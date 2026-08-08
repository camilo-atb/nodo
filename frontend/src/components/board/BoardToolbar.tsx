/**
 * Barra superior del tablero de brainstorming.
 * Permite crear tarjetas, elegir color, y activar modo "Select Winner" (solo líder).
 */

import { useState } from 'react';
import { Button } from '@/components/base/Button';

const CARD_COLORS: { value: string; label: string }[] = [
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#34d399', label: 'Green' },
  { value: '#fb7185', label: 'Pink' },
];

interface BoardToolbarProps {
  teamId: string;
  isLeader: boolean;
  onCreateCard: (color: string) => void;
  winnerMode: boolean;
  onToggleWinnerMode: () => void;
}

export function BoardToolbar({
  isLeader,
  onCreateCard,
  winnerMode,
  onToggleWinnerMode,
}: BoardToolbarProps) {
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0].value);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-panel">
      {/* Create card */}
      <Button
        variant="primary"
        onClick={() => onCreateCard(selectedColor)}
        className="flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Idea
      </Button>

      {/* Color picker */}
      <div className="flex items-center gap-1.5 ml-2">
        {CARD_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => setSelectedColor(color.value)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              selectedColor === color.value
                ? 'border-white scale-110'
                : 'border-transparent opacity-70'
            }`}
            style={{ backgroundColor: color.value }}
            aria-label={`Select ${color.label} color`}
            title={color.label}
          />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Winner mode toggle (leader only) */}
      {isLeader && (
        <Button
          variant={winnerMode ? 'primary' : 'secondary'}
          onClick={onToggleWinnerMode}
          className="flex items-center gap-1.5"
        >
          <span className="text-base">★</span>
          {winnerMode ? 'Cancel Selection' : 'Select Winner'}
        </Button>
      )}
    </div>
  );
}
