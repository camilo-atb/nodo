/**
 * Toggle de voto para una tarjeta del board.
 */

import { useState } from 'react';
import { apiErrorMessage, apiFetch } from '@/lib/api';
import { useBoardStore } from '@/stores/boardStore';

interface VoteButtonProps {
  cardId: string;
  votes: number;
  myVote: boolean;
  teamId: string;
}

export function VoteButton({ cardId, votes, myVote, teamId }: VoteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      let result: { votes: number };
      if (myVote) {
        result = await apiFetch<{ votes: number }>(`/v1/teams/${teamId}/board/cards/${cardId}/vote`, {
          method: 'DELETE',
        });
      } else {
        result = await apiFetch<{ votes: number }>(`/v1/teams/${teamId}/board/cards/${cardId}/vote`, {
          method: 'POST',
        });
      }
      useBoardStore.getState().setVotes(cardId, result.votes, !myVote);
    } catch (error: unknown) {
      setError(apiErrorMessage(error, 'Could not update your vote.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      onPointerDown={(event) => event.stopPropagation()}
      disabled={loading}
      className="flex items-center gap-1 text-xs transition-colors hover:scale-105 active:scale-95 disabled:opacity-50"
      aria-label={myVote ? 'Remove vote' : 'Add vote'}
      title={error ?? undefined}
    >
      {myVote ? (
        <svg
          className="w-4 h-4 text-red fill-current"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 text-gray-400 dark:text-[#68717d]"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      )}
      <span className={myVote ? 'text-red font-semibold' : 'text-gray-400 dark:text-[#68717d]'}>
        {votes}
      </span>
      {error && <span className="text-red-400" aria-label={error}>!</span>}
    </button>
  );
}
