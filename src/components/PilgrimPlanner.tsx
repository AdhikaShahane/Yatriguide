import { Calendar, Compass, Download, HeartHandshake, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PilgrimCareMode, PlannedItineraryResult } from '../types/pilgrimage';

interface PilgrimPlannerProps {
  careMode: PilgrimCareMode;
  onCareModeChange: (mode: PilgrimCareMode) => void;
  onOpenCircuitById: (circuitId: string) => void;
}

const CARE_MODES: {
  id: PilgrimCareMode;
  label: string;
  focus: string;
  detail: string;
}[] = [
  {
    id: 'SOLO_YOUTH',
    label: 'Young Solo Pilgrim',
    focus: 'Budget · Rail & Shuttle · Fast Routes',
    detail: 'Prioritizes economical Bhakta Niwas stays, early free darshan queues, and efficient public transport.',
  },
  {
    id: 'ELDERLY_CARE',
    label: 'Elderly & Senior Care',
    focus: 'Accessibility · Rest · Medical Safety',
    detail: 'Limits daily stops, avoids steep stairs via ramps/lifts/doli, adds midday rest, and lists nearby clinics.',
  },
  {
    id: 'FAMILY_KIDS',
    label: 'Family with Children',
    focus: 'Comfort · Satvik Meals · Calm Pacing',
    detail: 'Balances Sugam queue passes, nearby pure-veg stays, predictable travel times, and manageable walking.',
  },
];

const OFFLINE_CACHE_KEY = 'yatriguide_offline_plan_v1';

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapePlain(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function PilgrimPlanner({
  careMode,
  onCareModeChange,
  onOpenCircuitById,
}: PilgrimPlannerProps) {
  const [startingLocation, setStartingLocation] = useState('Pune');
  const [destination, setDestination] = useState('Varanasi & Sarnath (Kashi Vishwanath)');
  const [travellers, setTravellers] = useState(3);
  const [travelDate, setTravelDate] = useState('2026-12-12');
  const [budgetInr, setBudgetInr] = useState(24000);
  const [days, setDays] = useState(3);
  const [traditionInterest, setTraditionInterest] = useState(
    'Hindu Temples & Sacred River Ghats'
  );
  const [specialRequirements, setSpecialRequirements] = useState(
    'Travelling with 70-year-old parents; prefer lifts/ramps and minimal stairs'
  );

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [plan, setPlan] = useState<PlannedItineraryResult | null>(null);
  const [savedOfflineNotice, setSavedOfflineNotice] = useState('');

  useEffect(() => {
    try {
      const cached = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (cached) {
        setPlan(JSON.parse(cached) as PlannedItineraryResult);
      }
    } catch {
      // Ignore invalid localStorage state
    }
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSavedOfflineNotice('');
    setGenerating(true);

    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starting_location: startingLocation,
          destination,
          travellers,
          travel_date: travelDate,
          budget_inr: budgetInr,
          days,
          tradition_interest: traditionInterest,
          special_requirements: specialRequirements,
          care_mode: careMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not generate pilgrimage plan.');
        return;
      }
      setPlan(data.plan);
      try {
        localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(data.plan));
      } catch {
        // Ignore storage quota issues
      }
    } catch {
      setErrorMsg('Network error while generating your grounded pilgrimage plan.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadOfflineDossier = () => {
    if (!plan) return;
    const daysHtml = plan.days
      .map(
        (d) => `
      <div style="border:1px solid #e6d7c3;padding:14px;margin-bottom:12px;border-radius:6px;background:#fffdf9;">
        <h3 style="margin:0 0 6px;color:#6b1d1d;">Day ${d.day}: ${escapePlain(d.headline)}</h3>
        <p style="margin:4px 0;"><strong>Shrines:</strong> ${escapePlain(d.temples_covered.join(', '))}</p>
        <p style="margin:4px 0;"><strong>Verified Darshan Window:</strong> ${escapePlain(d.verified_darshan_window)}</p>
        <p style="margin:4px 0;"><strong>Walking &amp; Rest:</strong> ${escapePlain(d.walking_and_rest_plan)}</p>
        <p style="margin:4px 0;"><strong>Transit:</strong> ${escapePlain(d.transport_note)}</p>
        <p style="margin:4px 0;"><strong>Meals &amp; Hydration:</strong> ${escapePlain(d.meal_and_hydration)}</p>
      </div>`
      )
      .join('');

    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapePlain(plan.title)} — Offline Yatriguide Dossier</title></head>
<body style="font-family:Georgia,serif;background:#faf6ee;color:#241914;max-width:760px;margin:24px auto;padding:20px;">
  <h1 style="color:#6b1d1d;margin-bottom:4px;">${escapePlain(plan.title)}</h1>
  <p style="color:#685649;margin-top:0;">Offline Yatriguide Dossier · ${escapePlain(plan.care_mode_summary)}</p>
  <p><strong>Estimated Budget:</strong> ${formatInr(plan.estimated_budget_inr.total)} (Stay ${formatInr(plan.estimated_budget_inr.stay)}, Transit ${formatInr(plan.estimated_budget_inr.transport)}, Darshan ${formatInr(plan.estimated_budget_inr.darshan_and_seva)}, Meals ${formatInr(plan.estimated_budget_inr.meals_and_local)})</p>
  <h2>Day-by-Day Schedule</h2>
  ${daysHtml}
  <h2>Accessibility &amp; Care Notes</h2>
  <ul>${plan.accessibility_and_care_notes.map((n) => `<li>${escapePlain(n)}</li>`).join('')}</ul>
  <h2>Important Travel Precautions</h2>
  <ul>${plan.precautions.map((p) => `<li>${escapePlain(p)}</li>`).join('')}</ul>
  <h2>Emergency &amp; Temple Contacts</h2>
  <ul>${plan.offline_ready_contacts.map((c) => `<li>${escapePlain(c)}</li>`).join('')}</ul>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yatriguide-trip-guide-${travelDate}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSavedOfflineNotice('Offline Trip Guide saved! You can open it anytime even without mobile signal.');
  };

  return (
    <section
      id="plan-yatra"
      className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6"
    >
      <div className="rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-6 sm:p-8 sacred-top-rule">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E6D7C3] pb-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#6B1D1D]">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Intelligent Pilgrimage Planner · Grounded in Official Temple Timings</span>
            </div>
            <h2 className="mt-1 font-display text-3xl font-bold text-[#241914] sm:text-4xl">
              Plan Yatra with Pilgrim Care Mode
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-[#685649]">
              Unlike standard tourist itineraries, Yatriguide adapts daily pace, stair avoidance, rest periods, budget, and darshan windows to who is travelling.
            </p>
          </div>
        </div>

        {/* Pilgrim Care Mode Selector */}
        <div className="mt-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B1D1D]">
            <HeartHandshake className="h-4 w-4" aria-hidden="true" />
            <span>Step 1 · Choose Pilgrim Care Mode</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {CARE_MODES.map((m) => {
              const active = careMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onCareModeChange(m.id)}
                  className={`rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-[#D95D16] bg-[#FAF6EE] ring-1 ring-[#D95D16]'
                      : 'border-[#E6D7C3] bg-[#FFFDF9] hover:border-[#C28A1A]'
                  }`}
                >
                  <div className="text-xs font-semibold text-[#6B1D1D]">{m.focus}</div>
                  <div className="mt-1 font-display text-xl font-bold text-[#241914]">
                    {m.label}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#685649]">{m.detail}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Planner Form */}
        <form onSubmit={handleGenerate} className="mt-6 space-y-4 border-t border-[#E6D7C3] pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="text-xs font-semibold text-[#685649]">Starting Location</span>
              <input
                type="text"
                required
                value={startingLocation}
                onChange={(e) => setStartingLocation(e.target.value)}
                placeholder="e.g. Pune / Delhi / Bengaluru"
                className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-2 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#685649]">Destination / Sacred Circuit</span>
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Varanasi, Shirdi, Kedarnath, Bodh Gaya"
                className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-2 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#685649]">Travel Date</span>
              <div className="relative mt-1">
                <Calendar
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#685649]"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] py-2 pl-9 pr-3 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
                />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#685649]">Days</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-2 font-mono-data text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[#685649]">Travellers</span>
                <div className="relative mt-1">
                  <Users
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#685649]"
                    aria-hidden="true"
                  />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={travellers}
                    onChange={(e) => setTravellers(Number(e.target.value))}
                    className="w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] py-2 pl-8 pr-2 font-mono-data text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-[#685649]">
                Target Total Budget (INR)
              </span>
              <input
                type="number"
                min={1500}
                step={500}
                value={budgetInr}
                onChange={(e) => setBudgetInr(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-2 font-mono-data text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#685649]">
                Religious Tradition &amp; Interests
              </span>
              <select
                value={traditionInterest}
                onChange={(e) => setTraditionInterest(e.target.value)}
                className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-2 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
              >
                <option value="Hindu Temples & Sacred River Ghats">
                  Hindu Temples &amp; Sacred River Ghats
                </option>
                <option value="Jyotirlinga & Shiva Shrines">
                  Jyotirlinga &amp; Shiva Shrines
                </option>
                <option value="Ashtavinayak & Ganesha Shrines">
                  Ashtavinayak &amp; Ganesha Shrines
                </option>
                <option value="Buddhist Circuit & Meditation Sites">
                  Buddhist Circuit &amp; Meditation Sites
                </option>
                <option value="Universal Indian Sacred Shrines">
                  Universal Indian Sacred Shrines
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#685649]">
                Special Accessibility / Dietary Notes
              </span>
              <input
                type="text"
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                placeholder="e.g. Wheelchair, oxygen check, pure satvik food"
                className="mt-1 w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-2 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
              />
            </label>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-md border border-[#6B1D1D] bg-[#6B1D1D]/10 px-4 py-3 text-sm font-medium text-[#6B1D1D]"
            >
              {errorMsg}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <span className="text-xs text-[#685649]">
              Built around verified temple opening hours, walking distances, and rest needs.
            </span>

            <button
              type="submit"
              disabled={generating}
              className="rounded-md bg-[#D95D16] px-6 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#B84A0D] disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {generating ? 'Creating Your Trip Plan...' : 'Create My Trip Plan'}
            </button>
          </div>
        </form>

        {/* Generated Grounded Pilgrimage Plan Output */}
        {plan && (
          <div className="mt-8 border-t border-[#C28A1A] pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-[#1E6B47]">
                  Verified Schedule Generated · Cached for Offline Access
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#241914] sm:text-3xl">
                  {plan.title}
                </h3>
                <p className="mt-1 text-sm text-[#685649]">{plan.care_mode_summary}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadOfflineDossier}
                  className="inline-flex items-center gap-2 rounded-md border border-[#6B1D1D] bg-[#FFFDF9] px-4 py-2 text-xs font-semibold text-[#6B1D1D] hover:bg-[#FAF6EE] whitespace-nowrap cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save Offline Trip Guide</span>
                </button>

                {plan.recommended_circuit_id && (
                  <button
                    type="button"
                    onClick={() => onOpenCircuitById(plan.recommended_circuit_id!)}
                    className="rounded-md bg-[#6B1D1D] px-4 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#531515] whitespace-nowrap cursor-pointer"
                  >
                    Book Matching Rail &amp; Darshan Package
                  </button>
                )}
              </div>
            </div>

            {savedOfflineNotice && (
              <div className="mt-3 rounded-md border border-[#1E6B47]/30 bg-[#EEF7F1] px-4 py-2.5 text-xs font-medium text-[#1E6B47]">
                {savedOfflineNotice}
              </div>
            )}

            {/* Expected Expense Breakdown */}
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-4 sm:grid-cols-5">
              <div>
                <div className="text-xs text-[#685649]">Stay</div>
                <div className="font-mono-data text-base font-semibold text-[#241914]">
                  {formatInr(plan.estimated_budget_inr.stay)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#685649]">Transit</div>
                <div className="font-mono-data text-base font-semibold text-[#241914]">
                  {formatInr(plan.estimated_budget_inr.transport)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#685649]">Darshan &amp; Seva</div>
                <div className="font-mono-data text-base font-semibold text-[#241914]">
                  {formatInr(plan.estimated_budget_inr.darshan_and_seva)}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#685649]">Meals &amp; Local</div>
                <div className="font-mono-data text-base font-semibold text-[#241914]">
                  {formatInr(plan.estimated_budget_inr.meals_and_local)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#6B1D1D]">Expected Total</div>
                <div className="font-mono-data text-lg font-bold text-[#6B1D1D]">
                  {formatInr(plan.estimated_budget_inr.total)}
                </div>
              </div>
            </div>

            {/* Day-by-Day Table */}
            <div className="mt-5 divide-y divide-[#E6D7C3] rounded-lg border border-[#E6D7C3]">
              {plan.days.map((d) => (
                <div key={d.day} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-display text-xl font-bold text-[#241914]">
                      <span className="font-mono-data mr-2 text-sm text-[#6B1D1D]">
                        Day {d.day}
                      </span>
                      {d.headline}
                    </h4>
                    <span className="font-mono-data text-xs text-[#1E6B47]">
                      {d.verified_darshan_window}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-[#6B1D1D]">
                    {d.temples_covered.join(' · ')}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-[#685649] md:grid-cols-3">
                    <div>
                      <span className="font-semibold text-[#241914]">Walking &amp; Rest:</span>{' '}
                      {d.walking_and_rest_plan}
                    </div>
                    <div>
                      <span className="font-semibold text-[#241914]">Transport:</span>{' '}
                      {d.transport_note}
                    </div>
                    <div>
                      <span className="font-semibold text-[#241914]">Meals &amp; Hydration:</span>{' '}
                      {d.meal_and_hydration}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Accessibility, Precautions & Offline Contacts */}
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                <div className="text-xs font-semibold text-[#6B1D1D]">
                  Accessibility &amp; Care Notes
                </div>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#241914]">
                  {plan.accessibility_and_care_notes.map((n, idx) => (
                    <li key={idx}>· {n}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                <div className="text-xs font-semibold text-[#6B1D1D]">
                  Travel Precautions
                </div>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#241914]">
                  {plan.precautions.map((p, idx) => (
                    <li key={idx}>· {p}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                <div className="text-xs font-semibold text-[#6B1D1D]">
                  Offline Emergency Contacts
                </div>
                <ul className="mt-2 space-y-1.5 font-mono-data text-xs leading-relaxed text-[#241914]">
                  {plan.offline_ready_contacts.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
