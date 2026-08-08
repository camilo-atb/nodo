/**
 * Store de presence — quién está online.
 * Solo online/offline. NO lleva status de dominio.
 */

import { create } from 'zustand';

interface PresenceState {
  online: Set<string>;
  kind: 'detailed' | 'aggregate' | 'unknown';
  count: number;
  setOnline: (id: string) => void;
  setOffline: (id: string) => void;
  replaceAll: (ids: string[]) => void;
  setAggregate: (count: number) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  online: new Set(),
  kind: 'unknown',
  count: 0,

  setOnline: (id) =>
    set((state) => {
      const online = new Set(state.online);
      online.add(id);
      return { online, count: online.size };
    }),

  setOffline: (id) =>
    set((state) => {
      const online = new Set(state.online);
      online.delete(id);
      return { online, count: online.size };
    }),

  replaceAll: (ids) =>
    set({
      online: new Set(ids),
      kind: 'detailed',
      count: ids.length,
    }),

  setAggregate: (count) =>
    set({
      online: new Set(),
      kind: 'aggregate',
      count,
    }),
}));
