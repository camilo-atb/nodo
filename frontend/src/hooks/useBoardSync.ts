/**
 * Sincronización durable del board y señales efímeras de colaboración.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChannel } from '@portalsdk/react';
import { useSessionStore } from '@/stores/sessionStore';
import { TeamEvent } from '@nodo/contracts';
import { applyBoardEvent } from '@/lib/boardEvents';

const SIGNAL_INTERVAL_MS = 32;
const PEER_STALE_MS = 15_000;
const PEER_COLORS = ['#22d3ee', '#34d399', '#f59e0b', '#fb7185', '#a78bfa', '#60a5fa'];

export interface BoardMember {
  id: string;
  displayName: string;
}

export interface RemoteBoardPeer {
  personId: string;
  displayName: string;
  color: string;
  cursor?: { x: number; y: number };
  focusedCardId?: string | null;
  dragging?: { cardId: string; x: number; y: number };
  updatedAt: number;
}

export type CardDragPhase = 'start' | 'move' | 'end' | 'cancel';

type CursorSignal = { x: number; y: number };
type DragSignal = { cardId: string; x: number; y: number; phase: CardDragPhase };
type BoardActivity =
  | { type: 'cursor'; x: number; y: number }
  | { type: 'focus'; cardId: string | null }
  | ({ type: 'drag' } & DragSignal);

interface UseBoardSyncProps {
  teamId: string | null;
  members: BoardMember[];
}

function peerColor(personId: string): string {
  let hash = 0;
  for (const character of personId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return PEER_COLORS[hash % PEER_COLORS.length]!;
}

function decodeActivity(kind: string): BoardActivity | null {
  const [type, first, second, third, fourth] = kind.split('|');

  if (type === 'board.cursor') {
    const x = Number(first);
    const y = Number(second);
    return Number.isFinite(x) && Number.isFinite(y) ? { type: 'cursor', x, y } : null;
  }

  if (type === 'board.focus') {
    return { type: 'focus', cardId: first === '_' ? null : (first ?? null) };
  }

  if (type === 'board.drag') {
    const phase = first as CardDragPhase;
    const x = Number(third);
    const y = Number(fourth);
    if (
      !['start', 'move', 'end', 'cancel'].includes(phase) ||
      !second ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) return null;
    return { type: 'drag', phase, cardId: second, x, y };
  }

  return null;
}

export function useBoardSync({ teamId, members }: UseBoardSyncProps) {
  const channelId = teamId ? `team-${teamId}` : undefined;
  const [peersById, setPeersById] = useState<Record<string, RemoteBoardPeer>>({});
  const lastCursorAt = useRef(0);
  const lastDragAt = useRef(0);
  const signalCounter = useRef(0);
  const seenActivities = useRef(new Map<string, number>());

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.displayName])),
    [members],
  );

  const updatePeer = useCallback(
    (personId: string, update: (peer: RemoteBoardPeer) => RemoteBoardPeer) => {
      setPeersById((current) => {
        const peer = current[personId] ?? {
          personId,
          displayName: memberNames.get(personId) ?? 'Teammate',
          color: peerColor(personId),
          updatedAt: Date.now(),
        };
        return { ...current, [personId]: update(peer) };
      });
    },
    [memberNames],
  );

  const { status, activity, sendActivity } = useChannel<unknown>({
    channelId,
    history: 50,
    onMessage: (msg) => {
      const parsed = TeamEvent.safeParse(msg.content);
      if (!parsed.success) return;

      applyBoardEvent(parsed.data, useSessionStore.getState().personId);
      if (parsed.data.type === 'board.card_moved') {
        const movedCardId = parsed.data.payload.cardId;
        setPeersById((current) =>
          Object.fromEntries(
            Object.entries(current).map(([id, peer]) => [
              id,
              peer.dragging?.cardId === movedCardId ? { ...peer, dragging: undefined } : peer,
            ]),
          ),
        );
      }
    },
  });

  useEffect(() => {
    const myPersonId = useSessionStore.getState().personId;
    for (const entry of [...activity].sort((a, b) => a.since - b.since)) {
      if (entry.userId === myPersonId) continue;
      const key = `${entry.userId}:${entry.kind}:${entry.since}`;
      if (seenActivities.current.has(key)) continue;
      seenActivities.current.set(key, entry.since);

      const signal = decodeActivity(entry.kind);
      if (!signal) continue;
      updatePeer(entry.userId, (peer) => {
        if (signal.type === 'cursor') {
          return { ...peer, cursor: { x: signal.x, y: signal.y }, updatedAt: Date.now() };
        }
        if (signal.type === 'focus') {
          return { ...peer, focusedCardId: signal.cardId, updatedAt: Date.now() };
        }
        return {
          ...peer,
          focusedCardId: signal.cardId,
          dragging:
            signal.phase === 'cancel'
              ? undefined
              : { cardId: signal.cardId, x: signal.x, y: signal.y },
          updatedAt: Date.now(),
        };
      });
    }
  }, [activity, updatePeer]);

  const emitActivity = useCallback(
    (kind: string) => {
      if (status !== 'ready') return;
      signalCounter.current += 1;
      sendActivity(`${kind}|${signalCounter.current}`);
    },
    [sendActivity, status],
  );

  const sendCursor = useCallback(
    (point: CursorSignal) => {
      const now = performance.now();
      if (now - lastCursorAt.current < SIGNAL_INTERVAL_MS) return;
      lastCursorAt.current = now;
      emitActivity(`board.cursor|${Math.round(point.x)}|${Math.round(point.y)}`);
    },
    [emitActivity],
  );

  const sendFocus = useCallback(
    (cardId: string | null) => emitActivity(`board.focus|${cardId ?? '_'}`),
    [emitActivity],
  );

  const sendDrag = useCallback(
    (signal: DragSignal) => {
      const now = performance.now();
      if (signal.phase === 'move' && now - lastDragAt.current < SIGNAL_INTERVAL_MS) return;
      lastDragAt.current = now;
      emitActivity(
        `board.drag|${signal.phase}|${signal.cardId}|${Math.round(signal.x)}|${Math.round(signal.y)}`,
      );
    },
    [emitActivity],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      const cutoff = Date.now() - PEER_STALE_MS;
      for (const [key, since] of seenActivities.current) {
        if (since < cutoff) seenActivities.current.delete(key);
      }
      setPeersById((current) =>
        Object.fromEntries(Object.entries(current).filter(([, peer]) => peer.updatedAt >= cutoff)),
      );
    }, 5_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    seenActivities.current.clear();
    setPeersById({});
  }, [teamId]);

  useEffect(() => {
    setPeersById((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, peer]) => [
          id,
          { ...peer, displayName: memberNames.get(id) ?? peer.displayName },
        ]),
      ),
    );
  }, [memberNames]);

  return {
    status,
    remotePeers: Object.values(peersById),
    sendCursor,
    sendFocus,
    sendDrag,
  };
}
