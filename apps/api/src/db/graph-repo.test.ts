import type { GraphEdge, GraphNode } from '@nodo/contracts';
import { describe, expect, it } from 'vitest';
import { filterByEvent } from './graph-repo.js';

/**
 * ADR-013: `Event` es una dimensión de filtro, no un ámbito de canal ni un
 * `NodeKind`. `network-main` sigue siendo un solo canal para toda la red y el
 * recorte ocurre al servir el snapshot.
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
    const ids = filterByEvent(graph, 'ev_hack').nodes.map((n) => n.id);
    expect(ids).toContain('tm_health');
    expect(ids).not.toContain('tm_growth');
  });

  /**
   * Personas, skills y agentes no pertenecen a ningún contenedor: participan
   * en todos. Filtrarlos dejaría el grafo sin la mitad de sus extremos.
   */
  it('nunca filtra lo que no tiene contenedor', () => {
    const ids = filterByEvent(graph, 'ev_hack').nodes.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['per_laura', 'sk_go', 'matchmaker']));
  });

  /** Una arista hacia un nodo que no viajó dejaría al cliente con un extremo colgando. */
  it('descarta las aristas que perdieron un extremo', () => {
    const ids = filterByEvent(graph, 'ev_hack').edges.map((e) => e.id);
    expect(ids).toEqual(['e1', 'e3']);
  });

  it('un contenedor inexistente deja fuera todo lo que sí tiene contenedor', () => {
    const result = filterByEvent(graph, 'ev_no_existe');
    expect(result.nodes.map((n) => n.id)).toEqual(['per_laura', 'sk_go', 'matchmaker']);
    expect(result.edges.map((e) => e.id)).toEqual(['e3']);
  });
});
