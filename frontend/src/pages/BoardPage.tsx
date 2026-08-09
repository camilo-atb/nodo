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
    <div className="flex flex-col h-screen bg-[#f7f8fa] dark:bg-[#07090c]">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between
        bg-white border-gray-200
        dark:bg-[#0a0c0f] dark:border-[#202832]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/event/${eventId}`)}
            className="text-xs text-gray-500 hover:text-[#111318] dark:text-[#9da6b1] dark:hover:text-white transition-colors flex items-center gap-1"
          >
            ← Back to Graph
          </button>
          <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-[#202832]" />
          <div className="hidden sm:block">
            <span className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">Ideas Board</span>
            <span className="text-[10px] text-gray-400 dark:text-[#68717d] ml-2">Brainstorming</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-[#68717d]">
            <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === 'ready' ? 'bg-[#21d69a] shadow-[0_0_8px_#21d69a]' : 'bg-amber-400'}`} />
            {realtimeStatus === 'ready' ? 'Realtime' : 'Connecting'}
          </span>
          <button
            onClick={() => { document.documentElement.classList.toggle('dark'); localStorage.setItem('nodo-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light'); }}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors
              border-gray-200 text-gray-500 hover:bg-gray-50
              dark:border-[#202832] dark:text-[#9da6b1] dark:hover:bg-[#15191e]"
            aria-label="Toggle theme"
          >
            <svg className="w-3.5 h-3.5 hidden dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <svg className="w-3.5 h-3.5 dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          </button>
        </div>
      </div>
      {actionError && (
        <div role="alert" className="border-b border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-300">
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
