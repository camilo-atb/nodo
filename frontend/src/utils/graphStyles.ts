/**
 * Mapeo kind → estilo visual del grafo.
 * Single source of truth para colores, formas y tamaños.
 * Usado por nodeRenderer, linkRenderer, badges, leyendas.
 *
 * Paleta basada en nodo-proposal.html:
 * - person: #7380ad (gris-azulado)
 * - idea: #8b5cf6 (violet)
 * - team: #2dd4bf (teal)
 * - ai/matchmaker: #a78bfa (violet claro)
 */

export type NodeKind = 'person' | 'idea' | 'team' | 'skill' | 'matchmaker';
export type NodeShape = 'circle' | 'square' | 'diamond' | 'star' | 'dot';

export function getNodeColor(kind: NodeKind): string {
  const colors: Record<NodeKind, string> = {
    person: '#7380ad',
    idea: '#8b5cf6',
    team: '#2dd4bf',
    skill: '#fbbf24',
    matchmaker: '#a78bfa',
  };
  return colors[kind] ?? '#7380ad';
}

export function getNodeShape(kind: NodeKind): NodeShape {
  const shapes: Record<NodeKind, NodeShape> = {
    person: 'circle',
    idea: 'diamond',
    team: 'square',
    skill: 'dot',
    matchmaker: 'star',
  };
  return shapes[kind] ?? 'circle';
}

export function getNodeSize(kind: NodeKind): number {
  const sizes: Record<NodeKind, number> = {
    person: 6,
    idea: 8,
    team: 10,
    skill: 4,
    matchmaker: 8,
  };
  return sizes[kind] ?? 6;
}

export interface LinkStyle {
  color: string;
  dashed: boolean;
  width: number;
}

export function getLinkStyle(transient: boolean): LinkStyle {
  if (transient) {
    return { color: '#9b7cff', dashed: true, width: 1.5 };
  }
  return { color: '#4f5a85', dashed: false, width: 1 };
}
