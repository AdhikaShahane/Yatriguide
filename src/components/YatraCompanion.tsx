import { BookCheck, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PilgrimCareMode, TempleDirectoryEntry } from '../types/pilgrimage';

interface YatraCompanionProps {
  temples: TempleDirectoryEntry[];
  careMode: PilgrimCareMode;
  presetTempleId?: string;
  presetQuestion?: string;
}

const SAMPLE_QUESTIONS = [
  {
    templeId: 'kedarnath-dham',
    label: 'Why is Kedarnath considered important?',
  },
  {
    templeId: 'kashi-vishwanath',
    label: 'How can elderly pilgrims avoid stairs at Kashi Vishwanath?',
  },
  {
    templeId: 'shirdi-sai-baba',
    label: 'Best time to avoid Thursday crowds at Shirdi Sai Baba?',
  },
  {
    templeId: 'mahabodhi-bodhgaya',
    label: 'Morning chanting & wheelchair access at Mahabodhi Temple?',
  },
  {
    templeId: 'jagannath-puri-odisha',
    label: 'How can seniors avoid the 22 steps at Jagannath Puri?',
  },
];

export function YatraCompanion({
  temples,
  careMode,
  presetTempleId,
  presetQuestion,
}: YatraCompanionProps) {
  const [selectedTempleId, setSelectedTempleId] = useState<string>(
    presetTempleId || ''
  );
  const [question, setQuestion] = useState<string>(presetQuestion || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [answer, setAnswer] = useState('');
  const [citedSources, setCitedSources] = useState<string[]>([]);

  useEffect(() => {
    if (presetTempleId !== undefined) setSelectedTempleId(presetTempleId);
    if (presetQuestion) setQuestion(presetQuestion);
  }, [presetTempleId, presetQuestion]);

  const askQuestion = async (qText: string, templeFocus: string) => {
    if (qText.trim().length < 3) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/companion/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qText.trim(),
          temple_id: templeFocus || null,
          care_mode: careMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Companion could not process your question.');
        return;
      }
      setAnswer(data.answer || '');
      setCitedSources(data.citedSources || []);
    } catch {
      setErrorMsg('Network error reaching Yatra Companion.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(question, selectedTempleId);
  };

  return (
    <section
      id="yatra-companion"
      className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6"
    >
      <div className="rounded-lg border border-[#C28A1A] bg-[#FFFDF9] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E6D7C3] pb-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#6B1D1D]">
              <BookCheck className="h-4 w-4" aria-hidden="true" />
              <span>Source-Grounded Religious &amp; Practical Guide</span>
            </div>
            <h2 className="mt-1 font-display text-3xl font-bold text-[#241914]">
              Yatra Companion
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[#685649]">
              Answers questions on temple significance, rituals, dress codes, and senior accessibility strictly from verified temple authority records—never inventing timings or practices.
            </p>
          </div>
          <div className="text-xs font-medium text-[#685649]">
            Travelling as:{' '}
            <strong className="text-[#6B1D1D]">
              {careMode === 'ELDERLY_CARE'
                ? 'Senior Care'
                : careMode === 'FAMILY_KIDS'
                ? 'Family'
                : 'Solo Pilgrim'}
            </strong>
          </div>
        </div>

        {/* Sample Grounded Prompts */}
        <div className="mt-5 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => {
                setSelectedTempleId(sample.templeId);
                setQuestion(sample.label);
                askQuestion(sample.label, sample.templeId);
              }}
              className="rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-1.5 text-xs font-medium text-[#241914] hover:border-[#D95D16] cursor-pointer"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <select
              aria-label="Choose a temple"
              value={selectedTempleId}
              onChange={(e) => setSelectedTempleId(e.target.value)}
              className="w-full rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3 py-2.5 text-sm text-[#241914] focus:border-[#D95D16] focus:outline-none"
            >
              <option value="">All Verified Shrines ({temples.length})</option>
              {temples.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 md:col-span-8">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about temple rules, dress code, wheelchairs, or darshan timings..."
              className="flex-1 rounded-md border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] placeholder:text-[#9A897C] focus:border-[#D95D16] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md bg-[#D95D16] px-5 py-2.5 text-sm font-semibold text-[#FFFDF9] hover:bg-[#B84A0D] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{loading ? 'Checking...' : 'Ask'}</span>
            </button>
          </div>
        </form>

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-[#6B1D1D] bg-[#6B1D1D]/10 px-4 py-3 text-sm text-[#6B1D1D]"
          >
            {errorMsg}
          </div>
        )}

        {answer && (
          <div className="mt-5 rounded-lg border border-[#E6D7C3] bg-[#FAF6EE] p-5">
            <div className="text-xs font-semibold text-[#1E6B47]">
              Answer from Verified Temple Records
            </div>
            <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#241914]">
              {answer}
            </div>
            {citedSources.length > 0 && (
              <div className="mt-4 border-t border-[#E6D7C3] pt-3 text-xs text-[#685649]">
                <span className="font-semibold text-[#241914]">Official Sources:</span>{' '}
                {citedSources.slice(0, 3).join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
