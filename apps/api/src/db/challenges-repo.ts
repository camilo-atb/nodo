import type { ChallengeInfo, ChallengeStatus, LeaderboardRow } from '@nodo/contracts';
import { and, asc, count, eq, lt, inArray } from 'drizzle-orm';
import { rank } from '../agent/scoring.js';
import {
  challengeAnswers,
  challengeEntries,
  challengeQuestions,
  challenges,
  people,
} from './schema.js';
import type { Db } from './client.js';

/**
 * Skill Challenge (docs/12).
 *
 * `current_question` y `question_started_at` viven aquí y no en memoria: es lo
 * que hace que un redespliegue a mitad de reto no lo mate (ADR-012).
 */

export type ChallengeRow = {
  id: string;
  teamId: string;
  skillSlug: string;
  title: string;
  status: string;
  durationSec: number;
  currentQuestion: number | null;
  questionStartedAt: Date | null;
};

export const findChallenge = async (db: Db, id: string): Promise<ChallengeRow | undefined> => {
  const [row] = await db
    .select({
      id: challenges.id,
      teamId: challenges.teamId,
      skillSlug: challenges.skillSlug,
      title: challenges.title,
      status: challenges.status,
      durationSec: challenges.durationSec,
      currentQuestion: challenges.currentQuestion,
      questionStartedAt: challenges.questionStartedAt,
    })
    .from(challenges)
    .where(eq(challenges.id, id));
  return row;
};

export const countQuestions = async (db: Db, challengeId: string): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(challengeQuestions)
    .where(eq(challengeQuestions.challengeId, challengeId));
  return row?.n ?? 0;
};

export const toChallengeInfo = (row: ChallengeRow, questionCount: number): ChallengeInfo => ({
  id: row.id,
  teamId: row.teamId,
  skillSlug: row.skillSlug,
  title: row.title,
  status: row.status as ChallengeStatus,
  durationSec: row.durationSec,
  questionCount,
});

export const createChallenge = async (
  db: Db,
  input: {
    id: string;
    teamId: string;
    skillSlug: string;
    title: string;
    durationSec: number;
    expiresAt: Date;
    questions: Array<{
      id: string;
      text: string;
      options: string[];
      correctIndex: number;
    }>;
  },
): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.insert(challenges).values({
      id: input.id,
      teamId: input.teamId,
      skillSlug: input.skillSlug,
      title: input.title,
      status: 'draft',
      durationSec: input.durationSec,
      expiresAt: input.expiresAt,
    });
    for (const [position, q] of input.questions.entries()) {
      await tx.insert(challengeQuestions).values({
        id: q.id,
        challengeId: input.id,
        position,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
      });
    }
  });
};

export const setStatus = async (
  db: Db,
  id: string,
  status: ChallengeStatus,
  extra: { title?: string; startedAt?: Date; endedAt?: Date } = {},
): Promise<void> => {
  await db.update(challenges).set({ status, ...extra }).where(eq(challenges.id, id));
};

/**
 * Abre una pregunta anotando el instante del servidor.
 *
 * De aquí sale el `endsAt` que viaja en el sobre: el plazo es un **dato**, no
 * un temporizador (ADR-012). Nadie programa nada; el cliente descuenta en
 * local y el servidor valida contra su propio reloj al recibir la respuesta.
 */
export const openQuestion = async (db: Db, id: string, index: number): Promise<Date> => {
  const startedAt = new Date();
  await db
    .update(challenges)
    .set({ currentQuestion: index, questionStartedAt: startedAt, status: 'question' })
    .where(eq(challenges.id, id));
  return startedAt;
};

export const getQuestion = async (
  db: Db,
  challengeId: string,
  position: number,
): Promise<{ text: string; options: string[]; correctIndex: number } | undefined> => {
  const [row] = await db
    .select({
      text: challengeQuestions.text,
      options: challengeQuestions.options,
      correctIndex: challengeQuestions.correctIndex,
    })
    .from(challengeQuestions)
    .where(
      and(
        eq(challengeQuestions.challengeId, challengeId),
        eq(challengeQuestions.position, position),
      ),
    );
  return row;
};

export const listQuestions = async (
  db: Db,
  challengeId: string,
): Promise<Array<{ id: string; text: string; options: string[]; correctIndex: number }>> =>
  db
    .select({
      id: challengeQuestions.id,
      text: challengeQuestions.text,
      options: challengeQuestions.options,
      correctIndex: challengeQuestions.correctIndex,
    })
    .from(challengeQuestions)
    .where(eq(challengeQuestions.challengeId, challengeId))
    .orderBy(asc(challengeQuestions.position));

export const join = async (db: Db, challengeId: string, personId: string): Promise<void> => {
  await db.insert(challengeEntries).values({ challengeId, personId }).onConflictDoNothing();
};

export const countParticipants = async (db: Db, challengeId: string): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(challengeEntries)
    .where(eq(challengeEntries.challengeId, challengeId));
  return row?.n ?? 0;
};

export const isParticipant = async (
  db: Db,
  challengeId: string,
  personId: string,
): Promise<boolean> => {
  const [row] = await db
    .select({ personId: challengeEntries.personId })
    .from(challengeEntries)
    .where(
      and(eq(challengeEntries.challengeId, challengeId), eq(challengeEntries.personId, personId)),
    );
  return row !== undefined;
};

export const hasAnswered = async (
  db: Db,
  challengeId: string,
  personId: string,
  questionIndex: number,
): Promise<boolean> => {
  const [row] = await db
    .select({ id: challengeAnswers.id })
    .from(challengeAnswers)
    .where(
      and(
        eq(challengeAnswers.challengeId, challengeId),
        eq(challengeAnswers.personId, personId),
        eq(challengeAnswers.questionIndex, questionIndex),
      ),
    );
  return row !== undefined;
};

export const recordAnswer = async (
  db: Db,
  input: {
    id: string;
    challengeId: string;
    personId: string;
    questionIndex: number;
    answerIndex: number;
    points: number;
  },
): Promise<void> => {
  await db.transaction(async (tx) => {
    await tx.insert(challengeAnswers).values(input);
    // El puntaje se acumula en la entry para que el leaderboard sea una
    // lectura y no una agregación en cada pregunta.
    const [entry] = await tx
      .select({ score: challengeEntries.score, answeredCount: challengeEntries.answeredCount })
      .from(challengeEntries)
      .where(
        and(
          eq(challengeEntries.challengeId, input.challengeId),
          eq(challengeEntries.personId, input.personId),
        ),
      );
    await tx
      .update(challengeEntries)
      .set({
        score: (entry?.score ?? 0) + input.points,
        answeredCount: (entry?.answeredCount ?? 0) + 1,
      })
      .where(
        and(
          eq(challengeEntries.challengeId, input.challengeId),
          eq(challengeEntries.personId, input.personId),
        ),
      );
  });
};

export const leaderboard = async (db: Db, challengeId: string): Promise<LeaderboardRow[]> => {
  const rows = await db
    .select({
      personId: challengeEntries.personId,
      displayName: people.displayName,
      score: challengeEntries.score,
      answeredCount: challengeEntries.answeredCount,
    })
    .from(challengeEntries)
    .innerJoin(people, eq(people.id, challengeEntries.personId))
    .where(eq(challengeEntries.challengeId, challengeId));

  return rank(rows).map((r) => ({
    personId: r.personId,
    displayName: r.displayName,
    score: r.score,
    position: r.position,
  }));
};

/** Barrido de retos abandonados: cuelga del job runner que ya corre (docs/12). */
export const findExpired = async (db: Db, now: Date): Promise<string[]> => {
  const rows = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(
      and(
        inArray(challenges.status, ['waiting', 'question', 'reviewing']),
        lt(challenges.expiresAt, now),
      ),
    );
  return rows.map((r) => r.id);
};

/** Resultado del último reto de una persona en un equipo, para la bandeja. */
export const lastResultFor = async (
  db: Db,
  teamId: string,
  personId: string,
): Promise<{ score: number; position: number } | undefined> => {
  const rows = await db
    .select({ challengeId: challengeEntries.challengeId, score: challengeEntries.score })
    .from(challengeEntries)
    .innerJoin(challenges, eq(challenges.id, challengeEntries.challengeId))
    .where(and(eq(challenges.teamId, teamId), eq(challengeEntries.personId, personId)));

  const last = rows.at(-1);
  if (!last) return undefined;

  const board = await leaderboard(db, last.challengeId);
  const mine = board.find((r) => r.personId === personId);
  return mine ? { score: mine.score, position: mine.position } : undefined;
};
