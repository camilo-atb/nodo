/**
 * Hook que transforma graphStore → { nodes, links } para react-force-graph.
 */

import { useMemo } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import type { GraphFilter } from '@/types/ui';
import type { NodeKind } from '@nodo/contracts';

export interface ForceNode {
  id: string;
  kind: NodeKind;
  label: string;
  status?: string;
  meta?: Record<string, unknown>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface ForceLink {
  id: string;
  source: string;
  target: string;
  kind: string;
  transient?: boolean;
  weight?: number;
}

const defaultFilter: GraphFilter = {
  showPersons: true,
  showTeams: true,
  showIdeas: true,
  showSkills: true,
};

export function useGraphData(filter: GraphFilter = defaultFilter) {
  const nodesMap = useGraphStore((s) => s.nodes);
  const edgesMap = useGraphStore((s) => s.edges);

  return useMemo(() => {
    const kindVisible: Record<NodeKind, boolean> = {
      person: filter.showPersons,
      team: filter.showTeams,
      idea: filter.showIdeas,
      skill: filter.showSkills,
      agent: true, // agents always visible
    };

    // Build visible node set
    const visibleNodeIds = new Set<string>();
    const nodes: ForceNode[] = [];

    for (const [id, node] of nodesMap) {
      if (kindVisible[node.kind]) {
        visibleNodeIds.add(id);
        nodes.push({
          id: node.id,
          kind: node.kind,
          label: node.label,
          status: node.status,
          meta: node.meta,
        });
      }
    }

    // Build links only between visible nodes
    const links: ForceLink[] = [];

    for (const [, edge] of edgesMap) {
      if (visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)) {
        links.push({
          id: edge.id,
          source: edge.from,
          target: edge.to,
          kind: edge.kind,
          transient: edge.transient,
          weight: edge.weight,
        });
      }
    }

    return { nodes, links };
  }, [nodesMap, edgesMap, filter.showPersons, filter.showTeams, filter.showIdeas, filter.showSkills]);
}
