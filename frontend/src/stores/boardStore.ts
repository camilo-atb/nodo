/**
 * Store del tablero de brainstorming del equipo.
 */

import { create } from 'zustand';

export interface BoardCard {
  id: string;
  content: string;
  x: number;
  y: number;
  color: string;
  createdBy: string;
  votes: number;
  isWinner: boolean;
  myVote: boolean;
}

interface BoardState {
  cards: Map<string, BoardCard>;
  teamId: string | null;
  setTeamId: (id: string | null) => void;
  loadCards: (cards: BoardCard[]) => void;
  addCard: (card: BoardCard) => void;
  moveCard: (id: string, x: number, y: number) => void;
  updateCard: (id: string, content: string) => void;
  setVotes: (id: string, votes: number, myVote?: boolean) => void;
  setWinner: (id: string) => void;
  reset: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  cards: new Map(),
  teamId: null,

  setTeamId: (id) => set({ teamId: id }),

  loadCards: (cards) => {
    const map = new Map<string, BoardCard>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    set({ cards: map });
  },

  addCard: (card) =>
    set((state) => {
      const next = new Map(state.cards);
      next.set(card.id, card);
      return { cards: next };
    }),

  moveCard: (id, x, y) =>
    set((state) => {
      const card = state.cards.get(id);
      if (!card) return state;
      const next = new Map(state.cards);
      next.set(id, { ...card, x, y });
      return { cards: next };
    }),

  updateCard: (id, content) =>
    set((state) => {
      const card = state.cards.get(id);
      if (!card) return state;
      const next = new Map(state.cards);
      next.set(id, { ...card, content });
      return { cards: next };
    }),

  setVotes: (id, votes, myVote) =>
    set((state) => {
      const card = state.cards.get(id);
      if (!card) return state;
      const next = new Map(state.cards);
      next.set(id, { ...card, votes, myVote: myVote ?? card.myVote });
      return { cards: next };
    }),

  setWinner: (id) =>
    set((state) => {
      const next = new Map(state.cards);
      // Clear previous winners, set new one
      for (const [key, card] of next) {
        if (card.isWinner) {
          next.set(key, { ...card, isWinner: false });
        }
      }
      const card = next.get(id);
      if (card) {
        next.set(id, { ...card, isWinner: true });
      }
      return { cards: next };
    }),

  reset: () => set({ cards: new Map(), teamId: null }),
}));
