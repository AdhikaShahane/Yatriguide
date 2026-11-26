import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Hotel,
  QrCode,
  ShieldCheck,
  TrainFront,
  Users,
  Utensils,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  BookingRecord,
  CircuitDetail,
  ItineraryDay,
  PackageTier,
} from '../types/pilgrimage';
import type { AuthUser } from './AuthPage';

interface YatraConfiguratorProps {
  circuitDetail: CircuitDetail;
  currentUser: AuthUser | null;
  authToken: string;
  onClose: () => void;
  onBookingSuccess: (booking: BookingRecord) => void;
  onOpenTempleGuide?: (circuitId: string) => void;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const COMFORT_OPTIONS: Record<
  PackageTier,
  { name: string; subtitle: string; perks: string }
> = {
  SEVA: {
    name: 'Budget Saver',
    subtitle: 'Seva Tier',
    perks: 'Bhakta Niwas Guest House · Sleeper Train · Standard Darshan',
  },
  PARIVAR: {
    name: 'Family Comfort',
    subtitle: 'Most Popular',
    perks: '3-Star Pure-Veg Hotel · AC Train · Fast Sugam Pass',
  },
  RAJASI: {
    name: 'VIP Senior & Royal',
    subtitle: 'Rajasi Tier',
    perks: '5-Star Retreat · 1AC / Exec Chair · VIP Darshan & Cart Help',
  },
};

export function YatraConfigurator({
  circuitDetail,
  currentUser,
  authToken,
  onClose,
  onBookingSuccess,
  onOpenTempleGuide,
}: YatraConfiguratorProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tourType, setTourType] = useState<'PERSONALIZE' | 'GROUP'>(
    circuitDetail.booking_status === 'PRE_BOOKING' ? 'GROUP' : 'PERSONALIZE'
  );

  const [tier, setTier] = useState<PackageTier>('PARIVAR');
  const [travelDate, setTravelDate] = useState<string>(
    circuitDetail.booking_status === 'PRE_BOOKING'
      ? circuitDetail.window_opens_at
      : '2026-12-08'
  );
  const [adultCount, setAdultCount] = useState<number>(2);
  const [childCount, setChildCount] = useState<number>(0);

  const [seniorAssistance, setSeniorAssistance] = useState<boolean>(
    currentUser?.care_mode === 'ELDERLY_CARE'
  );
  const [prasadBox, setPrasadBox] = useState<boolean>(true);
  const [annadanSeva, setAnnadanSeva] = useState<boolean>(false);
  const [medicalCondition, setMedicalCondition] = useState<string>('');
  const [sankalpGotra, setSankalpGotra] = useState<string>('');

  const [darshanSlotId, setDarshanSlotId] = useState<string>(
    circuitDetail.darshan_slots[1]?.id ?? circuitDetail.darshan_slots[0]?.id ?? ''
  );

  const [includeTrain, setIncludeTrain] = useState<boolean>(true);
  const [trainRouteId, setTrainRouteId] = useState<string>(
    circuitDetail.train_routes[0]?.id ?? ''
  );
  const [trainClass, setTrainClass] = useState<string>(
    circuitDetail.train_routes[0]?.classes[0]?.code ?? '3A'
  );

  const [stayId, setStayId] = useState<string>(
    circuitDetail.stays.find((s) => s.tier === 'PARIVAR')?.id ??
      circuitDetail.stays[0]?.id ??
      ''
  );

  const [itinerary, setItinerary] = useState<ItineraryDay[]>(
    circuitDetail.default_itinerary
  );

  const [pilgrimName, setPilgrimName] = useState<string>(
    currentUser?.full_name ?? ''
  );
  const [pilgrimEmail, setPilgrimEmail] = useState<string>(
    currentUser?.email ?? ''
  );
  const [pilgrimPhone, setPilgrimPhone] = useState<string>(
    currentUser?.phone ?? ''
  );

  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);

  const pilgrimCount = Math.max(1, adultCount + childCount);

  useEffect(() => {
    if (currentUser) {
      setPilgrimName((prev) => prev || currentUser.full_name);
      setPilgrimEmail((prev) => prev || currentUser.email);
      setPilgrimPhone((prev) => prev || currentUser.phone);
    }
  }, [currentUser]);

  useEffect(() => {
    setStep(1);
    setConfirmedBooking(null);
    setTourType(circuitDetail.booking_status === 'PRE_BOOKING' ? 'GROUP' : 'PERSONALIZE');
    setTier('PARIVAR');
    setTravelDate(
      circuitDetail.booking_status === 'PRE_BOOKING'
        ? circuitDetail.window_opens_at
        : '2026-12-08'
    );
    setDarshanSlotId(
      circuitDetail.darshan_slots[1]?.id ?? circuitDetail.darshan_slots[0]?.id ?? ''
    );
    const firstTrain = circuitDetail.train_routes[0];
    setTrainRouteId(firstTrain?.id ?? '');
    setTrainClass(firstTrain?.classes[0]?.code ?? '3A');
    setStayId(
      circuitDetail.stays.find((s) => s.tier === 'PARIVAR')?.id ??
        circuitDetail.stays[0]?.id ??
        ''
    );
    setItinerary(circuitDetail.default_itinerary);
    setErrorMsg('');
  }, [circuitDetail]);

  const handleTierSelect = (nextTier: PackageTier) => {
    setTier(nextTier);
    const matchingStay = circuitDetail.stays.find((s) => s.tier === nextTier);
    if (matchingStay) setStayId(matchingStay.id);

    const train = circuitDetail.train_routes.find((t) => t.id === trainRouteId);
    if (train && train.classes.length > 0) {
      if (nextTier === 'SEVA') {
        const sl = train.classes.find((c) => c.code === 'SL') ?? train.classes[0];
        setTrainClass(sl.code);
      } else if (nextTier === 'RAJASI') {
        const vip =
          train.classes.find((c) => c.code === '1A' || c.code === 'EC') ??
          train.classes[train.classes.length - 1];
        setTrainClass(vip.code);
      } else {
        const mid =
          train.classes.find((c) => c.code === '3A' || c.code === 'CC') ??
          train.classes[0];
        setTrainClass(mid.code);
      }
    }
    if (nextTier === 'RAJASI') {
      const vipSlot = circuitDetail.darshan_slots.find((s) => s.is_vip === 1);
      if (vipSlot) setDarshanSlotId(vipSlot.id);
    }
  };

  const selectedTrain = useMemo(
    () => circuitDetail.train_routes.find((t) => t.id === trainRouteId) ?? null,
    [circuitDetail.train_routes, trainRouteId]
  );

  const selectedTrainClass = useMemo(
    () => selectedTrain?.classes.find((c) => c.code === trainClass) ?? null,
    [selectedTrain, trainClass]
  );

  const selectedSlot = useMemo(
    () => circuitDetail.darshan_slots.find((s) => s.id === darshanSlotId) ?? null,
    [circuitDetail.darshan_slots, darshanSlotId]
  );

  const selectedStay = useMemo(
    () => circuitDetail.stays.find((s) => s.id === stayId) ?? null,
    [circuitDetail.stays, stayId]
  );

  const pricing = useMemo(() => {
    const basePerPerson =
      tier === 'RAJASI'
        ? circuitDetail.price_rajasi
        : tier === 'PARIVAR'
          ? circuitDetail.price_parivar
          : circuitDetail.price_seva;
    const baseTotal = basePerPerson * pilgrimCount;
    const nights = Math.max(1, circuitDetail.duration_days - 1);
    const rooms = Math.ceil(pilgrimCount / 2);
    const stayTotal = (selectedStay?.price_per_night ?? 0) * nights * rooms;
    const darshanTotal = (selectedSlot?.surcharge ?? 0) * pilgrimCount;
    const trainTotal =
      includeTrain && selectedTrainClass ? selectedTrainClass.fare * pilgrimCount : 0;
    const assistTotal = seniorAssistance && tier !== 'RAJASI' ? 450 : 0;
    const prasadTotal = prasadBox ? 351 : 0;

    return {
      baseTotal,
      stayTotal,
      darshanTotal,
      trainTotal,
      assistTotal,
      prasadTotal,
      rooms,
      nights,
      grandTotal:
        baseTotal + stayTotal + darshanTotal + trainTotal + assistTotal + prasadTotal,
    };
  }, [
    circuitDetail,
    tier,
    pilgrimCount,
    selectedStay,
    selectedSlot,
    includeTrain,
    selectedTrainClass,
    seniorAssistance,
    prasadBox,
  ]);

  const toggleItineraryDay = (dayNumber: number) => {
    setItinerary((prev) =>
      prev.map((d) => (d.day === dayNumber ? { ...d, included: !d.included } : d))
    );
  };

  const handleContinueToPayment = () => {
    setErrorMsg('');
    if (pilgrimName.trim().length < 2) {
      setErrorMsg('Please enter the primary traveller full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pilgrimEmail.trim())) {
      setErrorMsg('Please enter a valid email address for your e-ticket.');
      return;
    }
    if (pilgrimPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setStep(3);
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const gotraAndNotes = [
      sankalpGotra.trim(),
      medicalCondition.trim() ? `Medical/Care: ${medicalCondition.trim()}` : '',
      annadanSeva ? 'Seva: Annadan' : '',
    ]
      .filter(Boolean)
      .join(' · ');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          circuit_id: circuitDetail.id,
          tier,
          pilgrim_name: pilgrimName.trim(),
          pilgrim_email: pilgrimEmail.trim(),
          pilgrim_phone: pilgrimPhone.trim(),
          travel_date: travelDate,
          pilgrim_count: pilgrimCount,
          senior_assistance: seniorAssistance,
          prasad_box: prasadBox,
          sankalp_gotra: gotraAndNotes,
          darshan_slot_id: darshanSlotId,
          train_route_id: includeTrain ? trainRouteId : null,
          train_class: includeTrain ? trainClass : 'SELF',
          stay_id: stayId,
          itinerary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not confirm your booking. Please check inputs.');
        return;
      }

      setConfirmedBooking(data.booking);
    } catch {
      setErrorMsg('Network error while confirming reservation. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Congrats Screen matching Figma "Congrats! Payment has done Successfully"
  if (confirmedBooking) {
    return (
      <section className="mx-auto max-w-[620px] px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-[#E6D7C3] bg-white p-8 text-center shadow-md">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#FF5722] to-[#D84315] text-white shadow-md">
            <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
          </div>
          <h2 className="mt-6 font-display text-4xl font-bold text-[#D84315]">
            Congrats!
          </h2>
          <p className="mt-2 text-base font-medium text-[#241914]">
            Booking &amp; Confirmation Completed Successfully
          </p>
          <p className="mt-2 text-sm text-[#685649]">
            Ticket <strong className="font-mono-data text-[#241914]">{confirmedBooking.pnr}</strong> and your full itinerary have been sent to{' '}
            <strong className="text-[#241914]">{confirmedBooking.pilgrim_email}</strong>.
          </p>

          <div className="mt-6 rounded-2xl border border-[#E6D7C3] bg-[#FAF6EE] p-4 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#685649]">Destination</span>
              <span className="font-bold text-[#241914]">{confirmedBooking.circuit_title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#685649]">Travel Date &amp; Travellers</span>
              <span className="font-mono-data font-semibold text-[#241914]">
                {confirmedBooking.travel_date} · {confirmedBooking.pilgrim_count} Yatris
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#685649]">Train / Stay</span>
              <span className="font-semibold text-[#1E6B47]">
                {confirmedBooking.train_coach_berth}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onBookingSuccess(confirmedBooking)}
            className="mt-7 w-full rounded-full bg-gradient-to-r from-[#FF5722] to-[#D84315] py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-95 cursor-pointer"
          >
            Great! View My Ticket &amp; Itinerary
          </button>
        </div>
      </section>
    );
  }

  const isPreBook = circuitDetail.booking_status === 'PRE_BOOKING';
  const tourCodePrefix = circuitDetail.title.slice(0, 2).toUpperCase();

  return (
    <section
      id="yatra-configurator"
      className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6"
    >
      <div className="overflow-hidden rounded-2xl border border-[#E6D7C3] bg-white shadow-sm">
        {/* Figma-Inspired Vibrant Orange-Red Destination Header */}
        <div className="bg-gradient-to-r from-[#FF5722] via-[#F4511E] to-[#D84315] px-5 py-5 text-white sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to All Destinations"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <img
                src={circuitDetail.image_url}
                alt={circuitDetail.title}
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full border-2 border-white/80 object-cover shadow-xs"
              />
              <div>
                <div className="text-xs font-medium text-white/90">
                  {circuitDetail.region} · {circuitDetail.duration_days} Days / {Math.max(1, circuitDetail.duration_days - 1)} Nights
                </div>
                <h2 className="font-display text-xl font-bold leading-tight sm:text-2xl">
                  {circuitDetail.title}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-white/85">
                {tourType === 'PERSONALIZE' ? `TOURCODE ${tourCodePrefix}Z` : `TOURCODE ${tourCodePrefix}G`}
              </div>
              <div className="font-mono-data text-xl font-bold">
                {formatInr(pricing.grandTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Clean 3-Step Bar */}
        <div className="grid grid-cols-3 border-b border-[#E6D7C3] bg-[#FAF6EE]">
          {[
            { num: 1 as const, label: '1. Places & Package' },
            { num: 2 as const, label: '2. Train, Stay & Details' },
            { num: 3 as const, label: '3. Confirm & Pay' },
          ].map((tab) => (
            <button
              key={tab.num}
              type="button"
              onClick={() => {
                if (tab.num < 3) setStep(tab.num);
              }}
              className={`border-b-2 px-3 py-3.5 text-center text-xs font-bold transition-colors sm:text-sm cursor-pointer ${
                step === tab.num
                  ? 'border-[#FF5722] bg-white text-[#D84315]'
                  : 'border-transparent text-[#685649] hover:text-[#241914]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="p-5 sm:p-6 lg:col-span-8 lg:border-r lg:border-[#E6D7C3]">
            {step === 1 && (
              <div className="space-y-6">
                {/* Personalize vs Yatra Group Cards from Figma Android Compact 6 / 13 */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-bold text-[#241914]">
                      Choose Your Yatra Style
                    </h3>
                    {onOpenTempleGuide && (
                      <button
                        type="button"
                        onClick={() => onOpenTempleGuide(circuitDetail.id)}
                        className="text-xs font-semibold text-[#D84315] hover:underline cursor-pointer"
                      >
                        Check Temple Rules &amp; Wheelchair Info
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setTourType('PERSONALIZE')}
                      className={`flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                        tourType === 'PERSONALIZE'
                          ? 'border-[#FF5722] bg-[#FFF7F3] ring-1 ring-[#FF5722]'
                          : 'border-[#E6D7C3] bg-white hover:border-[#C28A1A]'
                      }`}
                    >
                      <img
                        src={circuitDetail.image_url}
                        alt="Personalize Yatra"
                        referrerPolicy="no-referrer"
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-display text-lg font-bold text-[#241914]">
                            Personalize
                          </span>
                          <span className="font-mono-data text-[10px] font-bold text-[#685649]">
                            {tourCodePrefix}Z
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#685649]">
                          Private dates for your family
                        </p>
                        <div className="mt-2 inline-block rounded-md border border-[#1E6B47]/40 bg-[#EEF7F1] px-2 py-0.5 text-[11px] font-semibold text-[#1E6B47]">
                          Booking Available
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTourType('GROUP')}
                      className={`flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                        tourType === 'GROUP'
                          ? 'border-[#FF5722] bg-[#FFF7F3] ring-1 ring-[#FF5722]'
                          : 'border-[#E6D7C3] bg-white hover:border-[#C28A1A]'
                      }`}
                    >
                      <img
                        src={circuitDetail.image_url}
                        alt="Yatra Group"
                        referrerPolicy="no-referrer"
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-display text-lg font-bold text-[#241914]">
                            Yatra Group
                          </span>
                          <span className="font-mono-data text-[10px] font-bold text-[#685649]">
                            {tourCodePrefix}G
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#685649]">
                          Guided batch with temple coordinator
                        </p>
                        <div className="mt-2 inline-block rounded-md border border-[#D84315]/40 bg-[#FFF3EE] px-2 py-0.5 text-[11px] font-semibold text-[#D84315]">
                          {isPreBook ? `Opens ${circuitDetail.window_opens_at}` : 'Group Batch Open'}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Date & Adult/Children Counter */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-[#685649]">
                      Start Date
                    </span>
                    <div className="relative mt-1">
                      <Calendar
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#685649]"
                        aria-hidden="true"
                      />
                      <input
                        type="date"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] py-2.5 pl-9 pr-3 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[#685649]">
                      Adults
                    </span>
                    <div className="relative mt-1">
                      <Users
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#685649]"
                        aria-hidden="true"
                      />
                      <select
                        value={adultCount}
                        onChange={(e) => setAdultCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] py-2.5 pl-9 pr-3 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Adult' : 'Adults'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[#685649]">
                      Children
                    </span>
                    <select
                      value={childCount}
                      onChange={(e) => setChildCount(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Child' : 'Children'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Comfort Level */}
                <div>
                  <h4 className="text-sm font-bold text-[#241914]">
                    Comfort &amp; Hotel Category
                  </h4>
                  <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {(['SEVA', 'PARIVAR', 'RAJASI'] as PackageTier[]).map((t) => {
                      const price =
                        t === 'SEVA'
                          ? circuitDetail.price_seva
                          : t === 'PARIVAR'
                            ? circuitDetail.price_parivar
                            : circuitDetail.price_rajasi;
                      const active = tier === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleTierSelect(t)}
                          className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-[#FF5722] bg-[#FFF7F3] ring-1 ring-[#FF5722]'
                              : 'border-[#E6D7C3] bg-white hover:border-[#C28A1A]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-[#D84315]">
                                {COMFORT_OPTIONS[t].subtitle}
                              </span>
                              {active && (
                                <Check className="h-4 w-4 text-[#FF5722]" aria-hidden="true" />
                              )}
                            </div>
                            <div className="mt-0.5 font-display text-lg font-bold text-[#241914]">
                              {COMFORT_OPTIONS[t].name}
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-[#685649]">
                              {COMFORT_OPTIONS[t].perks}
                            </p>
                          </div>
                          <div className="mt-3 border-t border-[#E6D7C3] pt-2.5 font-mono-data text-sm font-bold text-[#241914]">
                            {formatInr(price)}{' '}
                            <span className="text-xs font-normal text-[#685649]">/ person</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Places to Visit & Pooja Info from Figma Android Compact 7 */}
                <div className="rounded-2xl border border-[#E6D7C3] bg-[#FAF6EE] p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-lg font-bold text-[#241914]">
                      Places to Visit &amp; Daily Darshan Schedule
                    </h4>
                    <span className="rounded bg-[#241914] px-2 py-0.5 text-[10px] font-bold text-white">
                      {circuitDetail.temples.length} SACRED SITES
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {circuitDetail.temples.map((t) => (
                      <div
                        key={t.order}
                        className="flex items-start gap-2.5 rounded-xl border border-[#E6D7C3] bg-white p-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF5722] font-mono-data text-xs font-bold text-white">
                          {t.order}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#241914]">
                            {t.name} <span className="font-normal text-[#685649]">({t.town})</span>
                          </div>
                          <div className="text-[11px] text-[#685649]">{t.highlight}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#E6D7C3] pt-3 text-xs text-[#685649] sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 shrink-0 text-[#D84315]" aria-hidden="true" />
                      <span>Pure Veg / Satvik / Jain &amp; Baby Food</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrainFront className="h-4 w-4 shrink-0 text-[#D84315]" aria-hidden="true" />
                      <span>Train + Local Temple Transport</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-[#D84315]" aria-hidden="true" />
                      <span>Mangala &amp; Sandhya Aarti Slots</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#D84315] px-6 py-3 text-sm font-bold text-white shadow-xs hover:opacity-95 cursor-pointer"
                  >
                    <span>Confirm Your Trip &amp; Pick Train / Details</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#241914]">
                    Pick Darshan &amp; Aarti Timing
                  </h3>
                  <div className="mt-3 space-y-2">
                    {circuitDetail.darshan_slots.map((slot) => {
                      const active = darshanSlotId === slot.id;
                      const disabled = slot.seats_remaining < pilgrimCount;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => setDarshanSlotId(slot.id)}
                          className={`flex w-full flex-col justify-between gap-2 rounded-xl border p-3.5 text-left sm:flex-row sm:items-center ${
                            disabled
                              ? 'cursor-not-allowed opacity-50 border-[#E6D7C3]'
                              : active
                                ? 'border-[#FF5722] bg-[#FFF7F3] ring-1 ring-[#FF5722] cursor-pointer'
                                : 'border-[#E6D7C3] bg-white hover:border-[#C28A1A] cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-bold text-[#241914]">
                              {slot.slot_name}
                            </div>
                            <div className="text-xs text-[#685649]">
                              {slot.slot_time} · {slot.seats_remaining} passes left
                            </div>
                          </div>
                          <div className="font-mono-data text-xs font-bold text-[#D84315]">
                            {slot.surcharge === 0
                              ? 'Included'
                              : `+ ${formatInr(slot.surcharge)} / person`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Train & Stay */}
                <div className="grid grid-cols-1 gap-5 border-t border-[#E6D7C3] pt-5 md:grid-cols-2">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#241914]">
                      <TrainFront className="h-4 w-4 text-[#D84315]" aria-hidden="true" />
                      <span>Train Ticket</span>
                    </h4>
                    <div className="mt-2 flex gap-1.5 rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] p-1">
                      <button
                        type="button"
                        onClick={() => setIncludeTrain(true)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold cursor-pointer ${
                          includeTrain ? 'bg-white text-[#D84315] shadow-xs' : 'text-[#685649]'
                        }`}
                      >
                        Include Train
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncludeTrain(false)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold cursor-pointer ${
                          !includeTrain ? 'bg-white text-[#D84315] shadow-xs' : 'text-[#685649]'
                        }`}
                      >
                        Own Travel
                      </button>
                    </div>

                    {includeTrain && (
                      <div className="mt-2.5 space-y-2">
                        {circuitDetail.train_routes.map((tr) => {
                          const active = trainRouteId === tr.id;
                          return (
                            <div
                              key={tr.id}
                              className={`rounded-xl border p-3 ${
                                active ? 'border-[#FF5722] bg-[#FFF7F3]' : 'border-[#E6D7C3]'
                              }`}
                            >
                              <div className="text-xs font-bold text-[#241914]">
                                {tr.train_name} (#{tr.train_number})
                              </div>
                              <div className="text-[11px] text-[#685649]">
                                {tr.origin_city} ({tr.departure_time}) → {tr.arrival_station}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {tr.classes.map((cls) => {
                                  const clsSelected = active && trainClass === cls.code;
                                  return (
                                    <button
                                      key={cls.code}
                                      type="button"
                                      onClick={() => {
                                        setTrainRouteId(tr.id);
                                        setTrainClass(cls.code);
                                      }}
                                      className={`rounded-lg border px-2.5 py-1 text-[11px] cursor-pointer ${
                                        clsSelected
                                          ? 'border-[#D84315] bg-[#D84315] text-white font-semibold'
                                          : 'border-[#E6D7C3] bg-white text-[#241914]'
                                      }`}
                                    >
                                      {cls.code} · {formatInr(cls.fare)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#241914]">
                      <Hotel className="h-4 w-4 text-[#D84315]" aria-hidden="true" />
                      <span>Hotel / Bhakta Niwas</span>
                    </h4>
                    <div className="mt-2 space-y-2">
                      {circuitDetail.stays.map((st) => {
                        const active = stayId === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setStayId(st.id)}
                            className={`w-full rounded-xl border p-3 text-left cursor-pointer ${
                              active
                                ? 'border-[#FF5722] bg-[#FFF7F3] ring-1 ring-[#FF5722]'
                                : 'border-[#E6D7C3] bg-white'
                            }`}
                          >
                            <div className="flex justify-between gap-2 text-xs font-bold text-[#241914]">
                              <span>{st.name}</span>
                              <span className="font-mono-data text-[#D84315]">
                                {formatInr(st.price_per_night)}/nt
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-[#685649]">
                              {st.distance_to_temple} · {st.meal_plan}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Day-by-Day Customization */}
                <div className="border-t border-[#E6D7C3] pt-5">
                  <h4 className="text-sm font-bold text-[#241914]">
                    Day-by-Day Plan (Uncheck any day to skip)
                  </h4>
                  <div className="mt-2.5 space-y-2">
                    {itinerary.map((day) => (
                      <label
                        key={day.day}
                        className="flex items-start gap-3 rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] p-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={day.included}
                          onChange={() => toggleItineraryDay(day.day)}
                          className="mt-1 h-4 w-4 accent-[#FF5722]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#241914]">
                            Day {day.day}: {day.title}
                          </div>
                          <div className="text-[11px] text-[#685649]">{day.darshan_window}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Client / Traveller Details + Seva Checkboxes matching Figma Client screen */}
                <div className="border-t border-[#E6D7C3] pt-5 space-y-4">
                  <h4 className="font-display text-xl font-bold text-[#241914]">
                    Traveller Information &amp; Seva Options
                  </h4>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-[#685649]">
                        Primary Traveller Full Name *
                      </span>
                      <input
                        type="text"
                        required
                        value={pilgrimName}
                        onChange={(e) => setPilgrimName(e.target.value)}
                        placeholder="Full Name"
                        className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#685649]">
                        Email ID (Ticket Confirmation) *
                      </span>
                      <input
                        type="email"
                        required
                        value={pilgrimEmail}
                        onChange={(e) => setPilgrimEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#685649]">
                        Phone Number *
                      </span>
                      <input
                        type="tel"
                        required
                        value={pilgrimPhone}
                        onChange={(e) => setPilgrimPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#685649]">
                        Any Medical Condition / Mobility Note
                      </span>
                      <input
                        type="text"
                        value={medicalCondition}
                        onChange={(e) => setMedicalCondition(e.target.value)}
                        placeholder="e.g. Knee pain, wheelchair needed, asthma"
                        className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                      />
                    </label>
                  </div>

                  {/* Seva Checkboxes */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <label className="flex items-start gap-2.5 rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] p-3 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={seniorAssistance}
                        onChange={(e) => setSeniorAssistance(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#FF5722]"
                      />
                      <div>
                        <div className="font-bold text-[#241914]">Senior Wheelchair Help</div>
                        <div className="text-[#685649]">
                          {tier === 'RAJASI' ? 'Free included' : '+₹450 total'}
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] p-3 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prasadBox}
                        onChange={(e) => setPrasadBox(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#FF5722]"
                      />
                      <div>
                        <div className="font-bold text-[#241914]">Temple Mahaprasad Box</div>
                        <div className="text-[#685649]">+₹351 family box</div>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] p-3 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={annadanSeva}
                        onChange={(e) => setAnnadanSeva(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-[#FF5722]"
                      />
                      <div>
                        <div className="font-bold text-[#241914]">Annadan / Temple Seva</div>
                        <div className="text-[#685649]">Volunteer &amp; devotion note</div>
                      </div>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-[#685649]">
                      Family Puja Gotra (Optional)
                    </span>
                    <input
                      type="text"
                      value={sankalpGotra}
                      onChange={(e) => setSankalpGotra(e.target.value)}
                      placeholder="e.g. Kashyap Gotra"
                      className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                    />
                  </label>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#6B1D1D] bg-[#6B1D1D]/10 px-4 py-3 text-xs font-medium text-[#6B1D1D]"
                  >
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-[#E6D7C3] px-4 py-2.5 text-sm font-semibold text-[#241914] cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToPayment}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#D84315] px-7 py-3 text-sm font-bold text-white shadow-xs hover:opacity-95 cursor-pointer"
                  >
                    <span>Proceed to Confirm &amp; Pay</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                <div>
                  <h3 className="font-display text-2xl font-bold text-[#241914]">
                    Booking &amp; Payment Confirmation
                  </h3>
                  <p className="mt-1 text-xs text-[#685649]">
                    Choose your preferred payment method to issue your ticket and email confirmation immediately.
                  </p>
                </div>

                {/* Package Fee Breakdown Box matching Figma Payment Card */}
                <div className="rounded-2xl border border-[#E6D7C3] bg-[#FAF6EE] p-5 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#685649]">Package Fee ({pilgrimCount} Yatris)</span>
                    <span className="font-mono-data font-semibold">{formatInr(pricing.baseTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#685649]">Stay ({pricing.rooms} Room · {pricing.nights} Nights)</span>
                    <span className="font-mono-data font-semibold">{formatInr(pricing.stayTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#685649]">Train &amp; Darshan Passes</span>
                    <span className="font-mono-data font-semibold">
                      {formatInr(pricing.trainTotal + pricing.darshanTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#685649]">Senior Help &amp; Prasad</span>
                    <span className="font-mono-data font-semibold">
                      {formatInr(pricing.assistTotal + pricing.prasadTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#C28A1A] pt-3 text-base font-bold text-[#D84315]">
                    <span>TOTAL AMOUNT</span>
                    <span className="font-mono-data">{formatInr(pricing.grandTotal)}</span>
                  </div>
                </div>

                {/* Payment Tabs: UPI / Card / Net Banking */}
                <div>
                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] p-1">
                    {[
                      { id: 'UPI' as const, label: 'UPI / GPay / PhonePe', icon: QrCode },
                      { id: 'CARD' as const, label: 'Debit / Credit Card', icon: CreditCard },
                      { id: 'NETBANKING' as const, label: 'Net Banking', icon: ShieldCheck },
                    ].map((pm) => {
                      const Icon = pm.icon;
                      const active = paymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-white text-[#D84315] shadow-xs'
                              : 'text-[#685649] hover:text-[#241914]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{pm.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === 'UPI' && (
                    <div className="mt-4 rounded-2xl border border-[#E6D7C3] bg-white p-5 flex flex-col sm:flex-row items-center gap-5">
                      <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D84315] bg-[#FFF7F3] text-center">
                        <QrCode className="h-14 w-14 text-[#241914]" aria-hidden="true" />
                        <span className="mt-1 text-[10px] font-bold text-[#D84315]">
                          SCAN TO PAY
                        </span>
                      </div>
                      <div className="flex-1 w-full">
                        <div className="text-xs font-bold text-[#241914]">
                          Pay with Google Pay, PhonePe, Paytm, or enter UPI ID
                        </div>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@okaxis (optional)"
                          className="mt-2 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                        />
                        <p className="mt-1.5 text-[11px] text-[#685649]">
                          Your e-ticket and darshan slot lock immediately in SQLite upon clicking Confirm.
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'CARD' && (
                    <div className="mt-4 rounded-2xl border border-[#E6D7C3] bg-white p-4 text-xs text-[#685649]">
                      Visa / Mastercard / RuPay debit &amp; credit card checkout ready for{' '}
                      <strong className="text-[#241914]">{pilgrimName}</strong> ({formatInr(pricing.grandTotal)}).
                    </div>
                  )}

                  {paymentMethod === 'NETBANKING' && (
                    <div className="mt-4 rounded-2xl border border-[#E6D7C3] bg-white p-4 text-xs text-[#685649]">
                      SBI, HDFC, ICICI, Axis &amp; Indian bank transfer selected for{' '}
                      <strong className="text-[#241914]">{formatInr(pricing.grandTotal)}</strong>.
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#6B1D1D] bg-[#6B1D1D]/10 px-4 py-3 text-xs font-medium text-[#6B1D1D]"
                  >
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-xl border border-[#E6D7C3] px-4 py-2.5 text-sm font-semibold text-[#241914] cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#D84315] px-8 py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? 'Issuing Ticket & Sending Email...' : `Confirm & Pay ${formatInr(pricing.grandTotal)}`}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Persistent Live Trip Summary Card */}
          <aside className="bg-[#FAF6EE] p-6 lg:col-span-4">
            <div className="text-xs font-bold text-[#D84315]">
              {tourType === 'PERSONALIZE' ? 'Private Family Yatra' : 'Guided Group Yatra'}
            </div>
            <h4 className="mt-1 font-display text-2xl font-bold text-[#241914]">
              {COMFORT_OPTIONS[tier].name}
            </h4>
            <div className="mt-1 text-xs text-[#685649]">
              {adultCount} {adultCount === 1 ? 'Adult' : 'Adults'}
              {childCount > 0 ? `, ${childCount} ${childCount === 1 ? 'Child' : 'Children'}` : ''} · {travelDate}
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-[#E6D7C3] pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#685649]">Package ({pilgrimCount}x)</dt>
                <dd className="font-mono-data font-medium">{formatInr(pricing.baseTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#685649]">Hotel / Stay</dt>
                <dd className="font-mono-data font-medium">{formatInr(pricing.stayTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#685649]">Darshan Pass</dt>
                <dd className="font-mono-data font-medium">
                  {pricing.darshanTotal === 0 ? 'Included' : formatInr(pricing.darshanTotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#685649]">Train Ticket</dt>
                <dd className="font-mono-data font-medium">
                  {pricing.trainTotal === 0 ? 'Self Travel' : formatInr(pricing.trainTotal)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 border-t border-[#C28A1A] pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-[#241914]">Total Cost</span>
                <span className="font-mono-data text-2xl font-bold text-[#D84315]">
                  {formatInr(pricing.grandTotal)}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#685649]">
                Includes automated e-ticket email confirmation, hotel address, train berth details, and verified darshan slot.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
