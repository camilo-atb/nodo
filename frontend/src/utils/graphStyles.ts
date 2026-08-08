/**
 * Mapeo kind → estilo visual del grafo.
 * Single source of truth para colores, formas y tamaños.
 * Usado por nodeRenderer, linkRenderer, badges, leyendas.
 */

import type { NodeKind, EdgeKind } from '@nodo/contracts';

export interface NodeVisual {
  fill: string;
  stroke: string;
  radius: number;
  haloColor: string;
  haloRadius: number;
  glow: boolean;
}

/**
 * Returns complete visual config for a node kind.
 * Matches the graph-explorer.html reference design.
 */
export function getNodeVisual(kind: NodeKind): NodeVisual {
  const visuals: Record<NodeKind, NodeVisual> = {
    person: {
      fill: '#171c2a',
      stroke: '#6d7aa3',
      radius: 16,
      haloColor: '#6d7aa3',
      haloRadius: 25,
      glow: false,
    },
    team: {
      fill: '#5eead4',
      stroke: '#118e82',
      radius: 25,
      haloColor: '#5eead4',
      haloRadius: 38,
      glow: true,
    },
    idea: {
      fill: '#c4b5fd',
      stroke: '#6d4de6',
      radius: 21,
      haloColor: '#c4b5fd',
      haloRadius: 32,
      glow: true,
    },
    skill: {
      fill: '#64748b',
      stroke: '#64748b',
      radius: 5,
      haloColor: '#64748b',
      haloRadius: 8,
      glow: false,
    },
    agent: {
      fill: '#c4b5fd',
      stroke: '#6d4de6',
      radius: 21,
      haloColor: '#a78bfa',
      haloRadius: 32,
      glow: true,
    },
  };
  return visuals[kind];
}

/** Legacy helper — returns the primary color for a node kind (used by controls/badges). */
export function getNodeColor(kind: NodeKind): string {
  const colors: Record<NodeKind, string> = {
    person: '#6d7aa3',
    team: '#2dd4bf',
    idea: '#8b5cf6',
    skill: '#64748b',
    agent: '#a78bfa',
  };
  return colors[kind] ?? '#6d7aa3';
}

export interface LinkStyle {
  color: string;
  dashed: boolean;
  width: number;
  opacity: number;
}

export function getLinkStyle(transient: boolean, kind?: EdgeKind): LinkStyle {
  // AI suggestion edges — cyan, dashed, animated, prominent
  if (transient || kind === 'suggested') {
    return { color: '#06b6d4', dashed: true, width: 2, opacity: 0.8 };
  }

  if (kind === 'member_of') {
    return { color: '#6b7aad', dashed: false, width: 1.5, opacity: 0.5 };
  }

  if (kind === 'has_skill') {
    return { color: '#4f5a85', dashed: false, width: 0.7, opacity: 0.25 };
  }

  // Default edge
  return { color: '#4f5a85', dashed: false, width: 1.2, opacity: 0.38 };
}
