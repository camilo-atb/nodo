/**
 * Toggle de voto para una tarjeta del board.
 */

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useBoardStore } from '@/stores/boardStore';

interface VoteButtonProps {
  cardId: string;
  votes: number;
  myVote: boolean;
  teamId: string;
}

export function VoteButton({ cardId, votes, myVote, teamId }: VoteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (myVote) {
        await apiFetch(`/v1/teams/${teamId}/board/cards/${cardId}/vote`, {
          method: 'DELETE',
        });
      } else {
        await apiFetch(`/v1/teams/${teamId}/board/cards/${cardId}/vote`, {
          method: 'POST',
        });
      }
    } catch {
      // Mock mode: toggle locally
      const store = useBoardStore.getState();
      const newVotes = myVote ? votes - 1 : votes + 1;
      store.setVotes(cardId, Math.max(0, newVotes), !myVote);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-1 text-xs transition-colors hover:scale-105 active:scale-95 disabled:opacity-50"
      aria-label={myVote ? 'Remove vote' : 'Add vote'}
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
          className="w-4 h-4 text-muted"
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
      <span className={myVote ? 'text-red font-semibold' : 'text-muted'}>
        {votes}
      </span>
    </button>
  );
}
