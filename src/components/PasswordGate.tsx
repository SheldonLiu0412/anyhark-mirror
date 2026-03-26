'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Non-obvious storage key
const STORAGE_KEY = '_amk';

// Salt mixed into the hash so storing "true" or the raw password won't work
const SALT = '\u{1FA9E}anyhark\u{1F30C}v1';

async function deriveToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + SALT);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Correct password — deriveToken('jaychou') is what gets stored & compared
const CORRECT = 'jaychou';

interface Props {
  children: React.ReactNode;
}

export function PasswordGate({ children }: Props) {
  const [status, setStatus] = useState<'loading' | 'locked' | 'unlocked'>('loading');
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Cooldown after 5 wrong attempts (seconds remaining)
  const [cooldown, setCooldown] = useState(0);
  const wrongCountRef = useRef(0);

  const expectedRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive token and check localStorage on mount
  useEffect(() => {
    deriveToken(CORRECT).then((expected) => {
      expectedRef.current = expected;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === expected) {
          setStatus('unlocked');
          return;
        }
      } catch {
        // localStorage unavailable — stay locked
      }
      setStatus('locked');
    });
  }, []);

  // Focus input when locked
  useEffect(() => {
    if (status === 'locked') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [status]);

  // Block ESC and F12 (devtools shortcut) while locked
  useEffect(() => {
    if (status !== 'locked') return;
    const block = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F12') e.preventDefault();
    };
    window.addEventListener('keydown', block, true);
    return () => window.removeEventListener('keydown', block, true);
  }, [status]);

  // Cleanup cooldown timer on unmount
  useEffect(() => () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || submitting || cooldown > 0) return;
    setSubmitting(true);
    setError(false);

    const token = await deriveToken(input.trim());
    if (token === expectedRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, token);
      } catch {
        // Ignore storage errors — session will still be unlocked
      }
      setStatus('unlocked');
    } else {
      wrongCountRef.current += 1;
      setError(true);
      setInput('');
      if (wrongCountRef.current >= 5) {
        wrongCountRef.current = 0;
        startCooldown(3);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    setSubmitting(false);
  }, [input, submitting, cooldown, startCooldown]);

  // Children are never rendered while locked or loading
  if (status === 'unlocked') return <>{children}</>;

  // Blank screen while computing hash
  if (status === 'loading') {
    return <div className="fixed inset-0 bg-[#0a0a0f] z-[9999]" />;
  }

  // Full-screen lock — no backdrop click, no ESC, no close button
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 35%, rgba(56,189,248,0.05) 0%, #0a0a0f 65%)',
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-[340px] mx-4 rounded-2xl flex flex-col items-center gap-7 px-8 py-10"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 40px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-12 w-12 rounded-full border border-white/[0.08] flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 50% 40%, rgba(56,189,248,0.1) 0%, transparent 70%)',
              boxShadow: '0 0 20px rgba(56,189,248,0.08)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="rgba(192,192,192,0.25)" strokeWidth="1.5" />
              <circle cx="14" cy="14" r="6" stroke="rgba(56,189,248,0.45)" strokeWidth="1" />
              <circle cx="14" cy="14" r="1.5" fill="rgba(56,189,248,0.65)" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold tracking-tight text-white/80">真实之镜</p>
            <p className="mt-1 text-[11px] text-white/30 tracking-[0.12em] uppercase">Mirror of Truth</p>
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-full h-px"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
          }}
        />

        {/* Input area */}
        <div className="w-full flex flex-col gap-3">
          <label className="text-[11px] text-white/30 tracking-wider uppercase text-center">
            输入访问密码
          </label>

          <input
            ref={inputRef}
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="••••••••"
            disabled={cooldown > 0 || submitting}
            autoComplete="new-password"
            className={[
              'w-full rounded-xl px-4 py-3 text-sm text-white/80 outline-none transition-all',
              'placeholder:text-white/15 disabled:opacity-40',
              'bg-white/[0.04]',
              error
                ? 'border border-red-400/40 focus:border-red-400/60'
                : 'border border-white/[0.08] focus:border-white/[0.2]',
            ].join(' ')}
          />

          {/* Error / Cooldown hint */}
          <div className="h-4 flex items-center justify-center">
            {error && cooldown > 0 && (
              <p className="text-[11px] text-red-400/70 animate-fade-in">
                密码不正确，请 {cooldown} 秒后重试
              </p>
            )}
            {error && cooldown === 0 && (
              <p className="text-[11px] text-red-400/70 animate-fade-in">
                密码不正确
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || submitting || cooldown > 0}
            className="w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(168,85,247,0.12) 100%)',
              border: '1px solid rgba(56,189,248,0.18)',
              color: 'rgba(56,189,248,0.85)',
            }}
          >
            {submitting ? '验证中…' : cooldown > 0 ? `${cooldown}s` : '解锁'}
          </button>
        </div>
      </div>
    </div>
  );
}
