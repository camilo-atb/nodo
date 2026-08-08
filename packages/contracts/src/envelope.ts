import { z } from 'zod';
import { GraphPatch, NodeKind } from './graph.js';
import { EpochMs, EventId, Handle, PersonId } from './primitives.js';

/**
 * Los agentes son nodos de primera clase del grafo, no funciones anónimas.
 *
 * `AgentId` es una unión y no un literal porque hay dos actores: `matchmaker`
 * sugiere encajes (docs/06) y `quizmaster` redacta los retos (docs/12). Son
 * dos actores del dominio, **no dos credenciales**: comparten el mismo
 * `LlmProvider` y la misma `LLM_API_KEY` (ADR-007).
 */
export const AGENT_ID = 'matchmaker';
export const AGENT_DISPLAY_NAME = 'MatchMaker';
export const QUIZMASTER_ID = 'quizmaster';
export const QUIZMASTER_DISPLAY_NAME = 'QuizMaster';

export const AgentId = z.enum([AGENT_ID, QUIZMASTER_ID]);
export type AgentId = z.infer<typeof AgentId>;

/** Prefijo de `senderId` de todo agente. Lo usa el guardarraíl anti-bucle. */
export const AGENT_SENDER_PREFIX = 'agent:';

export const ActorRef = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('person'),
    id: PersonId,
    handle: Handle,
    displayName: z.string().min(1),
  }),
  z.object({
    kind: z.literal('agent'),
    id: AgentId,
    displayName: z.string().min(1),
  }),
]);
export type ActorRef = z.infer<typeof ActorRef>;

/** Línea lista para el feed, con las referencias ya resueltas para enlazar. */
export const FeedLine = z.object({
  text: z.string().min(1),
  icon: z.string().min(1),
  refs: z.array(
    z.object({
      kind: NodeKind,
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
});
export type FeedLine = z.infer<typeof FeedLine>;

/**
 * Sobre base. No se usa directamente: todo mensaje se construye con uno de los
 * dos alias de abajo (ADR-010).
 *
 * Los objetos son `strict`, así que una clave no declarada —`graph` en un
 * sobre de canal privado, un campo con el nombre mal escrito— falla la
 * validación en vez de viajar sin que nadie la lea.
 */
const baseEnvelope = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.strictObject({
    /** Versión del contrato. */
    v: z.literal(1),
    type: z.literal(type),
    /** Id del evento de dominio. Clave de idempotencia. */
    id: EventId,
    /** Epoch ms del servidor. */
    at: EpochMs,
    actor: ActorRef,
    payload,
    summary: FeedLine,
  });

/** Sobre de `network-main`: exige parche de grafo. */
export const mainEnvelope = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  baseEnvelope(type, payload).extend({ graph: GraphPatch });

/** Sobre de `team-{id}`: no toca el grafo público, así que no lleva parche. */
export const teamEnvelope = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  baseEnvelope(type, payload);

export type Envelope<T extends string, P> = {
  v: 1;
  type: T;
  id: string;
  at: number;
  actor: ActorRef;
  payload: P;
  summary: FeedLine;
  graph?: GraphPatch;
};

export type MainEnvelope<T extends string, P> = Envelope<T, P> & { graph: GraphPatch };

/**
 * `graph?: never` es lo que convierte en error de compilación —en el backend y
 * en el frontend a la vez— adjuntar un parche a un evento de canal privado.
 */
export type TeamEnvelope<T extends string, P> = Envelope<T, P> & { graph?: never };

/** Aplica la prohibición de `graph` a un tipo inferido de un esquema. */
export type NoGraph<T> = T & { graph?: never };
