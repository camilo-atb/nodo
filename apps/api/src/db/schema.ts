import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Traducción literal de docs/04.
 *
 * Los invariantes viven aquí como índices únicos parciales, no solo en la capa
 * de servicio: un invariante que solo existe en el código no es un invariante
 * (docs/02).
 */

// ─── Vocabulario canónico (semilla, no se escribe en runtime) ────────────────

export const skills = pgTable(
  'skills',
  {
    slug: text('slug').primaryKey(),
    label: text('label').notNull(),
    category: text('category').notNull(),
  },
  (t) => [
    check(
      'skills_category_check',
      sql`${t.category} in ('frontend','backend','mobile','data-ai','design','product','infra','other')`,
    ),
  ],
);

/** Alias para la extracción por LLM: 'golang' → 'go', 'react.js' → 'react'. */
export const skillAliases = pgTable('skill_aliases', {
  alias: text('alias').primaryKey(),
  slug: text('slug')
    .notNull()
    .references(() => skills.slug, { onDelete: 'cascade' }),
});

// ─── Grafo ──────────────────────────────────────────────────────────────────

export const nodeKind = pgEnum('node_kind', ['person', 'idea', 'team', 'skill', 'agent']);

export const edgeKind = pgEnum('edge_kind', [
  'has_skill',
  'needs',
  'member_of',
  'leads',
  'interested_in',
  'authored',
  'spawned',
  'applied_to',
  'suggested',
]);

export const nodes = pgTable(
  'nodes',
  {
    id: text('id').primaryKey(),
    kind: nodeKind('kind').notNull(),
    label: text('label').notNull(),
    status: text('status'),
    meta: jsonb('meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('nodes_kind_status_idx').on(t.kind, t.status)],
);

export const edges = pgTable(
  'edges',
  {
    id: text('id').primaryKey(),
    kind: edgeKind('kind').notNull(),
    fromId: text('from_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    toId: text('to_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    weight: real('weight'),
    transient: boolean('transient').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    meta: jsonb('meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('edges_kind_to_idx').on(t.kind, t.toId),
    index('edges_kind_from_idx').on(t.kind, t.fromId),

    // Invariante 1: una persona pertenece como máximo a un equipo.
    uniqueIndex('one_team_per_person')
      .on(t.fromId)
      .where(sql`kind = 'member_of'`),

    // Invariante 4: una sola solicitud activa por (persona, equipo).
    uniqueIndex('one_active_application')
      .on(t.fromId, t.toId)
      .where(sql`kind = 'applied_to' and meta->>'status' = 'pending'`),

    // No duplicar aristas idénticas.
    uniqueIndex('uniq_skill_edges')
      .on(t.kind, t.fromId, t.toId)
      .where(
        sql`kind in ('has_skill','needs','member_of','leads','interested_in')`,
      ),
  ],
);

// ─── Detalle por tipo ───────────────────────────────────────────────────────
// Orden obligatorio: people → ideas → teams.

export const people = pgTable(
  'people',
  {
    id: text('id')
      .primaryKey()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    handle: text('handle').notNull().unique(),
    displayName: text('display_name').notNull(),
    headline: text('headline'),
    bioRaw: text('bio_raw'),
    availability: text('availability').notNull().default('full'),
    language: text('language').notNull().default('es'),
    sessionToken: text('session_token').notNull().unique(),
    recoveryCode: text('recovery_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('people_availability_check', sql`${t.availability} in ('full','partial','evenings')`),
  ],
);

// ─── Contenedor (ADR-013) ───────────────────────────────────────────────────

/**
 * `events` no participa en el grafo: es una dimensión de filtro, no un nodo.
 * Las fechas son nulables porque un `project` no las tiene.
 */
export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    kind: text('kind').notNull(),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('events_kind_check', sql`${t.kind} in ('hackathon','project')`)],
);

export const ideas = pgTable('ideas', {
  id: text('id')
    .primaryKey()
    .references(() => nodes.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  authorId: text('author_id')
    .notNull()
    .references(() => people.id),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable(
  'teams',
  {
    id: text('id')
      .primaryKey()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    pitch: text('pitch'),
    leadId: text('lead_id')
      .notNull()
      .references(() => people.id),
    ideaId: text('idea_id').references(() => ideas.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    maxSize: integer('max_size').notNull().default(4),
    /** El estado `building`: el líder congeló el reclutamiento. */
    frozen: boolean('frozen').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Sin tope superior (ADR-014): un proyecto de código abierto necesita más
    // de cuatro. El recorte de `members` en los sobres es lo que respeta el
    // límite de 2KB de Portal, no un tope al equipo.
    (t) => [
      check('teams_max_size_check', sql`${t.maxSize} >= 1`),
      index('teams_event_idx').on(t.eventId),
    ],
);

export const suggestions = pgTable(
  'suggestions',
  {
    id: text('id').primaryKey(),
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    score: real('score').notNull(),
    direction: text('direction').notNull(),
    matchedSkills: jsonb('matched_skills').notNull(),
    rationale: text('rationale').notNull(),
    status: text('status').notNull().default('live'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * Guardarraíl 1 de docs/06: una sola sugerencia por par, incluidas las
     * caducadas. Sin cláusula WHERE y sin borrar filas, así el par queda
     * bloqueado de forma permanente. Si las filas vencidas se eliminaran, el
     * mismo par volvería a sugerirse cada dos horas.
     */
    uniqueIndex('one_suggestion_per_pair').on(t.personId, t.teamId),
    index('suggestions_status_expires_idx').on(t.status, t.expiresAt),
    check(
      'suggestions_direction_check',
      sql`${t.direction} in ('team_needs_person','person_seeks_team')`,
    ),
    check('suggestions_status_check', sql`${t.status} in ('live','expired','consumed')`),
  ],
);

// ─── Infraestructura ────────────────────────────────────────────────────────

/** Idempotencia del camino de webhook (entrega at-least-once de Portal). */
export const processedEvents = pgTable('processed_events', {
  eventId: text('event_id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Reintento de publicaciones fallidas a Portal (ADR-005). */
export const outbox = pgTable(
  'outbox',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    channel: text('channel').notNull(),
    envelope: jsonb('envelope').notNull(),
    attempts: integer('attempts').notNull().default(0),
    published: boolean('published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('outbox_pending_idx')
      .on(t.published, t.createdAt)
      .where(sql`not published`),
  ],
);

/**
 * Marca de agua por canal para el `seq` de GET /v1/graph (ADR-009).
 * Se actualiza en cada publicación con éxito; `outbox` solo registra los
 * fallos y por eso no puede sostenerla.
 */
export const channelWatermarks = pgTable('channel_watermarks', {
  channel: text('channel').primaryKey(),
  seq: bigint('seq', { mode: 'number' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Tablero colaborativo (docs/11) ─────────────────────────────────────────

/**
 * `team_id` es `unique`: la relación 1:1 con el equipo se aplica en la base
 * de datos, no en la capa de servicio (docs/02).
 *
 * `winner_card_id` vive aquí y no como columna de la tarjeta, para que solo
 * pueda haber una ganadora **por construcción** en vez de por disciplina.
 */
export const boards = pgTable('boards', {
  id: text('id').primaryKey(),
  teamId: text('team_id')
    .notNull()
    .unique()
    .references(() => teams.id, { onDelete: 'cascade' }),
  winnerCardId: text('winner_card_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const boardCards = pgTable(
  'board_cards',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    content: text('content').notNull().default(''),
    x: real('x').notNull(),
    y: real('y').notNull(),
    color: text('color').notNull().default('yellow'),
    createdBy: text('created_by')
      .notNull()
      .references(() => people.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('board_cards_board_idx').on(t.boardId)],
);

/** Un voto por persona y tarjeta: el segundo `POST` no hace nada. */
export const boardVotes = pgTable(
  'board_votes',
  {
    cardId: text('card_id')
      .notNull()
      .references(() => boardCards.id, { onDelete: 'cascade' }),
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.personId] })],
);

// ─── Skill Challenge (docs/12) ──────────────────────────────────────────────

/**
 * `current_question` y `question_started_at` son lo que hace que el reto
 * sobreviva a un redespliegue (ADR-012): el estado vive aquí y no en un
 * temporizador en memoria, así que el siguiente `advance` lo continúa.
 */
export const challenges = pgTable(
  'challenges',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    skillSlug: text('skill_slug')
      .notNull()
      .references(() => skills.slug),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'),
    durationSec: integer('duration_sec').notNull().default(20),
    currentQuestion: integer('current_question'),
    questionStartedAt: timestamp('question_started_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'challenges_status_check',
      sql`${t.status} in ('draft','waiting','question','reviewing','ended')`,
    ),
    // Un reto vivo por equipo y skill: dos a la vez repartirían a los
    // solicitantes entre dos rankings que no se pueden comparar.
    uniqueIndex('one_live_challenge_per_team_skill')
      .on(t.teamId, t.skillSlug)
      .where(sql`${t.status} in ('waiting','question','reviewing')`),
    index('challenges_status_expires_idx').on(t.status, t.expiresAt),
  ],
);

export const challengeQuestions = pgTable(
  'challenge_questions',
  {
    id: text('id').primaryKey(),
    challengeId: text('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    options: text('options').array().notNull(),
    /** Solo existe aquí. Nunca viaja en el sobre de la pregunta (docs/12). */
    correctIndex: integer('correct_index').notNull(),
  },
  (t) => [
    uniqueIndex('challenge_questions_position_idx').on(t.challengeId, t.position),
    check('challenge_questions_correct_check', sql`${t.correctIndex} between 0 and 3`),
  ],
);

export const challengeEntries = pgTable(
  'challenge_entries',
  {
    challengeId: text('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    score: integer('score').notNull().default(0),
    answeredCount: integer('answered_count').notNull().default(0),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    /** Abandonar conserva el puntaje acumulado: no hay penalización. */
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.challengeId, t.personId] })],
);

/** Una respuesta por persona y pregunta: la segunda es `ALREADY_ANSWERED`. */
export const challengeAnswers = pgTable(
  'challenge_answers',
  {
    id: text('id').primaryKey(),
    challengeId: text('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    personId: text('person_id')
      .notNull()
      .references(() => people.id, { onDelete: 'cascade' }),
    questionIndex: integer('question_index').notNull(),
    answerIndex: integer('answer_index').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    points: integer('points').notNull(),
  },
  (t) => [
    uniqueIndex('one_answer_per_person_question').on(
      t.challengeId,
      t.personId,
      t.questionIndex,
    ),
  ],
);
