/**
 * Pantalla de resultados finales del challenge.
 * Muestra score, badge de validación y leaderboard completo.
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useChallengeStore } from '@/stores/challengeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Leaderboard } from './Leaderboard';
import { Button } from '@/components/base/Button';

export function ChallengeResult() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const rankings = useChallengeStore((s) => s.rankings);
  const skillSlug = useChallengeStore((s) => s.skillSlug);
  const totalQuestions = useChallengeStore((s) => s.totalQuestions);
  const personId = useSessionStore((s) => s.personId);

  const myRanking = rankings.find((r) => r.personId === personId);
  const scorePercent = myRanking
    ? Math.round((myRanking.score / totalQuestions) * 100)
    : 0;

  function handleBack() {
    useChallengeStore.getState().reset();
    navigate(`/event/${eventId ?? ''}`);
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Challenge Complete!</h1>
        <p className="text-muted">Results are in</p>
      </div>

      {/* Score badge */}
      {myRanking && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl px-6 py-4 text-center space-y-1">
          <p className="text-sm text-muted">Your result</p>
          <p className="text-xl font-bold text-white">
            Validated: <span className="text-accent">{formatSkill(skillSlug)}</span> — {scorePercent}%
          </p>
          <p className="text-sm text-muted">
            Position #{myRanking.position} • {myRanking.score}/{totalQuestions} correct
          </p>
        </div>
      )}

      {/* Leaderboard */}
      <div className="w-full">
        <Leaderboard />
      </div>

      {/* Back button */}
      <Button onClick={handleBack} variant="secondary" className="mt-4">
        Back to Team
      </Button>
    </div>
  );
}

/** Convierte slug a título legible */
function formatSkill(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
