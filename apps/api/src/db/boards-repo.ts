import { MAX_BOARD_CARDS, type BoardCard, type BoardSnapshot } from '@nodo/contracts';
import { and, count, eq } from 'drizzle-orm';
import { boardCards, boards, boardVotes } from './schema.js';
import type { Db } from './client.js';

/**
 * Tablero colaborativo (docs/11).
 *
 * No toca `nodes` ni `edges`: el tablero **no entra al grafo público**. Es
 * interno del equipo —el grafo muestra que el equipo existe y qué le falta, no
 * qué está pensando— y además `NodeKind` no puede ganar valores sin romper la
 * compilación del frontend, que construye `Record<NodeKind, …>` exhaustivos.
 */

type CardRow = {
  id: string;
  content: string;
  x: number;
  y: number;
  color: string;
  createdBy: string;
};

const toCard = (row: CardRow, votes: number, isWinner: boolean, myVote?: boolean): BoardCard => ({
  id: row.id,
  content: row.content,
  x: row.x,
  y: row.y,
  color: row.color,
  createdBy: row.createdBy,
  votes,
  isWinner,
  ...(myVote === undefined ? {} : { myVote }),
});

export const createBoard = async (tx: Db, input: { id: string; teamId: string }): Promise<void> => {
  await tx.insert(boards).values(input);
};

export const findBoardByTeam = async (
  db: Db,
  teamId: string,
): Promise<{ id: string; winnerCardId: string | null } | undefined> => {
  const [row] = await db
    .select({ id: boards.id, winnerCardId: boards.winnerCardId })
    .from(boards)
    .where(eq(boards.teamId, teamId));
  return row;
};

export const findCard = async (
  db: Db,
  cardId: string,
): Promise<{ id: string; boardId: string; createdBy: string } | undefined> => {
  const [row] = await db
    .select({ id: boardCards.id, boardId: boardCards.boardId, createdBy: boardCards.createdBy })
    .from(boardCards)
    .where(eq(boardCards.id, cardId));
  return row;
};

export const countVotes = async (db: Db, cardId: string): Promise<number> => {
  const [row] = await db.select({ n: count() }).from(boardVotes).where(eq(boardVotes.cardId, cardId));
  return row?.n ?? 0;
};

/**
 * `viewerId` es lo que hace que `myVote` tenga sentido. No se calcula al
 * publicar: un sobre lo leen varias personas y no puede afirmar algo distinto
 * para cada una (docs/11).
 */
export const loadBoard = async (
  db: Db,
  teamId: string,
  viewerId: string,
): Promise<BoardSnapshot | undefined> => {
  const board = await findBoardByTeam(db, teamId);
  if (!board) return undefined;

  const rows = await db
    .select({
      id: boardCards.id,
      content: boardCards.content,
      x: boardCards.x,
      y: boardCards.y,
      color: boardCards.color,
      createdBy: boardCards.createdBy,
    })
    .from(boardCards)
    .where(eq(boardCards.boardId, board.id));

  const mine = new Set(
    (
      await db
        .select({ cardId: boardVotes.cardId })
        .from(boardVotes)
        .where(eq(boardVotes.personId, viewerId))
    ).map((v) => v.cardId),
  );

  const cards = await Promise.all(
    rows.map(async (r) =>
      toCard(r, await countVotes(db, r.id), board.winnerCardId === r.id, mine.has(r.id)),
    ),
  );

  return { boardId: board.id, cards };
};

export const loadCard = async (
  db: Db,
  cardId: string,
  viewerId?: string,
): Promise<BoardCard | undefined> => {
  const [row] = await db
    .select({
      id: boardCards.id,
      boardId: boardCards.boardId,
      content: boardCards.content,
      x: boardCards.x,
      y: boardCards.y,
      color: boardCards.color,
      createdBy: boardCards.createdBy,
    })
    .from(boardCards)
    .where(eq(boardCards.id, cardId));
  if (!row) return undefined;

  const [board] = await db
    .select({ winnerCardId: boards.winnerCardId })
    .from(boards)
    .where(eq(boards.id, row.boardId));

  const myVote =
    viewerId === undefined
      ? undefined
      : (
          await db
            .select({ cardId: boardVotes.cardId })
            .from(boardVotes)
            .where(and(eq(boardVotes.cardId, cardId), eq(boardVotes.personId, viewerId)))
        ).length > 0;

  return toCard(row, await countVotes(db, cardId), board?.winnerCardId === cardId, myVote);
};

export const countCards = async (db: Db, boardId: string): Promise<number> => {
  const [row] = await db.select({ n: count() }).from(boardCards).where(eq(boardCards.boardId, boardId));
  return row?.n ?? 0;
};

export const boardIsFull = async (db: Db, boardId: string): Promise<boolean> =>
  (await countCards(db, boardId)) >= MAX_BOARD_CARDS;

export const insertCard = async (
  db: Db,
  input: {
    id: string;
    boardId: string;
    content: string;
    x: number;
    y: number;
    color: string;
    createdBy: string;
  },
): Promise<void> => {
  await db.insert(boardCards).values(input);
};

export const moveCard = async (db: Db, cardId: string, x: number, y: number): Promise<void> => {
  await db.update(boardCards).set({ x, y, updatedAt: new Date() }).where(eq(boardCards.id, cardId));
};

export const updateCardContent = async (
  db: Db,
  cardId: string,
  content: string,
): Promise<void> => {
  await db
    .update(boardCards)
    .set({ content, updatedAt: new Date() })
    .where(eq(boardCards.id, cardId));
};

/**
 * Idempotente por la clave primaria compuesta: votar dos veces deja un solo
 * voto, no dos, y tampoco falla. Un reintento no puede invertir el voto, que
 * es la razón de que votar y desvotar sean dos rutas y no un toggle.
 */
export const castVote = async (db: Db, cardId: string, personId: string): Promise<void> => {
  await db.insert(boardVotes).values({ cardId, personId }).onConflictDoNothing();
};

export const removeVote = async (db: Db, cardId: string, personId: string): Promise<void> => {
  await db
    .delete(boardVotes)
    .where(and(eq(boardVotes.cardId, cardId), eq(boardVotes.personId, personId)));
};

/** Una sola ganadora por tablero: marcar otra desmarca la anterior sin más. */
export const setWinner = async (db: Db, boardId: string, cardId: string): Promise<void> => {
  await db.update(boards).set({ winnerCardId: cardId }).where(eq(boards.id, boardId));
};
