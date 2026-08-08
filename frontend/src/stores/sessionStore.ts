/**
 * Store de sesión — identidad del usuario.
 * Persiste personId y sessionToken en localStorage.
 */

import { create } from 'zustand';

interface SessionState {
  personId: string | null;
  sessionToken: string | null;
  profile: { name: string; headline: string; bio: string } | null;
  setSession: (personId: string, sessionToken: string) => void;
  setProfile: (profile: SessionState['profile']) => void;
  clearSession: () => void;
}

const STORAGE_KEY = 'nodo_session';

function loadFromStorage(): Pick<SessionState, 'personId' | 'sessionToken'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const { personId, sessionToken } = JSON.parse(raw);
      return { personId, sessionToken };
    }
  } catch {
    // Corrupted storage, ignore
  }
  return { personId: null, sessionToken: null };
}

function persistToStorage(personId: string | null, sessionToken: string | null) {
  if (personId && sessionToken) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ personId, sessionToken }));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const useSessionStore = create<SessionState>((set) => ({
  ...loadFromStorage(),
  profile: null,

  setSession: (personId, sessionToken) => {
    persistToStorage(personId, sessionToken);
    set({ personId, sessionToken });
  },

  setProfile: (profile) => set({ profile }),

  clearSession: () => {
    persistToStorage(null, null);
    set({ personId: null, sessionToken: null, profile: null });
  },
}));
