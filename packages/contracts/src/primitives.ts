import { z } from 'zod';

/**
 * Identificadores.
 *
 * El prefijo es parte del contrato (docs/09): distingue a qué entidad
 * pertenece un id y convierte en error de validación el confundir un
 * `teamId` con un `personId`, que de otro modo son dos `string`.
 * El cuerpo queda libre a propósito: el generador puede cambiar sin
 * romper a los consumidores.
 */
const prefixedId = (prefix: string) =>
  z
    .string()
    .regex(
      new RegExp(`^${prefix}_[A-Za-z0-9_-]+$`),
      `debe ser un identificador con prefijo "${prefix}_"`,
    );

export const PersonId = prefixedId('per');
export const TeamId = prefixedId('tm');
export const IdeaId = prefixedId('idea');
export const ApplicationId = prefixedId('app');
export const SuggestionId = prefixedId('sug');
export const DomainEventId = prefixedId('evt');
/** Contenedor donde la gente se encuentra para construir (ADR-013). */
export const EventId = prefixedId('ev');
export const BoardId = prefixedId('brd');
export const CardId = prefixedId('card');

export type PersonId = z.infer<typeof PersonId>;
export type TeamId = z.infer<typeof TeamId>;
export type IdeaId = z.infer<typeof IdeaId>;
export type ApplicationId = z.infer<typeof ApplicationId>;
export type SuggestionId = z.infer<typeof SuggestionId>;
export type DomainEventId = z.infer<typeof DomainEventId>;
export type EventId = z.infer<typeof EventId>;
export type BoardId = z.infer<typeof BoardId>;
export type CardId = z.infer<typeof CardId>;

/** Fechas: epoch en milisegundos. Nunca `Date` ni ISO string (docs/09). */
export const EpochMs = z.number().int().nonnegative();
export type EpochMs = z.infer<typeof EpochMs>;

/** Handle público de una persona. Único en toda la red. */
export const Handle = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{1,29}$/, 'minúsculas, dígitos, guion y guion bajo; 2–30 caracteres');
export type Handle = z.infer<typeof Handle>;

/** ISO 639-1. */
export const LanguageCode = z.string().regex(/^[a-z]{2}$/, 'código ISO 639-1 de dos letras');
export type LanguageCode = z.infer<typeof LanguageCode>;

// ─── Enumeraciones del dominio ──────────────────────────────────────────────

export const SkillCategory = z.enum([
  'frontend',
  'backend',
  'mobile',
  'data-ai',
  'design',
  'product',
  'infra',
  'other',
]);
export type SkillCategory = z.infer<typeof SkillCategory>;

export const PersonStatus = z.enum(['looking', 'teamed', 'idle']);
export type PersonStatus = z.infer<typeof PersonStatus>;

export const Availability = z.enum(['full', 'partial', 'evenings']);
export type Availability = z.infer<typeof Availability>;

export const TeamStatus = z.enum(['recruiting', 'almost_full', 'complete', 'building']);
export type TeamStatus = z.infer<typeof TeamStatus>;

export const ApplicationStatus = z.enum([
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
  'auto_rejected',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

export const SuggestionDirection = z.enum(['team_needs_person', 'person_seeks_team']);
export type SuggestionDirection = z.infer<typeof SuggestionDirection>;

export const NeedPriority = z.enum(['required', 'nice']);
export type NeedPriority = z.infer<typeof NeedPriority>;

/**
 * Qué clase de contenedor es (ADR-013).
 *
 * `hackathon` está acotado en el tiempo y varios equipos compiten;
 * `project` es abierto y la gente colabora. De aquí deriva la interfaz su
 * modo de experiencia, así que no se guarda por separado.
 */
export const EventKind = z.enum(['hackathon', 'project']);
export type EventKind = z.infer<typeof EventKind>;

/**
 * Id del evento abierto por defecto, sembrado por `db:seed`.
 *
 * Es lo que permite que `teams.event_id` e `ideas.event_id` sean `NOT NULL`
 * **sin romper a ningún cliente existente**: `eventId` entra como campo
 * opcional en los payloads de creación y, si falta, la fila cae aquí.
 */
export const DEFAULT_EVENT_ID = 'ev_open';

/**
 * Tamaño de equipo **por defecto**, no un tope (ADR-014).
 *
 * `max_size` perdió su límite superior —`check (max_size >= 1)`— porque un
 * proyecto de código abierto necesita más de cuatro colaboradores. El 4 sigue
 * siendo el valor por defecto, que es el caso de un equipo de hackathon.
 */
export const DEFAULT_TEAM_SIZE = 4;

/**
 * Cuántos `PersonRef` caben en `TeamDTO.members` **dentro de un sobre**.
 *
 * El `content` de un mensaje de Portal está limitado a 2KB. Con el envoltorio
 * del sobre y el resto del DTO, pasado el orden de 8 miembros `team.updated`
 * excede ese límite, Portal rechaza la publicación y el evento se pierde. Por
 * eso `memberCount` —y no `members.length`— es la verdad (ADR-014).
 *
 * `GET /v1/teams/:id` no aplica este recorte: devuelve la lista completa.
 */
export const MAX_MEMBERS_IN_ENVELOPE = 8;

// ─── Referencias ligeras ────────────────────────────────────────────────────
// Se embeben dentro de otros DTO cuando solo hace falta identificar y mostrar.

export const PersonRef = z.object({
  id: PersonId,
  handle: Handle,
  displayName: z.string().min(1),
});
export type PersonRef = z.infer<typeof PersonRef>;

export const TeamRef = z.object({
  id: TeamId,
  name: z.string().min(1),
});
export type TeamRef = z.infer<typeof TeamRef>;

export const SkillRef = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  category: SkillCategory,
});
export type SkillRef = z.infer<typeof SkillRef>;

/**
 * Arista NEEDS: qué le falta a un equipo y con qué prioridad.
 *
 * Es la única especialización de `SkillRef`. `HAS_SKILL` no tiene atributos
 * propios y viaja como `SkillRef` a secas (docs/09).
 */
export const NeedRef = SkillRef.extend({
  priority: NeedPriority,
});
export type NeedRef = z.infer<typeof NeedRef>;
