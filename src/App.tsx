import {
  ArrowRight,
  BookOpen,
  Compass,
  HeartHandshake,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthPage, type AuthUser } from './components/AuthPage';
import { CircuitCard } from './components/CircuitCard';
import { PilgrimPlanner } from './components/PilgrimPlanner';
import { TempleGuideHub } from './components/TempleGuideHub';
import { YatraCompanion } from './components/YatraCompanion';
import { YatraConfigurator } from './components/YatraConfigurator';
import { YatraPassDesk } from './components/YatraPassDesk';
import type {
  BookingRecord,
  CircuitCategory,
  CircuitDetail,
  CircuitSummary,
  LiveFeedEvent,
  PilgrimCareMode,
  TempleDirectoryEntry,
} from './types/pilgrimage';

type ActivePage = 'HOME' | 'PLANNER' | 'GUIDE' | 'TICKETS' | 'AUTH';
type WindowFilter = 'ALL' | 'LIVE' | 'PRE_BOOKING';

const CATEGORIES: ('All' | CircuitCategory)[] = [
  'All',
  'Ashtavinayak',
  'Jyotirlinga',
  'Char Dham',
  'Buddhist Circuit',
  'South Divya Desam',
  'Regional Teerth',
];

const POPULAR_DESTINATIONS: {
  label: string;
  sublabel: string;
  description: string;
  image: string;
  circuitId: string;
  templeId: string;
  searchKeyword: string;
}[] = [
  {
    label: 'Jagannath Puri',
    sublabel: 'Puri, Odisha',
    description: 'Famous for Shree Jagannath Temple, one of the four Char Dham pilgrimage sites, sacred Mahaprasad & Rath Yatra.',
    image: '/src/assets/images/jagannath_puri_1795712131738.jpg',
    circuitId: 'jagannath-puri-konark-odisha',
    templeId: 'jagannath-puri-odisha',
    searchKeyword: 'Jagannath',
  },
  {
    label: 'Tirupati Balaji',
    sublabel: 'Tirumala, Andhra Pradesh',
    description: 'Sri Venkateswara Swamy Temple atop Tirumala hills, one of India’s most sacred Vaishnava shrines.',
    image: '/src/assets/images/tirupati_balaji_1795712131516.jpg',
    circuitId: 'tirupati-kanchi-divya-desam',
    templeId: 'tirumala-venkateswara',
    searchKeyword: 'Tirumala',
  },
  {
    label: 'Ayodhya Ram Mandir',
    sublabel: 'Ayodhya, Uttar Pradesh',
    description: 'Sacred birthplace of Lord Shri Rama along the Sarayu river with Ram Lalla, Hanuman Garhi & Dashrath Mahal.',
    image: '/src/assets/images/ayodhya_ram_mandir_1795712703190.jpg',
    circuitId: 'ram-mandir-ayodhya',
    templeId: 'ram-mandir-ayodhya',
    searchKeyword: 'Ayodhya',
  },
  {
    label: 'Dwarka',
    sublabel: 'Devbhumi Dwarka, Gujarat',
    description: 'Known as the Kingdom of Lord Krishna, Western Char Dham on the Gomti river, Bet Dwarka & Somnath.',
    image: '/src/assets/images/dwarka_temple_1795712703669.jpg',
    circuitId: 'dwarka-somnath-gujarat',
    templeId: 'dwarkadhish-dwarka',
    searchKeyword: 'Dwarka',
  },
  {
    label: 'Shirdi Sai Baba',
    sublabel: 'Shirdi, Maharashtra',
    description: 'Peaceful Samadhi Mandir & Dwarkamai with step-free Gate 6 senior care and Vande Bharat rail access.',
    image: '/src/assets/images/shirdi_saibaba_1795712133273.jpg',
    circuitId: 'shirdi-shani-teerth',
    templeId: 'shirdi-sai-baba',
    searchKeyword: 'Shirdi',
  },
  {
    label: 'Kashi Vishwanath',
    sublabel: 'Varanasi & Prayagraj, UP',
    description: 'Ancient Jyotirlinga on the Ganga ghats with Ganga Dwar lifts, Dashashwamedh Aarti & Triveni Sangam.',
    image: '/src/assets/images/circuit_jyotirlinga_kashi_1795707383684.jpg',
    circuitId: 'kashi-prayagraj-ayodhya',
    templeId: 'kashi-vishwanath',
    searchKeyword: 'Kashi',
  },
  {
    label: 'Kedarnath Dham',
    sublabel: 'Garhwal, Uttarakhand',
    description: 'Highest Himalayan Jyotirlinga & Badrinath Do-Dham with helicopter/palki options and early registration.',
    image: '/src/assets/images/circuit_chardham_himalaya_1795707384622.jpg',
    circuitId: 'kedarnath-badrinath-dodham',
    templeId: 'kedarnath-dham',
    searchKeyword: 'Kedarnath',
  },
  {
    label: 'Ujjain Mahakal',
    sublabel: 'Ujjain, Madhya Pradesh',
    description: 'Dakshinamurti Mahakaleshwar Bhasma Aarti, illuminated Mahakal Lok corridor & Omkareshwar island.',
    image: '/src/assets/images/ujjain_mahakal_1795712133305.jpg',
    circuitId: 'ujjain-mahakal-omkareshwar',
    templeId: 'mahakaleshwar-ujjain',
    searchKeyword: 'Ujjain',
  },
];

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('HOME');

  // Auth state kept strictly in React memory (Bearer token, never localStorage)
  const [authToken, setAuthToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [circuits, setCircuits] = useState<CircuitSummary[]>([]);
  const [temples, setTemples] = useState<TempleDirectoryEntry[]>([]);
  const [loadingCircuits, setLoadingCircuits] = useState(true);
  const [circuitsError, setCircuitsError] = useState('');

  const [careMode, setCareMode] = useState<PilgrimCareMode>('ELDERLY_CARE');
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'All' | CircuitCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTempleForGuide, setSelectedTempleForGuide] = useState<string>('');

  const [selectedCircuitId, setSelectedCircuitId] = useState<string | null>(null);
  const [selectedCircuitDetail, setSelectedCircuitDetail] =
    useState<CircuitDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null);

  const [companionPresetTemple, setCompanionPresetTemple] = useState<string>('');
  const [companionPresetQuestion, setCompanionPresetQuestion] = useState<string>('');

  const [heroImgError, setHeroImgError] = useState(false);

  const fetchCircuits = useCallback(async () => {
    try {
      const res = await fetch('/api/circuits');
      if (!res.ok) throw new Error('Failed to load pilgrimage packages');
      const data = await res.json();
      setCircuits(data.circuits ?? []);
      setCircuitsError('');
    } catch {
      setCircuitsError('Could not load pilgrimage packages right now.');
    } finally {
      setLoadingCircuits(false);
    }
  }, []);

  const fetchTemples = useCallback(async () => {
    try {
      const res = await fetch('/api/temples');
      if (!res.ok) return;
      const data = await res.json();
      setTemples(data.temples ?? []);
    } catch {
      // Non-blocking retry
    }
  }, []);

  const fetchRecentBookings = useCallback(async (tokenOverride?: string) => {
    try {
      const tokenToUse = tokenOverride ?? authToken;
      const headers: Record<string, string> = {};
      if (tokenToUse) {
        headers.Authorization = `Bearer ${tokenToUse}`;
      }
      const res = await fetch('/api/bookings', { headers });
      if (!res.ok) return;
      const data = await res.json();
      const list: BookingRecord[] = data.bookings ?? [];
      setBookings(list);
      setActiveBooking((prev) => {
        if (!prev) return list[0] ?? null;
        return list.find((b) => b.pnr === prev.pnr) ?? list[0] ?? null;
      });
    } catch {
      // Silent retry
    }
  }, [authToken]);

  useEffect(() => {
    fetchCircuits();
    fetchTemples();
    fetchRecentBookings();
  }, [fetchCircuits, fetchTemples, fetchRecentBookings]);

  // Real-time seat count refresh
  useEffect(() => {
    const source = new EventSource('/api/live-stream');
    source.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data) as LiveFeedEvent;
        if (parsed.type !== 'HEARTBEAT') {
          fetchCircuits();
          fetchRecentBookings();
        }
      } catch {
        // Ignore malformed frame
      }
    };
    return () => {
      source.close();
    };
  }, [fetchCircuits, fetchRecentBookings]);

  const navigateTo = (page: ActivePage) => {
    setActivePage(page);
    if (page !== 'HOME') {
      setSelectedCircuitDetail(null);
      setSelectedCircuitId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (token: string, user: AuthUser) => {
    setAuthToken(token);
    setCurrentUser(user);
    setCareMode(user.care_mode);
    fetchRecentBookings(token);
    navigateTo('HOME');
  };

  const handleSignOut = () => {
    setAuthToken('');
    setCurrentUser(null);
    fetchRecentBookings('');
    navigateTo('HOME');
  };

  const handleSelectCircuit = async (circuit: CircuitSummary) => {
    setSelectedCircuitId(circuit.id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/circuits/${encodeURIComponent(circuit.id)}`);
      if (!res.ok) throw new Error('Failed to load package details');
      const detail = (await res.json()) as CircuitDetail;
      setSelectedCircuitDetail(detail);
      setActivePage('HOME');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setCircuitsError('Could not open booking screen.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenCircuitById = (circuitId: string) => {
    const found = circuits.find((c) => c.id === circuitId) ?? circuits[0];
    if (found) {
      handleSelectCircuit(found);
    }
  };

  const handleBookingSuccess = (booking: BookingRecord) => {
    setSelectedCircuitDetail(null);
    setSelectedCircuitId(null);
    setActiveBooking(booking);
    setBookings((prev) => [booking, ...prev.filter((b) => b.pnr !== booking.pnr)]);
    fetchCircuits();
    navigateTo('TICKETS');
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

  const handleAskCompanion = (templeId: string, defaultQuestion: string) => {
    setCompanionPresetTemple(templeId);
    setCompanionPresetQuestion(defaultQuestion);
    setTimeout(() => {
      document
        .getElementById('yatra-companion')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleOpenDestination = (dest: (typeof POPULAR_DESTINATIONS)[number]) => {
    setCategoryFilter('All');
    setWindowFilter('ALL');
    setSearchQuery(dest.searchKeyword);
    setSelectedTempleForGuide(dest.templeId);
    const matching = circuits.find((c) => c.id === dest.circuitId);
    if (matching) {
      handleSelectCircuit(matching);
    } else {
      document
        .getElementById('packages-list')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredCircuits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
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
      if (q.length > 0) {
        const hay = `${c.title} ${c.region} ${c.deity} ${c.category} ${c.temples.map((t) => `${t.name} ${t.town} ${t.deity}`).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [circuits, windowFilter, categoryFilter, searchQuery]);

  const firstName = currentUser?.full_name.split(' ')[0] ?? '';

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF6EE] text-[#241914]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-[#E6D7C3] bg-[#FAF6EE]/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-8 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => {
              setSelectedCircuitDetail(null);
              setSelectedCircuitId(null);
              navigateTo('HOME');
            }}
            className="font-display text-2xl font-bold tracking-tight text-[#6B1D1D] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Yatriguide
          </button>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#685649]"
          >
            {[
              { id: 'HOME' as const, label: 'Home & Packages' },
              { id: 'PLANNER' as const, label: 'Plan My Trip' },
              { id: 'GUIDE' as const, label: 'Temple Guide' },
              { id: 'TICKETS' as const, label: 'My Tickets' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedCircuitDetail(null);
                  setSelectedCircuitId(null);
                  navigateTo(item.id);
                }}
                className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activePage === item.id
                    ? 'font-semibold text-[#6B1D1D] underline underline-offset-8 decoration-2 decoration-[#D95D16]'
                    : 'hover:text-[#6B1D1D]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('AUTH')}
              className="rounded-md bg-[#D95D16] px-4 py-2 text-sm font-semibold text-[#FFFDF9] transition-colors duration-150 hover:bg-[#B84A0D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1D1D] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {currentUser ? `Namaste, ${firstName}` : 'Sign In'}
            </button>
          </div>
        </div>

        {/* Mobile screens use fixed Android-style bottom navigation bar below */}
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        {activePage === 'AUTH' && (
          <AuthPage
            currentUser={currentUser}
            onAuthSuccess={handleAuthSuccess}
            onSignOut={handleSignOut}
            onBackHome={() => navigateTo('HOME')}
            onGoToTickets={() => navigateTo('TICKETS')}
          />
        )}

        {activePage === 'PLANNER' && (
          <PilgrimPlanner
            careMode={careMode}
            onCareModeChange={setCareMode}
            onOpenCircuitById={handleOpenCircuitById}
          />
        )}

        {activePage === 'GUIDE' && (
          <>
            <TempleGuideHub
              temples={temples}
              careMode={careMode}
              initialTempleId={selectedTempleForGuide}
              onAskCompanion={handleAskCompanion}
            />
            <YatraCompanion
              temples={temples}
              careMode={careMode}
              presetTempleId={companionPresetTemple}
              presetQuestion={companionPresetQuestion}
            />
          </>
        )}

        {activePage === 'TICKETS' && (
          <YatraPassDesk
            bookings={bookings}
            activeBooking={activeBooking}
            onSelectBooking={setActiveBooking}
            onSearchBooking={handleSearchBooking}
            onRefreshBooking={handleRefreshBooking}
          />
        )}

        {activePage === 'HOME' && selectedCircuitDetail && (
          <YatraConfigurator
            circuitDetail={selectedCircuitDetail}
            currentUser={currentUser}
            authToken={authToken}
            onClose={() => {
              setSelectedCircuitDetail(null);
              setSelectedCircuitId(null);
            }}
            onBookingSuccess={handleBookingSuccess}
            onOpenTempleGuide={(circuitId) => {
              const match = POPULAR_DESTINATIONS.find((d) => d.circuitId === circuitId);
              if (match) setSelectedTempleForGuide(match.templeId);
              navigateTo('GUIDE');
            }}
          />
        )}

        {activePage === 'HOME' && !selectedCircuitDetail && (
          <>
            {/* Signature Curved Orange-Red YatriGuide Banner (Inspired by Figma Android Compact 4) */}
            <section className="mx-auto max-w-[1160px] px-0 sm:px-6 sm:pt-5">
              <div className="rounded-b-3xl sm:rounded-3xl bg-gradient-to-r from-[#FF5722] via-[#F4511E] to-[#D84315] px-5 py-7 text-white shadow-sm sm:px-9 sm:py-9">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                  <div className="max-w-xl">
                    <h1 className="font-display text-[clamp(2rem,3.6vw,3.1rem)] font-bold leading-[1.1] tracking-tight text-white">
                      Namaste! Where would you like to go?
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-white/90 sm:text-base">
                      Explore Jagannath Puri, Tirupati Balaji, Ayodhya Ram Mandir, Dwarka, Shirdi, Kashi &amp; more with verified darshan, train berths, and senior care.
                    </p>

                    {/* Rounded Pill White Search Bar mirroring Figma Home */}
                    <div className="relative mt-5 max-w-lg">
                      <Search
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D84315]"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="SEARCH Jagannath Puri, Tirupati Balaji, Ayodhya, Dwarka..."
                        aria-label="Search pilgrimage destination"
                        className="w-full rounded-full bg-white py-3.5 pl-11 pr-10 text-sm font-medium text-[#241914] shadow-sm placeholder:text-[#9A897C] focus:outline-none"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#685649] hover:text-[#241914] cursor-pointer"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Featured Visual Shrine Showcase */}
                  <div className="relative h-52 w-full overflow-hidden rounded-2xl border-2 border-white/30 bg-[#F3EBDD] shadow-md lg:h-60 lg:w-[430px] shrink-0">
                    {!heroImgError ? (
                      <img
                        src="/src/assets/images/tirupati_balaji_1795712131516.jpg"
                        alt="Tirupati Balaji Sri Venkateswara Temple and Golden Gopuram"
                        referrerPolicy="no-referrer"
                        onError={() => setHeroImgError(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-6 text-center font-display text-2xl font-bold text-[#6B1D1D]">
                        YatriGuide Sacred Journeys
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <div className="font-display text-lg font-bold">
                        Tirupati Balaji · Jagannath Puri · Ayodhya
                      </div>
                      <div className="text-xs text-[#F5CFA0]">
                        Darshan Slots · Indian Railways · Pure-Veg Stays
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-[1160px] px-4 pt-6 sm:px-6">
              {/* 4 Quick-Start Action Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => navigateTo('PLANNER')}
                  className="flex items-center gap-3 rounded-2xl border border-[#E6D7C3] bg-white p-3.5 text-left shadow-xs transition-colors hover:border-[#FF5722] cursor-pointer"
                >
                  <Compass className="h-5 w-5 shrink-0 text-[#FF5722]" aria-hidden="true" />
                  <div>
                    <div className="text-xs font-bold text-[#241914] sm:text-sm">Plan My Trip</div>
                    <div className="text-[11px] text-[#685649]">Custom dates &amp; budget</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('GUIDE')}
                  className="flex items-center gap-3 rounded-2xl border border-[#E6D7C3] bg-white p-3.5 text-left shadow-xs transition-colors hover:border-[#FF5722] cursor-pointer"
                >
                  <MapPin className="h-5 w-5 shrink-0 text-[#6B1D1D]" aria-hidden="true" />
                  <div>
                    <div className="text-xs font-bold text-[#241914] sm:text-sm">Temple Timings</div>
                    <div className="text-[11px] text-[#685649]">Aarti, dress code &amp; crowd</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCareMode('ELDERLY_CARE');
                    navigateTo('PLANNER');
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-[#E6D7C3] bg-white p-3.5 text-left shadow-xs transition-colors hover:border-[#FF5722] cursor-pointer"
                >
                  <HeartHandshake className="h-5 w-5 shrink-0 text-[#1E6B47]" aria-hidden="true" />
                  <div>
                    <div className="text-xs font-bold text-[#241914] sm:text-sm">Senior Care</div>
                    <div className="text-[11px] text-[#685649]">Ramps, lifts &amp; wheelchairs</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo('TICKETS')}
                  className="flex items-center gap-3 rounded-2xl border border-[#E6D7C3] bg-white p-3.5 text-left shadow-xs transition-colors hover:border-[#FF5722] cursor-pointer"
                >
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#B87D14]" aria-hidden="true" />
                  <div>
                    <div className="text-xs font-bold text-[#241914] sm:text-sm">My Tickets</div>
                    <div className="text-[11px] text-[#685649]">Booking pass &amp; email</div>
                  </div>
                </button>
              </div>

              {/* Popular Recommended List Cards (Directly inspired by Figma Android Compact 4) */}
              <div className="mt-7">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#241914] sm:text-3xl">
                      Popular Recommended
                    </h2>
                    <p className="mt-0.5 text-xs text-[#685649]">
                      Tap any sacred destination to book darshan, stay &amp; train—or view temple rules.
                    </p>
                  </div>
                  <a
                    href="#packages-list"
                    className="text-xs font-bold text-[#D84315] hover:underline whitespace-nowrap"
                  >
                    See All Packages →
                  </a>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {POPULAR_DESTINATIONS.map((dest) => (
                    <div
                      key={dest.label}
                      className="group flex items-center gap-4 rounded-2xl border border-[#E6D7C3] bg-white p-3.5 shadow-xs transition-all hover:border-[#FF5722] hover:shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenDestination(dest)}
                        className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-[#F3EBDD] cursor-pointer sm:h-28 sm:w-36"
                      >
                        <img
                          src={dest.image}
                          alt={`${dest.label} — ${dest.sublabel}`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDestination(dest)}
                          className="text-left cursor-pointer"
                        >
                          <div className="font-display text-lg font-bold leading-snug text-[#241914] group-hover:text-[#D84315]">
                            {dest.label}{' '}
                            <span className="font-sans text-xs font-medium text-[#685649]">
                              ({dest.sublabel})
                            </span>
                          </div>
                        </button>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#685649]">
                          {dest.description}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDestination(dest)}
                            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF5722] to-[#D84315] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 cursor-pointer"
                          >
                            <span>Explore Now</span>
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTempleForGuide(dest.templeId);
                              navigateTo('GUIDE');
                            }}
                            className="text-xs font-semibold text-[#6B1D1D] hover:underline cursor-pointer"
                          >
                            Darshan Timings &amp; Rules
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Clean Packages List */}
            <section
              id="packages-list"
              className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6"
            >
              <div className="flex flex-col justify-between gap-4 border-b border-[#E6D7C3] pb-5 lg:flex-row lg:items-end">
                <div>
                  <h2 className="font-display text-3xl font-bold text-[#241914]">
                    Pilgrimage Packages Open Now
                  </h2>
                  <p className="mt-1 text-sm text-[#685649]">
                    Choose a trip below to pick your comfort level, darshan timing, train seat, and stay.
                  </p>
                </div>

                <div
                  role="tablist"
                  aria-label="Filter Packages"
                  className="flex items-center gap-1 rounded-lg border border-[#E6D7C3] bg-[#F3EBDD] p-1"
                >
                  {[
                    { id: 'ALL' as const, label: 'All Trips' },
                    { id: 'LIVE' as const, label: 'Open Now' },
                    { id: 'PRE_BOOKING' as const, label: 'Early Pre-Booking' },
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

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="ml-auto inline-flex items-center gap-1 rounded-md border border-[#D95D16] bg-[#FAF6EE] px-3 py-1.5 text-xs font-semibold text-[#6B1D1D] cursor-pointer"
                  >
                    <span>Showing: &ldquo;{searchQuery}&rdquo;</span>
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {circuitsError && (
                <div className="mt-6 rounded-md border border-[#6B1D1D] bg-[#6B1D1D]/10 p-4 text-sm text-[#6B1D1D]">
                  {circuitsError}
                </div>
              )}

              {loadingDetail && (
                <div className="mt-6 rounded-md border border-[#E6D7C3] bg-[#FFFDF9] p-4 text-sm font-medium text-[#6B1D1D]">
                  Opening package options...
                </div>
              )}

              {loadingCircuits ? (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-96 rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-5 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredCircuits.length === 0 ? (
                <div className="mt-6 rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-8 text-center">
                  <p className="text-sm font-semibold text-[#241914]">
                    No pilgrimage packages matched &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('All');
                      setWindowFilter('ALL');
                    }}
                    className="mt-3 rounded-md bg-[#D95D16] px-4 py-2 text-xs font-semibold text-[#FFFDF9] cursor-pointer"
                  >
                    Show All Sacred Packages
                  </button>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          </>
        )}
      </main>

      {/* Mobile Android-Style Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-30 flex md:hidden items-center justify-around border-t border-[#E6D7C3] bg-[#FFFDF9]/98 py-1.5 shadow-sm"
      >
        {[
          { id: 'HOME' as const, label: 'Explore', icon: Home },
          { id: 'PLANNER' as const, label: 'Plan', icon: Compass },
          { id: 'GUIDE' as const, label: 'Temples', icon: BookOpen },
          { id: 'TICKETS' as const, label: 'Tickets', icon: Ticket },
          { id: 'AUTH' as const, label: currentUser ? 'Account' : 'Sign In', icon: User },
        ].map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedCircuitDetail(null);
                setSelectedCircuitId(null);
                navigateTo(item.id);
              }}
              className={`flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[11px] font-semibold cursor-pointer ${
                active ? 'text-[#D95D16]' : 'text-[#685649]'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <footer className="hidden md:block border-t border-[#E6D7C3] bg-[#F3EBDD]">
        <div className="mx-auto flex max-w-[1160px] flex-col justify-between gap-4 px-4 py-7 text-xs text-[#685649] sm:flex-row sm:items-center sm:px-6">
          <div>
            <span className="font-display text-lg font-bold text-[#6B1D1D]">
              Yatriguide
            </span>
            <span className="ml-3">
              Your Simple Companion for Every Sacred Journey
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => navigateTo('HOME')}
              className="hover:text-[#241914] cursor-pointer"
            >
              Packages
            </button>
            <button
              type="button"
              onClick={() => navigateTo('PLANNER')}
              className="hover:text-[#241914] cursor-pointer"
            >
              Plan Trip
            </button>
            <button
              type="button"
              onClick={() => navigateTo('GUIDE')}
              className="hover:text-[#241914] cursor-pointer"
            >
              Temple Guide
            </button>
            <button
              type="button"
              onClick={() => navigateTo('AUTH')}
              className="hover:text-[#241914] cursor-pointer"
            >
              {currentUser ? 'My Account' : 'Sign In / Sign Up'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
