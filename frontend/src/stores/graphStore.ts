/**
 * Store del grafo — fuente de verdad del lado cliente.
 */

import { create } from 'zustand';
import type { GraphNode, GraphEdge, GraphPatch } from '@nodo/contracts';

export interface GraphState {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  lastSeq: number;
  connectionStatus: 'idle' | 'connecting' | 'ready' | 'reconnecting' | 'degraded' | 'degraded-http' | 'blocked';
}

export interface GraphActions {
  loadSnapshot: (snapshot: { nodes: GraphNode[]; edges: GraphEdge[]; seq: number }) => void;
  applyPatch: (patch: GraphPatch, seq: number) => void;
  setConnectionStatus: (status: GraphState['connectionStatus']) => void;
  reset: () => void;
}

export const useGraphStore = create<GraphState & GraphActions>((set, get) => ({
  nodes: new Map(),
  edges: new Map(),
  lastSeq: 0,
  connectionStatus: 'idle',

  loadSnapshot: (snapshot) => {
    const nodes = new Map(snapshot.nodes.map((n) => [n.id, n]));
    const edges = new Map(snapshot.edges.map((e) => [e.id, e]));
    set({ nodes, edges, lastSeq: snapshot.seq });
  },

  applyPatch: (patch, seq) => {
    const state = get();
    const nodes = new Map(state.nodes);
    const edges = new Map(state.edges);

    // Upsert nodes (shallow merge)
    if (patch.nodes) {
      for (const node of patch.nodes) {
        const existing = nodes.get(node.id);
        nodes.set(node.id, existing ? { ...existing, ...node } : node);
      }
    }

    // Upsert edges (shallow merge)
    if (patch.edges) {
      for (const edge of patch.edges) {
        const existing = edges.get(edge.id);
        edges.set(edge.id, existing ? { ...existing, ...edge } : edge);
      }
    }

    // Remove nodes + orphan edges
    if (patch.removeNodes) {
      for (const id of patch.removeNodes) {
        nodes.delete(id);
        // Remove edges that reference removed nodes
        for (const [edgeId, edge] of edges) {
          if (edge.from === id || edge.to === id) {
            edges.delete(edgeId);
          }
        }
      }
    }

    // Remove edges
    if (patch.removeEdges) {
      for (const id of patch.removeEdges) {
        edges.delete(id);
      }
    }

    set({ nodes, edges, lastSeq: seq });
  },

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  reset: () => set({ nodes: new Map(), edges: new Map(), lastSeq: 0, connectionStatus: 'idle' }),
}));
