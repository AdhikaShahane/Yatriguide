import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  hashPassword,
  signAuthToken,
  verifyAuthToken,
  verifyPassword,
  type AuthUser,
} from './server/auth.ts';
import {
  db,
  getBookingByPnrOrEmail,
  getCircuitDetail,
  getTempleById,
  listBookingsForUser,
  listCircuits,
  listRecentBookings,
  listTemples,
} from './server/db.ts';
import { dispatchTicketEmail } from './server/email.ts';
import {
  askGroundedCompanion,
  generateGroundedPilgrimagePlan,
} from './server/gemini.ts';
import type {
  ItineraryDay,
  LiveFeedEvent,
  PackageTier,
  PilgrimCareMode,
  TrainClassOption,
} from './src/types/pilgrimage.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '512kb' }));

// SSE subscribers for real-time booking window & PNR status updates
const sseClients = new Set<express.Response>();

function broadcastLiveEvent(event: LiveFeedEvent): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function generatePnr(): string {
  const num = crypto.randomInt(100000, 999999);
  return `TS-${num}`;
}

function allocateCoachAndBerths(trainClass: string, count: number): string {
  if (trainClass === 'SELF') {
    return 'Self Arrival / Direct Temple Reporting';
  }
  const coachPrefix =
    trainClass === '1A'
      ? 'H1'
      : trainClass === '2A'
        ? 'A2'
        : trainClass === '3A'
          ? 'B4'
          : trainClass === 'EC'
            ? 'E1'
            : trainClass === 'CC'
              ? 'C3'
              : 'S5';
  const startSeat = crypto.randomInt(12, 48);
  const seats = Array.from({ length: count }, (_, i) => startSeat + i).join(', ');
  return `Coach ${coachPrefix} · ${trainClass === 'CC' || trainClass === 'EC' ? 'Seats' : 'Berths'} ${seats}`;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: 'sqlite-wal', timestamp: new Date().toISOString() });
});

app.get('/api/live-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  const initEvent: LiveFeedEvent = {
    id: crypto.randomUUID(),
    type: 'HEARTBEAT',
    message: 'Connected to Yatriguide Live Darshan & Rail Desk',
    timestamp: new Date().toISOString(),
  };
  res.write(`data: ${JSON.stringify(initEvent)}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(res);
  });
});

app.get('/api/circuits', (_req, res) => {
  const circuits = listCircuits();
  const liveCount = circuits.filter(
    (c) => c.booking_status === 'LIVE_NOW' || c.booking_status === 'FILLING_FAST'
  ).length;
  const preBookCount = circuits.filter((c) => c.booking_status === 'PRE_BOOKING').length;
  const totalSlotsLeft = circuits.reduce((acc, c) => acc + c.slots_remaining, 0);
  const totalTrainRoutes = (
    db.prepare('SELECT COUNT(*) as cnt FROM train_routes').get() as { cnt: number }
  ).cnt;
  const totalBookings = (
    db.prepare('SELECT COUNT(*) as cnt FROM bookings').get() as { cnt: number }
  ).cnt;

  res.json({
    circuits,
    metrics: {
      liveWindowsOpen: liveCount,
      preBookingWindows: preBookCount,
      totalSlotsRemaining: totalSlotsLeft,
      activeTrainCorridors: totalTrainRoutes,
      confirmedPassesCount: totalBookings,
    },
  });
});

app.get('/api/circuits/:id', (req, res) => {
  const circuitId = String(req.params.id || '').trim();
  const detail = getCircuitDetail(circuitId);
  if (!detail) {
    res.status(404).json({ error: 'Pilgrimage circuit not found.' });
    return;
  }
  res.json(detail);
});

app.get('/api/temples', (_req, res) => {
  res.json({ temples: listTemples() });
});

app.get('/api/temples/:id', (req, res) => {
  const templeId = String(req.params.id || '').trim();
  const temple = getTempleById(templeId);
  if (!temple) {
    res.status(404).json({ error: 'Verified temple record not found.' });
    return;
  }
  res.json({ temple });
});

app.post('/api/planner/generate', async (req, res) => {
  try {
    const body = req.body ?? {};
    const startingLocation = String(body.starting_location || '').trim().slice(0, 100);
    const destination = String(body.destination || '').trim().slice(0, 120);
    const travellers = Math.min(20, Math.max(1, Number(body.travellers || 2)));
    const travelDate = String(body.travel_date || '2026-12-10').trim().slice(0, 20);
    const budgetInr = Math.min(1000000, Math.max(1500, Number(body.budget_inr || 15000)));
    const days = Math.min(14, Math.max(1, Number(body.days || 3)));
    const traditionInterest = String(body.tradition_interest || 'Hindu & Sacred Indian Shrines').trim().slice(0, 120);
    const specialRequirements = String(body.special_requirements || '').trim().slice(0, 240);
    const careModeRaw = String(body.care_mode || 'ELDERLY_CARE').toUpperCase();
    const careMode: PilgrimCareMode = ['SOLO_YOUTH', 'ELDERLY_CARE', 'FAMILY_KIDS'].includes(careModeRaw)
      ? (careModeRaw as PilgrimCareMode)
      : 'ELDERLY_CARE';

    if (startingLocation.length < 2 || destination.length < 2) {
      res.status(400).json({ error: 'Please provide both a starting city and a pilgrimage destination.' });
      return;
    }

    const plan = await generateGroundedPilgrimagePlan(
      {
        startingLocation,
        destination,
        travellers,
        travelDate,
        budgetInr,
        days,
        traditionInterest,
        specialRequirements,
        careMode,
      },
      listTemples(),
      listCircuits()
    );

    res.json({ plan });
  } catch (err) {
    if (err instanceof Error && err.message === 'GEMINI_KEY_MISSING') {
      res.status(503).json({
        error: 'Gemini API key is not configured. Check Settings > Secrets for GEMINI_API_KEY.',
      });
      return;
    }
    console.error('Planner generation error:', err);
    res.status(500).json({
      error: 'Unable to generate pilgrimage plan right now. Verify GEMINI_API_KEY or try again.',
    });
  }
});

app.post('/api/companion/ask', async (req, res) => {
  try {
    const body = req.body ?? {};
    const question = String(body.question || '').trim().slice(0, 500);
    const templeId = body.temple_id ? String(body.temple_id).trim() : '';
    const careModeRaw = String(body.care_mode || 'FAMILY_KIDS').toUpperCase();
    const careMode: PilgrimCareMode = ['SOLO_YOUTH', 'ELDERLY_CARE', 'FAMILY_KIDS'].includes(careModeRaw)
      ? (careModeRaw as PilgrimCareMode)
      : 'FAMILY_KIDS';

    if (question.length < 3) {
      res.status(400).json({ error: 'Ask a specific question about darshan timings, rituals, accessibility, or significance.' });
      return;
    }

    const focusedTemple = templeId ? getTempleById(templeId) : null;
    const result = await askGroundedCompanion(
      question,
      careMode,
      focusedTemple,
      listTemples()
    );

    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'GEMINI_KEY_MISSING') {
      res.status(503).json({
        error: 'Gemini API key is not configured. Check Settings > Secrets for GEMINI_API_KEY.',
      });
      return;
    }
    console.error('Companion ask error:', err);
    res.status(500).json({
      error: 'Yatra Companion could not answer right now. Verify GEMINI_API_KEY in Settings > Secrets.',
    });
  }
});

function getAuthUserFromRequest(req: express.Request): AuthUser | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const payload = verifyAuthToken(token);
  if (!payload) return null;

  const row = db
    .prepare('SELECT id, full_name, email, phone, care_mode FROM users WHERE id = ?')
    .get(payload.sub) as Record<string, unknown> | undefined;

  if (!row) return null;
  return {
    id: String(row.id),
    full_name: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone),
    care_mode: row.care_mode as PilgrimCareMode,
  };
}

app.post('/api/auth/signup', (req, res) => {
  try {
    const body = req.body ?? {};
    const fullName = String(body.full_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    const careModeRaw = String(body.care_mode || 'ELDERLY_CARE').toUpperCase();
    const careMode: PilgrimCareMode = ['SOLO_YOUTH', 'ELDERLY_CARE', 'FAMILY_KIDS'].includes(careModeRaw)
      ? (careModeRaw as PilgrimCareMode)
      : 'ELDERLY_CARE';

    if (fullName.length < 2 || fullName.length > 100) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const nowIso = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, full_name, email, phone, password_hash, care_mode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, fullName, email, phone, passwordHash, careMode, nowIso);

    const user: AuthUser = {
      id: userId,
      full_name: fullName,
      email,
      phone,
      care_mode: careMode,
    };
    const token = signAuthToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Could not create your account right now.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const body = req.body ?? {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Enter both your email and password.' });
      return;
    }

    const row = db
      .prepare('SELECT id, full_name, email, phone, password_hash, care_mode FROM users WHERE LOWER(email) = LOWER(?)')
      .get(email) as Record<string, unknown> | undefined;

    if (!row || !verifyPassword(password, String(row.password_hash))) {
      res.status(401).json({ error: 'Incorrect email or password. Please try again.' });
      return;
    }

    const user: AuthUser = {
      id: String(row.id),
      full_name: String(row.full_name),
      email: String(row.email),
      phone: String(row.phone),
      care_mode: row.care_mode as PilgrimCareMode,
    };
    const token = signAuthToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  res.json({ user });
});

app.get('/api/bookings', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length > 0) {
    const matches = getBookingByPnrOrEmail(q);
    res.json({ bookings: matches });
    return;
  }
  const user = getAuthUserFromRequest(req);
  if (user) {
    const userBookings = listBookingsForUser(user.id, user.email);
    if (userBookings.length > 0) {
      res.json({ bookings: userBookings });
      return;
    }
  }
  res.json({ bookings: listRecentBookings(10) });
});

app.post('/api/bookings', async (req, res) => {
  try {
    const authUser = getAuthUserFromRequest(req);
    const body = req.body ?? {};
    const circuitId = String(body.circuit_id || '').trim();
    const tier = String(body.tier || '').toUpperCase() as PackageTier;
    const pilgrimName = String(body.pilgrim_name || '').trim();
    const pilgrimEmail = String(body.pilgrim_email || '').trim();
    const pilgrimPhone = String(body.pilgrim_phone || '').trim();
    const travelDate = String(body.travel_date || '').trim();
    const pilgrimCount = Number(body.pilgrim_count);
    const darshanSlotId = String(body.darshan_slot_id || '').trim();
    const trainRouteId = body.train_route_id ? String(body.train_route_id).trim() : null;
    const trainClass = String(body.train_class || 'SELF').trim().toUpperCase();
    const stayId = String(body.stay_id || '').trim();
    const seniorAssistance = Boolean(body.senior_assistance);
    const prasadBox = Boolean(body.prasad_box);
    const sankalpGotra = String(body.sankalp_gotra || '').trim().slice(0, 120);
    const requestedItinerary = Array.isArray(body.itinerary) ? body.itinerary : null;

    if (!circuitId || !['SEVA', 'PARIVAR', 'RAJASI'].includes(tier)) {
      res.status(400).json({ error: 'Select a valid pilgrimage circuit and package tier.' });
      return;
    }
    if (pilgrimName.length < 2 || pilgrimName.length > 100) {
      res.status(400).json({ error: 'Enter a valid primary pilgrim full name.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(pilgrimEmail) || pilgrimEmail.length > 160) {
      res.status(400).json({ error: 'Enter a valid email address for automated e-ticket delivery.' });
      return;
    }
    if (pilgrimPhone.replace(/\D/g, '').length < 10) {
      res.status(400).json({ error: 'Enter a valid 10-digit mobile number for rail & darshan alerts.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      res.status(400).json({ error: 'Select a valid travel departure date.' });
      return;
    }
    if (!Number.isInteger(pilgrimCount) || pilgrimCount < 1 || pilgrimCount > 20) {
      res.status(400).json({ error: 'Pilgrim count must be between 1 and 20.' });
      return;
    }

    const circuitDetail = getCircuitDetail(circuitId);
    if (!circuitDetail) {
      res.status(404).json({ error: 'Selected circuit does not exist.' });
      return;
    }
    if (circuitDetail.slots_remaining < 1) {
      res.status(409).json({ error: 'No slots remaining in this booking window.' });
      return;
    }

    const slot = circuitDetail.darshan_slots.find((s) => s.id === darshanSlotId);
    if (!slot) {
      res.status(400).json({ error: 'Select a valid darshan & aarti timing slot.' });
      return;
    }
    if (slot.seats_remaining < pilgrimCount) {
      res.status(409).json({ error: `Only ${slot.seats_remaining} passes left in ${slot.slot_name}.` });
      return;
    }

    const stay = circuitDetail.stays.find((s) => s.id === stayId);
    if (!stay) {
      res.status(400).json({ error: 'Select a valid stay / Bhakta Niwas option.' });
      return;
    }

    let selectedTrain = null as (typeof circuitDetail.train_routes)[number] | null;
    let selectedTrainClassObj: TrainClassOption | null = null;
    if (trainRouteId && trainClass !== 'SELF') {
      selectedTrain = circuitDetail.train_routes.find((t) => t.id === trainRouteId) ?? null;
      if (!selectedTrain) {
        res.status(400).json({ error: 'Selected train route does not serve this circuit.' });
        return;
      }
      selectedTrainClassObj = selectedTrain.classes.find((c) => c.code === trainClass) ?? null;
      if (!selectedTrainClassObj) {
        res.status(400).json({ error: 'Selected train coach class is unavailable.' });
        return;
      }
    }

    // Authoritative server-side pricing
    const basePerPerson =
      tier === 'RAJASI'
        ? circuitDetail.price_rajasi
        : tier === 'PARIVAR'
          ? circuitDetail.price_parivar
          : circuitDetail.price_seva;

    const nights = Math.max(1, circuitDetail.duration_days - 1);
    const roomsNeeded = Math.ceil(pilgrimCount / 2);
    const stayCost = stay.price_per_night * nights * roomsNeeded;
    const darshanCost = slot.surcharge * pilgrimCount;
    const trainCost = selectedTrainClassObj ? selectedTrainClassObj.fare * pilgrimCount : 0;
    const assistanceCost = seniorAssistance && tier !== 'RAJASI' ? 450 : 0;
    const prasadCost = prasadBox ? 351 : 0;
    const totalAmount =
      basePerPerson * pilgrimCount + stayCost + darshanCost + trainCost + assistanceCost + prasadCost;

    // Sanitize personalized itinerary
    const sanitizedItinerary: ItineraryDay[] = (
      requestedItinerary && requestedItinerary.length > 0
        ? requestedItinerary
        : circuitDetail.default_itinerary
    ).map((item: Partial<ItineraryDay>, idx: number) => ({
      day: Number(item.day) || idx + 1,
      title: String(item.title || `Day ${idx + 1}`).slice(0, 120),
      morning_ritual: String(item.morning_ritual || '').slice(0, 160),
      darshan_window: String(item.darshan_window || '').slice(0, 160),
      evening_program: String(item.evening_program || '').slice(0, 160),
      included: item.included !== false,
      custom_note: item.custom_note ? String(item.custom_note).slice(0, 160) : undefined,
    }));

    const bookingMode: 'LIVE_BOOKING' | 'PRE_BOOKING' =
      circuitDetail.booking_status === 'PRE_BOOKING' ? 'PRE_BOOKING' : 'LIVE_BOOKING';
    const initialStatus =
      bookingMode === 'PRE_BOOKING' ? 'PRE_BOOKED_PRIORITY' : 'CONFIRMED';

    const bookingId = crypto.randomUUID();
    const pnr = generatePnr();
    const nowIso = new Date().toISOString();
    const coachBerth = allocateCoachAndBerths(
      selectedTrain ? trainClass : 'SELF',
      pilgrimCount
    );

    const tx = db.transaction(() => {
      const updatedCircuit = db
        .prepare(
          'UPDATE circuits SET slots_remaining = MAX(0, slots_remaining - 1) WHERE id = ? AND slots_remaining > 0'
        )
        .run(circuitId);
      if (updatedCircuit.changes === 0) {
        throw new Error('NO_SLOTS');
      }

      db.prepare(
        'UPDATE darshan_slots SET seats_remaining = MAX(0, seats_remaining - ?) WHERE id = ?'
      ).run(pilgrimCount, slot.id);

      db.prepare(
        `INSERT INTO bookings (
          id, pnr, circuit_id, booking_mode, tier, pilgrim_name, pilgrim_email,
          pilgrim_phone, travel_date, pilgrim_count, senior_assistance, prasad_box,
          sankalp_gotra, darshan_slot_id, train_route_id, train_class, train_coach_berth,
          stay_id, itinerary_json, total_amount, status, created_at, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        bookingId,
        pnr,
        circuitId,
        bookingMode,
        tier,
        pilgrimName,
        pilgrimEmail,
        pilgrimPhone,
        travelDate,
        pilgrimCount,
        seniorAssistance ? 1 : 0,
        prasadBox ? 1 : 0,
        sankalpGotra,
        slot.id,
        selectedTrain ? selectedTrain.id : null,
        selectedTrain ? trainClass : 'SELF',
        coachBerth,
        stay.id,
        JSON.stringify(sanitizedItinerary),
        totalAmount,
        initialStatus,
        nowIso,
        authUser ? authUser.id : null
      );

      const insertUpdate = db.prepare(
        'INSERT INTO booking_updates (booking_id, event_type, message, created_at) VALUES (?, ?, ?, ?)'
      );

      insertUpdate.run(
        bookingId,
        bookingMode === 'PRE_BOOKING' ? 'PREBOOK_PRIORITY_LOCKED' : 'TICKET_ISSUED',
        bookingMode === 'PRE_BOOKING'
          ? `Priority Pre-Booking ${pnr} locked for ${pilgrimCount} ${pilgrimCount === 1 ? 'Yatri' : 'Yatris'} (${tier} Tier).`
          : `Yatra Pass ${pnr} confirmed for ${pilgrimCount} ${pilgrimCount === 1 ? 'Yatri' : 'Yatris'} (${tier} Tier).`,
        nowIso
      );

      if (selectedTrain) {
        insertUpdate.run(
          bookingId,
          'TRAIN_PNR_SYNC',
          `${selectedTrain.train_number} ${selectedTrain.train_name} (${trainClass}) assigned: ${coachBerth}.`,
          nowIso
        );
      }

      insertUpdate.run(
        bookingId,
        'DARSHAN_TOKEN_READY',
        `${slot.slot_name} (${slot.slot_time}) token generated with ${stay.name}.`,
        nowIso
      );
    });

    tx();

    // Automated email confirmation dispatch
    const emailResult = await dispatchTicketEmail(pilgrimEmail, {
      pnr,
      bookingMode,
      tier,
      pilgrimName,
      pilgrimEmail,
      pilgrimPhone,
      travelDate,
      pilgrimCount,
      circuitTitle: circuitDetail.title,
      circuitRegion: circuitDetail.region,
      darshanSlotName: slot.slot_name,
      darshanSlotTime: slot.slot_time,
      trainSummary: selectedTrain
        ? `${selectedTrain.train_number} ${selectedTrain.train_name} (${selectedTrain.origin_city} → ${selectedTrain.arrival_station})`
        : 'Self Arrival / Direct Temple Check-in',
      trainCoachBerth: coachBerth,
      stayName: stay.name,
      stayDistance: stay.distance_to_temple,
      sankalpGotra,
      seniorAssistance,
      prasadBox,
      totalAmount,
      itinerary: sanitizedItinerary,
    });

    const emailTime = new Date().toISOString();
    db.prepare(
      'INSERT INTO email_dispatches (booking_id, recipient_email, subject, delivery_mode, html_body, sent_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      bookingId,
      pilgrimEmail,
      emailResult.subject,
      emailResult.deliveryMode,
      emailResult.htmlBody,
      emailTime
    );

    db.prepare(
      'INSERT INTO booking_updates (booking_id, event_type, message, created_at) VALUES (?, ?, ?, ?)'
    ).run(
      bookingId,
      'EMAIL_SENT',
      `Automated E-Ticket & Darshan Pass sent to ${pilgrimEmail} (${emailResult.deliveryMode === 'SMTP_SENT' ? 'SMTP Delivered' : 'Verified Dispatch'}).`,
      emailTime
    );

    const updatedCircuitRow = db
      .prepare('SELECT slots_remaining FROM circuits WHERE id = ?')
      .get(circuitId) as { slots_remaining: number };

    broadcastLiveEvent({
      id: crypto.randomUUID(),
      type: bookingMode === 'PRE_BOOKING' ? 'PREBOOK_CREATED' : 'BOOKING_CREATED',
      pnr,
      circuit_id: circuitId,
      circuit_title: circuitDetail.title,
      slots_remaining: updatedCircuitRow.slots_remaining,
      message: `${pilgrimCount} ${pilgrimCount === 1 ? 'Yatri' : 'Yatris'} ${
        bookingMode === 'PRE_BOOKING' ? 'pre-booked' : 'booked'
      } ${circuitDetail.title} (${tier} Tier)`,
      timestamp: emailTime,
    });

    const [created] = getBookingByPnrOrEmail(pnr);
    res.status(201).json({ booking: created });
  } catch (err) {
    if (err instanceof Error && err.message === 'NO_SLOTS') {
      res.status(409).json({ error: 'Selected pilgrimage window is currently full.' });
      return;
    }
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Could not complete pilgrimage booking. Please verify inputs and try again.' });
  }
});

app.post('/api/bookings/:pnr/notify', async (req, res) => {
  try {
    const pnr = String(req.params.pnr || '').trim().toUpperCase();
    const [booking] = getBookingByPnrOrEmail(pnr);
    if (!booking) {
      res.status(404).json({ error: 'Booking PNR not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const updateMessage = booking.train_number
      ? `Live Rail & Darshan Sync: ${booking.train_number} ${booking.train_name} running on schedule · ${booking.darshan_slot_name || 'Darshan'} gate reporting confirmed.`
      : `Live Darshan Sync: ${booking.darshan_slot_name || 'Temple'} slot verified for ${booking.travel_date} · Sanctuary reporting active.`;

    const emailResult = await dispatchTicketEmail(booking.pilgrim_email, {
      pnr: booking.pnr,
      bookingMode: booking.booking_mode,
      tier: booking.tier,
      pilgrimName: booking.pilgrim_name,
      pilgrimEmail: booking.pilgrim_email,
      pilgrimPhone: booking.pilgrim_phone,
      travelDate: booking.travel_date,
      pilgrimCount: booking.pilgrim_count,
      circuitTitle: booking.circuit_title,
      circuitRegion: booking.circuit_region,
      darshanSlotName: booking.darshan_slot_name || 'Scheduled Darshan',
      darshanSlotTime: booking.darshan_slot_time || 'Morning Window',
      trainSummary: booking.train_number
        ? `${booking.train_number} ${booking.train_name}`
        : 'Self Arrival',
      trainCoachBerth: booking.train_coach_berth,
      stayName: booking.stay_name || 'Reserved Sacred Stay',
      stayDistance: booking.stay_distance || 'Walking distance',
      sankalpGotra: booking.sankalp_gotra,
      seniorAssistance: Boolean(booking.senior_assistance),
      prasadBox: Boolean(booking.prasad_box),
      totalAmount: booking.total_amount,
      itinerary: booking.itinerary,
      updateHeadline: updateMessage,
    });

    db.prepare(
      'INSERT INTO booking_updates (booking_id, event_type, message, created_at) VALUES (?, ?, ?, ?)'
    ).run(booking.id, 'TRAIN_PNR_SYNC', updateMessage, nowIso);

    db.prepare(
      'INSERT INTO email_dispatches (booking_id, recipient_email, subject, delivery_mode, html_body, sent_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      booking.id,
      booking.pilgrim_email,
      emailResult.subject,
      emailResult.deliveryMode,
      emailResult.htmlBody,
      nowIso
    );

    broadcastLiveEvent({
      id: crypto.randomUUID(),
      type: 'STATUS_SYNC',
      pnr: booking.pnr,
      circuit_id: booking.circuit_id,
      circuit_title: booking.circuit_title,
      message: `Real-time alert emailed to ${booking.pilgrim_email} for ${booking.pnr}`,
      timestamp: nowIso,
    });

    const [refreshed] = getBookingByPnrOrEmail(booking.pnr);
    res.json({ booking: refreshed });
  } catch (err) {
    console.error('Notify error:', err);
    res.status(500).json({ error: 'Unable to dispatch live update notification.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TeerthSutra server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
