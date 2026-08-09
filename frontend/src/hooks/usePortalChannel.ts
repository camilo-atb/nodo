/**
 * Hook de suscripción al canal privado del Event activo.
 * Verifica seq, aplica patch al graphStore, alimenta feedStore.
 *
 * Montar este hook ES la suscripción — no hay .subscribe() aparte.
 */

import { useEffect } from 'react';
import { useChannel } from '@portalsdk/react';
import { useGraphStore } from '@/stores/graphStore';
import { useFeedStore } from '@/stores/feedStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { apiFetch } from '@/lib/api';
import { eventChannel, type FeedLine, type GraphPatch, type GraphSnapshot } from '@nodo/contracts';

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

export function usePortalChannel(eventId: string) {
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
   * El snapshot y el canal usan el mismo ámbito para que un Event nunca
   * contamine el store de otro.
   */
  useEffect(() => {
    useGraphStore.getState().reset();
    useFeedStore.getState().clear();
    usePresenceStore.getState().clear();
    void refetchSnapshot(eventId);

    return () => {
      useGraphStore.getState().reset();
      useFeedStore.getState().clear();
      usePresenceStore.getState().clear();
    };
  }, [eventId]);

  const { status, presence } = useChannel<MainEventContent>({
    channelId: eventChannel(eventId),
    history: 50,
    onMessage: (msg) => {
      const lastSeq = useGraphStore.getState().lastSeq;
      const seq = (msg as unknown as { seq?: number | null }).seq;

      // Ephemeral messages (seq: null) — skip
      if (seq == null) return;

      // Duplicate — ignore
      if (seq <= lastSeq) return;

      // Gap detected — refetch snapshot AND apply this message
      if (seq > lastSeq + 1) {
        void refetchSnapshot(eventId);
      }

      // Always apply the patch if we have content (even during gap recovery)
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

  // Sync connection status (in effect, not during render)
  useEffect(() => {
    if (status) {
      const validStatuses = ['idle', 'connecting', 'ready', 'reconnecting', 'degraded', 'degraded-http', 'blocked'] as const;
      type ConnectionStatus = (typeof validStatuses)[number];
      if (validStatuses.includes(status as ConnectionStatus)) {
        useGraphStore.getState().setConnectionStatus(status as ConnectionStatus);
      }
    }
  }, [status]);

  // Sync presence (in effect, not during render)
  useEffect(() => {
    if (presence) {
      if ('participants' in presence && Array.isArray((presence as { participants?: unknown }).participants)) {
        const ids = ((presence as { participants: { id: string }[] }).participants).map((p) => p.id);
        usePresenceStore.getState().replaceAll(ids);
      } else if ('count' in presence && typeof (presence as { count?: unknown }).count === 'number') {
        usePresenceStore.getState().setAggregate((presence as { count: number }).count);
      }
    }
  }, [presence]);

  return { status, presence };
}

async function refetchSnapshot(eventId: string) {
  try {
    const snapshot = await apiFetch<GraphSnapshot>(
      `/v1/graph?eventId=${encodeURIComponent(eventId)}`,
    );
    useGraphStore.getState().loadSnapshot(snapshot);
  } catch {
    // Will retry on next gap detection
  }
}
