import { ArrowRight, Train } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircuitCard } from './components/CircuitCard';
import { YatraConfigurator } from './components/YatraConfigurator';
import { YatraPassDesk } from './components/YatraPassDesk';
import type {
  BookingRecord,
  CircuitCategory,
  CircuitDetail,
  CircuitSummary,
  LiveFeedEvent,
} from './types/pilgrimage';

interface CircuitsMetrics {
  liveWindowsOpen: number;
  preBookingWindows: number;
  totalSlotsRemaining: number;
  activeTrainCorridors: number;
  confirmedPassesCount: number;
}

type WindowFilter = 'ALL' | 'LIVE' | 'PRE_BOOKING';

const CATEGORIES: ('All' | CircuitCategory)[] = [
  'All',
  'Ashtavinayak',
  'Jyotirlinga',
  'Char Dham',
  'South Divya Desam',
  'Regional Teerth',
];

export default function App() {
  const [circuits, setCircuits] = useState<CircuitSummary[]>([]);
  const [metrics, setMetrics] = useState<CircuitsMetrics>({
    liveWindowsOpen: 0,
    preBookingWindows: 0,
    totalSlotsRemaining: 0,
    activeTrainCorridors: 0,
    confirmedPassesCount: 0,
  });
  const [loadingCircuits, setLoadingCircuits] = useState(true);
  const [circuitsError, setCircuitsError] = useState('');

  const [windowFilter, setWindowFilter] = useState<WindowFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'All' | CircuitCategory>('All');

  const [selectedCircuitId, setSelectedCircuitId] = useState<string | null>(null);
  const [selectedCircuitDetail, setSelectedCircuitDetail] =
    useState<CircuitDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);

  const [sseConnected, setSseConnected] = useState(false);
  const [latestLiveEvent, setLatestLiveEvent] = useState<LiveFeedEvent | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);

  const fetchCircuits = useCallback(async () => {
    try {
      const res = await fetch('/api/circuits');
      if (!res.ok) throw new Error('Failed to load pilgrimage circuits');
      const data = await res.json();
      setCircuits(data.circuits ?? []);
      if (data.metrics) setMetrics(data.metrics);
      setCircuitsError('');
    } catch {
      setCircuitsError('Unable to load live pilgrimage windows right now.');
    } finally {
      setLoadingCircuits(false);
    }
  }, []);

  const fetchRecentBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings');
      if (!res.ok) return;
      const data = await res.json();
      const list: BookingRecord[] = data.bookings ?? [];
      setBookings(list);
      setActiveBooking((prev) => {
        if (!prev) return list[0] ?? null;
        return list.find((b) => b.pnr === prev.pnr) ?? list[0] ?? null;
      });
    } catch {
      // Silent retry on next action
    }
  }, []);

  useEffect(() => {
    fetchCircuits();
    fetchRecentBookings();
  }, [fetchCircuits, fetchRecentBookings]);

  // Real-time Server-Sent Events subscription
  useEffect(() => {
    const source = new EventSource('/api/live-stream');

    source.onopen = () => {
      setSseConnected(true);
    };

    source.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data) as LiveFeedEvent;
        if (parsed.type !== 'HEARTBEAT') {
          setLatestLiveEvent(parsed);
          fetchCircuits();
          fetchRecentBookings();
        }
      } catch {
        // Ignore malformed frame
      }
    };

    source.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      source.close();
    };
  }, [fetchCircuits, fetchRecentBookings]);

  const handleSelectCircuit = async (circuit: CircuitSummary) => {
    setSelectedCircuitId(circuit.id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/circuits/${encodeURIComponent(circuit.id)}`);
      if (!res.ok) throw new Error('Failed to load circuit details');
      const detail = (await res.json()) as CircuitDetail;
      setSelectedCircuitDetail(detail);
      setTimeout(() => {
        document
          .getElementById('yatra-configurator')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } catch {
      setCircuitsError('Could not open circuit configurator.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePlanYatraClick = () => {
    const defaultTarget =
      circuits.find((c) => c.booking_status === 'LIVE_NOW') ?? circuits[0];
    if (defaultTarget) {
      handleSelectCircuit(defaultTarget);
    } else {
      document
        .getElementById('live-windows')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBookingSuccess = (booking: BookingRecord) => {
    setSelectedCircuitDetail(null);
    setSelectedCircuitId(null);
    setActiveBooking(booking);
    setBookings((prev) => [booking, ...prev.filter((b) => b.pnr !== booking.pnr)]);
    fetchCircuits();
    setTimeout(() => {
      document
        .getElementById('my-yatra-pass')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleSearchBooking = async (query: string) => {
    const res = await fetch(`/api/bookings?q=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const data = await res.json();
    const matches: BookingRecord[] = data.bookings ?? [];
    if (matches.length > 0) {
      setActiveBooking(matches[0]);
      setBookings((prev) => {
        const merged = [...matches];
        for (const old of prev) {
          if (!merged.some((m) => m.pnr === old.pnr)) merged.push(old);
        }
        return merged;
      });
    } else {
      setActiveBooking(null);
    }
  };

  const handleRefreshBooking = (updated: BookingRecord) => {
    setActiveBooking(updated);
    setBookings((prev) =>
      prev.map((b) => (b.pnr === updated.pnr ? updated : b))
    );
  };

  const filteredCircuits = useMemo(() => {
    return circuits.filter((c) => {
      if (
        windowFilter === 'LIVE' &&
        c.booking_status !== 'LIVE_NOW' &&
        c.booking_status !== 'FILLING_FAST'
      ) {
        return false;
      }
      if (windowFilter === 'PRE_BOOKING' && c.booking_status !== 'PRE_BOOKING') {
        return false;
      }
      if (categoryFilter !== 'All' && c.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [circuits, windowFilter, categoryFilter]);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#241914]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-[#E6D7C3] bg-[#FAF6EE]/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-4 py-4 sm:px-6">
          <a
            href="#top"
            className="font-display text-2xl font-bold tracking-tight text-[#6B1D1D] whitespace-nowrap shrink-0"
          >
            TeerthSutra
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#685649]"
          >
            <a
              href="#live-windows"
              className="hover:text-[#6B1D1D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Live Windows
            </a>
            <a
              href="#sacred-circuits"
              className="hover:text-[#6B1D1D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sacred Circuits
            </a>
            <a
              href="#trains-stays"
              className="hover:text-[#6B1D1D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Trains &amp; Stays
            </a>
            <a
              href="#my-yatra-pass"
              className="hover:text-[#6B1D1D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              My Yatra Pass
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handlePlanYatraClick}
              className="rounded-md bg-[#D95D16] px-4 py-2 text-sm font-semibold text-[#FFFDF9] transition-colors duration-150 hover:bg-[#B84A0D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1D1D] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Plan Yatra
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Asymmetric Editorial Hero Split */}
        <section className="mx-auto max-w-[1200px] px-4 pt-8 pb-8 sm:px-6 lg:pt-12">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="flex flex-col justify-between rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-7 sm:p-10 lg:col-span-6 sacred-top-rule">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B1D1D]">
                  <span>Hindu Pilgrimage &amp; Sacred Circuit Desk</span>
                  <span aria-hidden="true">·</span>
                  <span>Seva to Rajasi VIP</span>
                </div>

                <h1 className="mt-4 font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-[#241914] text-balance">
                  Sacred journeys, timed to the aarti bell.
                </h1>

                <p className="mt-4 max-w-xl text-base leading-relaxed text-[#685649]">
                  Reserve complete Ashtavinayak, Jyotirlinga, Char Dham, and regional temple pilgrimages in one place—pairing pure-veg stays, exact darshan slots, Indian Railways berths, personalized schedules, and automated e-tickets sent to your email.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-5 border-t border-[#E6D7C3] pt-6">
                <a
                  href="#live-windows"
                  className="inline-flex items-center gap-2 rounded-md bg-[#D95D16] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors hover:bg-[#B84A0D] whitespace-nowrap shrink-0"
                >
                  <span>Explore Live Windows</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>

                <a
                  href="#my-yatra-pass"
                  className="text-sm font-semibold text-[#6B1D1D] underline-offset-4 hover:underline whitespace-nowrap shrink-0"
                >
                  Check Existing PNR
                </a>
              </div>
            </div>

            <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-[#E6D7C3] bg-[#F3EBDD] lg:col-span-6">
              {!heroImgError ? (
                <img
                  src="/src/assets/images/hero_temple_sunrise_1795707382592.jpg"
                  alt="Sacred river ghat steps illuminated by morning aarti diyas and marigold garlands at sunrise"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="h-full w-full object-cover lg:h-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F3EBDD] to-[#E6D7C3] p-8 text-center">
                  <span className="font-display text-3xl font-bold text-[#6B1D1D]">
                    TeerthSutra Sacred Circuits
                  </span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-2 text-[#FFFDF9]">
                <div>
                  <div className="text-xs text-[#F5CFA0]">Active Sacred Calendar</div>
                  <div className="font-display text-xl font-bold">
                    Ashtavinayak, Kashi &amp; Tirumala Windows Live Now
                  </div>
                </div>
                <span className="font-mono-data text-xs text-[#F7E8D6]">
                  2026–2027 Season
                </span>
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Live Booking Ledger Strip */}
          <div className="mt-6 rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="border-r border-[#E6D7C3]/70 pr-3">
                <div className="text-xs text-[#685649]">Booking Live Now</div>
                <div className="mt-1 font-mono-data text-2xl font-semibold text-[#1E6B47]">
                  {metrics.liveWindowsOpen} Circuits
                </div>
              </div>
              <div className="md:border-r md:border-[#E6D7C3]/70 md:pr-3">
                <div className="text-xs text-[#685649]">Pre-Booking Open</div>
                <div className="mt-1 font-mono-data text-2xl font-semibold text-[#B87D14]">
                  {metrics.preBookingWindows} Upcoming
                </div>
              </div>
              <div className="border-r border-[#E6D7C3]/70 pr-3">
                <div className="text-xs text-[#685649]">Darshan Slots Remaining</div>
                <div className="mt-1 font-mono-data text-2xl font-semibold text-[#241914]">
                  {metrics.totalSlotsRemaining}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#685649]">Active Rail Corridors</div>
                <div className="mt-1 font-mono-data text-2xl font-semibold text-[#6B1D1D]">
                  {metrics.activeTrainCorridors} Express Routes
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E6D7C3] pt-3 text-xs text-[#685649]">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    sseConnected ? 'bg-[#1E6B47]' : 'bg-[#B87D14]'
                  }`}
                />
                <span className="font-medium text-[#241914]">
                  {sseConnected
                    ? 'Live Booking Stream Connected'
                    : 'Connecting to Live Desk'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {latestLiveEvent
                    ? latestLiveEvent.message
                    : `${metrics.confirmedPassesCount} verified yatra passes issued in SQLite`}
                </span>
              </div>
              <span className="font-mono-data">Automated Email E-Ticketing Active</span>
            </div>
          </div>
        </section>

        {/* Live Windows & Sacred Circuits Directory */}
        <section
          id="live-windows"
          className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6"
        >
          <div id="sacred-circuits" className="flex flex-col justify-between gap-5 border-b border-[#E6D7C3] pb-6 lg:flex-row lg:items-end">
            <div>
              <div className="text-xs font-semibold text-[#6B1D1D]">
                Live Departures &amp; Advance Priority Quotas
              </div>
              <h2 className="mt-1 font-display text-3xl font-bold text-[#241914] sm:text-4xl">
                Circuits Open for Booking &amp; Pre-Booking
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                role="tablist"
                aria-label="Booking Window Status"
                className="flex items-center gap-1 rounded-lg border border-[#E6D7C3] bg-[#F3EBDD] p-1"
              >
                {[
                  { id: 'ALL' as const, label: 'All Windows' },
                  { id: 'LIVE' as const, label: 'Booking Live Now' },
                  { id: 'PRE_BOOKING' as const, label: 'Pre-Booking Open' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={windowFilter === tab.id}
                    onClick={() => setWindowFilter(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      windowFilter === tab.id
                        ? 'bg-[#FFFDF9] text-[#6B1D1D] shadow-xs'
                        : 'text-[#685649] hover:text-[#241914]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Regional / Deity Category Filter */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'border-[#6B1D1D] bg-[#6B1D1D] text-[#FFFDF9]'
                    : 'border-[#E6D7C3] bg-[#FFFDF9] text-[#685649] hover:border-[#C28A1A] hover:text-[#241914]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {circuitsError && (
            <div className="mt-6 rounded-md border border-[#6B1D1D] bg-[#6B1D1D]/10 p-4 text-sm text-[#6B1D1D]">
              {circuitsError}
            </div>
          )}

          {loadingCircuits ? (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-96 rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-5 animate-pulse"
                />
              ))}
            </div>
          ) : filteredCircuits.length === 0 ? (
            <div className="mt-8 rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-10 text-center">
              <p className="font-display text-2xl font-bold text-[#241914]">
                No circuits match this filter
              </p>
              <button
                type="button"
                onClick={() => {
                  setWindowFilter('ALL');
                  setCategoryFilter('All');
                }}
                className="mt-4 rounded-md bg-[#D95D16] px-4 py-2 text-sm font-semibold text-[#FFFDF9] cursor-pointer"
              >
                Show All Pilgrimage Windows
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredCircuits.map((circuit) => (
                <CircuitCard
                  key={circuit.id}
                  circuit={circuit}
                  isSelected={selectedCircuitId === circuit.id}
                  onSelect={handleSelectCircuit}
                />
              ))}
            </div>
          )}
        </section>

        {/* Interactive 4-Step Pilgrimage Configurator (opens when a circuit is selected) */}
        {loadingDetail && (
          <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 text-sm font-medium text-[#6B1D1D]">
            Loading darshan quotas, train berths, and Bhakta Niwas availability...
          </div>
        )}

        {selectedCircuitDetail && !loadingDetail && (
          <YatraConfigurator
            circuitDetail={selectedCircuitDetail}
            onClose={() => {
              setSelectedCircuitDetail(null);
              setSelectedCircuitId(null);
            }}
            onBookingSuccess={handleBookingSuccess}
          />
        )}

        {/* Trains, Stays & Tier Comparison Matrix */}
        <section
          id="trains-stays"
          className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6"
        >
          <div className="rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#E6D7C3] pb-5 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#6B1D1D]">
                  <Train className="h-4 w-4" aria-hidden="true" />
                  <span>Multimodal Rail Integration &amp; Tiered Sanctum Access</span>
                </div>
                <h2 className="mt-1 font-display text-3xl font-bold text-[#241914]">
                  From Humble Seva to Royal Rajasi Comfort
                </h2>
              </div>
              <p className="max-w-md text-sm text-[#685649]">
                Every budget receives confirmed darshan timings, pure-veg satvik meals, and automated rail/temple alerts by email.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  tier: 'Seva Economy',
                  price: 'From ₹3,450',
                  rail: 'Sleeper (SL) / Reserved Sitting (2S)',
                  stay: 'Clean Temple Trust Bhakta Niwas (120m from gate)',
                  darshan: 'Pratah Kakad & Mukh Darshan Queue Token',
                },
                {
                  tier: 'Parivar Comfort',
                  price: 'From ₹6,900',
                  rail: 'AC 3-Tier (3A) / Vande Bharat Chair Car',
                  stay: '3-Star Pure-Veg Family Heritage Stay + Thali',
                  darshan: 'Mangala Sugam Pass & Senior Gate Assistance',
                },
                {
                  tier: 'Rajasi Royal VIP',
                  price: 'From ₹15,800',
                  rail: 'First AC Cabin (1A) / Executive Chair (EC)',
                  stay: '5-Star Spiritual Sanctuary Suite + Private Cart',
                  darshan: 'VIP Garbha Griha Darshan & Purohit Sankalp Abhishek',
                },
              ].map((row) => (
                <div
                  key={row.tier}
                  className="flex flex-col justify-between rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-5"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-2xl font-bold text-[#6B1D1D]">
                        {row.tier}
                      </h3>
                      <span className="font-mono-data text-sm font-semibold text-[#241914]">
                        {row.price}
                      </span>
                    </div>
                    <dl className="mt-4 space-y-2.5 text-xs text-[#685649]">
                      <div>
                        <dt className="font-semibold text-[#241914]">Indian Railways</dt>
                        <dd>{row.rail}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[#241914]">Sacred Stay</dt>
                        <dd>{row.stay}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-[#241914]">Darshan Access</dt>
                        <dd>{row.darshan}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* My Yatra Pass & Real-Time Email Ticketing Desk */}
        <YatraPassDesk
          bookings={bookings}
          activeBooking={activeBooking}
          onSelectBooking={setActiveBooking}
          onSearchBooking={handleSearchBooking}
          onRefreshBooking={handleRefreshBooking}
        />
      </main>

      <footer className="border-t border-[#E6D7C3] bg-[#F3EBDD]">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-4 px-4 py-8 text-xs text-[#685649] sm:flex-row sm:items-center sm:px-6">
          <div>
            <span className="font-display text-lg font-bold text-[#6B1D1D]">
              TeerthSutra
            </span>
            <span className="ml-3">
              Sacred Hindu Pilgrimage Circuits · SQLite Reservation Ledger · Automated E-Ticketing
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#live-windows" className="hover:text-[#241914]">
              Live Windows
            </a>
            <a href="#trains-stays" className="hover:text-[#241914]">
              Rail &amp; Stays
            </a>
            <a href="#my-yatra-pass" className="hover:text-[#241914]">
              PNR Lookup
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
