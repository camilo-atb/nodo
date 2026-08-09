import { z } from 'zod';
import { BoardCard } from './board.js';
import { ChallengeQuestion, LeaderboardRow } from './challenge.js';
import { ApplicationDTO, IdeaDTO, PersonDTO, SuggestionDTO, TeamDTO } from './dto.js';
import { mainEnvelope, teamEnvelope, type NoGraph } from './envelope.js';
import {
  CardId,
  EpochMs,
  NeedRef,
  PersonId,
  PersonRef,
  PersonStatus,
  SkillRef,
  SuggestionId,
  TeamId,
  TeamStatus,
} from './primitives.js';

// ─── Canales ────────────────────────────────────────────────────────────────
// Un solo canal público. Las vistas filtradas son cosa del cliente
// (`room.view()`), no de abrir sockets extra (docs/03).

export const MAIN_CHANNEL = 'network-main';
/** Canal privado de grafo, feed y presencia de un Event. */
export const eventChannel = (eventId: string): string => `event-${eventId}`;
export const teamChannel = (teamId: string): string => `team-${teamId}`;

// ─── network-main ───────────────────────────────────────────────────────────

export const PersonUpserted = mainEnvelope(
  'person.upserted',
  z.object({ person: PersonDTO, skills: z.array(SkillRef) }),
);

export const PersonStatusChanged = mainEnvelope(
  'person.status_changed',
  z.object({ personId: PersonId, status: PersonStatus, previous: PersonStatus }),
);

export const IdeaPublished = mainEnvelope('idea.published', z.object({ idea: IdeaDTO }));

export const TeamCreated = mainEnvelope('team.created', z.object({ team: TeamDTO }));

export const TeamUpdated = mainEnvelope('team.updated', z.object({ team: TeamDTO }));

export const TeamMemberJoined = mainEnvelope(
  'team.member_joined',
  z.object({ teamId: TeamId, person: PersonRef, status: TeamStatus }),
);

export const TeamMemberLeft = mainEnvelope(
  'team.member_left',
  z.object({ teamId: TeamId, personId: PersonId, status: TeamStatus }),
);

export const MatchSuggested = mainEnvelope(
  'match.suggested',
  z.object({ suggestion: SuggestionDTO }),
);

/**
 * Retira una sugerencia del grafo. Lo emite tanto la caducidad por tiempo como
 * el desplazamiento por tope (guardarraíles 2, 3 y 4 de docs/06): en ambos
 * casos la arista tiene que desaparecer y este es el único sobre que lo hace.
 */
export const MatchExpired = mainEnvelope(
  'match.expired',
  z.object({ suggestionId: SuggestionId }),
);

export const MainEvent = z.discriminatedUnion('type', [
  PersonUpserted,
  PersonStatusChanged,
  IdeaPublished,
  TeamCreated,
  TeamUpdated,
  TeamMemberJoined,
  TeamMemberLeft,
  MatchSuggested,
  MatchExpired,
]);
export type MainEvent = z.infer<typeof MainEvent>;

// ─── team-{teamId} ──────────────────────────────────────────────────────────
// Las applications no se publican en `network-main`: quién solicita a qué
// equipo es información sensible y no aparece en el grafo público (docs/03).

export const ApplicationCreated = teamEnvelope(
  'application.created',
  z.object({ application: ApplicationDTO }),
);

export const ApplicationResolved = teamEnvelope(
  'application.resolved',
  z.object({ application: ApplicationDTO }),
);

export const TeamNeedChanged = teamEnvelope(
  'team.need_changed',
  z.object({ teamId: TeamId, needs: z.array(NeedRef) }),
);

// ─── Tablero (docs/11) ──────────────────────────────────────────────────────
// Van por el MISMO canal `team-{teamId}`, no por uno propio (ADR-015): su
// `authz` ya está desplegado y ya distingue miembros de solicitantes, así que
// el tablero no añade ni una línea a `portal.config.ts`.

export const BoardCardCreated = teamEnvelope(
  'board.card_created',
  z.object({ card: BoardCard }),
);

/**
 * `card_moved` y `card_updated` llevan solo el delta, no la tarjeta entera:
 * son los dos mensajes de mayor frecuencia del canal y el `content` de Portal
 * está limitado a 2KB.
 */
export const BoardCardMoved = teamEnvelope(
  'board.card_moved',
  z.object({ cardId: CardId, x: z.number(), y: z.number() }),
);

export const BoardCardUpdated = teamEnvelope(
  'board.card_updated',
  z.object({ cardId: CardId, content: z.string() }),
);

/** `votes` viaja ya agregado: reaplicar el mensaje no descuadra el contador. */
export const BoardVoteCast = teamEnvelope(
  'board.vote_cast',
  z.object({ cardId: CardId, personId: PersonId, votes: z.number().int().nonnegative() }),
);

export const BoardVoteRemoved = teamEnvelope(
  'board.vote_removed',
  z.object({ cardId: CardId, personId: PersonId, votes: z.number().int().nonnegative() }),
);

export const BoardWinnerSelected = teamEnvelope(
  'board.winner_selected',
  z.object({ cardId: CardId }),
);

export const TeamEvent = z.discriminatedUnion('type', [
  ApplicationCreated,
  ApplicationResolved,
  TeamNeedChanged,
  BoardCardCreated,
  BoardCardMoved,
  BoardCardUpdated,
  BoardVoteCast,
  BoardVoteRemoved,
  BoardWinnerSelected,
]);
export type TeamEvent = NoGraph<z.infer<typeof TeamEvent>>;

// ─── Reto (docs/12) ─────────────────────────────────────────────────────────
// Canal `challenge-{teamId}-{challengeId}`, en modo broadcast.

/** `endsAt` es el plazo como dato (ADR-012): el cliente descuenta en local. */
export const ChallengeQuestionRevealed = teamEnvelope(
  'challenge.question_revealed',
  z.object({
    questionIndex: z.number().int().nonnegative(),
    question: ChallengeQuestion,
    endsAt: EpochMs,
  }),
);

/**
 * `correctIndex` aparece **aquí y no antes**: cuando este sobre se publica, la
 * pregunta ya cerró para todos y revelarla deja de ser una filtración.
 */
export const ChallengeLeaderboardUpdate = teamEnvelope(
  'challenge.leaderboard_update',
  z.object({
    questionIndex: z.number().int().nonnegative(),
    correctIndex: z.number().int().min(0).max(3),
    rankings: z.array(LeaderboardRow),
  }),
);

export const ChallengeEnded = teamEnvelope(
  'challenge.ended',
  z.object({ rankings: z.array(LeaderboardRow) }),
);

export const ChallengeEvent = z.discriminatedUnion('type', [
  ChallengeQuestionRevealed,
  ChallengeLeaderboardUpdate,
  ChallengeEnded,
]);
export type ChallengeEvent = NoGraph<z.infer<typeof ChallengeEvent>>;

export const AnyEvent = z.union([MainEvent, TeamEvent, ChallengeEvent]);
export type AnyEvent = MainEvent | TeamEvent | ChallengeEvent;
