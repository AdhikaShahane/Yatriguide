import { Eye, EyeOff, LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { useState } from 'react';
import type { PilgrimCareMode } from '../types/pilgrimage';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  care_mode: PilgrimCareMode;
}

interface AuthPageProps {
  currentUser: AuthUser | null;
  onAuthSuccess: (token: string, user: AuthUser) => void;
  onSignOut: () => void;
  onBackHome: () => void;
  onGoToTickets: () => void;
}

export function AuthPage({
  currentUser,
  onAuthSuccess,
  onSignOut,
  onBackHome,
  onGoToTickets,
}: AuthPageProps) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [careMode, setCareMode] = useState<PilgrimCareMode>('ELDERLY_CARE');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (currentUser) {
    return (
      <section className="mx-auto max-w-[640px] px-4 py-10 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[#E6D7C3] bg-[#FFFDF9] shadow-sm">
          <div className="bg-gradient-to-r from-[#FF5722] via-[#F4511E] to-[#D84315] px-6 py-6 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
              <UserCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Signed In to YatriGuide</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">
              Namaste, {currentUser.full_name}
            </h1>
            <p className="mt-1 text-xs text-white/90">
              Your details are saved and automatically filled when you book a yatra.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <dl className="space-y-3 border-b border-[#E6D7C3] pb-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#685649]">Email Address</dt>
                <dd className="font-medium text-[#241914]">{currentUser.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#685649]">Mobile Number</dt>
                <dd className="font-mono-data font-medium text-[#241914]">
                  +91 {currentUser.phone.replace(/^\+?91\s*/, '')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#685649]">Travel Comfort Profile</dt>
                <dd className="font-medium text-[#D84315]">
                  {currentUser.care_mode === 'ELDERLY_CARE'
                    ? 'Elderly & Senior Care'
                    : currentUser.care_mode === 'FAMILY_KIDS'
                      ? 'Family with Children'
                      : 'Solo / Budget Pilgrim'}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onGoToTickets}
                  className="rounded-xl bg-gradient-to-r from-[#FF5722] to-[#D84315] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:opacity-95 cursor-pointer"
                >
                  View My Tickets
                </button>
                <button
                  type="button"
                  onClick={onBackHome}
                  className="rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-4 py-2.5 text-sm font-medium text-[#241914] hover:border-[#FF5722] cursor-pointer"
                >
                  Explore Destinations
                </button>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-2 rounded-xl border border-[#6B1D1D]/30 px-4 py-2.5 text-sm font-semibold text-[#6B1D1D] hover:bg-[#6B1D1D]/5 cursor-pointer"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const endpoint = mode === 'LOGIN' ? '/api/auth/login' : '/api/auth/signup';
      const payload =
        mode === 'LOGIN'
          ? { email: email.trim(), password }
          : {
              full_name: fullName.trim(),
              email: email.trim(),
              phone: phone.trim(),
              password,
              care_mode: careMode,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not sign in. Please check your details.');
        return;
      }

      onAuthSuccess(data.token, data.user);
    } catch {
      setErrorMsg('Connection error. Please check your internet and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-[960px] px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#E6D7C3] bg-white shadow-md md:grid-cols-12">
        {/* Left Sacred Backdrop inspired by Figma Onboarding Screens */}
        <div className="relative min-h-[240px] md:col-span-5">
          <img
            src="/src/assets/images/tirupati_balaji_1795712131516.jpg"
            alt="Sacred Tirupati Balaji Temple"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
          <div className="absolute inset-x-6 bottom-6 text-white">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F5CFA0]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sacred Travel Companion</span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-bold leading-snug sm:text-3xl">
              Namaste to YatriGuide
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/90">
              Sign in or create your free pilgrim account to explore Jagannath Puri, Tirupati Balaji, Ayodhya, Dwarka, book darshan slots, and receive train e-tickets.
            </p>
          </div>
        </div>

        {/* Right Clean White Sign-In / Sign-Up Card */}
        <div className="p-6 sm:p-8 md:col-span-7">
          <h1 className="font-display text-2xl font-bold text-[#241914] sm:text-3xl">
            {mode === 'LOGIN' ? 'Welcome Back — Sign In' : 'Create Your YatriGuide Account'}
          </h1>
          <p className="mt-1 text-xs text-[#685649]">
            Please sign in or create an account first to open destinations, itineraries, and ticket bookings.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg('');
              }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer ${
                mode === 'LOGIN'
                  ? 'bg-white text-[#D84315] shadow-xs'
                  : 'text-[#685649] hover:text-[#241914]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('SIGNUP');
                setErrorMsg('');
              }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors cursor-pointer ${
                mode === 'SIGNUP'
                  ? 'bg-white text-[#D84315] shadow-xs'
                  : 'text-[#685649] hover:text-[#241914]'
              }`}
            >
              Sign-Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'SIGNUP' && (
              <>
                <label className="block">
                  <span className="text-xs font-semibold text-[#685649]">Enter your Name</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-[#685649]">Enter Phone Number</span>
                  <div className="mt-1 flex overflow-hidden rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] focus-within:border-[#FF5722]">
                    <span className="flex items-center border-r border-[#E6D7C3] bg-[#F3EBDD] px-3 text-xs font-semibold text-[#241914]">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98200 12345"
                      className="w-full bg-transparent px-3.5 py-2.5 text-sm text-[#241914] focus:outline-none"
                    />
                  </div>
                </label>
              </>
            )}

            <label className="block">
              <span className="text-xs font-semibold text-[#685649]">Email Address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#685649]">
                Password {mode === 'SIGNUP' && '(minimum 6 characters)'}
              </span>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] py-2.5 pl-3.5 pr-11 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#685649] hover:text-[#241914] cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            {mode === 'SIGNUP' && (
              <label className="block">
                <span className="text-xs font-semibold text-[#685649]">
                  Who usually travels with you?
                </span>
                <select
                  value={careMode}
                  onChange={(e) => setCareMode(e.target.value as PilgrimCareMode)}
                  className="mt-1 w-full rounded-xl border border-[#E6D7C3] bg-[#FAF6EE] px-3.5 py-2.5 text-sm text-[#241914] focus:border-[#FF5722] focus:outline-none"
                >
                  <option value="ELDERLY_CARE">
                    Elderly Parents / Seniors (Ramps, lifts &amp; fewer stairs)
                  </option>
                  <option value="FAMILY_KIDS">
                    Family with Children (Clean stays &amp; Satvik meals)
                  </option>
                  <option value="SOLO_YOUTH">
                    Solo or Friends (Budget-friendly &amp; fast rail routes)
                  </option>
                </select>
              </label>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-[#6B1D1D] bg-[#6B1D1D]/10 px-4 py-3 text-xs font-medium text-[#6B1D1D]"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-[#FF5722] to-[#D84315] py-3 text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'LOGIN'
                  ? 'CONFIRM SIGN IN'
                  : 'CONFIRM & CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-5 border-t border-[#E6D7C3] pt-4 text-center text-xs text-[#685649]">
            {mode === 'LOGIN' ? (
              <>
                New to YatriGuide?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('SIGNUP');
                    setErrorMsg('');
                  }}
                  className="font-bold text-[#D84315] underline underline-offset-4 cursor-pointer"
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('LOGIN');
                    setErrorMsg('');
                  }}
                  className="font-bold text-[#D84315] underline underline-offset-4 cursor-pointer"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
