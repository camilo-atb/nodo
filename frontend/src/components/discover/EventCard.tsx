import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/base/Card';
import { Badge } from '@/components/base/Badge';
import type { NodoEvent, EventType } from '@/stores/eventStore';

interface EventCardProps {
  event: NodoEvent;
}

const typeColors: Record<EventType, 'accent' | 'green'> = {
  hackathon: 'accent',
  project: 'green',
};

const typeLabels: Record<EventType, string> = {
  hackathon: 'Hackathon',
  project: 'Project',
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

      {/* Tags */}
      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
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
