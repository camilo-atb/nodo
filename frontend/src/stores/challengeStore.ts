/**
 * Store del Skill Challenge (quiz en tiempo real).
 * Gestiona estado de preguntas, respuestas, timer y leaderboard.
 */

import { create } from 'zustand';

export interface RankingEntry {
  personId: string;
  displayName: string;
  score: number;
  position: number;
}

export interface ChallengeState {
  challengeId: string | null;
  title: string;
  skillSlug: string;
  status: 'waiting' | 'question' | 'reviewing' | 'ended';
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: { text: string; options: [string, string, string, string] } | null;
  myAnswers: (number | null)[];
  rankings: RankingEntry[];
  endsAt: number | null;

  // Actions
  setChallenge: (id: string, title: string, skillSlug: string, totalQuestions: number) => void;
  revealQuestion: (index: number, question: { text: string; options: [string, string, string, string] }, endsAt: number) => void;
  submitAnswer: (questionIndex: number, answerIndex: number) => void;
  updateLeaderboard: (rankings: RankingEntry[]) => void;
  endChallenge: (finalRankings: RankingEntry[]) => void;
  reset: () => void;
}

const initialState = {
  challengeId: null,
  title: '',
  skillSlug: '',
  status: 'waiting' as const,
  currentQuestionIndex: 0,
  totalQuestions: 5,
  currentQuestion: null,
  myAnswers: [] as (number | null)[],
  rankings: [] as RankingEntry[],
  endsAt: null,
};

export const useChallengeStore = create<ChallengeState>((set) => ({
  ...initialState,

  setChallenge: (id, title, skillSlug, totalQuestions) =>
    set({
      challengeId: id,
      title,
      skillSlug,
      totalQuestions,
      status: 'waiting',
      myAnswers: Array.from<number | null>({ length: totalQuestions }).fill(null),
    }),

  revealQuestion: (index, question, endsAt) =>
    set({
      status: 'question',
      currentQuestionIndex: index,
      currentQuestion: question,
      endsAt,
    }),

  submitAnswer: (questionIndex, answerIndex) =>
    set((state) => {
      const myAnswers = [...state.myAnswers];
      myAnswers[questionIndex] = answerIndex;
      return { myAnswers };
    }),

  updateLeaderboard: (rankings) =>
    set({ rankings, status: 'reviewing' }),

  endChallenge: (finalRankings) =>
    set({ rankings: finalRankings, status: 'ended', currentQuestion: null, endsAt: null }),

  reset: () => set(initialState),
}));
