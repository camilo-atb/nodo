/**
 * @nodo/contracts — Tipos compartidos entre frontend y backend.
 *
 * PLACEHOLDER: estos tipos se reemplazarán cuando el backend publique el paquete real.
 * Por ahora definimos la forma mínima para que el frontend compile.
 */

// === Graph ===

export interface GraphNode {
  id: string;
  kind: 'person' | 'idea' | 'team' | 'skill' | 'matchmaker';
  label: string;
  status?: 'looking' | 'idle' | 'teamed' | 'recruiting' | 'full';
  transient?: boolean;
  expiresAt?: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: 'HAS_SKILL' | 'INTERESTED_IN' | 'MEMBER_OF' | 'AUTHORED' | 'NEEDS_SKILL' | 'suggested';
  transient?: boolean;
  expiresAt?: string;
  weight?: number;
  [key: string]: unknown;
}

export interface GraphPatch {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  removeNodes?: string[];
  removeEdges?: string[];
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  seq: number;
}

// === Feed ===

export interface FeedLine {
  id: string;
  type: string;
  summary: string;
  refs?: { kind: string; id: string; label: string }[];
  createdAt: string;
}

// === Teams & Applications ===

export interface Application {
  id: string;
  personId: string;
  teamId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'auto_rejected';
  createdAt: string;
}

export interface TeamNeed {
  skillSlug: string;
  priority: 'required' | 'nice';
}

// === Envelope (mensajes de Portal) ===

export interface Envelope<T = unknown> {
  id: string;
  type: string;
  seq: number;
  graph: GraphPatch;
  summary: string;
  content: T;
}
