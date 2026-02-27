'use client';

/**
 * Join Page — Co-teacher invite code redemption
 * Place at: src/app/join/page.tsx
 *
 * Shown to new users who don't belong to any organization yet.
 * They enter their invite code here to join a family account.
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/src/lib/supabase';
import { redeemInvite } from '@/src/lib/invites';

const CODE_LENGTH = 8;

export default function JoinPage() {
  const router = useRouter();
  const supabase = createClient();

  const [slots, setSlots] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first slot on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // ── Code input handling ─────────────────────────────────────────────────────

  function handleSlotChange(index: number, value: string) {
    // Handle paste into any slot
    if (value.length > 1) {
      handlePaste(value, index);
      return;
    }

    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!char) return;

    const next = [...slots];
    next[index] = char;
    setSlots(next);
    setError('');

    // Advance to next slot
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (slots[index]) {
        // Clear current slot
        const next = [...slots];
        next[index] = '';
        setSlots(next);
      } else if (index > 0) {
        // Move back and clear previous slot
        const next = [...slots];
        next[index - 1] = '';
        setSlots(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  function handlePaste(text: string, startIndex = 0) {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleaned) return;

    const next = [...slots];
    let focusIndex = startIndex;

    for (let i = 0; i < cleaned.length && startIndex + i < CODE_LENGTH; i++) {
      next[startIndex + i] = cleaned[i];
      focusIndex = startIndex + i;
    }

    setSlots(next);
    setError('');

    // Focus last filled slot or next empty
    const nextEmpty = focusIndex < CODE_LENGTH - 1 ? focusIndex + 1 : focusIndex;
    inputRefs.current[nextEmpty]?.focus();
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const code = slots.join('');
    if (code.length < CODE_LENGTH) {
      setError('Please enter the full invite code.');
      return;
    }

    setError('');
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setError('You must be signed in to join. Please log in and try again.');
      setLoading(false);
      return;
    }

    const result = await redeemInvite(code, user.id, user.email);

    if (!result.success) {
      setError(result.error ?? 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    // Show success briefly before redirect
    setSuccess(true);
    setTimeout(() => {
      router.push('/teaching-schedule');
    }, 1500);
  }

  // ── Success state ───────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 text-lg">You're in!</p>
          <p className="text-slate-400 text-sm">Taking you to your teaching schedule…</p>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  const isFilled = slots.every(s => s !== '');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo / branding */}
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Join a HomeschoolHQ Family</h1>
          <p className="text-slate-500 text-sm mt-2">
            Enter the invite code shared by the account admin.
          </p>
        </div>

        {/* Code input */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-3">
              Invite Code
            </label>

            {/* Segmented code slots */}
            <div className="flex gap-2 justify-center">
              {slots.map((slot, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={slot}
                  onChange={e => handleSlotChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={e => {
                    e.preventDefault();
                    handlePaste(e.clipboardData.getData('text'), i);
                  }}
                  onFocus={e => e.target.select()}
                  className={[
                    'w-9 h-11 text-center font-mono text-lg font-bold uppercase rounded-lg border transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent',
                    slot
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-800',
                    error ? 'border-red-300 bg-red-50' : '',
                  ].join(' ')}
                />
              ))}
            </div>

            {/* Divider between groups of 4 — visual only, no functional split */}
            {/* The gap between slot 3 and 4 is intentionally larger */}
            <style jsx>{`
              div > input:nth-child(4) {
                margin-right: 0.5rem;
              }
            `}</style>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !isFilled}
            className={[
              'w-full py-3 rounded-xl font-semibold text-sm transition-all',
              isFilled && !loading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            ].join(' ')}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Joining…
              </span>
            ) : 'Join Family Account'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          Don't have a code?{' '}
          <span className="text-slate-600">Ask the account admin to generate one from their Co-Teacher settings.</span>
        </p>

      </div>
    </div>
  );
}