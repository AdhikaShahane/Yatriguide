import {
  Accessibility,
  BookOpen,
  Clock,
  Download,
  ExternalLink,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PilgrimCareMode, TempleDirectoryEntry } from '../types/pilgrimage';

interface TempleGuideHubProps {
  temples: TempleDirectoryEntry[];
  careMode: PilgrimCareMode;
  initialTempleId?: string;
  onAskCompanion: (templeId: string, defaultQuestion: string) => void;
}

type GuideTab = 'DARSHAN' | 'CROWD' | 'CARE' | 'HERITAGE';

function escapePlain(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function TempleGuideHub({
  temples,
  careMode,
  initialTempleId,
  onAskCompanion,
}: TempleGuideHubProps) {
  const [traditionFilter, setTraditionFilter] = useState<string>('ALL');
  const [selectedTempleId, setSelectedTempleId] = useState<string>(
    initialTempleId || temples[0]?.id || 'tirumala-venkateswara'
  );
  const [activeTab, setActiveTab] = useState<GuideTab>('DARSHAN');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (initialTempleId) {
      setSelectedTempleId(initialTempleId);
      setTraditionFilter('ALL');
      setImgError(false);
    }
  }, [initialTempleId]);

  const filteredTemples = useMemo(() => {
    if (traditionFilter === 'ALL') return temples;
    return temples.filter((t) => t.tradition === traditionFilter);
  }, [temples, traditionFilter]);

  const selectedTemple = useMemo(() => {
    return (
      filteredTemples.find((t) => t.id === selectedTempleId) ??
      filteredTemples[0] ??
      temples[0] ??
      null
    );
  }, [filteredTemples, selectedTempleId, temples]);

  const handleDownloadOfflineGuide = () => {
    if (!selectedTemple) return;
    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapePlain(selectedTemple.name)} — Offline Yatriguide Reference</title></head>
<body style="font-family:Georgia,serif;background:#faf6ee;color:#241914;max-width:720px;margin:24px auto;padding:20px;">
  <h1 style="color:#6b1d1d;">${escapePlain(selectedTemple.name)}</h1>
  <p>${escapePlain(selectedTemple.location)}, ${escapePlain(selectedTemple.state)} · Verified Authority: ${escapePlain(selectedTemple.source_authority)}</p>
  <h2>Darshan &amp; Aarti Timings</h2>
  <p><strong>Opening/Closing:</strong> ${escapePlain(selectedTemple.opening_closing)}</p>
  <p><strong>Darshan:</strong> ${escapePlain(selectedTemple.darshan_timings)}</p>
  <p><strong>Aarti / Chanting:</strong> ${escapePlain(selectedTemple.aarti_timings)}</p>
  <p><strong>Dress Code:</strong> ${escapePlain(selectedTemple.dress_code)}</p>
  <p><strong>Online Booking:</strong> ${escapePlain(selectedTemple.online_booking_info)}</p>
  <h2>Accessibility &amp; Emergency</h2>
  <p><strong>Ramps &amp; Lifts:</strong> ${escapePlain(selectedTemple.ramps_and_lifts)}</p>
  <p><strong>Walking Distance:</strong> ${escapePlain(selectedTemple.walking_distance_note)}</p>
  <p><strong>Medical Facility:</strong> ${escapePlain(selectedTemple.medical_facility)}</p>
  <p><strong>Nearby Pharmacy:</strong> ${escapePlain(selectedTemple.nearby_pharmacy)}</p>
  <p><strong>Emergency Contact:</strong> ${escapePlain(selectedTemple.emergency_contact)}</p>
  <h2>Historical Crowd Estimates (Historical Pattern, Not Live Data)</h2>
  <p><strong>Weekday:</strong> ${escapePlain(selectedTemple.crowd_weekday)}</p>
  <p><strong>Weekend:</strong> ${escapePlain(selectedTemple.crowd_weekend)}</p>
  <p><strong>Festival:</strong> ${escapePlain(selectedTemple.crowd_festival)}</p>
  <p><strong>Recommended Window:</strong> ${escapePlain(selectedTemple.recommended_visit_window)}</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemple.id}-offline-guide.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!selectedTemple) return null;

  return (
    <section
      id="explore-temples"
      className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6"
    >
      <div
        id="darshan-guide"
        className="flex flex-col justify-between gap-4 border-b border-[#E6D7C3] pb-6 lg:flex-row lg:items-end"
      >
        <div>
          <div className="text-xs font-semibold text-[#6B1D1D]">
            Verified Sacred Places · Historical Crowd Patterns · Pilgrim Care
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold text-[#241914] sm:text-4xl">
            Explore Temples, Darshan Timings &amp; Accessibility
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-[#685649]">
            Pick any temple below to check official opening hours, dress codes, wheelchair ramps, medical desks, and calmer visiting times.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Tradition Filter"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-[#E6D7C3] bg-[#F3EBDD] p-1"
        >
          {[
            { id: 'ALL', label: 'All Shrines' },
            { id: 'Hindu', label: 'Hindu' },
            { id: 'Buddhist', label: 'Buddhist' },
            { id: 'Universal / Multi-Faith', label: 'Multi-Faith' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={traditionFilter === tab.id}
              onClick={() => {
                setTraditionFilter(tab.id);
                setImgError(false);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                traditionFilter === tab.id
                  ? 'bg-[#FFFDF9] text-[#6B1D1D] shadow-xs'
                  : 'text-[#685649] hover:text-[#241914]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Shrine Selector Grid */}
      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemples.map((t) => {
          const active = selectedTemple.id === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedTempleId(t.id);
                setImgError(false);
              }}
              className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                active
                  ? 'border-[#D95D16] bg-[#6B1D1D] text-[#FFFDF9] shadow-xs'
                  : 'border-[#E6D7C3] bg-[#FFFDF9] text-[#241914] hover:border-[#C28A1A]'
              }`}
            >
              <img
                src={t.image_url}
                alt={t.name}
                referrerPolicy="no-referrer"
                className="h-12 w-16 shrink-0 rounded-md object-cover bg-[#F3EBDD]"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold">{t.name}</div>
                <div
                  className={`truncate text-[11px] ${
                    active ? 'text-[#F5CFA0]' : 'text-[#685649]'
                  }`}
                >
                  {t.state} · {t.deity_or_focus.split('(')[0].trim()}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Shrine Verified Dossier */}
      <div className="mt-6 rounded-lg border border-[#E6D7C3] bg-[#FFFDF9] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Shrine Overview */}
          <div className="border-b border-[#E6D7C3] lg:col-span-4 lg:border-b-0 lg:border-r">
            <div className="aspect-[4/3] w-full bg-[#F3EBDD] overflow-hidden">
              {!imgError ? (
                <img
                  src={selectedTemple.image_url}
                  alt={selectedTemple.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-6 text-center font-display text-2xl font-bold text-[#6B1D1D]">
                  {selectedTemple.name}
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-[#685649]">
                  {selectedTemple.tradition} · {selectedTemple.state}
                </div>
                <h3 className="mt-1 font-display text-2xl font-bold text-[#241914]">
                  {selectedTemple.name}
                </h3>
                <div className="mt-1 text-xs font-medium text-[#6B1D1D]">
                  {selectedTemple.deity_or_focus}
                </div>
              </div>

              <div className="border-t border-[#E6D7C3] pt-3 text-xs text-[#685649] space-y-1.5">
                <div>
                  <span className="font-semibold text-[#241914]">Verified Source:</span>{' '}
                  {selectedTemple.source_authority}
                </div>
                <div>
                  <a
                    href={selectedTemple.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#D95D16] hover:underline"
                  >
                    <span>Official Authority Portal</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onAskCompanion(
                      selectedTemple.id,
                      `Explain the religious significance, verified darshan timings, and ${
                        careMode === 'ELDERLY_CARE'
                          ? 'senior accessibility facilities'
                          : 'best visiting schedule'
                      } for ${selectedTemple.name}.`
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#D95D16] px-4 py-2 text-xs font-semibold text-[#FFFDF9] hover:bg-[#B84A0D] cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ask Yatra Companion</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOfflineGuide}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-4 py-2 text-xs font-semibold text-[#241914] hover:border-[#C28A1A] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save Offline Shrine Guide</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right 4-Module Detail Tabs */}
          <div className="flex flex-col lg:col-span-8">
            <div className="grid grid-cols-2 border-b border-[#E6D7C3] bg-[#FAF6EE] sm:grid-cols-4">
              {[
                { id: 'DARSHAN' as const, label: 'Darshan & Rules', icon: Clock },
                { id: 'CROWD' as const, label: 'Crowd Estimates', icon: Users },
                { id: 'CARE' as const, label: 'Pilgrim Care', icon: Accessibility },
                { id: 'HERITAGE' as const, label: 'Tradition & FAQs', icon: BookOpen },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center justify-center gap-2 border-b-2 px-3 py-3.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'border-[#D95D16] bg-[#FFFDF9] text-[#6B1D1D]'
                        : 'border-transparent text-[#685649] hover:text-[#241914]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-6 flex-1">
              {activeTab === 'DARSHAN' && (
                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-[#6B1D1D]">
                      Opening &amp; Closing Schedule
                    </dt>
                    <dd className="mt-1 text-[#241914]">{selectedTemple.opening_closing}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#6B1D1D]">
                      Darshan Timings
                    </dt>
                    <dd className="mt-1 text-[#241914]">{selectedTemple.darshan_timings}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#6B1D1D]">
                      Aarti / Chanting Schedule
                    </dt>
                    <dd className="mt-1 text-[#241914]">{selectedTemple.aarti_timings}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#6B1D1D]">
                      Official Online Booking
                    </dt>
                    <dd className="mt-1 text-[#241914]">{selectedTemple.online_booking_info}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#6B1D1D]">
                      Entry Requirements
                    </dt>
                    <dd className="mt-1 text-[#685649]">{selectedTemple.entry_requirements}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#6B1D1D]">
                      Dress Code
                    </dt>
                    <dd className="mt-1 text-[#685649]">{selectedTemple.dress_code}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#6B1D1D]">
                      Photography Restrictions
                    </dt>
                    <dd className="mt-1 text-[#685649]">{selectedTemple.photography_rules}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-[#6B1D1D]">
                      Major Festivals
                    </dt>
                    <dd className="mt-1 text-[#241914]">
                      {selectedTemple.festivals.join(' · ')}
                    </dd>
                  </div>
                </dl>
              )}

              {activeTab === 'CROWD' && (
                <div className="space-y-5">
                  <div className="rounded-md border border-[#C28A1A]/50 bg-[#FAF6EE] px-4 py-3 text-xs text-[#6B1D1D]">
                    <strong>Historical Estimate Notice:</strong> Waiting times below reflect historical weekday, weekend, and festival patterns—not live gate sensor feeds. Always verify festival advisories on the official portal.
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                      <div className="text-xs font-semibold text-[#1E6B47]">
                        Weekday Historical Wait
                      </div>
                      <div className="mt-1.5 text-sm font-semibold text-[#241914]">
                        {selectedTemple.crowd_weekday}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                      <div className="text-xs font-semibold text-[#B87D14]">
                        Weekend Historical Wait
                      </div>
                      <div className="mt-1.5 text-sm font-semibold text-[#241914]">
                        {selectedTemple.crowd_weekend}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-4">
                      <div className="text-xs font-semibold text-[#6B1D1D]">
                        Festival Peak Pattern
                      </div>
                      <div className="mt-1.5 text-sm font-semibold text-[#241914]">
                        {selectedTemple.crowd_festival}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-[#E6D7C3] pt-4 text-sm">
                    <div>
                      <div className="text-xs font-semibold text-[#1E6B47]">
                        Recommended Off-Peak Window
                      </div>
                      <div className="mt-1 font-medium text-[#241914]">
                        {selectedTemple.recommended_visit_window}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#6B1D1D]">
                        Special Darshan &amp; Queue Notes
                      </div>
                      <div className="mt-1 text-[#685649]">
                        {selectedTemple.special_darshan_notes}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'CARE' && (
                <div id="pilgrim-care" className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-4 py-3 text-xs">
                    <span className="font-semibold text-[#6B1D1D]">
                      Wheelchair &amp; Step-Free Status:{' '}
                      {selectedTemple.wheelchair_accessible
                        ? 'Accessible via Ramps / Lifts'
                        : 'High-Altitude / Steep Terrain (Doli or Heli Required)'}
                    </span>
                    <span className="text-[#685649]">
                      Active Profile: {careMode.replace('_', ' ')}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                    <div>
                      <dt className="text-xs font-semibold text-[#6B1D1D]">
                        Ramps, Lifts &amp; Shuttles
                      </dt>
                      <dd className="mt-1 text-[#241914]">{selectedTemple.ramps_and_lifts}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-[#6B1D1D]">
                        Walking Distance
                      </dt>
                      <dd className="mt-1 text-[#241914]">{selectedTemple.walking_distance_note}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-[#6B1D1D]">
                        Resting &amp; Seating Locations
                      </dt>
                      <dd className="mt-1 text-[#685649]">{selectedTemple.resting_zones}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-[#6B1D1D]">
                        Medical Facilities
                      </dt>
                      <dd className="mt-1 text-[#685649]">{selectedTemple.medical_facility}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-[#6B1D1D]">
                        Nearby Pharmacy
                      </dt>
                      <dd className="mt-1 text-[#685649]">{selectedTemple.nearby_pharmacy}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-[#6B1D1D]">
                        Emergency &amp; Trust Helpline
                      </dt>
                      <dd className="mt-1 font-mono-data text-xs font-semibold text-[#6B1D1D]">
                        {selectedTemple.emergency_contact}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {activeTab === 'HERITAGE' && (
                <div className="space-y-5 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-[#6B1D1D]">
                      Historical Background
                    </div>
                    <p className="mt-1 leading-relaxed text-[#241914]">
                      {selectedTemple.history_summary}
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#6B1D1D]">
                      Religious Significance
                    </div>
                    <p className="mt-1 leading-relaxed text-[#241914]">
                      {selectedTemple.significance_summary}
                    </p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#6B1D1D]">
                      Traditional Rituals &amp; Etiquette
                    </div>
                    <p className="mt-1 leading-relaxed text-[#685649]">
                      {selectedTemple.rituals_summary}
                    </p>
                  </div>

                  {selectedTemple.faqs.length > 0 && (
                    <div className="border-t border-[#E6D7C3] pt-4 space-y-3">
                      <div className="text-xs font-semibold text-[#6B1D1D]">
                        Verified Pilgrim FAQs
                      </div>
                      {selectedTemple.faqs.map((faq, idx) => (
                        <div key={idx} className="rounded-md border border-[#E6D7C3] bg-[#FAF6EE] p-3.5">
                          <div className="font-semibold text-[#241914]">{faq.question}</div>
                          <div className="mt-1 text-xs leading-relaxed text-[#685649]">
                            {faq.answer}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
