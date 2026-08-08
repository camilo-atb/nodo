import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/base/Card';
import { Badge } from '@/components/base/Badge';
import type { NodoEvent, EventType } from '@/stores/eventStore';

interface EventCardProps {
  event: NodoEvent;
}

const typeColors: Record<EventType, 'violet' | 'green' | 'cyan' | 'amber' | 'muted'> = {
  hackathon: 'violet',
  open_source: 'green',
  ai_challenge: 'cyan',
  workshop: 'amber',
  meetup: 'muted',
  recruiting: 'muted',
  other: 'muted',
};

const typeLabels: Record<EventType, string> = {
  hackathon: 'Hackathon',
  open_source: 'Open Source',
  ai_challenge: 'AI Challenge',
  workshop: 'Workshop',
  meetup: 'Meetup',
  recruiting: 'Recruiting',
  other: 'Other',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer"
      onClick={() => navigate(`/event/${event.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">
            {event.name}
          </h3>
          <p className="text-xs text-muted mt-1 line-clamp-2">
            {event.description}
          </p>
        </div>
        <Badge color={typeColors[event.type]}>
          {typeLabels[event.type]}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-2">
        <span>{formatDate(event.startsAt)} – {formatDate(event.endsAt)}</span>
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
          </svg>
          {event.participantCount}
        </span>
      </div>
    </Card>
  );
}
