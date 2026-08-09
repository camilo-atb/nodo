import { beforeEach, describe, expect, it } from 'vitest';
import { TeamEvent, type BoardCard } from '@nodo/contracts';
import { applyBoardEvent } from './boardEvents';
import { useBoardStore } from '@/stores/boardStore';

const actor = {
  kind: 'person' as const,
  id: 'per_ana',
  handle: 'ana',
  displayName: 'Ana',
};

const summary = { text: 'Board changed', icon: 'x', refs: [] };

const card: BoardCard = {
  id: 'card_one',
  content: 'First idea',
  x: 10,
  y: 20,
  color: '#06b6d4',
  createdBy: 'per_ana',
  votes: 0,
  isWinner: false,
};

function boardEvent(type: string, payload: unknown) {
  return TeamEvent.parse({
    v: 1,
    type,
    id: `evt_${type.replace(/\./g, '_')}`,
    at: 1,
    actor,
    payload,
    summary,
  });
}

describe('applyBoardEvent', () => {
  beforeEach(() => useBoardStore.getState().reset());

  it('applies create, move and edit envelopes from their payload', () => {
    applyBoardEvent(boardEvent('board.card_created', { card }), 'per_ana');
    applyBoardEvent(boardEvent('board.card_moved', { cardId: card.id, x: 40, y: 50 }), 'per_ana');
    applyBoardEvent(boardEvent('board.card_updated', { cardId: card.id, content: 'Updated' }), 'per_ana');

    expect(useBoardStore.getState().cards.get(card.id)).toMatchObject({
      content: 'Updated',
      x: 40,
      y: 50,
      myVote: false,
    });
  });

  it('uses the aggregate votes field and only changes myVote for my event', () => {
    useBoardStore.getState().loadCards([{ ...card, myVote: false }]);

    applyBoardEvent(
      boardEvent('board.vote_cast', { cardId: card.id, personId: 'per_other', votes: 1 }),
      'per_ana',
    );
    expect(useBoardStore.getState().cards.get(card.id)).toMatchObject({ votes: 1, myVote: false });

    applyBoardEvent(
      boardEvent('board.vote_cast', { cardId: card.id, personId: 'per_ana', votes: 2 }),
      'per_ana',
    );
    expect(useBoardStore.getState().cards.get(card.id)).toMatchObject({ votes: 2, myVote: true });

    applyBoardEvent(
      boardEvent('board.vote_removed', { cardId: card.id, personId: 'per_ana', votes: 1 }),
      'per_ana',
    );
    expect(useBoardStore.getState().cards.get(card.id)).toMatchObject({ votes: 1, myVote: false });
  });

  it('synchronizes the selected winner', () => {
    const other = { ...card, id: 'card_two', isWinner: true };
    useBoardStore.getState().loadCards([{ ...card, myVote: false }, { ...other, myVote: false }]);

    applyBoardEvent(boardEvent('board.winner_selected', { cardId: card.id }), 'per_ana');

    expect(useBoardStore.getState().cards.get(card.id)?.isWinner).toBe(true);
    expect(useBoardStore.getState().cards.get(other.id)?.isWinner).toBe(false);
  });

  it('rejects the old flat message shape that caused realtime updates to be ignored', () => {
    expect(TeamEvent.safeParse({
      v: 1,
      type: 'board.card_moved',
      id: 'evt_flat',
      at: 1,
      actor,
      cardId: card.id,
      x: 40,
      y: 50,
      summary,
    }).success).toBe(false);
  });
});
