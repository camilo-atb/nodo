/**
 * Store del equipo del usuario.
 */

import { create } from 'zustand';
import type { ApplicationDTO } from '@nodo/contracts';

interface TeamState {
  myTeamId: string | null;
  applications: ApplicationDTO[];
  myApplication: ApplicationDTO | null;
  setMyTeamId: (id: string | null) => void;
  setApplications: (apps: ApplicationDTO[]) => void;
  addApplication: (app: ApplicationDTO) => void;
  updateApplication: (id: string, update: Partial<ApplicationDTO>) => void;
  setMyApplication: (app: ApplicationDTO | null) => void;
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
