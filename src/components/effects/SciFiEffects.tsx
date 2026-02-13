'use client';

import { useState, useEffect, useCallback } from 'react';

/* ============================================
   AuroraBackground
   Layered radial gradients with aurora animation
   ============================================ */

export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Primary aurora layer */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 40%, rgba(56, 189, 248, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 20%, rgba(168, 85, 247, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 50% 80%, rgba(192, 192, 192, 0.04) 0%, transparent 55%)
          `,
          backgroundSize: '200% 200%',
          animation: 'aurora-shift 25s ease-in-out infinite',
        }}
      />
      {/* Secondary layer - offset timing */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(ellipse 50% 70% at 70% 60%, rgba(56, 189, 248, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 80% 40% at 30% 30%, rgba(45, 212, 191, 0.04) 0%, transparent 45%)
          `,
          backgroundSize: '300% 300%',
          animation: 'aurora-shift 28s ease-in-out infinite reverse',
        }}
      />
      {/* Subtle noise overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

/* ============================================
   GradientTitle
   Animated silver-blue gradient text
   ============================================ */

interface GradientTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientTitle({ children, className = '' }: GradientTitleProps) {
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        background: 'linear-gradient(135deg, #C0C0C0 0%, #38BDF8 40%, #C0C0C0 60%, #38BDF8 100%)',
        backgroundSize: '300% 300%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shimmer-text 6s ease-in-out infinite',
      }}
    >
      {children}
    </span>
  );
}

/* ============================================
   DecryptText
   Text that "decrypts" character-by-character
   ============================================ */

interface DecryptTextProps {
  text: string;
  className?: string;
  speed?: number;
}

const CHAR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

function randomChar(): string {
  return CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];
}

export function DecryptText({ text, className = '', speed = 30 }: DecryptTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [resolvedCount, setResolvedCount] = useState(0);

  const generateDisplay = useCallback(
    (resolved: number): string => {
      let result = '';
      for (let i = 0; i < text.length; i++) {
        if (i < resolved) {
          result += text[i];
        } else if (text[i] === ' ') {
          result += ' ';
        } else {
          result += randomChar();
        }
      }
      return result;
    },
    [text],
  );

  useEffect(() => {
    if (resolvedCount >= text.length) {
      setDisplayed(text);
      return;
    }

    const scrambleInterval = setInterval(() => {
      setDisplayed(generateDisplay(resolvedCount));
    }, 40);

    const resolveTimeout = setTimeout(() => {
      setResolvedCount((prev) => prev + 1);
    }, speed);

    return () => {
      clearInterval(scrambleInterval);
      clearTimeout(resolveTimeout);
    };
  }, [resolvedCount, text, speed, generateDisplay]);

  useEffect(() => {
    setDisplayed(generateDisplay(0));
    setResolvedCount(0);
  }, [text, generateDisplay]);

  return (
    <span className={`font-mono ${className}`} aria-label={text}>
      {displayed}
    </span>
  );
}
