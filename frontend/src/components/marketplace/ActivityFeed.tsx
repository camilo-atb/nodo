import { useNavigate } from 'react-router-dom';
import { useFeedStore } from '@/stores/feedStore';
import { useEventStore } from '@/stores/eventStore';
import { EmptyState } from '@/components/base/EmptyState';
import { formatRelativeTime } from '@/utils/formatRelativeTime';
import type { FeedLine } from '@nodo/contracts';

function FeedLineItem({ line }: { line: FeedLine & { at?: string } }) {
  const navigate = useNavigate();
  const currentEventId = useEventStore((s) => s.currentEventId);

  function handleRefClick(ref: FeedLine['refs'][number]) {
    if (!currentEventId) return;
    if (ref.kind === 'team') {
      navigate(`/event/${currentEventId}/team/${ref.id}`);
    } else if (ref.kind === 'person') {
      navigate(`/event/${currentEventId}/profile/${ref.id}`);
    }
  }

  // Build text with clickable refs
  function renderText() {
    if (line.refs.length === 0) {
      return <span className="text-muted">{line.text}</span>;
    }

    // Replace ref labels in text with clickable spans
    let remaining = line.text;
    const parts: React.ReactNode[] = [];
    let key = 0;

    for (const ref of line.refs) {
      const idx = remaining.indexOf(ref.label);
      if (idx === -1) continue;

      if (idx > 0) {
        parts.push(<span key={key++} className="text-muted">{remaining.slice(0, idx)}</span>);
      }

      parts.push(
        <button
          key={key++}
          onClick={() => handleRefClick(ref)}
          className="text-accent hover:underline font-medium"
        >
          {ref.label}
        </button>
      );

      remaining = remaining.slice(idx + ref.label.length);
    }

    if (remaining) {
      parts.push(<span key={key++} className="text-muted">{remaining}</span>);
    }

    return <>{parts}</>;
  }

  return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      <span className="text-sm mt-0.5 shrink-0">{line.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-relaxed">{renderText()}</p>
        {'at' in line && line.at && (
          <span className="text-[10px] text-muted-2 mt-0.5 block">
            {formatRelativeTime(line.at)}
          </span>
        )}
      </div>
    </div>
  );
}

export function ActivityFeed() {
  const lines = useFeedStore((s) => s.lines);

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Activity will appear here as things happen."
      />
    );
  }

  return (
    <div className="flex flex-col">
      {lines.map((line, i) => (
        <FeedLineItem key={i} line={line} />
      ))}
    </div>
  );
}
