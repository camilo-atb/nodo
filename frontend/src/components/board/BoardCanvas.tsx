/**
 * Superficie del tablero de brainstorming.
 * Área fija 1200x800 con grid de puntos.
 */

import { useBoardStore } from '@/stores/boardStore';
import { BoardCard } from './BoardCard';
import { EmptyState } from '@/components/base/EmptyState';
import type { CardDragPhase, RemoteBoardPeer } from '@/hooks/useBoardSync';

interface BoardCanvasProps {
  teamId: string;
  isLeader: boolean;
  winnerMode: boolean;
  onSelectWinner: (cardId: string) => void;
  remotePeers: RemoteBoardPeer[];
  onCursorSignal: (point: { x: number; y: number }) => void;
  onFocusSignal: (cardId: string | null) => void;
  onDragSignal: (signal: {
    cardId: string;
    x: number;
    y: number;
    phase: CardDragPhase;
  }) => void;
}

export function BoardCanvas({
  teamId,
  isLeader,
  winnerMode,
  onSelectWinner,
  remotePeers,
  onCursorSignal,
  onFocusSignal,
  onDragSignal,
}: BoardCanvasProps) {
  const cards = useBoardStore((s) => s.cards);
  const cardArray = Array.from(cards.values());

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-4">
      <div
        className="relative w-[1200px] h-[800px] rounded-xl border border-border bg-panel shrink-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onCursorSignal({
            x: Math.max(0, Math.min(1200, event.clientX - rect.left)),
            y: Math.max(0, Math.min(800, event.clientY - rect.top)),
          });
        }}
        onPointerDown={() => onFocusSignal(null)}
      >
        {cardArray.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <EmptyState
              title="Start brainstorming!"
              description="Add your first idea."
            />
          </div>
        ) : (
          cardArray.map((card) => (
            <BoardCard
              key={card.id}
              card={card}
              isLeader={isLeader}
              teamId={teamId}
              winnerMode={winnerMode}
              onSelectWinner={onSelectWinner}
              remotePeer={remotePeers.find(
                (peer) =>
                  peer.dragging?.cardId === card.id || peer.focusedCardId === card.id,
              )}
              onFocusSignal={onFocusSignal}
              onDragSignal={onDragSignal}
            />
          ))
        )}

        {remotePeers.map((peer) =>
          peer.cursor ? (
            <div
              key={peer.personId}
              className="pointer-events-none absolute left-0 top-0 z-[100] will-change-transform transition-transform duration-75 ease-out"
              style={{ transform: `translate(${peer.cursor.x}px, ${peer.cursor.y}px)` }}
            >
              <svg
                width="20"
                height="24"
                viewBox="0 0 20 24"
                fill="none"
                className="drop-shadow-md"
                aria-hidden="true"
              >
                <path
                  d="M2 2L17 12.1L10.2 13.5L6.6 21.5L2 2Z"
                  fill={peer.color}
                  stroke="#081018"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                className="absolute left-4 top-4 max-w-40 truncate whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-semibold text-slate-950 shadow-lg"
                style={{ backgroundColor: peer.color }}
              >
                {peer.displayName}
              </span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
