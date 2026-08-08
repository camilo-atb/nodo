import type { GraphEdge, GraphNode } from '@nodo/contracts';
import { isNull, gt, or, sql } from 'drizzle-orm';
import type { Db } from './client.js';
import { edges, nodes, channelWatermarks } from './schema.js';

/**
 * `GET /v1/graph`: dos consultas y cero ensamblaje (docs/04). `nodes` y
 * `edges` ya tienen la forma de `GraphNode`/`GraphEdge`; el único trabajo es
 * convertir la marca de tiempo a epoch ms.
 */
/**
 * Acota un snapshot a un contenedor (ADR-013).
 *
 * `Event` no es un `NodeKind`, así que el filtro va por el `eventId` del
 * `meta` y **en memoria**: el grafo entero cabe en pocos cientos de KB, y
 * hacerlo en SQL obligaría a indexar dentro del `jsonb` para ahorrar una
 * operación que ya es de milisegundos.
 *
 * Los nodos **sin** `eventId` —personas, skills, el agente— nunca se filtran:
 * no pertenecen a ningún contenedor, participan en todos. Y las aristas se
 * recortan a las que siguen teniendo sus dos extremos visibles, o el cliente
 * recibiría aristas colgando de nodos que no le llegaron.
 */
export const filterByEvent = (
  graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  eventId?: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } => {
  if (!eventId) return graph;

  const nodes = graph.nodes.filter((n) => {
    const owner = n.meta?.['eventId'];
    return owner === undefined || owner === eventId;
  });
  const visible = new Set(nodes.map((n) => n.id));

  return { nodes, edges: graph.edges.filter((e) => visible.has(e.from) && visible.has(e.to)) };
};

export const getGraphSnapshot = async (
  db: Db,
  eventId?: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> => {
  const nodeRows = await db
    .select({ id: nodes.id, kind: nodes.kind, label: nodes.label, status: nodes.status, meta: nodes.meta })
    .from(nodes);

  const edgeRows = await db
    .select({
      id: edges.id,
      kind: edges.kind,
      from: edges.fromId,
      to: edges.toId,
      weight: edges.weight,
      transient: edges.transient,
      expiresAt: edges.expiresAt,
      meta: edges.meta,
    })
    .from(edges)
    .where(or(isNull(edges.expiresAt), gt(edges.expiresAt, sql`now()`)));

  const all = {
    nodes: nodeRows.map((n) => ({
      id: n.id,
      kind: n.kind,
      label: n.label,
      status: n.status ?? undefined,
      meta: (n.meta as Record<string, unknown>) ?? undefined,
    })),
    edges: edgeRows.map((e) => ({
      id: e.id,
      kind: e.kind,
      from: e.from,
      to: e.to,
      weight: e.weight ?? undefined,
      transient: e.transient,
      expiresAt: e.expiresAt ? e.expiresAt.getTime() : undefined,
      meta: (e.meta as Record<string, unknown>) ?? undefined,
    })),
  };

  return filterByEvent(all, eventId);
};

/**
 * `seq` es exclusivamente el de `network-main` (ADR-009). Se lee **antes**
 * que el grafo: el peor caso es reaplicar un parche que el snapshot ya
 * incluía, y el upsert por `id` es idempotente.
 */
export const getMainWatermark = async (db: Db): Promise<number> => {
  const [row] = await db
    .select({ seq: channelWatermarks.seq })
    .from(channelWatermarks)
    .where(sql`${channelWatermarks.channel} = 'network-main'`);
  return row?.seq ?? 0;
};
