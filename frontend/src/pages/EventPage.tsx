import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventStore, type NodoEvent, type EventType } from '@/stores/eventStore';
import { apiFetch } from '@/lib/api';
import { Badge } from '@/components/base/Badge';
import { Button } from '@/components/base/Button';
import { Spinner } from '@/components/base/Spinner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';

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
  const { events, setCurrentEvent } = useEventStore();
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [event, setEvent] = useState<NodoEvent | null>(null);

  useEffect(() => {
    if (eventId) {
      setCurrentEvent(eventId);
      const found = events.find((e) => e.id === eventId);
      if (found) setEvent(found);
    }
    return () => setCurrentEvent(null);
  }, [eventId, events, setCurrentEvent]);

  async function handleJoin() {
    if (!eventId) return;
    setJoining(true);
    try {
      await apiFetch(`/v1/events/${eventId}/join`, { method: 'POST' });
    } catch {
      // Proceed anyway — backend may not have this endpoint yet
    }
    setJoined(true);
    setJoining(false);
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Header />
        <MainLayout />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="max-w-md w-full mx-4 border border-border bg-panel rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge color={typeColors[event.type]}>
            {typeLabels[event.type]}
          </Badge>
          <span className="text-[11px] text-muted-2">
            {event.participantCount} participants
          </span>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">{event.name}</h1>
        <p className="text-sm text-muted mb-2">{event.description}</p>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-muted bg-panel-2 border border-border px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-2 mb-6">
          {new Date(event.startsAt).toLocaleDateString()} – {new Date(event.endsAt).toLocaleDateString()}
        </div>

        <Button onClick={handleJoin} disabled={joining} className="w-full">
          {joining ? 'Joining...' : event.type === 'project' ? 'Join Project' : 'Join Event'}
        </Button>
      </div>
    </div>
  );
}
