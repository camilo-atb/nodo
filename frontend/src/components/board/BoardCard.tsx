/**
 * Tarjeta individual del tablero de brainstorming.
 * Drag con pointer events, edición con doble-click.
 */

import { useState, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useBoardStore } from '@/stores/boardStore';
import { VoteButton } from './VoteButton';
import type { BoardCard as BoardCardType } from '@/stores/boardStore';

interface BoardCardProps {
  card: BoardCardType;
  isLeader: boolean;
  teamId: string;
  onSelectWinner?: (cardId: string) => void;
  winnerMode?: boolean;
}

export function BoardCard({ card, teamId, onSelectWinner, winnerMode }: BoardCardProps) {
  const [dragging, setDragging] = useState(false);
  const [localPos, setLocalPos] = useState({ x: card.x, y: card.y });
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);

  const dragOffset = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Sync position from store when not dragging
  const displayX = dragging ? localPos.x : card.x;
  const displayY = dragging ? localPos.y : card.y;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editing || winnerMode) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = cardRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;

      dragOffset.current = {
        x: e.clientX - displayX,
        y: e.clientY - displayY,
      };

      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [editing, winnerMode, displayX, displayY],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.preventDefault();

      const newX = Math.max(0, Math.min(1000, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(720, e.clientY - dragOffset.current.y));

      setLocalPos({ x: newX, y: newY });
    },
    [dragging],
  );

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent) => {
      if (!dragging) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragging(false);

      const store = useBoardStore.getState();
      store.moveCard(card.id, localPos.x, localPos.y);

      try {
        await apiFetch(`/v1/teams/${teamId}/board/cards/${card.id}/move`, {
          method: 'POST',
          body: JSON.stringify({ x: localPos.x, y: localPos.y }),
        });
      } catch {
        // Mock mode: position already updated locally
      }
    },
    [dragging, localPos, card.id, teamId],
  );

  const handleDoubleClick = () => {
    if (winnerMode) return;
    setEditing(true);
    setEditContent(card.content);
  };

  const handleEditBlur = async () => {
    setEditing(false);
    if (editContent.trim() === card.content) return;

    const content = editContent.trim();
    if (!content) return;

    const store = useBoardStore.getState();
    store.updateCard(card.id, content);

    try {
      await apiFetch(`/v1/teams/${teamId}/board/cards/${card.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
    } catch {
      // Mock mode: content already updated locally
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
    if (e.key === 'Escape') {
      setEditContent(card.content);
      setEditing(false);
    }
  };

  const handleClick = () => {
    if (winnerMode && onSelectWinner) {
      onSelectWinner(card.id);
    }
  };

  const initials = card.createdBy.slice(0, 2).toUpperCase();

  return (
    <div
      ref={cardRef}
      className={`absolute w-[200px] min-h-[80px] rounded-lg border border-border bg-panel shadow-lg select-none transition-shadow ${
        dragging ? 'shadow-xl z-50 cursor-grabbing' : 'cursor-grab z-10'
      } ${card.isWinner ? 'ring-2 ring-amber' : ''} ${
        winnerMode ? 'hover:ring-2 hover:ring-accent cursor-pointer' : ''
      }`}
      style={{
        transform: `translate(${displayX}px, ${displayY}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
    >
      {/* Color bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: card.color }}
      />

      {/* Winner badge */}
      {card.isWinner && (
        <div className="absolute -top-2 -right-2 bg-amber text-bg text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          ★ Winner
        </div>
      )}

      {/* Content */}
      <div className="p-3 pl-4">
        {editing ? (
          <textarea
            className="w-full bg-transparent text-white text-sm resize-none outline-none border-b border-accent"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            autoFocus
            rows={3}
          />
        ) : (
          <p className="text-sm text-white leading-relaxed break-words whitespace-pre-wrap">
            {card.content}
          </p>
        )}

        {/* Footer: votes + creator */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
          <VoteButton
            cardId={card.id}
            votes={card.votes}
            myVote={card.myVote}
            teamId={teamId}
          />
          <div
            className="w-5 h-5 rounded-full bg-panel-3 border border-border flex items-center justify-center text-[8px] font-bold text-muted"
            title={card.createdBy}
          >
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
}
