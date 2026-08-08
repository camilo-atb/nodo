/**
 * Superficie del tablero de brainstorming.
 * Área fija 1200x800 con grid de puntos.
 */

import { useBoardStore } from '@/stores/boardStore';
import { BoardCard } from './BoardCard';
import { EmptyState } from '@/components/base/EmptyState';

interface BoardCanvasProps {
  teamId: string;
  isLeader: boolean;
  winnerMode: boolean;
  onSelectWinner: (cardId: string) => void;
}

export function BoardCanvas({ teamId, isLeader, winnerMode, onSelectWinner }: BoardCanvasProps) {
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
            />
          ))
        )}
      </div>
    </div>
  );
}
