import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Home,
  Mail,
  Train,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  BookingRecord,
  CircuitDetail,
  ItineraryDay,
  PackageTier,
} from '../types/pilgrimage';

interface YatraConfiguratorProps {
  circuitDetail: CircuitDetail;
  onClose: () => void;
  onBookingSuccess: (booking: BookingRecord) => void;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const TIER_INFO: Record<
  PackageTier,
  { name: string; subtitle: string; perks: string }
> = {
  SEVA: {
    name: 'Seva Tier',
    subtitle: 'Budget & Devotional Economy',
    perks: 'Trust Bhakta Niwas · Sleeper / 2S Rail · General Mukh Darshan',
  },
  PARIVAR: {
    name: 'Parivar Tier',
    subtitle: 'Comfort Family Pilgrimage',
    perks: '3-Star Pure Veg Stay · 3AC / Chair Car Rail · Sugam Queue Pass',
  },
  RAJASI: {
    name: 'Rajasi VIP Tier',
    subtitle: 'Royal Sanctum & Priority Concierge',
    perks: '5-Star Spiritual Retreat · 1AC / Executive Rail · VIP Garbha Griha & Sankalp',
  },
};

export function YatraConfigurator({
  circuitDetail,
  onClose,
  onBookingSuccess,
}: YatraConfiguratorProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [tier, setTier] = useState<PackageTier>('PARIVAR');
  const [travelDate, setTravelDate] = useState<string>(
    circuitDetail.booking_status === 'PRE_BOOKING'
      ? circuitDetail.window_opens_at
      : '2026-12-08'
  );
  const [pilgrimCount, setPilgrimCount] = useState<number>(2);
  const [seniorAssistance, setSeniorAssistance] = useState<boolean>(false);
  const [prasadBox, setPrasadBox] = useState<boolean>(true);
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

  const [pilgrimName, setPilgrimName] = useState<string>('');
  const [pilgrimEmail, setPilgrimEmail] = useState<string>('');
  const [pilgrimPhone, setPilgrimPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sync defaults when user switches circuit
  useEffect(() => {
    setStep(1);
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

    // Suggest matching train class and darshan slot for tier
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

  const updateDayNote = (dayNumber: number, note: string) => {
    setItinerary((prev) =>
      prev.map((d) => (d.day === dayNumber ? { ...d, custom_note: note } : d))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (pilgrimName.trim().length < 2) {
      setErrorMsg('Enter the primary pilgrim full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pilgrimEmail.trim())) {
      setErrorMsg('Enter a valid email address to receive your automated e-ticket.');
      return;
    }
    if (pilgrimPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          sankalp_gotra: sankalpGotra.trim(),
          darshan_slot_id: darshanSlotId,
          train_route_id: includeTrain ? trainRouteId : null,
          train_class: includeTrain ? trainClass : 'SELF',
          stay_id: stayId,
          itinerary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Booking could not be processed.');
        return;
      }

      onBookingSuccess(data.booking);
    } catch {
      setErrorMsg('Network error while confirming reservation. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPreBook = circuitDetail.booking_status === 'PRE_BOOKING';

  return (
    <section
      id="yatra-configurator"
      aria-label="Yatra Configurator"
      className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6"
    >
      <div className="rounded-lg border border-[#C28A1A] bg-[#FFFDF9] sacred-top-rule overflow-hidden">
        {/* Top Configurator Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6D7C3] bg-[#F3EBDD] px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#6B1D1D]">
              <span>{isPreBook ? 'Priority Pre-Booking Desk' : 'Live Yatra Booking Desk'}</span>
              <span aria-hidden="true">·</span>
              <span>{circuitDetail.window_label}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-data">
                {circuitDetail.slots_remaining} slots remaining
              </span>
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-[#241914] sm:text-3xl">
              {circuitDetail.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E6D7C3] bg-[#FFFDF9] px-4 py-2 text-sm font-medium text-[#241914] transition-colors hover:bg-[#FAF6EE] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Close Desk
          </button>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 border-b border-[#E6D7C3] bg-[#FAF6EE] sm:grid-cols-4">
          {[
            { num: 1 as const, label: '01. Tier & Yatris', icon: Users },
            { num: 2 as const, label: '02. Darshan & VIP', icon: Clock },
            { num: 3 as const, label: '03. Train & Stay', icon: Train },
            { num: 4 as const, label: '04. Itinerary & Email', icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = step === tab.num;
            return (
              <button
                key={tab.num}
                type="button"
                onClick={() => setStep(tab.num)}
                className={`flex items-center justify-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-[#D95D16] bg-[#FFFDF9] text-[#6B1D1D]'
                    : 'border-transparent text-[#685649] hover:text-[#241914]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Split Body: Left Interactive Controls, Right Live Summary Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="p-6 lg:col-span-8 lg:border-r lg:border-[#E6D7C3]">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-2xl font-bold text-[#241914]">
                    Select Yatra Tier (Economy to Royal VIP)
                  </h3>
                  <p className="mt-1 text-sm text-[#685649]">
                    Every tier includes verified temple coordination, satvik meal planning, and automated email ticketing.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                        className={`flex flex-col justify-between rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-[#D95D16] bg-[#FAF6EE] ring-1 ring-[#D95D16]'
                            : 'border-[#E6D7C3] bg-[#FFFDF9] hover:border-[#C28A1A]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#6B1D1D]">
                              {TIER_INFO[t].subtitle}
                            </span>
                            {active && (
                              <Check className="h-4 w-4 text-[#D95D16]" aria-hidden="true" />
                            )}
                          </div>
                          <div className="mt-1 font-display text-xl font-bold text-[#241914]">
                            {TIER_INFO[t].name}
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-[#685649]">
                            {TIER_INFO[t].perks}
                          </p>
                        </div>
                        <div className="mt-4 border-t border-[#E6D7C3] pt-3 font-mono-data text-base font-semibold text-[#241914]">
                          {formatInr(price)}{' '}
                          <span className="text-xs font-normal text-[#685649]">/ yatri</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-[#685649]">
                      Departure Date
                    </span>
                    <div className="relative mt-1.5">
                      <Calendar
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#685649]"
                        aria-hidden="true"
                      />
                      <input
                        type="date"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] py-2 pl-9 pr-3 text-sm font-medium text-[#241914] focus:border-[#D95D16] focus:outline-none"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[#685649]">
                      Number of Yatris
                    </span>
                    <select
                      value={pilgrimCount}
                      onChange={(e) => setPilgrimCount(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] px-3 py-2 text-sm font-medium text-[#241914] focus:border-[#D95D16] focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Pilgrim' : 'Pilgrims'}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-[#685649]">
                      Sankalp Gotra (Optional)
                    </span>
                    <input
                      type="text"
                      value={sankalpGotra}
                      onChange={(e) => setSankalpGotra(e.target.value)}
                      placeholder="e.g. Bharadwaj Gotra"
                      className="mt-1.5 w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] px-3 py-2 text-sm text-[#241914] placeholder:text-[#9A897C] focus:border-[#D95D16] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seniorAssistance}
                      onChange={(e) => setSeniorAssistance(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#D95D16]"
                    />
                    <div>
                      <div className="text-sm font-semibold text-[#241914]">
                        Senior Citizen Wheelchair &amp; Doli Priority
                      </div>
                      <div className="text-xs text-[#685649]">
                        {tier === 'RAJASI'
                          ? 'Complimentary in Rajasi Tier'
                          : '₹450 flat coordination fee across temple gates'}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-3.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prasadBox}
                      onChange={(e) => setPrasadBox(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#D95D16]"
                    />
                    <div>
                      <div className="text-sm font-semibold text-[#241914]">
                        Sanctum Panchamrit &amp; Prasad Box
                      </div>
                      <div className="text-xs text-[#685649]">
                        ₹351 family box packed after main Abhishek
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-md bg-[#D95D16] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] hover:bg-[#B84A0D] cursor-pointer"
                  >
                    <span>Choose Darshan Timing</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-2xl font-bold text-[#241914]">
                    Darshan Timings &amp; VIP Aarti Passes
                  </h3>
                  <p className="mt-1 text-sm text-[#685649]">
                    Live slot allocation from temple trust quotas for {circuitDetail.deity}.
                  </p>
                </div>

                <div className="space-y-3">
                  {circuitDetail.darshan_slots.map((slot) => {
                    const active = darshanSlotId === slot.id;
                    const disabled = slot.seats_remaining < pilgrimCount;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setDarshanSlotId(slot.id)}
                        className={`flex w-full flex-col justify-between gap-3 rounded-lg border p-4 text-left transition-colors sm:flex-row sm:items-center ${
                          disabled
                            ? 'cursor-not-allowed border-[#E6D7C3] bg-[#F3EBDD]/50 opacity-50'
                            : active
                              ? 'border-[#D95D16] bg-[#FAF6EE] ring-1 ring-[#D95D16] cursor-pointer'
                              : 'border-[#E6D7C3] bg-[#FFFDF9] hover:border-[#C28A1A] cursor-pointer'
                        }`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#685649]">
                            <span className="font-semibold text-[#6B1D1D]">
                              {slot.is_vip ? 'VIP / Special Seva' : 'Standard / Sugam Queue'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-data">{slot.slot_time}</span>
                            <span aria-hidden="true">·</span>
                            <span>{slot.seats_remaining} passes left</span>
                          </div>
                          <div className="mt-1 font-display text-xl font-bold text-[#241914]">
                            {slot.slot_name}
                          </div>
                        </div>

                        <div className="text-right font-mono-data text-sm font-semibold text-[#241914]">
                          {slot.surcharge === 0
                            ? 'Included'
                            : `+ ${formatInr(slot.surcharge)} / yatri`}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-md border border-[#E6D7C3] px-4 py-2 text-sm font-medium text-[#241914] hover:bg-[#FAF6EE] cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-md bg-[#D95D16] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] hover:bg-[#B84A0D] cursor-pointer"
                  >
                    <span>Select Train &amp; Stay</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display text-2xl font-bold text-[#241914]">
                    Indian Railways Transit &amp; Sacred Stay
                  </h3>
                  <p className="mt-1 text-sm text-[#685649]">
                    Book confirmed rail berths synchronized with your darshan check-in, or select self arrival.
                  </p>
                </div>

                {/* Train toggle */}
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-1.5">
                  <button
                    type="button"
                    onClick={() => setIncludeTrain(true)}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      includeTrain
                        ? 'bg-[#FFFDF9] text-[#6B1D1D] shadow-xs'
                        : 'text-[#685649] hover:text-[#241914]'
                    }`}
                  >
                    Include Indian Railways Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeTrain(false)}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      !includeTrain
                        ? 'bg-[#FFFDF9] text-[#6B1D1D] shadow-xs'
                        : 'text-[#685649] hover:text-[#241914]'
                    }`}
                  >
                    Self Arrival at Base Town
                  </button>
                </div>

                {includeTrain && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-[#685649]">
                      Serving Express &amp; Vande Bharat Corridors
                    </div>
                    {circuitDetail.train_routes.map((tr) => {
                      const active = trainRouteId === tr.id;
                      return (
                        <div
                          key={tr.id}
                          className={`rounded-lg border p-4 transition-colors ${
                            active
                              ? 'border-[#D95D16] bg-[#FAF6EE]'
                              : 'border-[#E6D7C3] bg-[#FFFDF9]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTrainRouteId(tr.id);
                                if (!tr.classes.some((c) => c.code === trainClass)) {
                                  setTrainClass(tr.classes[0]?.code ?? '3A');
                                }
                              }}
                              className="text-left cursor-pointer"
                            >
                              <div className="flex flex-wrap items-center gap-2 text-xs text-[#685649]">
                                <span className="font-mono-data font-semibold text-[#6B1D1D]">
                                  #{tr.train_number}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{tr.live_status}</span>
                              </div>
                              <div className="mt-0.5 text-base font-bold text-[#241914]">
                                {tr.train_name}
                              </div>
                              <div className="mt-0.5 font-mono-data text-xs text-[#685649]">
                                {tr.origin_city} ({tr.departure_time}) → {tr.arrival_station} (
                                {tr.arrival_time}) · {tr.duration_text}
                              </div>
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
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
                                  className={`rounded-md border px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                                    clsSelected
                                      ? 'border-[#6B1D1D] bg-[#6B1D1D] text-[#FFFDF9]'
                                      : 'border-[#E6D7C3] bg-[#FFFDF9] text-[#241914] hover:border-[#C28A1A]'
                                  }`}
                                >
                                  <div className="font-mono-data font-semibold">
                                    {cls.code} · {formatInr(cls.fare)}
                                  </div>
                                  <div
                                    className={
                                      clsSelected ? 'text-[#F7E8D6]' : 'text-[#685649]'
                                    }
                                  >
                                    {cls.label} ({cls.available} left)
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#685649]">
                    <Home className="h-4 w-4" aria-hidden="true" />
                    <span>Select Bhakta Niwas / Pure-Veg Hotel</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {circuitDetail.stays.map((st) => {
                      const active = stayId === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setStayId(st.id)}
                          className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-[#D95D16] bg-[#FAF6EE] ring-1 ring-[#D95D16]'
                              : 'border-[#E6D7C3] bg-[#FFFDF9] hover:border-[#C28A1A]'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-[#6B1D1D]">
                              {st.tier} Stay · {st.distance_to_temple}
                            </div>
                            <div className="mt-1 font-display text-lg font-bold text-[#241914]">
                              {st.name}
                            </div>
                            <div className="mt-1 text-xs text-[#685649]">{st.stay_type}</div>
                            <div className="mt-1 text-xs text-[#1E6B47]">{st.meal_plan}</div>
                          </div>
                          <div className="mt-3 border-t border-[#E6D7C3] pt-2 font-mono-data text-sm font-semibold text-[#241914]">
                            {formatInr(st.price_per_night)} / night
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-md border border-[#E6D7C3] px-4 py-2 text-sm font-medium text-[#241914] hover:bg-[#FAF6EE] cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="inline-flex items-center gap-2 rounded-md bg-[#D95D16] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] hover:bg-[#B84A0D] cursor-pointer"
                  >
                    <span>Personalize Itinerary &amp; Confirm</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="font-display text-2xl font-bold text-[#241914]">
                    Personalized Itinerary &amp; Automated Email E-Ticket
                  </h3>
                  <p className="mt-1 text-sm text-[#685649]">
                    Customize your day-by-day temple stops below. Your confirmed Yatra Pass, PNR, and real-time alert subscription will be dispatched to your email immediately.
                  </p>
                </div>

                <div className="space-y-3">
                  {itinerary.map((day) => (
                    <div
                      key={day.day}
                      className={`rounded-lg border p-4 transition-colors ${
                        day.included
                          ? 'border-[#E6D7C3] bg-[#FAF6EE]'
                          : 'border-[#E6D7C3] bg-[#F3EBDD]/40 opacity-65'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={day.included}
                            onChange={() => toggleItineraryDay(day.day)}
                            aria-label={`Include Day ${day.day}`}
                            className="h-4 w-4 accent-[#D95D16]"
                          />
                          <div>
                            <span className="font-mono-data text-xs font-semibold text-[#6B1D1D]">
                              Day {day.day}
                            </span>
                            <h4 className="font-display text-lg font-bold text-[#241914]">
                              {day.title}
                            </h4>
                          </div>
                        </div>
                        <span className="font-mono-data text-xs text-[#685649]">
                          {day.darshan_window}
                        </span>
                      </div>

                      {day.included && (
                        <div className="mt-2 pl-7 space-y-2">
                          <div className="text-xs text-[#685649]">
                            {day.morning_ritual} · {day.evening_program}
                          </div>
                          <input
                            type="text"
                            value={day.custom_note || ''}
                            onChange={(e) => updateDayNote(day.day, e.target.value)}
                            placeholder="Add custom pilgrim request (e.g. wheelchair at east gate, Jain/no-onion satvik thali)..."
                            className="w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] px-3 py-1.5 text-xs text-[#241914] placeholder:text-[#9A897C] focus:border-[#D95D16] focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#E6D7C3] pt-5">
                  <h4 className="font-display text-xl font-bold text-[#241914]">
                    Primary Pilgrim Contact for Automated E-Ticket
                  </h4>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-[#685649]">
                        Full Name *
                      </span>
                      <input
                        type="text"
                        required
                        value={pilgrimName}
                        onChange={(e) => setPilgrimName(e.target.value)}
                        placeholder="e.g. Aditi Kulkarni"
                        className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] px-3 py-2 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#685649]">
                        Email for E-Ticket &amp; Alerts *
                      </span>
                      <input
                        type="email"
                        required
                        value={pilgrimEmail}
                        onChange={(e) => setPilgrimEmail(e.target.value)}
                        placeholder="yatri@domain.in"
                        className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] px-3 py-2 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-[#685649]">
                        Mobile Number *
                      </span>
                      <input
                        type="tel"
                        required
                        value={pilgrimPhone}
                        onChange={(e) => setPilgrimPhone(e.target.value)}
                        placeholder="+91 98200 12345"
                        className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] px-3 py-2 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
                      />
                    </label>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-md border border-[#6B1D1D] bg-[#6B1D1D]/10 px-4 py-3 text-sm font-medium text-[#6B1D1D]"
                  >
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-md border border-[#E6D7C3] px-4 py-2 text-sm font-medium text-[#241914] hover:bg-[#FAF6EE] cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-md bg-[#D95D16] px-6 py-3 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#B84A0D] disabled:opacity-60 cursor-pointer"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {submitting
                        ? 'Issuing Yatra Pass & Emailing...'
                        : isPreBook
                          ? 'Lock Pre-Booking & Email Pass'
                          : 'Confirm Booking & Email Pass'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Live Dakshina & Selection Ledger */}
          <aside className="bg-[#FAF6EE] p-6 lg:col-span-4">
            <div className="text-xs font-semibold text-[#6B1D1D]">
              Yatra Reservation Ledger
            </div>
            <h4 className="mt-1 font-display text-xl font-bold text-[#241914]">
              {TIER_INFO[tier].name} · {pilgrimCount} {pilgrimCount === 1 ? 'Yatri' : 'Yatris'}
            </h4>
            <div className="mt-1 font-mono-data text-xs text-[#685649]">
              Departure: {travelDate} · {circuitDetail.duration_days} Days
            </div>

            <dl className="mt-5 space-y-3 border-t border-[#E6D7C3] pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#685649]">Circuit Package ({tier})</dt>
                <dd className="font-mono-data font-medium text-[#241914]">
                  {formatInr(pricing.baseTotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#685649]">
                  Stay ({Math.max(1, circuitDetail.duration_days - 1)} nights ·{' '}
                  {Math.ceil(pilgrimCount / 2)} room)
                </dt>
                <dd className="font-mono-data font-medium text-[#241914]">
                  {formatInr(pricing.stayTotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#685649]">
                  {selectedSlot?.slot_name ?? 'Darshan Slot'}
                </dt>
                <dd className="font-mono-data font-medium text-[#241914]">
                  {pricing.darshanTotal === 0 ? 'Included' : formatInr(pricing.darshanTotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#685649]">
                  {includeTrain && selectedTrain
                    ? `Train #${selectedTrain.train_number} (${trainClass})`
                    : 'Self Arrival'}
                </dt>
                <dd className="font-mono-data font-medium text-[#241914]">
                  {pricing.trainTotal === 0 ? '₹0' : formatInr(pricing.trainTotal)}
                </dd>
              </div>
              {seniorAssistance && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#685649]">Senior Doli / Wheelchair</dt>
                  <dd className="font-mono-data font-medium text-[#241914]">
                    {pricing.assistTotal === 0 ? 'Complimentary' : formatInr(pricing.assistTotal)}
                  </dd>
                </div>
              )}
              {prasadBox && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#685649]">Panchamrit Prasad Box</dt>
                  <dd className="font-mono-data font-medium text-[#241914]">
                    {formatInr(pricing.prasadTotal)}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-5 border-t border-[#C28A1A] pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#241914]">
                  Total Yatra Dakshina
                </span>
                <span className="font-mono-data text-2xl font-bold text-[#6B1D1D]">
                  {formatInr(pricing.grandTotal)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#685649]">
                Includes temple trust registration, PNR berth locking, and automated e-ticket dispatch to your email.
              </p>
            </div>

            <div className="mt-6 border-t border-[#E6D7C3] pt-4">
              <div className="text-xs font-semibold text-[#241914]">
                Sacred Stops ({circuitDetail.temples.length})
              </div>
              <ol className="mt-2 space-y-1.5 text-xs text-[#685649]">
                {circuitDetail.temples.map((t) => (
                  <li key={t.order} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">
                      <span className="font-mono-data text-[#6B1D1D]">0{t.order}.</span> {t.name}
                    </span>
                    <span className="shrink-0 text-[#9A897C]">{t.town}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
