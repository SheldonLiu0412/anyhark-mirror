'use client';

import { useEffect, useRef } from 'react';
import { DimensionResult } from '@/lib/types';
import { DIMENSION_ORDER } from '@/lib/dimensions';

function colorWithAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(255,255,255,${alpha})`;
}

interface RadarChartProps {
  dimensions: DimensionResult[];
  size?: number;
}

const DIMENSION_META: Record<string, { angle: number; label: string }> = {
  feeling:   { angle: -Math.PI / 2,    label: 'Feeling' },
  intuition: { angle: 0,               label: 'Intuition' },
  sensing:   { angle: Math.PI / 2,     label: 'Sensing' },
  thinking:  { angle: Math.PI,         label: 'Thinking' },
};

export function RadarChart({ dimensions, size = 240 }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTime = useRef<number>(0);
  const currentScores = useRef<Record<string, number>>({
    feeling: 0, intuition: 0, sensing: 0, thinking: 0,
  });
  const targetScoresRef = useRef<Record<string, number>>({
    feeling: 0, intuition: 0, sensing: 0, thinking: 0,
  });
  const colorsRef = useRef<Record<string, string>>({
    feeling: 'rgba(255,255,255,0.3)',
    intuition: 'rgba(255,255,255,0.3)',
    sensing: 'rgba(255,255,255,0.3)',
    thinking: 'rgba(255,255,255,0.3)',
  });

  const center = size / 2;
  const maxRadius = size / 2 - 50;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!startTime.current) startTime.current = performance.now();

    for (const dim of dimensions) {
      targetScoresRef.current[dim.id] = dim.score / 10;
      colorsRef.current[dim.id] = dim.color;
    }

    let running = true;

    const draw = (now: number) => {
      if (!running) return;

      const t = (now - startTime.current) / 1000; // seconds elapsed
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // Smooth spring-like interpolation
      for (const id of DIMENSION_ORDER) {
        const target = targetScoresRef.current[id];
        const current = currentScores.current[id];
        const diff = target - current;
        // Faster approach when far, gentle settle when close
        const speed = Math.abs(diff) > 0.05 ? 0.1 : 0.04;
        currentScores.current[id] = current + diff * speed;
      }

      // Breathing pulse for the whole chart
      const breathe = 1 + Math.sin(t * 1.2) * 0.008;

      // ── Grid rings with breathing alpha ──
      for (let i = 1; i <= 4; i++) {
        const r = (maxRadius / 4) * i;
        ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          const dim = DIMENSION_ORDER[j];
          const { angle } = DIMENSION_META[dim];
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const ringAlpha = i === 4 ? 0.08 : 0.03 + Math.sin(t * 0.8 + i) * 0.015;
        ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Axis lines with pulsing ends ──
      for (let idx = 0; idx < DIMENSION_ORDER.length; idx++) {
        const id = DIMENSION_ORDER[idx];
        const { angle } = DIMENSION_META[id];
        const endX = center + Math.cos(angle) * maxRadius;
        const endY = center + Math.sin(angle) * maxRadius;

        // Gradient axis line
        const lineGrad = ctx.createLinearGradient(center, center, endX, endY);
        lineGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
        lineGrad.addColorStop(1, colorWithAlpha(colorsRef.current[id], 0.12 + Math.sin(t * 1.5 + idx) * 0.04));
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // ── Data polygon ──
      const points: { x: number; y: number; color: string; score: number }[] = [];
      for (const id of DIMENSION_ORDER) {
        const { angle } = DIMENSION_META[id];
        const score = currentScores.current[id];
        const r = score * maxRadius * breathe;
        points.push({
          x: center + Math.cos(angle) * r,
          y: center + Math.sin(angle) * r,
          color: colorsRef.current[id],
          score,
        });
      }

      const totalScore = points.reduce((s, p) => s + p.score, 0);

      if (totalScore > 0.01) {
        // Outer glow layer
        ctx.save();
        ctx.filter = 'blur(16px)';
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        const glowAlpha = 0.12 + Math.sin(t * 1.5) * 0.04;
        ctx.fillStyle = `rgba(56, 189, 248, ${glowAlpha})`;
        ctx.fill();
        ctx.restore();

        // Fill polygon with gradient
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        const fillGrad = ctx.createRadialGradient(center, center, 0, center, center, maxRadius);
        fillGrad.addColorStop(0, `rgba(56, 189, 248, ${0.04 + Math.sin(t) * 0.02})`);
        fillGrad.addColorStop(1, `rgba(56, 189, 248, ${0.1 + Math.sin(t) * 0.03})`);
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // Stroke with animated dash
        ctx.beginPath();
        points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 + Math.sin(t * 2) * 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ── Vertices with glow rings ──
        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          if (point.score < 0.01) continue;

          const pulsePhase = t * 2.5 + i * 1.5;
          const pulseSize = 3 + Math.sin(pulsePhase) * 0.8;

          // Outer glow ring
          const ringSize = 10 + Math.sin(pulsePhase) * 3;
          ctx.beginPath();
          ctx.arc(point.x, point.y, ringSize, 0, Math.PI * 2);
          const ringGrad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, ringSize);
          ringGrad.addColorStop(0, colorWithAlpha(point.color, 0.15));
          ringGrad.addColorStop(0.5, colorWithAlpha(point.color, 0.05));
          ringGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = ringGrad;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(point.x, point.y, pulseSize, 0, Math.PI * 2);
          ctx.fillStyle = point.color;
          ctx.fill();

          // Inner bright spot
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = colorWithAlpha(point.color, 0.9);
          ctx.fill();
        }
      }

      // ── Labels ──
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < DIMENSION_ORDER.length; i++) {
        const id = DIMENSION_ORDER[i];
        const { angle, label } = DIMENSION_META[id];
        const labelR = maxRadius + 22;
        const x = center + Math.cos(angle) * labelR;
        const y = center + Math.sin(angle) * labelR;
        const score = currentScores.current[id];
        const labelAlpha = score > 0.01 ? 0.7 + Math.sin(t * 1.5 + i) * 0.15 : 0.3;
        ctx.font = `${score > 0.01 ? '600' : '400'} 11px system-ui, sans-serif`;
        ctx.fillStyle = colorWithAlpha(colorsRef.current[id], labelAlpha);
        ctx.fillText(label, x, y);
      }

      // ── Center dot pulse ──
      const centerPulse = 2 + Math.sin(t * 1.8) * 0.5;
      ctx.beginPath();
      ctx.arc(center, center, centerPulse, 0, Math.PI * 2);
      const cGrad = ctx.createRadialGradient(center, center, 0, center, center, centerPulse);
      cGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
      cGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = cGrad;
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [dimensions, size, center, maxRadius]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="mx-auto"
    />
  );
}
