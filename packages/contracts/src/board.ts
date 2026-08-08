import { z } from 'zod';
import { BoardId, CardId, PersonId } from './primitives.js';

/**
 * Tablero colaborativo (docs/11).
 *
 * Es la forma que `frontend/src/stores/boardStore.ts` ya consume: el contrato
 * se documentó a partir del frontend, no al revés (ADR-015).
 *
 * **`Card`, nunca «Idea».** `Idea` ya está tomado y significa otra cosa: una
 * propuesta de proyecto publicada por una Person, que existe con o sin equipo
 * y es un nodo del grafo. Una tarjeta es un papelito en un lienzo de equipo.
 */

/** Máximo de tarjetas por tablero. Ver docs/11: 200 son unos 40 KB de JSON. */
export const MAX_BOARD_CARDS = 200;

/** Longitud máxima del texto de una tarjeta. */
export const MAX_CARD_LENGTH = 500;

export const BoardCard = z.object({
  id: CardId,
  content: z.string().max(MAX_CARD_LENGTH),
  x: z.number(),
  y: z.number(),
  color: z.string().min(1),
  /** `personId` a secas, no `PersonRef`: es lo que el frontend ya espera. */
  createdBy: PersonId,
  /** Ya agregado, para que el cliente no lleve la cuenta. */
  votes: z.number().int().nonnegative(),
  isWinner: z.boolean(),
  /**
   * Relativo a **quien pregunta**, así que solo tiene valor en la respuesta
   * REST. En un sobre va omitido: un mismo mensaje lo leen varias personas y
   * no puede afirmar algo distinto para cada una. El cliente lo deriva de sus
   * propios `board.vote_cast` / `board.vote_removed`.
   */
  myVote: z.boolean().optional(),
});
export type BoardCard = z.infer<typeof BoardCard>;

export const BoardSnapshot = z.object({
  boardId: BoardId,
  cards: z.array(BoardCard),
});
export type BoardSnapshot = z.infer<typeof BoardSnapshot>;

// ─── Peticiones ─────────────────────────────────────────────────────────────

export const CreateCardRequest = z.object({
  content: z.string().max(MAX_CARD_LENGTH).default(''),
  x: z.number(),
  y: z.number(),
  color: z.string().min(1).default('yellow'),
});
export type CreateCardRequest = z.infer<typeof CreateCardRequest>;

export const UpdateCardRequest = z.object({
  content: z.string().max(MAX_CARD_LENGTH),
});
export type UpdateCardRequest = z.infer<typeof UpdateCardRequest>;

/**
 * Expresa un hecho —«se soltó aquí»— y no un parche parcial del recurso, de
 * ahí que su ruta sea `POST .../move` y no un `PATCH`. Se llama una sola vez,
 * al terminar el arrastre: durante el arrastre no viaja nada (ADR-015).
 */
export const MoveCardRequest = z.object({
  x: z.number(),
  y: z.number(),
});
export type MoveCardRequest = z.infer<typeof MoveCardRequest>;

export const SelectWinnerRequest = z.object({
  cardId: CardId,
});
export type SelectWinnerRequest = z.infer<typeof SelectWinnerRequest>;
