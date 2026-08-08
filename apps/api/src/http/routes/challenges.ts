import {
  AnswerRequest,
  ApproveChallengeRequest,
  CHALLENGE_DURATION_SEC,
  CHALLENGE_MAX_PARTICIPANTS,
  CHALLENGE_QUESTION_COUNT,
  CreateChallengeRequest,
  type AnswerResponse,
  type ChallengeInfo,
  type ChallengeState,
} from '@nodo/contracts';
import { scoreAnswer } from '../../agent/scoring.js';
import {
  countParticipants,
  countQuestions,
  createChallenge,
  findChallenge,
  getQuestion,
  hasAnswered,
  isParticipant,
  join,
  leaderboard,
  openQuestion,
  recordAnswer,
  setStatus,
  toChallengeInfo,
} from '../../db/challenges-repo.js';
import { findTeamRow } from '../../db/teams-repo.js';
import {
  challengeEnded,
  challengeLeaderboardUpdate,
  challengeQuestionRevealed,
} from '../../domain/envelopes.js';
import { errors } from '../../domain/errors.js';
import { answerId, challengeId as newChallengeId, questionId } from '../../domain/ids.js';
import type { AppContext } from '../context.js';
import { requireAuth } from '../middleware/auth.js';
import { createRouter } from '../types.js';

/**
 * Skill Challenge (docs/12).
 *
 * **El plazo es un dato, no un temporizador** (ADR-012). No hay `setTimeout`
 * en este archivo ni en ningún otro: el backend anota `question_started_at`,
 * publica `endsAt`, y valida contra su propio reloj al recibir la respuesta.
 * El avance lo dispara `advance`, que es idempotente y puede llegar del líder
 * o del primer cliente cuyo contador expiró.
 *
 * Las respuestas **nunca** viajan por el canal: el `content` de un mensaje lo
 * reciben todos los suscriptores, rivales incluidos.
 */
export const challengesRoutes = (ctx: AppContext) => {
  const router = createRouter();

  const requireLead = async (teamId: string, personId: string) => {
    const team = await findTeamRow(ctx.db, teamId);
    if (!team) throw errors.notFound('El equipo no existe.');
    if (team.leadId !== personId) throw errors.forbidden('Solo el líder puede hacer esto.');
    return team;
  };

  const stateOf = async (id: string): Promise<ChallengeState> => {
    const row = (await findChallenge(ctx.db, id))!;
    const questionCount = await countQuestions(ctx.db, id);
    return {
      challenge: toChallengeInfo(row, questionCount),
      currentQuestion: row.currentQuestion,
      endsAt:
        row.questionStartedAt === null
          ? null
          : row.questionStartedAt.getTime() + row.durationSec * 1000,
      leaderboard: await leaderboard(ctx.db, id),
    };
  };

  /** Lo que el frontend ya llama al montar la página del reto. */
  router.get('/v1/challenges/:id', requireAuth(ctx), async (c) => {
    const row = await findChallenge(ctx.db, c.req.param('id'));
    if (!row) throw errors.notFound('El reto no existe.');
    return c.json(toChallengeInfo(row, await countQuestions(ctx.db, row.id)) satisfies ChallengeInfo);
  });

  router.get('/v1/challenges/:id/state', requireAuth(ctx), async (c) => {
    const row = await findChallenge(ctx.db, c.req.param('id'));
    if (!row) throw errors.notFound('El reto no existe.');
    return c.json(await stateOf(row.id));
  });

  /** `quizmaster` genera el borrador. Nace en `draft`: sin aprobar no se lanza. */
  router.post('/v1/teams/:teamId/challenges', requireAuth(ctx), async (c) => {
    const teamId = c.req.param('teamId');
    const auth = c.get('auth');
    await requireLead(teamId, auth.personId);

    const parsed = CreateChallengeRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw errors.validation(parsed.error.issues);

    const slug = ctx.vocabulary.resolve(parsed.data.skillSlug);
    if (!slug) throw errors.unknownSkill([parsed.data.skillSlug]);
    const skill = ctx.vocabulary.all().find((s) => s.slug === slug)!;

    const questionCount = parsed.data.questionCount ?? CHALLENGE_QUESTION_COUNT;
    // Sin fallback de plantilla a propósito: una pregunta mal generada no
    // degrada un texto, corrompe la selección (docs/12).
    const draft = await ctx.llm.generateChallenge({
      skillSlug: skill.slug,
      skillLabel: skill.label,
      theme: parsed.data.theme ?? null,
      questionCount,
      language: 'es',
    });

    const id = newChallengeId();
    const durationSec = parsed.data.durationSec ?? CHALLENGE_DURATION_SEC;
    await createChallenge(ctx.db, {
      id,
      teamId,
      skillSlug: skill.slug,
      title: `Reto de ${skill.label}`,
      durationSec,
      expiresAt: new Date(Date.now() + ctx.env.CHALLENGE_TTL_MINUTES * 60_000),
      questions: draft.map((q) => ({ id: questionId(), ...q })),
    });

    const row = (await findChallenge(ctx.db, id))!;
    return c.json(toChallengeInfo(row, draft.length) satisfies ChallengeInfo, 202);
  });

  /** La aprobación del líder es lo que saca al reto de `draft`. */
  router.patch('/v1/challenges/:id', requireAuth(ctx), async (c) => {
    const row = await findChallenge(ctx.db, c.req.param('id'));
    if (!row) throw errors.notFound('El reto no existe.');
    const auth = c.get('auth');
    await requireLead(row.teamId, auth.personId);

    const parsed = ApproveChallengeRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw errors.validation(parsed.error.issues);

    await setStatus(ctx.db, row.id, 'waiting', parsed.data.title ? { title: parsed.data.title } : {});
    const updated = (await findChallenge(ctx.db, row.id))!;
    return c.json(toChallengeInfo(updated, await countQuestions(ctx.db, row.id)));
  });

  router.post('/v1/challenges/:id/join', requireAuth(ctx), async (c) => {
    const row = await findChallenge(ctx.db, c.req.param('id'));
    if (!row) throw errors.notFound('El reto no existe.');
    if (row.status === 'draft') throw errors.challengeNotReady();
    // Sin entrada tardía: con menos preguntas contestadas el puntaje dejaría
    // de comparar lo mismo, y comparar es el único propósito del reto.
    if (row.status !== 'waiting') throw errors.challengeAlreadyStarted();
    if ((await countParticipants(ctx.db, row.id)) >= CHALLENGE_MAX_PARTICIPANTS) {
      throw errors.challengeFull();
    }

    await join(ctx.db, row.id, c.get('auth').personId);
    return c.json(await stateOf(row.id));
  });

  router.post('/v1/challenges/:id/start', requireAuth(ctx), async (c) => {
    const row = await findChallenge(ctx.db, c.req.param('id'));
    if (!row) throw errors.notFound('El reto no existe.');
    await requireLead(row.teamId, c.get('auth').personId);
    if (row.status !== 'waiting') throw errors.challengeNotReady();

    await setStatus(ctx.db, row.id, 'waiting', { startedAt: new Date() });
    await openAndPublish(row.id, 0);
    return c.json(await stateOf(row.id));
  });

  /**
   * Idempotente y guardado por `current_question`: puede llegar del líder o de
   * varios clientes cuyo contador expiró a la vez, y el segundo no hace nada.
   */
  router.post('/v1/challenges/:id/advance', requireAuth(ctx), async (c) => {
    const row = await findChallenge(ctx.db, c.req.param('id'));
    if (!row) throw errors.notFound('El reto no existe.');
    if (row.status === 'ended') return c.json(await stateOf(row.id));

    const total = await countQuestions(ctx.db, row.id);
    const current = row.currentQuestion ?? -1;

    // Cierra la pregunta en curso revelando la correcta: cuando este sobre se
    // publica, la pregunta ya cerró para todos y deja de ser una filtración.
    if (current >= 0 && row.status === 'question') {
      const q = await getQuestion(ctx.db, row.id, current);
      if (q) {
        await setStatus(ctx.db, row.id, 'reviewing');
        await ctx.publisher.publishChallenge(
          row.teamId,
          row.id,
          challengeLeaderboardUpdate(current, q.correctIndex, await leaderboard(ctx.db, row.id)),
        );
      }
    }

    const next = current + 1;
    if (next >= total) {
      await setStatus(ctx.db, row.id, 'ended', { endedAt: new Date() });
      await ctx.publisher.publishChallenge(
        row.teamId,
        row.id,
        challengeEnded(await leaderboard(ctx.db, row.id)),
      );
      return c.json(await stateOf(row.id));
    }

    await openAndPublish(row.id, next);
    return c.json(await stateOf(row.id));
  });

  router.post('/v1/challenges/:id/answer', requireAuth(ctx), async (c) => {
    const row = await findChallenge(ctx.db, c.req.param('id'));
    if (!row) throw errors.notFound('El reto no existe.');
    const auth = c.get('auth');

    const parsed = AnswerRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw errors.validation(parsed.error.issues);
    const { questionIndex, answerIndex } = parsed.data;

    if (!(await isParticipant(ctx.db, row.id, auth.personId))) {
      throw errors.forbidden('No participas en este reto.');
    }
    if (row.currentQuestion !== questionIndex || row.questionStartedAt === null) {
      throw errors.answerTooLate();
    }
    if (await hasAnswered(ctx.db, row.id, auth.personId, questionIndex)) {
      throw errors.alreadyAnswered();
    }

    // El reloj del servidor, no el del cliente (ADR-012).
    const receivedAt = Date.now();
    const endsAt = row.questionStartedAt.getTime() + row.durationSec * 1000;
    if (receivedAt > endsAt) throw errors.answerTooLate();

    const question = await getQuestion(ctx.db, row.id, questionIndex);
    if (!question) throw errors.notFound('Esa pregunta no existe.');

    const correct = question.correctIndex === answerIndex;
    const points = scoreAnswer({
      correct,
      questionStartedAt: row.questionStartedAt.getTime(),
      receivedAt,
      durationSec: row.durationSec,
    });

    await recordAnswer(ctx.db, {
      id: answerId(),
      challengeId: row.id,
      personId: auth.personId,
      questionIndex,
      answerIndex,
      points,
    });

    // Devuelve si acertó y cuántos puntos, pero **no** cuál era la correcta:
    // eso llega en `leaderboard_update`, cuando la pregunta cerró para todos.
    return c.json({ points, correct } satisfies AnswerResponse);
  });

  /** Abre una pregunta y publica su plazo. Único sitio que toca el reloj. */
  const openAndPublish = async (id: string, index: number): Promise<void> => {
    const row = (await findChallenge(ctx.db, id))!;
    const question = await getQuestion(ctx.db, id, index);
    if (!question) return;

    const startedAt = await openQuestion(ctx.db, id, index);
    await ctx.publisher.publishChallenge(
      row.teamId,
      id,
      challengeQuestionRevealed(
        index,
        { text: question.text, options: question.options as [string, string, string, string] },
        startedAt.getTime() + row.durationSec * 1000,
      ),
    );
  };

  return router;
};
