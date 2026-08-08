/**
 * Página del tablero de brainstorming.
 * Route: /event/:eventId/team/:teamId/board
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useBoardStore } from '@/stores/boardStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useBoardSync } from '@/hooks/useBoardSync';
import { BoardToolbar } from '@/components/board/BoardToolbar';
import { BoardCanvas } from '@/components/board/BoardCanvas';
import type { BoardCard } from '@/stores/boardStore';

interface BoardResponse {
  cards: BoardCard[];
}

export function BoardPage() {
  const { teamId } = useParams<{ eventId: string; teamId: string }>();
  const personId = useSessionStore((s) => s.personId);
  const [winnerMode, setWinnerMode] = useState(false);

  // TODO: determine isLeader from team membership data
  // For now we treat current user as leader for demo purposes
  const isLeader = true;

  // Set teamId in store and fetch initial cards
  useEffect(() => {
    if (!teamId) return;

    const store = useBoardStore.getState();
    store.setTeamId(teamId);

    const fetchCards = async () => {
      try {
        const data = await apiFetch<BoardResponse>(`/v1/teams/${teamId}/board`);
        const cardsWithMyVote = data.cards.map((card) => ({
          ...card,
          myVote: card.myVote ?? false,
        }));
        store.loadCards(cardsWithMyVote);
      } catch {
        // Mock mode: start with empty board
        store.loadCards([]);
      }
    };

    fetchCards();

    return () => {
      useBoardStore.getState().reset();
    };
  }, [teamId]);

  // Subscribe to board events via Portal
  useBoardSync({ teamId: teamId ?? null });

  const handleCreateCard = useCallback(
    async (color: string) => {
      if (!teamId) return;

      const x = 100 + Math.random() * 800;
      const y = 100 + Math.random() * 500;
      const content = 'New idea...';

      try {
        const card = await apiFetch<BoardCard>(
          `/v1/teams/${teamId}/board/cards`,
          {
            method: 'POST',
            body: JSON.stringify({ content, x, y, color }),
          },
        );
        useBoardStore.getState().addCard({ ...card, myVote: false });
      } catch {
        // Mock mode: create local card
        const mockCard: BoardCard = {
          id: `card_${Date.now()}`,
          content,
          x: Math.round(x),
          y: Math.round(y),
          color,
          createdBy: personId ?? 'anonymous',
          votes: 0,
          isWinner: false,
          myVote: false,
        };
        useBoardStore.getState().addCard(mockCard);
      }
    },
    [teamId, personId],
  );

  const handleSelectWinner = useCallback(
    async (cardId: string) => {
      if (!teamId) return;
      setWinnerMode(false);

      try {
        await apiFetch(`/v1/teams/${teamId}/board/winner`, {
          method: 'POST',
          body: JSON.stringify({ cardId }),
        });
      } catch {
        // Mock mode: set winner locally
        useBoardStore.getState().setWinner(cardId);
      }
    },
    [teamId],
  );

  if (!teamId) return null;

  return (
    <div className="flex flex-col h-screen bg-bg">
      <BoardToolbar
        teamId={teamId}
        isLeader={isLeader}
        onCreateCard={handleCreateCard}
        winnerMode={winnerMode}
        onToggleWinnerMode={() => setWinnerMode((v) => !v)}
      />
      <BoardCanvas
        teamId={teamId}
        isLeader={isLeader}
        winnerMode={winnerMode}
        onSelectWinner={handleSelectWinner}
      />
    </div>
  );
}
