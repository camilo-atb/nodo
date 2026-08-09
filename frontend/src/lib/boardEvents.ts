import type { TeamEvent } from '@nodo/contracts';
import { useBoardStore } from '@/stores/boardStore';

type BoardStoreActions = Pick<
  ReturnType<typeof useBoardStore.getState>,
  'addCard' | 'moveCard' | 'updateCard' | 'setVotes' | 'setWinner'
>;

/** Apply one validated Portal team envelope to the local board projection. */
export function applyBoardEvent(
  event: TeamEvent,
  myPersonId: string | null,
  store: BoardStoreActions = useBoardStore.getState(),
): void {
  switch (event.type) {
    case 'board.card_created':
      store.addCard({ ...event.payload.card, myVote: false });
      break;
    case 'board.card_moved':
      store.moveCard(event.payload.cardId, event.payload.x, event.payload.y);
      break;
    case 'board.card_updated':
      store.updateCard(event.payload.cardId, event.payload.content);
      break;
    case 'board.vote_cast':
      store.setVotes(
        event.payload.cardId,
        event.payload.votes,
        event.payload.personId === myPersonId ? true : undefined,
      );
      break;
    case 'board.vote_removed':
      store.setVotes(
        event.payload.cardId,
        event.payload.votes,
        event.payload.personId === myPersonId ? false : undefined,
      );
      break;
    case 'board.winner_selected':
      store.setWinner(event.payload.cardId);
      break;
    default:
      // The team channel also carries applications and team updates.
      break;
  }
}
