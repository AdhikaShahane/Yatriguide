import { GoogleGenAI, Type } from '@google/genai';
import type {
  CircuitSummary,
  PilgrimCareMode,
  PlannedItineraryResult,
  TempleDirectoryEntry,
} from '../src/types/pilgrimage.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface PlannerRequestInput {
  startingLocation: string;
  destination: string;
  travellers: number;
  travelDate: string;
  budgetInr: number;
  days: number;
  traditionInterest: string;
  specialRequirements: string;
  careMode: PilgrimCareMode;
}

export async function generateGroundedPilgrimagePlan(
  input: PlannerRequestInput,
  temples: TempleDirectoryEntry[],
  circuits: CircuitSummary[]
): Promise<PlannedItineraryResult> {
  const ai = getGeminiClient();

  const careDirective =
    input.careMode === 'ELDERLY_CARE'
      ? 'ELDERLY CARE MODE: Maximum 1-2 temples per day, mandatory midday rest window, zero strenuous climbs where lifts/ramps/doli/e-carts exist, highlight medical clinics, nearby pharmacies, wheelchair access, and gentle walking distances.'
      : input.careMode === 'FAMILY_KIDS'
        ? 'FAMILY WITH CHILDREN MODE: Balanced schedule with afternoon rest, clean pure-veg family meals, predictable queue timing via Sugam/paid passes, safe transport, and manageable daily travel distance.'
        : 'YOUNG SOLO PILGRIM MODE: Budget-conscious economy transport (Sleeper/2S/state shuttle), early morning free darshan windows, efficient walking & local transit routes.';

  const groundedTemplesContext = temples.map((t) => ({
    id: t.id,
    name: t.name,
    tradition: t.tradition,
    location: `${t.location}, ${t.state}`,
    opening_closing: t.opening_closing,
    darshan_timings: t.darshan_timings,
    aarti_timings: t.aarti_timings,
    online_booking: t.online_booking_info,
    dress_code: t.dress_code,
    historical_crowd: {
      weekday: t.crowd_weekday,
      weekend: t.crowd_weekend,
      festival: t.crowd_festival,
      recommended_window: t.recommended_visit_window,
    },
    accessibility: {
      wheelchair_accessible: Boolean(t.wheelchair_accessible),
      ramps_and_lifts: t.ramps_and_lifts,
      walking_distance: t.walking_distance_note,
      resting_zones: t.resting_zones,
      medical: t.medical_facility,
      pharmacy: t.nearby_pharmacy,
      emergency: t.emergency_contact,
    },
  }));

  const groundedCircuitsContext = circuits.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    duration_days: c.duration_days,
    price_seva_inr: c.price_seva,
    price_parivar_inr: c.price_parivar,
    price_rajasi_inr: c.price_rajasi,
    temples: c.temples.map((s) => `${s.name} (${s.town})`),
  }));

  const systemInstruction = [
    'You are Yatriguide, an accurate Indian pilgrimage planner that prioritizes pilgrim safety, verified temple timings, accessibility, and realistic pacing.',
    'STRICT GROUNDING RULES:',
    '1. Base all temple opening/closing hours, darshan windows, dress codes, accessibility notes, and emergency contacts ONLY on the verified SQLite temple & circuit records provided below.',
    '2. Never invent live crowd numbers. Describe crowd expectations strictly as historical estimates.',
    '3. Match the requested Pilgrim Care Mode strictly: adjust daily stop count, walking distance, rest blocks, and recommended darshan pass accordingly.',
    '4. If a matching circuit exists in VERIFIED_CIRCUITS, set recommended_circuit_id to its exact id.',
    '5. Keep descriptions concise, practical, and respectful across Hindu, Buddhist, and multi-tradition Indian sacred sites.',
    `PILGRIM CARE PROFILE: ${careDirective}`,
    `VERIFIED_TEMPLES: ${JSON.stringify(groundedTemplesContext)}`,
    `VERIFIED_CIRCUITS: ${JSON.stringify(groundedCircuitsContext)}`,
  ].join('\n\n');

  const prompt = `Create a ${input.days}-day pilgrimage plan from ${input.startingLocation} to ${input.destination} starting ${input.travelDate} for ${input.travellers} travellers with a total target budget around ₹${input.budgetInr}. Tradition/Interests: ${input.traditionInterest}. Special requirements: ${input.specialRequirements || 'None'}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          care_mode_summary: { type: Type.STRING },
          recommended_circuit_id: { type: Type.STRING },
          estimated_budget_inr: {
            type: Type.OBJECT,
            properties: {
              stay: { type: Type.INTEGER },
              transport: { type: Type.INTEGER },
              darshan_and_seva: { type: Type.INTEGER },
              meals_and_local: { type: Type.INTEGER },
              total: { type: Type.INTEGER },
            },
            required: ['stay', 'transport', 'darshan_and_seva', 'meals_and_local', 'total'],
          },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                headline: { type: Type.STRING },
                temples_covered: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                verified_darshan_window: { type: Type.STRING },
                walking_and_rest_plan: { type: Type.STRING },
                transport_note: { type: Type.STRING },
                meal_and_hydration: { type: Type.STRING },
              },
              required: [
                'day',
                'headline',
                'temples_covered',
                'verified_darshan_window',
                'walking_and_rest_plan',
                'transport_note',
                'meal_and_hydration',
              ],
            },
          },
          accessibility_and_care_notes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          precautions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          offline_ready_contacts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'title',
          'care_mode_summary',
          'estimated_budget_inr',
          'days',
          'accessibility_and_care_notes',
          'precautions',
          'offline_ready_contacts',
        ],
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  return JSON.parse(text) as PlannedItineraryResult;
}

export async function askGroundedCompanion(
  question: string,
  careMode: PilgrimCareMode,
  focusedTemple: TempleDirectoryEntry | null,
  allTemples: TempleDirectoryEntry[]
): Promise<{ answer: string; citedSources: string[] }> {
  const ai = getGeminiClient();

  const relevantTemples = focusedTemple ? [focusedTemple] : allTemples;
  const citedSources = relevantTemples.map(
    (t) => `${t.name} (${t.source_authority})`
  );

  const systemInstruction = [
    'You are the Yatriguide Source-Grounded Pilgrimage Companion.',
    'STRICT VERIFICATION POLICY:',
    '- Answer ONLY using the verified temple records provided in VERIFIED_RECORDS below.',
    '- Do NOT invent unverified temple timings, ticket fees, rituals, or live crowd numbers.',
    '- Always distinguish historical crowd estimates from live data.',
    '- When answering about a temple or tradition, cite the official source authority and official website from the record.',
    '- If the user asks about a temple or practice not covered in VERIFIED_RECORDS, clearly state that Yatriguide only provides verified information from official temple authorities and list which shrines currently have verified records.',
    `- Tailor practical advice to Pilgrim Care Mode: ${careMode}.`,
    'Keep the response structured, clear, warm, and under 220 words.',
    `VERIFIED_RECORDS: ${JSON.stringify(relevantTemples)}`,
  ].join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: question,
    config: {
      systemInstruction,
    },
  });

  return {
    answer: (response.text ?? '').trim(),
    citedSources,
  };
}
