/**
 * Barra de countdown — usa el endsAt del servidor.
 * Transición de color: accent → amber → red conforme se acaba el tiempo.
 */

import { useState, useEffect, useRef } from 'react';
import { useChallengeStore } from '@/stores/challengeStore';

const TOTAL_DURATION_MS = 30_000; // 30s per question

export function TimerBar() {
  const endsAt = useChallengeStore((s) => s.endsAt);
  const [remaining, setRemaining] = useState(TOTAL_DURATION_MS);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }

    function tick() {
      const now = Date.now();
      const left = Math.max(0, endsAt! - now);
      setRemaining(left);
      if (left > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [endsAt]);

  const seconds = Math.ceil(remaining / 1000);
  const fraction = remaining / TOTAL_DURATION_MS;

  // Color transition: accent (>60%) → amber (30-60%) → red (<30%)
  let barColor = 'bg-accent';
  let textColor = 'text-accent';
  if (fraction < 0.3) {
    barColor = 'bg-red';
    textColor = 'text-red';
  } else if (fraction < 0.6) {
    barColor = 'bg-amber';
    textColor = 'text-amber';
  }

  if (!endsAt) return null;

  if (remaining === 0) {
    return (
      <div className="w-full text-center">
        <p className="text-red font-bold text-lg animate-pulse">Time&apos;s up!</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wide">Time remaining</span>
        <span className={`text-lg font-bold tabular-nums ${textColor}`}>{seconds}s</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-100 ${barColor}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
