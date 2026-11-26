import { Mail, Printer, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import type { BookingRecord } from '../types/pilgrimage';

interface YatraPassDeskProps {
  bookings: BookingRecord[];
  activeBooking: BookingRecord | null;
  onSelectBooking: (booking: BookingRecord) => void;
  onSearchBooking: (query: string) => Promise<void>;
  onRefreshBooking: (booking: BookingRecord) => void;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function YatraPassDesk({
  bookings,
  activeBooking,
  onSelectBooking,
  onSearchBooking,
  onRefreshBooking,
}: YatraPassDeskProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [viewEmail, setViewEmail] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setStatusNotice('');
    try {
      await onSearchBooking(searchQuery.trim());
    } finally {
      setSearching(false);
    }
  };

  const handleSyncAndEmail = async () => {
    if (!activeBooking) return;
    setSyncing(true);
    setStatusNotice('');
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(activeBooking.pnr)}/notify`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.booking) {
        onRefreshBooking(data.booking);
        setStatusNotice(
          `Real-time update & email confirmation sent to ${data.booking.pilgrim_email}`
        );
      } else {
        setStatusNotice(data.error || 'Could not trigger live update.');
      }
    } catch {
      setStatusNotice('Network error while syncing live status.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section
      id="my-yatra-pass"
      className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6"
    >
      <div className="flex flex-col justify-between gap-6 border-b border-[#E6D7C3] pb-6 md:flex-row md:items-end no-print">
        <div>
          <div className="text-xs font-semibold text-[#6B1D1D]">
            SQLite-Backed E-Ticket &amp; Real-Time Dispatch Desk
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-[#241914] sm:text-4xl">
            My Yatra Pass &amp; Live Alerts
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[#685649]">
            Retrieve any PNR or pilgrim email to view confirmed rail berths, darshan slot tokens, live status logs, and the automated HTML e-ticket dispatched to your inbox.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#685649]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PNR (e.g. TS-408219) or email"
              className="w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] py-2 pl-9 pr-3 text-sm text-[#241914] placeholder:text-[#9A897C] focus:border-[#D95D16] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-md bg-[#6B1D1D] px-4 py-2 text-sm font-semibold text-[#FFFDF9] hover:bg-[#531515] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {searching ? 'Checking...' : 'Find Pass'}
          </button>
        </form>
      </div>

      {/* Recent PNRs segmented switcher */}
      {bookings.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 no-print">
          <span className="text-xs font-semibold text-[#685649] mr-1">
            Saved Yatra Passes:
          </span>
          {bookings.slice(0, 6).map((bk) => {
            const active = activeBooking?.pnr === bk.pnr;
            return (
              <button
                key={bk.pnr}
                type="button"
                onClick={() => {
                  onSelectBooking(bk);
                  setViewEmail(false);
                  setStatusNotice('');
                }}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-[#D95D16] bg-[#FFFDF9] text-[#6B1D1D] font-semibold'
                    : 'border-[#E6D7C3] bg-[#F3EBDD] text-[#241914] hover:border-[#C28A1A]'
                }`}
              >
                <span className="font-mono-data">{bk.pnr}</span> · {bk.pilgrim_name}
              </button>
            );
          })}
        </div>
      )}

      {!activeBooking ? (
        <div className="mt-8 rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] p-10 text-center">
          <p className="font-display text-2xl font-bold text-[#241914]">
            No matching Yatra Pass found
          </p>
          <p className="mt-2 text-sm text-[#685649]">
            Select one of the live passes above or complete a new pilgrimage booking to generate an automated e-ticket.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-[#C28A1A] bg-[#FFFDF9] overflow-hidden">
          {/* Pass Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#6B1D1D] px-6 py-5 text-[#FFFDF9]">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#F5CFA0]">
                <span>
                  {activeBooking.booking_mode === 'PRE_BOOKING'
                    ? 'Priority Pre-Booking Pass'
                    : 'Confirmed Sacred Yatra E-Ticket'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-data font-semibold text-[#FFFDF9]">
                  PNR {activeBooking.pnr}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeBooking.tier} Tier</span>
              </div>
              <h3 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                {activeBooking.circuit_title}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                type="button"
                onClick={handleSyncAndEmail}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-md bg-[#D95D16] px-4 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#B84A0D] whitespace-nowrap cursor-pointer"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{syncing ? 'Syncing...' : 'Send Live Update Email'}</span>
              </button>

              {activeBooking.latest_email && (
                <button
                  type="button"
                  onClick={() => setViewEmail((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#F5CFA0]/40 bg-[#531515] px-4 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#431010] whitespace-nowrap cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{viewEmail ? 'View Yatra Pass' : 'Inspect Dispatched Email'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-md border border-[#F5CFA0]/40 bg-transparent px-3.5 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#531515] whitespace-nowrap cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Print Pass</span>
              </button>
            </div>
          </div>

          {statusNotice && (
            <div className="border-b border-[#E6D7C3] bg-[#EEF7F1] px-6 py-3 text-sm font-medium text-[#1E6B47] no-print">
              {statusNotice}
            </div>
          )}

          {viewEmail && activeBooking.latest_email ? (
            <div className="p-6 bg-[#FAF6EE]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#685649]">
                <div>
                  <span className="font-semibold text-[#241914]">To:</span>{' '}
                  {activeBooking.latest_email.recipient_email}{' '}
                  <span aria-hidden="true">·</span>{' '}
                  <span className="font-semibold text-[#241914]">Subject:</span>{' '}
                  {activeBooking.latest_email.subject}
                </div>
                <span className="font-mono-data text-[#1E6B47]">
                  {activeBooking.latest_email.delivery_mode === 'SMTP_SENT'
                    ? 'SMTP Delivered'
                    : 'Verified E-Ticket Dispatch'}
                </span>
              </div>
              <iframe
                title="Dispatched Confirmation Email"
                sandbox=""
                srcDoc={activeBooking.latest_email.html_body}
                className="h-[540px] w-full rounded-md border border-[#E6D7C3] bg-white"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Left Ticket Details */}
              <div className="p-6 lg:col-span-8 lg:border-r lg:border-[#E6D7C3]">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <div className="text-xs text-[#685649]">Primary Pilgrim</div>
                    <div className="mt-0.5 text-base font-bold text-[#241914]">
                      {activeBooking.pilgrim_name}
                    </div>
                    <div className="text-xs text-[#685649]">
                      {activeBooking.pilgrim_count}{' '}
                      {activeBooking.pilgrim_count === 1 ? 'Yatri' : 'Yatris'} ·{' '}
                      {activeBooking.pilgrim_email}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[#685649]">Departure &amp; Darshan</div>
                    <div className="mt-0.5 font-mono-data text-base font-bold text-[#241914]">
                      {activeBooking.travel_date}
                    </div>
                    <div className="text-xs text-[#6B1D1D] font-medium">
                      {activeBooking.darshan_slot_name} ({activeBooking.darshan_slot_time})
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-[#685649]">Total Dakshina Paid</div>
                    <div className="mt-0.5 font-mono-data text-lg font-bold text-[#6B1D1D]">
                      {formatInr(activeBooking.total_amount)}
                    </div>
                    <div className="text-xs text-[#1E6B47] font-medium">
                      {activeBooking.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#E6D7C3] pt-5 sm:grid-cols-2">
                  <div className="rounded-md border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                    <div className="text-xs font-semibold text-[#685649]">
                      Rail / Transit Allocation
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#241914]">
                      {activeBooking.train_number
                        ? `${activeBooking.train_number} ${activeBooking.train_name}`
                        : 'Self Arrival / Direct Check-in'}
                    </div>
                    <div className="mt-1 font-mono-data text-xs text-[#6B1D1D]">
                      {activeBooking.train_coach_berth}
                    </div>
                    {activeBooking.train_origin && (
                      <div className="mt-1 text-xs text-[#685649]">
                        {activeBooking.train_origin} → {activeBooking.train_arrival}
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                    <div className="text-xs font-semibold text-[#685649]">
                      Sacred Stay &amp; Sankalp
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#241914]">
                      {activeBooking.stay_name}
                    </div>
                    <div className="mt-1 text-xs text-[#685649]">
                      {activeBooking.stay_distance}
                      {activeBooking.sankalp_gotra
                        ? ` · ${activeBooking.sankalp_gotra}`
                        : ''}
                    </div>
                    <div className="mt-1 text-xs text-[#1E6B47]">
                      {activeBooking.senior_assistance
                        ? 'Senior Wheelchair Priority · '
                        : ''}
                      {activeBooking.prasad_box
                        ? 'Panchamrit Prasad Box Included'
                        : 'Standard Pass'}
                    </div>
                  </div>
                </div>

                {/* Personalized Schedule */}
                <div className="mt-6 border-t border-[#E6D7C3] pt-5">
                  <h4 className="font-display text-xl font-bold text-[#241914]">
                    Personalized Pilgrimage Schedule
                  </h4>
                  <div className="mt-3 divide-y divide-[#E6D7C3] rounded-md border border-[#E6D7C3]">
                    {activeBooking.itinerary
                      .filter((d) => d.included)
                      .map((d) => (
                        <div
                          key={d.day}
                          className="flex flex-col justify-between gap-2 p-3.5 sm:flex-row sm:items-center"
                        >
                          <div>
                            <div className="font-mono-data text-xs font-semibold text-[#6B1D1D]">
                              Day {d.day}
                            </div>
                            <div className="text-sm font-semibold text-[#241914]">
                              {d.title}
                            </div>
                            <div className="text-xs text-[#685649]">{d.morning_ritual}</div>
                            {d.custom_note && (
                              <div className="mt-0.5 text-xs text-[#B87D14]">
                                Pilgrim Note: {d.custom_note}
                              </div>
                            )}
                          </div>
                          <div className="font-mono-data text-xs text-[#685649] sm:text-right">
                            {d.darshan_window}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Right Verification Seal & Real-Time Update Log */}
              <div className="bg-[#FAF6EE] p-6 lg:col-span-4">
                <div className="flex items-center justify-between border-b border-[#E6D7C3] pb-4">
                  <div>
                    <div className="text-xs font-semibold text-[#685649]">
                      Gate Verification Seal
                    </div>
                    <div className="font-mono-data text-lg font-bold text-[#241914]">
                      {activeBooking.pnr}
                    </div>
                  </div>
                  {/* Sacred Brass Geometric Verification Matrix */}
                  <svg
                    width="58"
                    height="58"
                    viewBox="0 0 64 64"
                    aria-label="Sacred Yatra Pass Verification Seal"
                    className="shrink-0 rounded border border-[#C28A1A] bg-[#FFFDF9] p-1"
                  >
                    <rect x="6" y="6" width="16" height="16" fill="#6B1D1D" />
                    <rect x="42" y="6" width="16" height="16" fill="#6B1D1D" />
                    <rect x="6" y="42" width="16" height="16" fill="#6B1D1D" />
                    <rect x="10" y="10" width="8" height="8" fill="#FFFDF9" />
                    <rect x="46" y="10" width="8" height="8" fill="#FFFDF9" />
                    <rect x="10" y="46" width="8" height="8" fill="#FFFDF9" />
                    <rect x="28" y="28" width="8" height="8" fill="#D95D16" />
                    <rect x="26" y="10" width="6" height="6" fill="#241914" />
                    <rect x="34" y="18" width="6" height="6" fill="#241914" />
                    <rect x="14" y="28" width="6" height="6" fill="#241914" />
                    <rect x="44" y="30" width="6" height="6" fill="#241914" />
                    <rect x="30" y="44" width="6" height="6" fill="#241914" />
                    <rect x="44" y="46" width="12" height="6" fill="#B87D14" />
                  </svg>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold text-[#6B1D1D]">
                    Real-Time Status &amp; Email Dispatch Log
                  </div>
                  <ol className="mt-3 space-y-3">
                    {activeBooking.updates.map((upd) => (
                      <li
                        key={upd.id}
                        className="border-b border-[#E6D7C3] pb-3 last:border-b-0"
                      >
                        <div className="font-mono-data text-[11px] text-[#685649]">
                          {new Date(upd.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                        <div className="mt-0.5 text-xs leading-relaxed text-[#241914]">
                          {upd.message}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
