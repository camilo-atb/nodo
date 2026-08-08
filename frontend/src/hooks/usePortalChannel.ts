/**
 * Hook de suscripción al canal network-main.
 * Verifica seq, aplica patch al graphStore, alimenta feedStore.
 *
 * Montar este hook ES la suscripción — no hay .subscribe() aparte.
 */

import { useEffect } from 'react';
import { useChannel } from '@portalsdk/react';
import { useGraphStore } from '@/stores/graphStore';
import { useFeedStore } from '@/stores/feedStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { CHANNEL_NETWORK_MAIN, API_URL } from '@/lib/constants';
import type { GraphPatch, FeedLine } from '@nodo/contracts';

/**
 * The content shape inside Portal's Message envelope.
 * Portal wraps our domain envelope in Message<T> where T = content type.
 */
interface MainEventContent {
  type?: string;
  graph?: GraphPatch;
  summary?: FeedLine;
  [key: string]: unknown;
}

export function usePortalChannel() {
  /**
   * Carga inicial del grafo, **independiente de Portal**.
   *
   * El paso 3 del contrato de arranque —`GET /v1/graph`— y el paso 4
   * —suscribirse— son independientes (docs-backend/03). Antes de esto,
   * `refetchSnapshot()` solo se llamaba al detectar un hueco de `seq`, así que
   * el grafo no llegaba tarde: no se pedía nunca. Si Portal no conectaba —sin
   * perfil, sin `pk_`, sin `portal deploy`— la aplicación se veía vacía aunque
   * el API tuviera los datos.
   *
   * `GET /v1/graph` es público y sin autenticación por diseño, así que la red
   * puede leerse siempre; el tiempo real solo añade los cambios en vivo.
   */
  useEffect(() => {
    void refetchSnapshot();
  }, []);

  const { status, presence } = useChannel<MainEventContent>({
    channelId: CHANNEL_NETWORK_MAIN,
    history: 50,
    onMessage: (msg) => {
      const lastSeq = useGraphStore.getState().lastSeq;
      // msg is Message<MainEventContent> — seq lives on msg directly
      const seq = (msg as unknown as { seq?: number | null }).seq;

      // Ephemeral messages (seq: null) — skip
      if (seq == null) return;

      // Duplicate — ignore
      if (seq <= lastSeq) return;

      // Hueco detectado — el backfill de 50 no alcanza, se re-pide el snapshot
      if (seq > lastSeq + 1) {
        void refetchSnapshot();
        return;
      }

      // Normal: seq === lastSeq + 1
      // msg.content is our MainEventContent
      const content = (msg as unknown as { content?: MainEventContent }).content;
      if (!content) return;

      if (content.graph) {
        useGraphStore.getState().applyPatch(content.graph, seq);
      }

      if (content.summary) {
        useFeedStore.getState().addLine(content.summary);
      }
    },
  });

  // Sync connection status
  if (status) {
    const validStatuses = ['idle', 'connecting', 'ready', 'reconnecting', 'degraded', 'degraded-http', 'blocked'] as const;
    type ConnectionStatus = (typeof validStatuses)[number];
    if (validStatuses.includes(status as ConnectionStatus)) {
      useGraphStore.getState().setConnectionStatus(status as ConnectionStatus);
    }
  }

  // Sync presence
  if (presence) {
    if ('participants' in presence && Array.isArray((presence as { participants?: unknown }).participants)) {
      const ids = ((presence as { participants: { id: string }[] }).participants).map((p) => p.id);
      usePresenceStore.getState().replaceAll(ids);
    } else if ('count' in presence && typeof (presence as { count?: unknown }).count === 'number') {
      usePresenceStore.getState().setAggregate((presence as { count: number }).count);
    }
  }

  return { status, presence };
}

async function refetchSnapshot() {
  try {
    const res = await fetch(`${API_URL}/v1/graph`);
    if (!res.ok) return;
    const snapshot = await res.json();
    useGraphStore.getState().loadSnapshot(snapshot);
  } catch {
    // Will retry on next gap detection
  }
}
