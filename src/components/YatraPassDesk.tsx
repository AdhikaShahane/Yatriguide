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
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(activeBooking.pnr)}/notify`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (res.ok && data.booking) {
        onRefreshBooking(data.booking);
        setStatusNotice(
          `Latest train & darshan update sent to ${data.booking.pilgrim_email}`
        );
      } else {
        setStatusNotice(data.error || 'Could not send update right now.');
      }
    } catch {
      setStatusNotice('Connection error while sending update.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section
      id="my-yatra-pass"
      className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6"
    >
      <div className="flex flex-col justify-between gap-5 border-b border-[#E6D7C3] pb-6 md:flex-row md:items-end no-print">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#241914] sm:text-4xl">
            My Yatra Tickets
          </h1>
          <p className="mt-1.5 text-sm text-[#685649]">
            Check your booking number, train seat, hotel, and darshan timing—or print your pass for travel.
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
              placeholder="Enter Ticket No. (e.g. TS-408219) or Email"
              className="w-full rounded-md border border-[#E6D7C3] bg-[#FFFDF9] py-2.5 pl-9 pr-3 text-sm text-[#241914] placeholder:text-[#9A897C] focus:border-[#D95D16] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-md bg-[#6B1D1D] px-4 py-2.5 text-sm font-semibold text-[#FFFDF9] hover:bg-[#531515] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {searching ? 'Finding...' : 'Find Ticket'}
          </button>
        </form>
      </div>

      {bookings.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 no-print">
          <span className="text-xs font-semibold text-[#685649] mr-1">
            Recent Tickets:
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
            No matching ticket found
          </p>
          <p className="mt-2 text-sm text-[#685649]">
            Check your ticket number or pick one of the recent bookings above.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-[#C28A1A] bg-[#FFFDF9] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#6B1D1D] px-6 py-5 text-[#FFFDF9]">
            <div>
              <div className="text-xs text-[#F5CFA0]">
                {activeBooking.booking_mode === 'PRE_BOOKING'
                  ? 'Early Pre-Booking Confirmed'
                  : 'Confirmed Yatra Ticket'}{' '}
                · Ticket No. <strong className="font-mono-data text-white">{activeBooking.pnr}</strong>
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                {activeBooking.circuit_title}
              </h2>
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
                <span>{syncing ? 'Sending...' : 'Email Me Latest Update'}</span>
              </button>

              {activeBooking.latest_email && (
                <button
                  type="button"
                  onClick={() => setViewEmail((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-md border border-[#F5CFA0]/40 bg-[#531515] px-4 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#431010] whitespace-nowrap cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{viewEmail ? 'Show Ticket' : 'View Email Copy'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-md border border-[#F5CFA0]/40 bg-transparent px-3.5 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#531515] whitespace-nowrap cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Print</span>
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
              <div className="mb-3 text-xs text-[#685649]">
                <strong>Sent to:</strong> {activeBooking.latest_email.recipient_email} ·{' '}
                <strong>Subject:</strong> {activeBooking.latest_email.subject}
              </div>
              <iframe
                title="Email Confirmation Copy"
                sandbox=""
                srcDoc={activeBooking.latest_email.html_body}
                className="h-[520px] w-full rounded-md border border-[#E6D7C3] bg-white"
              />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                  <div className="text-xs text-[#685649]">Traveller</div>
                  <div className="mt-1 text-base font-bold text-[#241914]">
                    {activeBooking.pilgrim_name}
                  </div>
                  <div className="text-xs text-[#685649]">
                    {activeBooking.pilgrim_count}{' '}
                    {activeBooking.pilgrim_count === 1 ? 'Person' : 'People'} ·{' '}
                    {activeBooking.pilgrim_email}
                  </div>
                </div>

                <div className="rounded-md border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                  <div className="text-xs text-[#685649]">Start Date &amp; Darshan Time</div>
                  <div className="mt-1 font-mono-data text-base font-bold text-[#241914]">
                    {activeBooking.travel_date}
                  </div>
                  <div className="text-xs font-medium text-[#6B1D1D]">
                    {activeBooking.darshan_slot_name} ({activeBooking.darshan_slot_time})
                  </div>
                </div>

                <div className="rounded-md border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                  <div className="text-xs text-[#685649]">Total Paid</div>
                  <div className="mt-1 font-mono-data text-lg font-bold text-[#6B1D1D]">
                    {formatInr(activeBooking.total_amount)}
                  </div>
                  <div className="text-xs font-medium text-[#1E6B47]">
                    Confirmed ({activeBooking.tier} Comfort)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-[#E6D7C3] p-4">
                  <div className="text-xs font-semibold text-[#685649]">
                    Train &amp; Seat Details
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#241914]">
                    {activeBooking.train_number
                      ? `${activeBooking.train_name} (#${activeBooking.train_number})`
                      : 'Self Travel / Direct Arrival'}
                  </div>
                  <div className="mt-1 font-mono-data text-xs text-[#6B1D1D]">
                    {activeBooking.train_coach_berth}
                  </div>
                </div>

                <div className="rounded-md border border-[#E6D7C3] p-4">
                  <div className="text-xs font-semibold text-[#685649]">
                    Hotel / Stay Details
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#241914]">
                    {activeBooking.stay_name}
                  </div>
                  <div className="mt-1 text-xs text-[#685649]">
                    {activeBooking.stay_distance}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-display text-xl font-bold text-[#241914]">
                  Day-by-Day Plan
                </h3>
                <div className="mt-2 divide-y divide-[#E6D7C3] rounded-md border border-[#E6D7C3]">
                  {activeBooking.itinerary
                    .filter((d) => d.included)
                    .map((d) => (
                      <div
                        key={d.day}
                        className="flex flex-col justify-between gap-1 p-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="text-sm font-semibold text-[#241914]">
                          Day {d.day}: {d.title}
                        </div>
                        <div className="font-mono-data text-xs text-[#685649]">
                          {d.darshan_window}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {activeBooking.updates.length > 0 && (
                <div className="border-t border-[#E6D7C3] pt-4">
                  <div className="text-xs font-semibold text-[#685649]">
                    Recent Ticket Updates
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-[#241914]">
                    {activeBooking.updates.slice(0, 4).map((u) => (
                      <li key={u.id}>
                        <span className="font-mono-data text-[#685649]">
                          {new Date(u.created_at).toLocaleDateString('en-IN')}:
                        </span>{' '}
                        {u.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
