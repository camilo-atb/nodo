/**
 * Hook de suscripción al canal de challenge (quiz en tiempo real).
 * Se suscribe a challenge-{challengeId} y procesa mensajes del servidor.
 */

import { useChannel } from '@portalsdk/react';
import { useChallengeStore } from '@/stores/challengeStore';
import type { RankingEntry } from '@/stores/challengeStore';

interface ChallengeMessageContent {
  type?: string;
  questionIndex?: number;
  question?: { text: string; options: [string, string, string, string] };
  endsAt?: number;
  rankings?: RankingEntry[];
  finalRankings?: RankingEntry[];
  challengeId?: string;
  personId?: string;
  [key: string]: unknown;
}

interface UseChallengeChannelProps {
  challengeId: string | null;
}

export function useChallengeChannel({ challengeId }: UseChallengeChannelProps) {
  const channelId = challengeId ? `challenge-${challengeId}` : undefined;

  const { status } = useChannel<ChallengeMessageContent>({
    channelId,
    onMessage: (msg) => {
      const content = (msg as unknown as { content?: ChallengeMessageContent }).content;
      if (!content?.type) return;

      const store = useChallengeStore.getState();

      switch (content.type) {
        case 'challenge.question_revealed': {
          if (content.questionIndex != null && content.question && content.endsAt) {
            store.revealQuestion(content.questionIndex, content.question, content.endsAt);
          }
          break;
        }
        case 'challenge.leaderboard_update': {
          if (content.rankings) {
            store.updateLeaderboard(content.rankings);
          }
          break;
        }
        case 'challenge.ended': {
          if (content.finalRankings) {
            store.endChallenge(content.finalRankings);
          }
          break;
        }
      }
    },
  });

  return { status };
}
