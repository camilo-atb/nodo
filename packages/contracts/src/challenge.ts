import { z } from 'zod';
import { ChallengeId, EpochMs, PersonId, TeamId } from './primitives.js';

/**
 * Skill Challenge (docs/12).
 *
 * Es la forma que `frontend/src/pages/ChallengePage.tsx` y `challengeStore.ts`
 * ya consumen: el contrato se documentó a partir del frontend (ADR-015).
 *
 * **Un reto, un skill.** No se ancla a varios `NEEDS` a la vez: un reto que
 * mezcla Go y Figma no distingue a nadie.
 */

/** El canal lleva el `teamId` dentro por obligación, no por estética. */
export const challengeChannel = (teamId: string, challengeId: string): string =>
  `challenge-${teamId}-${challengeId}`;

export const CHALLENGE_QUESTION_COUNT = 5;
export const CHALLENGE_DURATION_SEC = 20;
export const CHALLENGE_MAX_PARTICIPANTS = 50;

/** Puntos máximos por pregunta. Acertar pesa el doble que la velocidad. */
export const CHALLENGE_BASE_POINTS = 500;

export const ChallengeStatus = z.enum(['draft', 'waiting', 'question', 'reviewing', 'ended']);
export type ChallengeStatus = z.infer<typeof ChallengeStatus>;

/**
 * Lo que se publica. **Nunca lleva `correctIndex`**: el `content` de un
 * mensaje lo reciben todos los suscriptores del canal, rivales incluidos. La
 * respuesta correcta solo existe en Postgres y aparece por primera vez en
 * `challenge.leaderboard_update`, cuando la pregunta ya cerró para todos.
 */
export const ChallengeQuestion = z.object({
  text: z.string().min(1),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
});
export type ChallengeQuestion = z.infer<typeof ChallengeQuestion>;

export const ChallengeInfo = z.object({
  id: ChallengeId,
  teamId: TeamId,
  skillSlug: z.string().min(1),
  title: z.string().min(1),
  status: ChallengeStatus,
  durationSec: z.number().int().positive(),
  questionCount: z.number().int().nonnegative(),
});
export type ChallengeInfo = z.infer<typeof ChallengeInfo>;

export const LeaderboardRow = z.object({
  personId: PersonId,
  displayName: z.string().min(1),
  score: z.number().int().nonnegative(),
  position: z.number().int().positive(),
});
export type LeaderboardRow = z.infer<typeof LeaderboardRow>;

// ─── Peticiones ─────────────────────────────────────────────────────────────

export const CreateChallengeRequest = z.object({
  skillSlug: z.string().min(1),
  /** Temática con la que el agente afina las preguntas. */
  theme: z.string().min(1).optional(),
  questionCount: z.number().int().min(1).max(20).optional(),
  durationSec: z.number().int().min(5).max(120).optional(),
});
export type CreateChallengeRequest = z.infer<typeof CreateChallengeRequest>;

/** Aprobar es lo que saca al reto de `draft`: sin humano no se lanza. */
export const ApproveChallengeRequest = z.object({
  title: z.string().min(1).optional(),
  approve: z.literal(true),
});
export type ApproveChallengeRequest = z.infer<typeof ApproveChallengeRequest>;

export const AnswerRequest = z.object({
  questionIndex: z.number().int().nonnegative(),
  answerIndex: z.number().int().min(0).max(3),
});
export type AnswerRequest = z.infer<typeof AnswerRequest>;

export const AnswerResponse = z.object({
  points: z.number().int().nonnegative(),
  correct: z.boolean(),
});
export type AnswerResponse = z.infer<typeof AnswerResponse>;

/**
 * El plazo es un dato, no un temporizador (ADR-012).
 *
 * `endsAt` viaja en el sobre, cada cliente descuenta en local y el backend
 * valida contra su propio reloj al recibir. No hay `setTimeout` en ninguna
 * parte: por eso un redespliegue a mitad de reto no lo mata.
 */
export const ChallengeState = z.object({
  challenge: ChallengeInfo,
  currentQuestion: z.number().int().nonnegative().nullable(),
  endsAt: EpochMs.nullable(),
  leaderboard: z.array(LeaderboardRow),
});
export type ChallengeState = z.infer<typeof ChallengeState>;
