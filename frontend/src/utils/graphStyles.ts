/**
 * Mapeo kind → estilo visual del grafo.
 * Single source of truth para colores, formas y tamaños.
 * Usado por nodeRenderer, linkRenderer, badges, leyendas.
 */

import type { NodeKind, EdgeKind } from '@nodo/contracts';

export type NodeShape = 'circle' | 'square' | 'diamond' | 'star' | 'dot';

export function getNodeColor(kind: NodeKind): string {
  const colors: Record<NodeKind, string> = {
    person: '#4c9ed9',
    team: '#06b6d4',
    idea: '#f59e0b',
    skill: '#64748b',
    agent: '#a78bfa',
  };
  return colors[kind] ?? '#4c9ed9';
}

export function getNodeShape(kind: NodeKind): NodeShape {
  const shapes: Record<NodeKind, NodeShape> = {
    person: 'circle',
    team: 'square',
    idea: 'diamond',
    skill: 'dot',
    agent: 'star',
  };
  return shapes[kind] ?? 'circle';
}

export function getNodeSize(kind: NodeKind): number {
  const sizes: Record<NodeKind, number> = {
    person: 7,
    team: 10,
    idea: 8,
    skill: 4,
    agent: 9,
  };
  return sizes[kind] ?? 7;
}

export interface LinkStyle {
  color: string;
  dashed: boolean;
  width: number;
}

export function getLinkStyle(transient: boolean, kind?: EdgeKind): LinkStyle {
  if (transient) {
    return { color: '#06b6d4', dashed: true, width: 1.5 };
  }

  const widths: Partial<Record<EdgeKind, number>> = {
    suggested: 2,
    member_of: 1.5,
    has_skill: 0.8,
  };

  return {
    color: '#4f5a85',
    dashed: kind === 'suggested',
    width: widths[kind as EdgeKind] ?? 1,
  };
}
