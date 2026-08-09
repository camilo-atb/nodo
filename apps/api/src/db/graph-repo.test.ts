import type { GraphEdge, GraphNode } from '@nodo/contracts';
import { describe, expect, it } from 'vitest';
import { filterByEvent } from './graph-repo.js';

/**
 * Event no es un NodeKind, pero sí es el ámbito de aislamiento. Solo las
 * Person suscritas forman parte de su proyección.
 */
describe('filterByEvent — acotar el grafo a un contenedor (ADR-013)', () => {
  const node = (id: string, kind: GraphNode['kind'], eventId?: string): GraphNode => ({
    id,
    kind,
    label: id,
    ...(eventId ? { meta: { eventId } } : {}),
  });

  const edge = (id: string, from: string, to: string): GraphEdge => ({
    id,
    kind: 'member_of',
    from,
    to,
  });

  const graph = {
    nodes: [
      node('per_laura', 'person'),
      node('sk_go', 'skill'),
      node('matchmaker', 'agent'),
      node('tm_health', 'team', 'ev_hack'),
      node('tm_growth', 'team', 'ev_open'),
      node('idea_health', 'idea', 'ev_hack'),
    ],
    edges: [
      edge('e1', 'per_laura', 'tm_health'),
      edge('e2', 'per_laura', 'tm_growth'),
      edge('e3', 'per_laura', 'sk_go'),
    ],
  };

  it('sin eventId devuelve el grafo entero, y el mismo objeto', () => {
    expect(filterByEvent(graph)).toBe(graph);
  });

  it('deja solo los nodos del contenedor pedido', () => {
    const ids = filterByEvent(graph, 'ev_hack', new Set(['per_laura'])).nodes.map((n) => n.id);
    expect(ids).toContain('tm_health');
    expect(ids).not.toContain('tm_growth');
  });

  /**
   * Skills y agentes son conceptos globales; Person requiere suscripción.
   */
  it('incluye únicamente participantes suscritos, además de skills y agentes', () => {
    const ids = filterByEvent(graph, 'ev_hack', new Set(['per_laura'])).nodes.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['per_laura', 'sk_go', 'matchmaker']));
    expect(filterByEvent(graph, 'ev_hack').nodes.map((n) => n.id)).not.toContain('per_laura');
  });

  /** Una arista hacia un nodo que no viajó dejaría al cliente con un extremo colgando. */
  it('descarta las aristas que perdieron un extremo', () => {
    const ids = filterByEvent(graph, 'ev_hack', new Set(['per_laura'])).edges.map((e) => e.id);
    expect(ids).toEqual(['e1', 'e3']);
  });

  it('un contenedor inexistente deja fuera todo lo que sí tiene contenedor', () => {
    const result = filterByEvent(graph, 'ev_no_existe');
    expect(result.nodes.map((n) => n.id)).toEqual(['sk_go', 'matchmaker']);
    expect(result.edges.map((e) => e.id)).toEqual([]);
  });
});
