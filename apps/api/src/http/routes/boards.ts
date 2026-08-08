import {
  CreateCardRequest,
  MoveCardRequest,
  SelectWinnerRequest,
  UpdateCardRequest,
  type BoardCard,
  type BoardSnapshot,
} from '@nodo/contracts';
import {
  boardIsFull,
  castVote,
  countVotes,
  findBoardByTeam,
  findCard,
  insertCard,
  loadBoard,
  loadCard,
  moveCard,
  removeVote,
  setWinner,
  updateCardContent,
} from '../../db/boards-repo.js';
import { getTeamMembers, findTeamRow } from '../../db/teams-repo.js';
import {
  boardCardCreated,
  boardCardMoved,
  boardCardUpdated,
  boardVoteCast,
  boardVoteRemoved,
  boardWinnerSelected,
} from '../../domain/envelopes.js';
import { errors } from '../../domain/errors.js';
import { cardId as newCardId } from '../../domain/ids.js';
import { toPersonRef } from '../../domain/mappers.js';
import { findPersonById } from '../../db/people-repo.js';
import type { AppContext } from '../context.js';
import { requireAuth } from '../middleware/auth.js';
import { createRouter } from '../types.js';

/**
 * Tablero colaborativo (docs/11).
 *
 * Todo el estado se escribe **por REST**; no hay publicación desde el cliente,
 * ni efímera ni de ningún tipo (ADR-015). Arrastrar una tarjeta actualiza en
 * local y hace un solo `POST` al soltar, así que el principio 1 de docs/03
 * queda intacto y `publish: false` sigue siendo universal.
 *
 * Los sobres van por `team-{teamId}`, el canal que ya existe.
 */
export const boardsRoutes = (ctx: AppContext) => {
  const router = createRouter();

  /** Miembro del equipo. Un solicitante lee `team-{id}` pero no escribe aquí. */
  const requireMember = async (teamId: string, personId: string): Promise<void> => {
    const members = await getTeamMembers(ctx.db, teamId);
    if (!members.some((m) => m.id === personId)) {
      throw errors.forbidden('Solo el equipo puede usar este tablero.');
    }
  };

  const actorOf = async (personId: string) => {
    const row = await findPersonById(ctx.db, personId);
    if (!row) throw errors.unauthenticated();
    return { kind: 'person' as const, ...toPersonRef(row) };
  };

  router.get('/v1/teams/:teamId/board', requireAuth(ctx), async (c) => {
    const teamId = c.req.param('teamId');
    const auth = c.get('auth');
    await requireMember(teamId, auth.personId);

    const snapshot = await loadBoard(ctx.db, teamId, auth.personId);
    if (!snapshot) throw errors.notFound('Este equipo no tiene tablero.');
    return c.json(snapshot satisfies BoardSnapshot);
  });

  router.post('/v1/teams/:teamId/board/cards', requireAuth(ctx), async (c) => {
    const teamId = c.req.param('teamId');
    const auth = c.get('auth');
    await requireMember(teamId, auth.personId);

    const parsed = CreateCardRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw errors.validation(parsed.error.issues);

    const board = await findBoardByTeam(ctx.db, teamId);
    if (!board) throw errors.notFound('Este equipo no tiene tablero.');
    if (await boardIsFull(ctx.db, board.id)) throw errors.boardFull();

    const id = newCardId();
    await insertCard(ctx.db, {
      id,
      boardId: board.id,
      content: parsed.data.content,
      x: parsed.data.x,
      y: parsed.data.y,
      color: parsed.data.color,
      createdBy: auth.personId,
    });

    // commit → publish (docs/05). La tarjeta se relee ya comprometida.
    const card = (await loadCard(ctx.db, id, auth.personId))!;
    await ctx.publisher.publishTeam(teamId, boardCardCreated(await actorOf(auth.personId), card));
    return c.json(card satisfies BoardCard, 201);
  });

  router.post('/v1/teams/:teamId/board/cards/:cardId/move', requireAuth(ctx), async (c) => {
    const teamId = c.req.param('teamId');
    const auth = c.get('auth');
    await requireMember(teamId, auth.personId);

    const parsed = MoveCardRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw errors.validation(parsed.error.issues);

    const cardIdParam = c.req.param('cardId');
    if (!(await findCard(ctx.db, cardIdParam))) throw errors.notFound('La tarjeta no existe.');

    await moveCard(ctx.db, cardIdParam, parsed.data.x, parsed.data.y);
    await ctx.publisher.publishTeam(
      teamId,
      boardCardMoved(await actorOf(auth.personId), cardIdParam, parsed.data.x, parsed.data.y),
    );
    return c.body(null, 204);
  });

  /** Edita el autor o el líder: nadie más reescribe una idea ajena. */
  router.patch('/v1/teams/:teamId/board/cards/:cardId', requireAuth(ctx), async (c) => {
    const teamId = c.req.param('teamId');
    const auth = c.get('auth');
    await requireMember(teamId, auth.personId);

    const parsed = UpdateCardRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw errors.validation(parsed.error.issues);

    const cardIdParam = c.req.param('cardId');
    const card = await findCard(ctx.db, cardIdParam);
    if (!card) throw errors.notFound('La tarjeta no existe.');

    const team = await findTeamRow(ctx.db, teamId);
    if (card.createdBy !== auth.personId && team?.leadId !== auth.personId) {
      throw errors.forbidden('Solo quien la escribió o el líder pueden editarla.');
    }

    await updateCardContent(ctx.db, cardIdParam, parsed.data.content);
    await ctx.publisher.publishTeam(
      teamId,
      boardCardUpdated(await actorOf(auth.personId), cardIdParam, parsed.data.content),
    );
    return c.body(null, 204);
  });

  /**
   * Votar y desvotar son dos rutas, no un toggle: así cada una es idempotente
   * y un reintento no invierte el voto sin querer (docs/11).
   */
  router.post('/v1/teams/:teamId/board/cards/:cardId/vote', requireAuth(ctx), async (c) => {
    const teamId = c.req.param('teamId');
    const auth = c.get('auth');
    await requireMember(teamId, auth.personId);

    const cardIdParam = c.req.param('cardId');
    if (!(await findCard(ctx.db, cardIdParam))) throw errors.notFound('La tarjeta no existe.');

    await castVote(ctx.db, cardIdParam, auth.personId);
    const votes = await countVotes(ctx.db, cardIdParam);
    await ctx.publisher.publishTeam(
      teamId,
      boardVoteCast(await actorOf(auth.personId), cardIdParam, auth.personId, votes),
    );
    return c.json({ votes });
  });

  router.delete('/v1/teams/:teamId/board/cards/:cardId/vote', requireAuth(ctx), async (c) => {
    const teamId = c.req.param('teamId');
    const auth = c.get('auth');
    await requireMember(teamId, auth.personId);

    const cardIdParam = c.req.param('cardId');
    if (!(await findCard(ctx.db, cardIdParam))) throw errors.notFound('La tarjeta no existe.');

    await removeVote(ctx.db, cardIdParam, auth.personId);
    const votes = await countVotes(ctx.db, cardIdParam);
    await ctx.publisher.publishTeam(
      teamId,
      boardVoteRemoved(await actorOf(auth.personId), cardIdParam, auth.personId, votes),
    );
    return c.json({ votes });
  });

  /** Solo el líder cierra la lluvia de ideas eligiendo una ganadora. */
  router.post('/v1/teams/:teamId/board/winner', requireAuth(ctx), async (c) => {
    const teamId = c.req.param('teamId');
    const auth = c.get('auth');

    const team = await findTeamRow(ctx.db, teamId);
    if (!team) throw errors.notFound('El equipo no existe.');
    if (team.leadId !== auth.personId) throw errors.forbidden('Solo el líder elige la ganadora.');

    const parsed = SelectWinnerRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw errors.validation(parsed.error.issues);

    const board = await findBoardByTeam(ctx.db, teamId);
    if (!board) throw errors.notFound('Este equipo no tiene tablero.');

    const card = await findCard(ctx.db, parsed.data.cardId);
    if (!card || card.boardId !== board.id) {
      throw errors.notFound('Esa tarjeta no está en este tablero.');
    }

    await setWinner(ctx.db, board.id, parsed.data.cardId);
    await ctx.publisher.publishTeam(
      teamId,
      boardWinnerSelected(await actorOf(auth.personId), parsed.data.cardId),
    );
    return c.body(null, 204);
  });

  return router;
};
