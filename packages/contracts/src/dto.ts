import { z } from 'zod';
import {
  ApplicationId,
  ApplicationStatus,
  Availability,
  EpochMs,
  EventId,
  EventKind,
  Handle,
  IdeaId,
  LanguageCode,
  NeedRef,
  PersonId,
  PersonRef,
  PersonStatus,
  SuggestionDirection,
  SuggestionId,
  TeamId,
  TeamStatus,
} from './primitives.js';

/**
 * Regla de exposición (docs/09): `session_token` y `recovery_code` existen en
 * la base de datos y no aparecen en ningún DTO. Se devuelven una sola vez, en
 * la respuesta que los acuña (ver `rest.ts`).
 */
export const PersonDTO = z.object({
  id: PersonId,
  handle: Handle,
  displayName: z.string().min(1),
  headline: z.string().nullable(),
  /** Texto libre que la persona escribió. Público. */
  bio: z.string().nullable(),
  availability: Availability,
  language: LanguageCode,
  status: PersonStatus,
  /** `MEMBER_OF` materializado. Como máximo uno (invariante 1). */
  teamId: TeamId.nullable(),
  createdAt: EpochMs,
});
export type PersonDTO = z.infer<typeof PersonDTO>;

/**
 * `members` viaja completo porque `maxSize` lo acota a 4 como mucho, y `lead`
 * está siempre incluido en él (invariante 3).
 */
export const TeamDTO = z.object({
  id: TeamId,
  name: z.string().min(1),
  pitch: z.string().nullable(),
  /** Derivado por cascada salvo `building` (docs/02). */
  status: TeamStatus,
  lead: PersonRef,
  /**
   * En `GET /v1/teams/:id` es la lista completa; en un sobre viaja acotada a
   * `MAX_MEMBERS_IN_ENVELOPE` con el líder primero (ADR-014). Para el contador
   * «X de Y» hay que leer `memberCount`, nunca `members.length`.
   */
  members: z.array(PersonRef).min(1),
  memberCount: z.number().int().nonnegative(),
  needs: z.array(NeedRef),
  /** Contenedor al que pertenece. Nunca nulo (ADR-013). */
  eventId: EventId,
  ideaId: IdeaId.nullable(),
  /** Sin tope superior desde ADR-014: el 4 es el valor por defecto. */
  maxSize: z.number().int().min(1),
  createdAt: EpochMs,
});
export type TeamDTO = z.infer<typeof TeamDTO>;

export const IdeaDTO = z.object({
  id: IdeaId,
  title: z.string().min(1),
  summary: z.string().nullable(),
  author: PersonRef,
  /** Contenedor al que pertenece. Nunca nulo (ADR-013). */
  eventId: EventId,
  /** Arista `SPAWNED`, si la idea ya derivó en equipo. */
  teamId: TeamId.nullable(),
  interestedCount: z.number().int().nonnegative(),
  createdAt: EpochMs,
});
export type IdeaDTO = z.infer<typeof IdeaDTO>;

/**
 * `teamName` y `leadId` están denormalizados a propósito: el bridge `notify`
 * corre dentro de Portal, sin acceso a la base de datos, y solo puede leer el
 * `content` del mensaje. Quitarlos rompe las notificaciones en silencio.
 */
export const ApplicationDTO = z.object({
  id: ApplicationId,
  person: PersonRef,
  teamId: TeamId,
  teamName: z.string().min(1),
  leadId: PersonId,
  status: ApplicationStatus,
  message: z.string().nullable(),
  /**
   * Resultado del último reto de esta persona en este equipo (docs/12).
   *
   * **Ordenan la bandeja del líder, no deciden nada.** Aceptar sigue siendo un
   * acto explícito: es la única operación que dispara el invariante 5 completo
   * y automatizarla desde un juego convertiría cada empate o desconexión en
   * una escritura irreversible que nadie autorizó.
   */
  challengeScore: z.number().int().nonnegative().nullable(),
  challengeRank: z.number().int().positive().nullable(),
  createdAt: EpochMs,
  resolvedAt: EpochMs.nullable(),
});
export type ApplicationDTO = z.infer<typeof ApplicationDTO>;

/**
 * `personName` y `teamName` los exige el mismo bridge `notify`, por el mismo
 * motivo que en `ApplicationDTO`.
 *
 * `matchedSkills` no puede venir vacío: el rationale tiene que nombrar skills
 * concretos y sin coincidencias no hay nada que nombrar (docs/06).
 */
export const SuggestionDTO = z.object({
  id: SuggestionId,
  personId: PersonId,
  personName: z.string().min(1),
  teamId: TeamId,
  teamName: z.string().min(1),
  score: z.number().nonnegative(),
  direction: SuggestionDirection,
  matchedSkills: z.array(NeedRef).min(1),
  rationale: z.string().min(1),
  expiresAt: EpochMs,
  createdAt: EpochMs,
});
export type SuggestionDTO = z.infer<typeof SuggestionDTO>;

/**
 * Contenedor donde la gente se encuentra para construir (ADR-013).
 *
 * **No es un nodo del grafo.** `NodeKind` no gana valores: el frontend
 * construye `Record<NodeKind, …>` exhaustivos y añadir uno rompe su
 * compilación. El evento viaja como `eventId` en `GraphNode.meta` y actúa
 * como dimensión de filtro, no como ámbito de canal: `network-main` sigue
 * siendo un solo canal para toda la red.
 *
 * Las fechas son nulables porque un `project` no las tiene; un `hackathon`
 * sí. Ese par de nulos en una tabla que casi nadie consulta es más barato que
 * un nulo en la clave foránea que consulta todo el mundo.
 */
export const EventDTO = z.object({
  id: EventId,
  name: z.string().min(1),
  description: z.string().nullable(),
  kind: EventKind,
  tags: z.array(z.string().min(1)),
  startsAt: EpochMs.nullable(),
  endsAt: EpochMs.nullable(),
  participantCount: z.number().int().nonnegative(),
  createdAt: EpochMs,
});
export type EventDTO = z.infer<typeof EventDTO>;
