/**
 * Barra de countdown — usa el endsAt del servidor.
 * Transición de color: accent → amber → red conforme se acaba el tiempo.
 */

import { useState, useEffect, useRef } from 'react';
import { useChallengeStore } from '@/stores/challengeStore';

export function TimerBar() {
  const endsAt = useChallengeStore((s) => s.endsAt);
  const [remaining, setRemaining] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!endsAt) {
      setRemaining(0);
      setTotalDuration(0);
      return;
    }

    // Calculate total duration when question appears
    const now = Date.now();
    const duration = Math.max(0, endsAt - now);
    setTotalDuration(duration);
    setRemaining(duration);

    // Update every 50ms for smooth animation
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, endsAt - Date.now());
      setRemaining(left);
      if (left <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endsAt]);

  const seconds = Math.ceil(remaining / 1000);
  const fraction = totalDuration > 0 ? remaining / totalDuration : 0;

  // Color transition: accent (>50%) → amber (20-50%) → red (<20%)
  let barColor = 'bg-accent';
  let textColor = 'text-accent';
  if (fraction < 0.2) {
    barColor = 'bg-red';
    textColor = 'text-red';
  } else if (fraction < 0.5) {
    barColor = 'bg-amber';
    textColor = 'text-amber';
  }

  if (!endsAt) return null;

  if (remaining === 0) {
    return (
      <div className="w-full text-center">
        <p className="text-muted font-medium text-sm">Waiting for results...</p>
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
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${fraction * 100}%`, transition: 'width 50ms linear' }}
        />
      </div>
    </div>
  );
}
