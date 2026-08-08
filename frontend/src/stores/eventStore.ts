/**
 * Store de eventos — descubrimiento y evento activo.
 *
 * Taxonomía:
 * - Category (tipo de oportunidad): hackathon | project
 * - Tags (de qué trata): AI, Open Source, Web, etc. — son informativos, no filtrables en MVP
 * - Skills (qué necesitas saber): Go, React, etc. — viven en el modelo de teams/needs
 */

import { create } from 'zustand';

/** Solo dos tipos reales de oportunidad. Ambos implican CONSTRUIR algo. */
export type EventType = 'hackathon' | 'project';

/**
 * Experience mode — derivado del tipo, no almacenado.
 * - competition: multiple teams, ideas, people looking for team (hackathon)
 * - collaboration: one project, looking for contributors (project)
 */
export type ExperienceMode = 'competition' | 'collaboration';

export function getExperienceMode(type: EventType): ExperienceMode {
  return type === 'hackathon' ? 'competition' : 'collaboration';
}

export interface NodoEvent {
  id: string;
  name: string;
  description: string;
  type: EventType;
  tags: string[];
  startsAt: string;
  endsAt: string;
  status: string;
  participantCount: number;
}

interface EventState {
  events: NodoEvent[];
  currentEventId: string | null;
  setEvents: (events: NodoEvent[]) => void;
  setCurrentEvent: (id: string | null) => void;
  addEvent: (event: NodoEvent) => void;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  currentEventId: null,

  setEvents: (events) => set({ events }),

  setCurrentEvent: (id) => set({ currentEventId: id }),

  addEvent: (event) =>
    set((state) => ({ events: [event, ...state.events] })),
}));
