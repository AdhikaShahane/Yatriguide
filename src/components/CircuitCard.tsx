import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { CircuitSummary } from '../types/pilgrimage';

interface CircuitCardProps {
  circuit: CircuitSummary;
  isSelected: boolean;
  onSelect: (circuit: CircuitSummary) => void;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CircuitCard({ circuit, isSelected, onSelect }: CircuitCardProps) {
  const [imgError, setImgError] = useState(false);

  const isPreBook = circuit.booking_status === 'PRE_BOOKING';
  const isFillingFast = circuit.booking_status === 'FILLING_FAST';

  const statusText = isPreBook
    ? `Early Pre-Booking · Opens ${circuit.window_opens_at}`
    : isFillingFast
      ? `Few Seats Left · ${circuit.slots_remaining} left`
      : `Open Now · ${circuit.slots_remaining} seats left`;

  const statusColorClass = isPreBook
    ? 'text-[#B87D14]'
    : isFillingFast
      ? 'text-[#6B1D1D]'
      : 'text-[#1E6B47]';

  return (
    <article
      className={`group flex flex-col bg-[#FFFDF9] border transition-transform duration-200 hover:-translate-y-0.5 rounded-lg overflow-hidden ${
        isSelected
          ? 'border-[#D95D16] ring-1 ring-[#D95D16]'
          : 'border-[#E6D7C3] hover:border-[#C28A1A]'
      }`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3EBDD]">
        {!imgError ? (
          <img
            src={circuit.image_url}
            alt={circuit.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F3EBDD] to-[#E6D7C3] p-6 text-center">
            <span className="font-display text-2xl font-bold text-[#6B1D1D]">
              {circuit.category}
            </span>
            <span className="mt-1 text-sm text-[#685649]">{circuit.region}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-medium text-[#FFFDF9]">
          <span className="truncate">{circuit.region.split('(')[0].trim()}</span>
          <span className="font-mono-data shrink-0">{circuit.duration_days} Days</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#6B1D1D]">
            <span>{circuit.category}</span>
            <span className="text-[#685649] font-medium">
              {circuit.temples.length} Temples
            </span>
          </div>

          <h3 className="mt-1.5 font-display text-2xl font-bold leading-snug text-[#241914]">
            {circuit.title}
          </h3>

          <div className="mt-1 text-xs font-semibold text-[#B84A0D]">
            {circuit.deity}
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#685649]">
            {circuit.summary}
          </p>
        </div>

        <div className="mt-5 border-t border-[#E6D7C3] pt-4">
          <div className="text-xs font-semibold">
            <span className={statusColorClass}>{statusText}</span>
          </div>

          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-[#685649]">Starts from</div>
              <div className="font-mono-data text-lg font-bold text-[#241914]">
                {formatInr(circuit.price_seva)}{' '}
                <span className="text-xs font-normal text-[#685649]">/ person</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelect(circuit)}
              className="inline-flex items-center gap-2 rounded-md bg-[#D95D16] px-4 py-2.5 text-sm font-semibold text-[#FFFDF9] transition-colors duration-150 hover:bg-[#B84A0D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6B1D1D] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{isPreBook ? 'Pre-Book Trip' : 'View & Book'}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
