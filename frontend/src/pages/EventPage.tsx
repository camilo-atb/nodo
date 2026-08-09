import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventStore, type NodoEvent, type EventType } from '@/stores/eventStore';
import { apiErrorMessage, apiFetch } from '@/lib/api';
import { Badge } from '@/components/base/Badge';
import { Button } from '@/components/base/Button';
import { Spinner } from '@/components/base/Spinner';
import { MainLayout } from '@/components/layout/MainLayout';
import type { EventSubscriptionResponse } from '@nodo/contracts';
import { fetchPortalToken, portal } from '@/lib/portal';

const typeColors: Record<EventType, 'accent' | 'green'> = {
  hackathon: 'accent',
  project: 'green',
};

const typeLabels: Record<EventType, string> = {
  hackathon: 'Hackathon',
  project: 'Project',
};

export function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { events, setCurrentEvent } = useEventStore();
  const [joining, setJoining] = useState(false);
  const [event, setEvent] = useState<NodoEvent | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [joined, setJoined] = useState<boolean | null>(null);

  useEffect(() => {
    if (!eventId) return;
    setCurrentEvent(eventId);
    setJoined(null);
    setJoinError(null);
    void apiFetch<EventSubscriptionResponse>(`/v1/events/${eventId}/subscription`)
      .then(({ subscribed }) => setJoined(subscribed))
      .catch((error: unknown) => {
        setJoined(false);
        setJoinError(apiErrorMessage(
          error,
          'Could not verify your participation. Check that the API is running and the database is migrated.',
        ));
      });

    const found = events.find((e) => e.id === eventId);
    if (found) {
      setEvent(found);
    } else {
      // Entrar por enlace directo no pasa por Discover, así que el store está
      // vacío. Sin esto la página se queda en blanco en cuanto alguien
      // comparte una URL o recarga.
      void apiFetch<NodoEvent>(`/v1/events/${eventId}`)
        .then(setEvent)
        .catch(() => setEvent(null));
    }

    return () => setCurrentEvent(null);
  }, [eventId, events, setCurrentEvent]);

  async function handleJoin() {
    if (!eventId) return;
    setJoining(true);
    setJoinError(null);
    try {
      await apiFetch<EventSubscriptionResponse>(`/v1/events/${eventId}/subscription`, {
        method: 'POST',
      });
      // La nueva suscripción vive en el claim `events`; fuerza al SDK a
      // reautenticar antes de montar el canal recién autorizado.
      portal.setToken(fetchPortalToken);
      setJoined(true);
    } catch (error: unknown) {
      setJoined(false);
      setJoinError(apiErrorMessage(
        error,
        'Could not join this event. Check that the API is running and try again.',
      ));
    } finally {
      setJoining(false);
    }
  }

  if (!event || joined === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] dark:bg-[#07090c]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (joined) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-[#f7f8fa] dark:bg-[#07090c]">
        <MainLayout eventId={eventId!} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] dark:bg-[#07090c]">
      {/* Back button */}
      <button
        onClick={() => navigate('/discover')}
        className="absolute top-6 left-6 text-xs text-gray-500 hover:text-[#111318] dark:text-[#9da6b1] dark:hover:text-white transition-colors"
      >
        ← Back to Discover
      </button>

      <div className="max-w-md w-full mx-4 border rounded-2xl p-6
        bg-white border-gray-200
        dark:bg-[#101317] dark:border-[#20262d]">
        <div className="flex items-center gap-3 mb-4">
          <Badge color={typeColors[event.kind]}>
            {typeLabels[event.kind]}
          </Badge>
          <span className="text-[11px] text-gray-500 dark:text-[#68717d]">
            {event.participantCount} participants
          </span>
        </div>

        <h1 className="text-xl font-bold mb-2 text-[#111318] dark:text-[#f4f6f8]">{event.name}</h1>
        <p className="text-sm mb-2 text-gray-500 dark:text-[#9da6b1]">{event.description}</p>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded border
                  bg-gray-50 border-gray-200 text-gray-500
                  dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#9da6b1]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs mb-6 text-gray-500 dark:text-[#68717d]">
          {/* Un `project` no tiene fechas (ADR-013): son nulables. */}
          {event.startsAt === null && event.endsAt === null
            ? 'Sin fechas'
            : `${event.startsAt === null ? '—' : new Date(event.startsAt).toLocaleDateString()} – ${
                event.endsAt === null ? '—' : new Date(event.endsAt).toLocaleDateString()
              }`}
        </div>

        <Button onClick={handleJoin} disabled={joining} className="w-full">
          {joining ? 'Joining...' : event.kind === 'project' ? 'Join Project' : 'Join Event'}
        </Button>
        {joinError && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {joinError}
          </p>
        )}
      </div>
    </div>
  );
}
