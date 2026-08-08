/**
 * Store del feed de actividad.
 */

import { create } from 'zustand';
import { FEED_MAX_LINES } from '@/lib/constants';
import type { FeedLine } from '@nodo/contracts';

interface FeedState {
  lines: FeedLine[];
  addLine: (line: FeedLine) => void;
  clear: () => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  lines: [],

  addLine: (line) =>
    set((state) => ({
      lines: [line, ...state.lines].slice(0, FEED_MAX_LINES),
    })),

  clear: () => set({ lines: [] }),
}));
