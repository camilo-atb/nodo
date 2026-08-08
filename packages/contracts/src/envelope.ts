import { z } from 'zod';
import { GraphPatch, NodeKind } from './graph.js';
import { EpochMs, EventId, Handle, PersonId } from './primitives.js';

export const AGENT_ID = 'matchmaker';
export const AGENT_DISPLAY_NAME = 'MatchMaker';

export const ActorRef = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('person'), id: PersonId, handle: Handle, displayName: z.string().min(1) }),
  z.object({ kind: z.literal('agent'), id: z.literal(AGENT_ID), displayName: z.literal(AGENT_DISPLAY_NAME) }),
]);
export type ActorRef = z.infer<typeof ActorRef>;

export const FeedLine = z.object({
  text: z.string().min(1),
  icon: z.string().min(1),
  refs: z.array(z.object({ kind: NodeKind, id: z.string().min(1), label: z.string().min(1) })),
});
export type FeedLine = z.infer<typeof FeedLine>;

const baseEnvelope = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.strictObject({ v: z.literal(1), type: z.literal(type), id: EventId, at: EpochMs, actor: ActorRef, payload, summary: FeedLine });

export const mainEnvelope = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  baseEnvelope(type, payload).extend({ graph: GraphPatch });

export const teamEnvelope = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  baseEnvelope(type, payload);

export type Envelope<T extends string, P> = { v: 1; type: T; id: string; at: number; actor: ActorRef; payload: P; summary: FeedLine; graph?: GraphPatch };
export type MainEnvelope<T extends string, P> = Envelope<T, P> & { graph: GraphPatch };
export type TeamEnvelope<T extends string, P> = Envelope<T, P> & { graph?: never };
export type NoGraph<T> = T & { graph?: never };
