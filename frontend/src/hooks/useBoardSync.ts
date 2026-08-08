/**
 * Hook de suscripción al canal team-{teamId} para eventos del board.
 * Procesa mensajes board.* y actualiza el boardStore.
 */

import { useChannel } from '@portalsdk/react';
import { useBoardStore } from '@/stores/boardStore';
import { useSessionStore } from '@/stores/sessionStore';
import type { BoardCard } from '@/stores/boardStore';

interface BoardMessageContent {
  type?: string;
  card?: BoardCard;
  cardId?: string;
  x?: number;
  y?: number;
  content?: string;
  personId?: string;
  totalVotes?: number;
  [key: string]: unknown;
}

interface UseBoardSyncProps {
  teamId: string | null;
}

export function useBoardSync({ teamId }: UseBoardSyncProps) {
  const channelId = teamId ? `team-${teamId}` : undefined;

  const { status } = useChannel<BoardMessageContent>({
    channelId,
    onMessage: (msg) => {
      const content = (msg as unknown as { content?: BoardMessageContent }).content;
      if (!content?.type) return;

      const store = useBoardStore.getState();
      const myId = useSessionStore.getState().personId;

      switch (content.type) {
        case 'board.card_created': {
          if (content.card) {
            const card: BoardCard = {
              ...content.card,
              myVote: false,
            };
            store.addCard(card);
          }
          break;
        }
        case 'board.card_moved': {
          if (content.cardId != null && content.x != null && content.y != null) {
            store.moveCard(content.cardId, content.x, content.y);
          }
          break;
        }
        case 'board.card_updated': {
          if (content.cardId && content.content) {
            store.updateCard(content.cardId, content.content);
          }
          break;
        }
        case 'board.vote_cast': {
          if (content.cardId && content.totalVotes != null) {
            const isMyVote = content.personId === myId;
            store.setVotes(content.cardId, content.totalVotes, isMyVote ? true : undefined);
          }
          break;
        }
        case 'board.vote_removed': {
          if (content.cardId && content.totalVotes != null) {
            const isMyVote = content.personId === myId;
            store.setVotes(content.cardId, content.totalVotes, isMyVote ? false : undefined);
          }
          break;
        }
        case 'board.winner_selected': {
          if (content.cardId) {
            store.setWinner(content.cardId);
          }
          break;
        }
      }
    },
  });

  return { status };
}
