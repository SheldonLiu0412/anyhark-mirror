'use client';

import { useState } from 'react';
import { DimensionResult } from '@/lib/types';
import { DIMENSIONS } from '@/lib/dimensions';

function getScoreHint(score: number, hints: { low: string; mid: string; high: string }) {
  if (score <= 3) return hints.low;
  if (score <= 6) return hints.mid;
  return hints.high;
}

interface DimensionPanelProps {
  dimensions: DimensionResult[];
}

export function DimensionPanel({ dimensions }: DimensionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!dimensions || dimensions.length === 0) return null;

  return (
    <div className="mt-2.5 mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        >
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
        镜面分析
      </button>

      {isOpen && (
        <div className="mt-2 flex flex-col gap-2 animate-fade-in">
          {dimensions.map((dim) => (
            <div
              key={dim.id}
              className="relative overflow-hidden rounded-lg border border-white/[0.06] px-3 py-2 transition-all duration-300 hover:border-white/[0.1]"
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, ${dim.color}06 100%)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
              }}
            >
              {/* Top shimmer */}
              <div
                className="absolute inset-x-0 top-0 h-px opacity-30"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${dim.color}40 50%, transparent 100%)`,
                }}
              />

              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: dim.color,
                    boxShadow: `0 0 4px ${dim.color}50`,
                  }}
                />
                <span className="text-[10px] font-semibold tracking-wider" style={{ color: dim.color }}>
                  {DIMENSIONS[dim.id].name}
                </span>
                <span className="text-[9px] text-text-tertiary/50">
                  {DIMENSIONS[dim.id].subtitle}
                </span>
                {/* Mini score bar */}
                <div className="ml-auto flex items-center gap-1">
                  <div className="h-[3px] w-8 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${dim.score * 10}%`,
                        background: `linear-gradient(90deg, ${dim.color}80, ${dim.color})`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-text-tertiary">{dim.score}</span>
                </div>
              </div>
              <p className="text-[11px] leading-[17px] text-text-secondary/80">
                {dim.analysis}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
