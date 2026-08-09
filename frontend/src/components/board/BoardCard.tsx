/**
 * Tarjeta individual del tablero de brainstorming.
 * Drag con pointer events, edición con doble-click.
 */

import { useState, useRef, useCallback } from 'react';
import { apiErrorMessage, apiFetch } from '@/lib/api';
import { useBoardStore } from '@/stores/boardStore';
import { VoteButton } from './VoteButton';
import type { BoardCard as BoardCardType } from '@/stores/boardStore';
import type { CardDragPhase, RemoteBoardPeer } from '@/hooks/useBoardSync';

interface BoardCardProps {
  card: BoardCardType;
  isLeader: boolean;
  teamId: string;
  onSelectWinner?: (cardId: string) => void;
  winnerMode?: boolean;
  remotePeer?: RemoteBoardPeer;
  onFocusSignal: (cardId: string | null) => void;
  onDragSignal: (signal: {
    cardId: string;
    x: number;
    y: number;
    phase: CardDragPhase;
  }) => void;
}

export function BoardCard({
  card,
  teamId,
  onSelectWinner,
  winnerMode,
  remotePeer,
  onFocusSignal,
  onDragSignal,
}: BoardCardProps) {
  const [dragging, setDragging] = useState(false);
  const [localPos, setLocalPos] = useState({ x: card.x, y: card.y });
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const [operationError, setOperationError] = useState<string | null>(null);

  const dragOffset = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const localPosRef = useRef({ x: card.x, y: card.y });
  const previousPosRef = useRef({ x: card.x, y: card.y });
  const cardRef = useRef<HTMLDivElement>(null);

  const remoteDrag = remotePeer?.dragging?.cardId === card.id ? remotePeer.dragging : undefined;
  const displayX = dragging ? localPos.x : (remoteDrag?.x ?? card.x);
  const displayY = dragging ? localPos.y : (remoteDrag?.y ?? card.y);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editing || winnerMode || (e.target as HTMLElement).closest('button, textarea')) return;
      e.preventDefault();
      e.stopPropagation();

      const canvasRect = cardRef.current?.parentElement?.getBoundingClientRect();
      if (!canvasRect) return;

      const pointerX = e.clientX - canvasRect.left;
      const pointerY = e.clientY - canvasRect.top;

      dragOffset.current = {
        x: pointerX - displayX,
        y: pointerY - displayY,
      };

      const position = { x: displayX, y: displayY };
      previousPosRef.current = { x: card.x, y: card.y };
      localPosRef.current = position;
      draggingRef.current = true;
      setLocalPos(position);
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      onFocusSignal(card.id);
      onDragSignal({ cardId: card.id, ...position, phase: 'start' });
    },
    [card.id, card.x, card.y, editing, winnerMode, displayX, displayY, onFocusSignal, onDragSignal],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();

      const canvasRect = cardRef.current?.parentElement?.getBoundingClientRect();
      if (!canvasRect) return;
      const newX = Math.max(
        0,
        Math.min(1000, e.clientX - canvasRect.left - dragOffset.current.x),
      );
      const newY = Math.max(
        0,
        Math.min(720, e.clientY - canvasRect.top - dragOffset.current.y),
      );

      const position = { x: newX, y: newY };
      localPosRef.current = position;
      setLocalPos(position);
      onDragSignal({ cardId: card.id, ...position, phase: 'move' });
    },
    [card.id, onDragSignal],
  );

  const handlePointerUp = useCallback(
    async (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setDragging(false);

      const store = useBoardStore.getState();
      const position = localPosRef.current;
      const previous = previousPosRef.current;
      store.moveCard(card.id, position.x, position.y);
      onDragSignal({ cardId: card.id, ...position, phase: 'end' });
      setOperationError(null);

      try {
        await apiFetch(`/v1/teams/${teamId}/board/cards/${card.id}/move`, {
          method: 'POST',
          body: JSON.stringify(position),
        });
      } catch (error: unknown) {
        store.moveCard(card.id, previous.x, previous.y);
        localPosRef.current = previous;
        setLocalPos(previous);
        onDragSignal({ cardId: card.id, ...previous, phase: 'cancel' });
        setOperationError(apiErrorMessage(error, 'Could not save the new position.'));
      }
    },
    [card.id, teamId, onDragSignal],
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      const previous = previousPosRef.current;
      localPosRef.current = previous;
      setLocalPos(previous);
      onDragSignal({ cardId: card.id, ...previous, phase: 'cancel' });
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [card.id, onDragSignal],
  );

  const handleDoubleClick = () => {
    if (winnerMode) return;
    onFocusSignal(card.id);
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
    setOperationError(null);

    try {
      await apiFetch(`/v1/teams/${teamId}/board/cards/${card.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      });
    } catch (error: unknown) {
      store.updateCard(card.id, card.content);
      setEditContent(card.content);
      setOperationError(apiErrorMessage(error, 'Could not save this card.'));
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
      className={`absolute w-[200px] min-h-[80px] rounded-lg border shadow-lg select-none ease-out
        bg-white border-gray-200 dark:bg-[#0d0f17] dark:border-[#202832] ${
        dragging
          ? 'shadow-xl z-50 cursor-grabbing will-change-transform transition-none'
          : remoteDrag
            ? 'shadow-xl z-50 cursor-grabbing will-change-transform transition-transform duration-75'
            : 'cursor-grab z-10 transition-[box-shadow,transform] duration-100'
      } ${card.isWinner ? 'ring-2 ring-amber' : ''} ${
        winnerMode ? 'hover:ring-2 hover:ring-accent cursor-pointer' : ''
      }`}
      style={{
        transform: `translate(${displayX}px, ${displayY}px) scale(${dragging || remoteDrag ? 1.015 : 1})`,
        boxShadow: remotePeer ? `0 0 0 2px ${remotePeer.color}, 0 14px 30px rgba(0,0,0,.3)` : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
    >
      {remotePeer && (
        <div
          className="pointer-events-none absolute -top-7 left-0 max-w-[180px] truncate rounded-md px-2 py-1 text-[10px] font-semibold text-slate-950 shadow-lg"
          style={{ backgroundColor: remotePeer.color }}
        >
          {remotePeer.displayName} {remoteDrag ? 'is moving' : 'selected'}
        </div>
      )}
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
            className="w-full bg-transparent text-[#111318] dark:text-white text-sm resize-none outline-none border-b border-accent"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            autoFocus
            rows={3}
          />
        ) : (
          <p className="text-sm text-[#111318] dark:text-white leading-relaxed break-words whitespace-pre-wrap">
            {card.content}
          </p>
        )}

        {/* Footer: votes + creator */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-[#202832]">
          <VoteButton
            cardId={card.id}
            votes={card.votes}
            myVote={card.myVote}
            teamId={teamId}
          />
          <div
            className="w-5 h-5 rounded-full bg-gray-100 dark:bg-[#15191e] border border-gray-200 dark:border-[#202832] flex items-center justify-center text-[8px] font-bold text-gray-500 dark:text-[#9da6b1]"
            title={card.createdBy}
          >
            {initials}
          </div>
        </div>
        {operationError && (
          <p role="alert" className="mt-2 text-[10px] leading-tight text-red-400">
            {operationError}
          </p>
        )}
      </div>
    </div>
  );
}
