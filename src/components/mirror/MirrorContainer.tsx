'use client';

import { useRef, useState } from 'react';
import { DimensionResult, DimensionId } from '@/lib/types';
import { DIMENSIONS, DIMENSION_ORDER } from '@/lib/dimensions';
import { RadarChart } from './RadarChart';
import { DecryptText } from '@/components/effects/SciFiEffects';

interface MirrorContainerProps {
  dimensions: DimensionResult[];
  isLoading: boolean;
}

// Default placeholder per dimension (before any data arrives)
function makeDefault(id: DimensionId): DimensionResult {
  const cfg = DIMENSIONS[id];
  return { id, name: cfg.name, analysis: '', score: 0, color: cfg.color };
}

export function MirrorContainer({ dimensions, isLoading }: MirrorContainerProps) {
  const [expandedAnnotation, setExpandedAnnotation] = useState<DimensionId | null>(null);
  // Persistent store: always holds 4 dimensions, merges incoming data
  const displayedRef = useRef<Record<DimensionId, DimensionResult>>({
    feeling: makeDefault('feeling'),
    intuition: makeDefault('intuition'),
    sensing: makeDefault('sensing'),
    thinking: makeDefault('thinking'),
  });

  // Merge incoming dimensions into persistent store
  for (const dim of dimensions) {
    displayedRef.current[dim.id] = dim;
  }

  const displayed = displayedRef.current;
  const hasAnyData = DIMENSION_ORDER.some((id) => displayed[id].score > 0);

  // Build a full 4-item array for RadarChart (always 4 entries)
  const radarDimensions = DIMENSION_ORDER.map((id) => displayed[id]);

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Title */}
      <div className="text-center">
        <h2 className="mirror-text text-sm font-semibold tracking-widest uppercase">
          Mirror
        </h2>
      </div>

      {/* Radar Chart */}
      <div className="relative flex items-center justify-center py-2">
        <div className={`transition-opacity duration-700 ${hasAnyData || isLoading ? 'opacity-100' : 'opacity-40'}`}>
          <RadarChart dimensions={radarDimensions} size={260} />
        </div>
        {isLoading && !hasAnyData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full border border-mirror-blue/20 animate-pulse-glow" />
          </div>
        )}
      </div>

      {/* Dimension Details — 4 stable cards, always rendered */}
      <div className="flex flex-col gap-2.5 px-1">
        {DIMENSION_ORDER.map((id) => {
          const dim = displayed[id];
          const hasData = dim.score > 0 && dim.analysis !== '';
          const isUpdating = isLoading && dimensions.some((d) => d.id === id);

          return (
            <div
              key={id}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] p-3 hover:border-white/[0.12]"
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, ${dim.color}06 100%)`,
                boxShadow: `0 0 20px ${dim.color}08, inset 0 1px 0 rgba(255,255,255,0.04)`,
                opacity: hasData ? 1 : 0.35,
                transition: 'opacity 0.5s ease, border-color 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              {/* Top shimmer line */}
              <div
                className="absolute inset-x-0 top-0 h-px opacity-40"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${dim.color}50 50%, transparent 100%)`,
                }}
              />

              <div className="flex items-center gap-2 mb-1.5">
                {/* Glowing dot */}
                <span
                  className="inline-block h-2 w-2 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: dim.color,
                    boxShadow: hasData ? `0 0 6px ${dim.color}60` : 'none',
                  }}
                />
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: dim.color }}>
                  {DIMENSIONS[id].name}
                </span>
                <span className="text-[10px] text-text-tertiary/60">
                  {DIMENSIONS[id].subtitle}
                </span>
                {/* Annotation toggle */}
                <button
                  onClick={() => setExpandedAnnotation(expandedAnnotation === id ? null : id)}
                  className="ml-0.5 text-text-tertiary/40 hover:text-text-tertiary/70 transition-colors"
                  title="查看维度注解"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
                    <text x="6" y="8.5" textAnchor="middle" fill="currentColor" fontSize="7" fontFamily="serif" fontStyle="italic">i</text>
                  </svg>
                </button>

                {/* Score bar */}
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="h-1 w-12 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${dim.score * 10}%`,
                        background: `linear-gradient(90deg, ${dim.color}80, ${dim.color})`,
                        boxShadow: `0 0 4px ${dim.color}40`,
                        transition: 'width 0.7s ease-out',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-text-tertiary w-4 text-right transition-all duration-300">
                    {dim.score > 0 ? dim.score : '–'}
                  </span>
                </div>
              </div>

              {/* Annotation */}
              {expandedAnnotation === id && (
                <p className="text-[10px] leading-[15px] text-text-tertiary/70 mb-1.5 pl-4 border-l border-white/[0.06] animate-fade-in">
                  {DIMENSIONS[id].annotation}
                </p>
              )}

              <p
                className="text-[11px] leading-[18px] text-text-secondary/80 transition-opacity duration-300"
                style={{ opacity: hasData ? 1 : 0 }}
              >
                {dim.analysis || '\u00A0'}
              </p>

              {/* Subtle pulse when this dimension just updated */}
              {isUpdating && (
                <div
                  className="absolute inset-0 rounded-xl pointer-events-none animate-pulse-glow"
                  style={{ boxShadow: `inset 0 0 12px ${dim.color}10` }}
                />
              )}
            </div>
          );
        })}

        {/* Loading hint */}
        {isLoading && dimensions.length < 4 && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] px-3 py-3">
            <div className="h-2 w-2 rounded-full bg-mirror-blue/30 animate-pulse-glow" />
            <DecryptText
              text="维度分析中..."
              className="text-[11px] text-text-tertiary"
              speed={50}
            />
          </div>
        )}
      </div>
    </div>
  );
}
