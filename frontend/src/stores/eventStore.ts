/**
 * Store de eventos — descubrimiento y evento activo.
 */

import { create } from 'zustand';

export type EventType =
  | 'hackathon'
  | 'open_source'
  | 'ai_challenge'
  | 'workshop'
  | 'meetup'
  | 'recruiting'
  | 'other';

export interface NodoEvent {
  id: string;
  name: string;
  description: string;
  type: EventType;
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
