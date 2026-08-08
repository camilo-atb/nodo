import { TeamEvent, type BoardCard, type PersonRef } from '@nodo/contracts';
import { describe, expect, it } from 'vitest';
import {
  boardCardCreated,
  boardCardMoved,
  boardVoteCast,
  boardWinnerSelected,
} from './envelopes.js';

const lead: PersonRef = { id: 'per_laura', handle: 'laura', displayName: 'Laura' };
const actor = { kind: 'person' as const, ...lead };

const card: BoardCard = {
  id: 'card_uno',
  content: 'Primera idea',
  x: 10,
  y: 20,
  color: 'green',
  createdBy: 'per_laura',
  votes: 3,
  isWinner: false,
  myVote: true,
};

describe('sobres del tablero (docs/11)', () => {
  /**
   * `myVote` es relativo a quien pregunta. Un sobre lo leen varias personas a
   * la vez, así que afirmarlo ahí sería mentirle a todas menos a una: cada
   * cliente lo deriva de sus propios `board.vote_cast` / `board.vote_removed`.
   */
  it('board.card_created no publica myVote', () => {
    const envelope = boardCardCreated(actor, card);
    expect(envelope.payload.card).not.toHaveProperty('myVote');
  });

  it('conserva el resto de la tarjeta intacto', () => {
    expect(boardCardCreated(actor, card).payload.card).toMatchObject({
      id: 'card_uno',
      votes: 3,
      isWinner: false,
    });
  });

  /**
   * ADR-010: los sobres de canal privado no llevan parche de grafo, y el
   * tablero no entra al grafo público. El esquema es `strictObject`, así que
   * un `graph` colado aquí falla la validación en vez de viajar.
   */
  it('ningún sobre del tablero lleva parche de grafo', () => {
    for (const envelope of [
      boardCardCreated(actor, card),
      boardCardMoved(actor, 'card_uno', 1, 2),
      boardVoteCast(actor, 'card_uno', 'per_laura', 4),
      boardWinnerSelected(actor, 'card_uno'),
    ]) {
      expect(envelope).not.toHaveProperty('graph');
      expect(TeamEvent.safeParse(envelope).success).toBe(true);
    }
  });

  /** Los dos mensajes de mayor frecuencia llevan delta, no la tarjeta entera. */
  it('card_moved lleva solo el delta', () => {
    expect(boardCardMoved(actor, 'card_uno', 300, 200).payload).toEqual({
      cardId: 'card_uno',
      x: 300,
      y: 200,
    });
  });
});
