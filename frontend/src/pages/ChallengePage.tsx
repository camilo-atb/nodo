/**
 * Página full-screen del Skill Challenge (quiz en tiempo real).
 * Ruta: /event/:eventId/challenge/:challengeId
 *
 * Incluye MOCK MODE para demo sin backend.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChallengeStore } from '@/stores/challengeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useChallengeChannel } from '@/hooks/useChallengeChannel';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/base/Spinner';
import { Button } from '@/components/base/Button';
import { QuestionCard } from '@/components/challenge/QuestionCard';
import { TimerBar } from '@/components/challenge/TimerBar';
import { Leaderboard } from '@/components/challenge/Leaderboard';
import { ChallengeResult } from '@/components/challenge/ChallengeResult';

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_QUESTIONS: { text: string; options: [string, string, string, string] }[] = [
  {
    text: 'What is the primary goal of Hexagonal Architecture?',
    options: [
      'Maximize database performance',
      'Decouple core logic from external adapters',
      'Minimize the number of classes',
      'Enforce a single entry point',
    ],
  },
  {
    text: 'In Hexagonal Architecture, what are "ports"?',
    options: [
      'Network endpoints',
      'Interfaces that define boundaries of the domain',
      'Database connection strings',
      'UI components',
    ],
  },
  {
    text: 'Which layer should contain business rules in Hexagonal Architecture?',
    options: [
      'Infrastructure layer',
      'Presentation layer',
      'Domain / Application core',
      'Adapter layer',
    ],
  },
  {
    text: 'What is an "adapter" in the context of Hexagonal Architecture?',
    options: [
      'A design pattern for UI rendering',
      'An implementation that connects ports to external systems',
      'A database migration tool',
      'A testing framework plugin',
    ],
  },
  {
    text: 'Which principle does Hexagonal Architecture primarily enforce?',
    options: [
      'DRY (Don\'t Repeat Yourself)',
      'Dependency Inversion Principle',
      'Single Responsibility only',
      'Open/Closed exclusively',
    ],
  },
];

const MOCK_PARTICIPANTS = [
  { personId: 'per_mock-alice', displayName: 'Alice', score: 0 },
  { personId: 'per_mock-bob', displayName: 'Bob', score: 0 },
  { personId: 'per_mock-carol', displayName: 'Carol', score: 0 },
];

// ─── Component ─────────────────────────────────────────────────────────────────

interface ChallengeInfo {
  id: string;
  teamId: string;
  skillSlug: string;
  title: string;
  status: string;
  durationSec: number;
  questionCount: number;
}

export function ChallengePage() {
  const { challengeId: paramId } = useParams<{ challengeId: string }>();
  const store = useChallengeStore();
  const mockTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Subscribe to Portal channel
  useChallengeChannel({ challengeId: paramId ?? null });

  // Fetch challenge info on mount
  useEffect(() => {
    if (!paramId) return;

    async function loadChallenge() {
      try {
        const info = await apiFetch<ChallengeInfo>(`/v1/challenges/${paramId}`);
        useChallengeStore.getState().setChallenge(
          info.id,
          info.title,
          info.skillSlug,
          info.questionCount,
        );
      } catch {
        // If fetch fails, set a fallback so the page renders
        useChallengeStore.getState().setChallenge(
          paramId!,
          'Skill Challenge',
          'hexagonal-architecture',
          5,
        );
      }
    }

    loadChallenge();

    return () => {
      // Cleanup mock timers on unmount
      mockTimersRef.current.forEach(clearTimeout);
      mockTimersRef.current = [];
    };
  }, [paramId]);

  // ─── Mock mode ───────────────────────────────────────────────────────────────

  const startMockChallenge = useCallback(() => {
    const personId = useSessionStore.getState().personId ?? 'per_current-user';
    const timers: ReturnType<typeof setTimeout>[] = [];

    let cumulativeDelay = 500; // small initial delay
    const questionDuration = 8_000; // 8s per question — enough time to read and answer
    const reviewPause = 2_000; // 2s to show leaderboard between questions

    MOCK_QUESTIONS.forEach((q, idx) => {
      // Reveal question
      timers.push(
        setTimeout(() => {
          useChallengeStore.getState().revealQuestion(idx, q, Date.now() + questionDuration);
        }, cumulativeDelay),
      );

      // After question timer expires, show leaderboard
      cumulativeDelay += questionDuration + 500; // 500ms grace after timer
      timers.push(
        setTimeout(() => {
          const mockRankings = [
            { personId, displayName: 'You', score: Math.min(idx + 1, 5), position: 1 },
            ...MOCK_PARTICIPANTS.map((p, pIdx) => ({
              ...p,
              score: Math.max(0, Math.floor(Math.random() * (idx + 2)) - 1),
              position: pIdx + 2,
            })),
          ]
            .sort((a, b) => b.score - a.score)
            .map((r, rIdx) => ({ ...r, position: rIdx + 1 }));

          useChallengeStore.getState().updateLeaderboard(mockRankings);
        }, cumulativeDelay),
      );

      cumulativeDelay += reviewPause; // pause showing leaderboard before next question
    });

    // End challenge
    timers.push(
      setTimeout(() => {
        const finalRankings = [
          { personId, displayName: 'You', score: 4, position: 1 },
          { personId: 'per_mock-alice', displayName: 'Alice', score: 3, position: 2 },
          { personId: 'per_mock-bob', displayName: 'Bob', score: 2, position: 3 },
          { personId: 'per_mock-carol', displayName: 'Carol', score: 1, position: 4 },
        ];
        useChallengeStore.getState().endChallenge(finalRankings);
      }, cumulativeDelay),
    );

    mockTimersRef.current = timers;

    // Also set a fake challengeId if not already set
    if (!useChallengeStore.getState().challengeId) {
      useChallengeStore.getState().setChallenge(
        paramId ?? 'mock-challenge',
        'Hexagonal Architecture Challenge',
        'hexagonal-architecture',
        5,
      );
    }
  }, [paramId]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center p-4 overflow-y-auto">
      {store.status === 'waiting' && (
        <WaitingScreen
          title={store.title}
          skillSlug={store.skillSlug}
          onStartMock={startMockChallenge}
        />
      )}

      {store.status === 'question' && (
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-start">
          {/* Main content */}
          <div className="flex-1 flex flex-col items-center gap-6 w-full">
            <TimerBar />
            <QuestionCard />
          </div>
          {/* Sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
            <Leaderboard />
          </aside>
        </div>
      )}

      {store.status === 'reviewing' && (
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          <Spinner size="lg" />
          <p className="text-muted text-lg">Waiting for next question...</p>
          <Leaderboard />
        </div>
      )}

      {store.status === 'ended' && <ChallengeResult />}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function WaitingScreen({
  title,
  skillSlug,
  onStartMock,
}: {
  title: string;
  skillSlug: string;
  onStartMock: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">
          {title || 'Skill Challenge'}
        </h1>
        {skillSlug && (
          <p className="text-muted">
            Topic: <span className="text-accent font-medium">{formatSkillSlug(skillSlug)}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-muted">
        <Spinner size="sm" />
        <span className="text-sm">Waiting for questions...</span>
      </div>

      {/* Mock mode button */}
      <div className="mt-8 pt-6 border-t border-border">
        <Button onClick={onStartMock} variant="secondary">
          Start Mock Challenge
        </Button>
        <p className="text-xs text-muted-2 mt-2">Demo mode — simulates 5 questions locally</p>
      </div>
    </div>
  );
}

function formatSkillSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
