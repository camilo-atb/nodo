/**
 * Store del equipo del usuario.
 */

import { create } from 'zustand';
import type { Application } from '@nodo/contracts';

interface TeamState {
  myTeamId: string | null;
  applications: Application[];
  myApplication: Application | null;
  setMyTeamId: (id: string | null) => void;
  setApplications: (apps: Application[]) => void;
  addApplication: (app: Application) => void;
  updateApplication: (id: string, update: Partial<Application>) => void;
  setMyApplication: (app: Application | null) => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  myTeamId: null,
  applications: [],
  myApplication: null,

  setMyTeamId: (id) => set({ myTeamId: id }),

  setApplications: (apps) => set({ applications: apps }),

  addApplication: (app) =>
    set((state) => ({ applications: [...state.applications, app] })),

  updateApplication: (id, update) =>
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? { ...a, ...update } : a,
      ),
    })),

  setMyApplication: (app) => set({ myApplication: app }),
}));
