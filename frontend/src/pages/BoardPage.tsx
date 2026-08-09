/**
 * Página del tablero de brainstorming.
 * Route: /event/:eventId/team/:teamId/board
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiErrorMessage, apiFetch } from '@/lib/api';
import { useBoardStore } from '@/stores/boardStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useBoardSync } from '@/hooks/useBoardSync';
import { fetchPortalToken, portal } from '@/lib/portal';
import { BoardToolbar } from '@/components/board/BoardToolbar';
import { BoardCanvas } from '@/components/board/BoardCanvas';
import { Spinner } from '@/components/base/Spinner';
import type { BoardCard, BoardSnapshot, TeamResponse } from '@nodo/contracts';
import type { BoardMember } from '@/hooks/useBoardSync';

export function BoardPage() {
  const { teamId, eventId } = useParams<{ eventId: string; teamId: string }>();
  const personId = useSessionStore((s) => s.personId);
  const [winnerMode, setWinnerMode] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isLeader = personId !== null && personId === leadId;

  // Set teamId in store and fetch initial cards
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;

    const store = useBoardStore.getState();
    store.setTeamId(teamId);
    setLoading(true);
    setLoadError(null);

    // Team membership may have changed since the last Portal token was minted.
    portal.setToken(fetchPortalToken);

    const fetchBoard = async () => {
      try {
        const [board, team] = await Promise.all([
          apiFetch<BoardSnapshot>(`/v1/teams/${teamId}/board`),
          apiFetch<TeamResponse>(`/v1/teams/${teamId}`),
        ]);
        if (cancelled) return;

        const cardsWithMyVote = board.cards.map((card) => ({
          ...card,
          myVote: card.myVote ?? false,
        }));
        store.loadCards(cardsWithMyVote);
        setLeadId(team.team.lead.id);
        setMembers(team.team.members);
      } catch (error: unknown) {
        if (!cancelled) {
          setLoadError(apiErrorMessage(error, 'Could not load this board.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchBoard();

    return () => {
      cancelled = true;
      useBoardStore.getState().reset();
      setMembers([]);
    };
  }, [teamId]);

  // Subscribe to board events via Portal
  const {
    status: realtimeStatus,
    remotePeers,
    sendCursor,
    sendFocus,
    sendDrag,
  } = useBoardSync({ teamId: teamId ?? null, members });

  const handleCreateCard = useCallback(
    async (color: string) => {
      if (!teamId) return;

      const x = 100 + Math.random() * 800;
      const y = 100 + Math.random() * 500;
      const content = 'New idea...';

      setActionError(null);
      try {
        const card = await apiFetch<BoardCard>(
          `/v1/teams/${teamId}/board/cards`,
          {
            method: 'POST',
            body: JSON.stringify({ content, x, y, color }),
          },
        );
        useBoardStore.getState().addCard({ ...card, myVote: false });
      } catch (error: unknown) {
        setActionError(apiErrorMessage(error, 'Could not create the card.'));
      }
    },
    [teamId],
  );

  const handleSelectWinner = useCallback(
    async (cardId: string) => {
      if (!teamId) return;
      setWinnerMode(false);
      setActionError(null);

      try {
        await apiFetch(`/v1/teams/${teamId}/board/winner`, {
          method: 'POST',
          body: JSON.stringify({ cardId }),
        });
        useBoardStore.getState().setWinner(cardId);
      } catch (error: unknown) {
        setActionError(apiErrorMessage(error, 'Could not select the winning card.'));
      }
    },
    [teamId],
  );

  const navigate = useNavigate();

  if (!teamId) return null;

  if (loading) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4">
        <p role="alert" className="text-sm text-red-400">{loadError}</p>
        <button
          onClick={() => navigate(`/event/${eventId}/team/${teamId}`)}
          className="text-sm text-accent hover:underline"
        >
          Back to Team
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Back button */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <button
          onClick={() => navigate(`/event/${eventId}`)}
          className="text-xs text-muted hover:text-white transition-colors flex items-center gap-1"
        >
          ← Back to Graph
        </button>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span
            className={`h-2 w-2 rounded-full ${realtimeStatus === 'ready' ? 'bg-green-400' : 'bg-amber-400'}`}
          />
          Realtime: {realtimeStatus ?? 'connecting'}
        </div>
      </div>
      {actionError && (
        <div role="alert" className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {actionError}
        </div>
      )}
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
        remotePeers={remotePeers}
        onCursorSignal={sendCursor}
        onFocusSignal={sendFocus}
        onDragSignal={sendDrag}
      />
    </div>
  );
}
