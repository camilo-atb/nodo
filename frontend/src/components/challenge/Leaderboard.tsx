/**
 * Leaderboard del challenge — muestra rankings en tiempo real.
 * Destaca al usuario actual y anima cambios de posición.
 */

import { useChallengeStore } from '@/stores/challengeStore';
import { useSessionStore } from '@/stores/sessionStore';

export function Leaderboard() {
  const rankings = useChallengeStore((s) => s.rankings);
  const personId = useSessionStore((s) => s.personId);

  if (rankings.length === 0) {
    return (
      <div className="text-center text-muted text-sm py-4">
        Waiting for results...
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="text-xs uppercase tracking-wide text-muted mb-3 font-semibold">
        Leaderboard
      </h3>
      <ul className="space-y-1.5">
        {rankings.map((entry) => {
          const isMe = entry.personId === personId;
          return (
            <li
              key={entry.personId}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300
                ${isMe ? 'bg-accent/10 border border-accent/30' : 'bg-white/[0.03]'}
              `}
            >
              <span className={`text-sm font-bold w-6 text-center ${isMe ? 'text-accent' : 'text-muted'}`}>
                #{entry.position}
              </span>
              <span className={`flex-1 text-sm truncate ${isMe ? 'text-white font-semibold' : 'text-muted'}`}>
                {entry.displayName}
                {isMe && <span className="ml-1 text-accent text-xs">(you)</span>}
              </span>
              <span className={`text-sm font-bold tabular-nums ${isMe ? 'text-accent' : 'text-white'}`}>
                {entry.score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
