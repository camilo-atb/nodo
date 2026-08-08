import { useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { Card } from '@/components/base/Card';
import { apiFetch } from '@/lib/api';

export function IdeasList() {
  const nodes = useGraphStore((s) => s.nodes);
  const ideas = Array.from(nodes.values()).filter((n) => n.kind === 'idea');

  if (ideas.length === 0) {
    return (
      <p className="text-xs text-muted text-center py-4">
        No ideas shared yet. Be the first!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {ideas.map((idea) => (
        <IdeaItem key={idea.id} idea={idea} />
      ))}
    </div>
  );
}

function IdeaItem({ idea }: { idea: { id: string; label: string; meta?: Record<string, unknown> } }) {
  const [interested, setInterested] = useState(false);
  const [loading, setLoading] = useState(false);

  const author = typeof idea.meta?.['author'] === 'string' ? idea.meta['author'] : null;
  const baseCount = typeof idea.meta?.['interestedCount'] === 'number' ? idea.meta['interestedCount'] : 0;
  const displayCount = baseCount + (interested ? 1 : 0);

  async function handleToggleInterest() {
    setLoading(true);
    try {
      await apiFetch(`/v1/ideas/${idea.id}/interest`, { method: 'POST' });
      setInterested(!interested);
    } catch {
      // Toggle locally even if API fails (mock mode)
      setInterested(!interested);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">{idea.label}</p>
          {author && (
            <p className="text-[11px] text-muted mt-0.5">by {author}</p>
          )}
        </div>
        <button
          onClick={handleToggleInterest}
          disabled={loading}
          className={`shrink-0 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
            interested
              ? 'bg-accent/20 text-accent border border-accent/40'
              : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20'
          } disabled:opacity-50`}
        >
          {interested ? '✓ Interested' : 'Interested'}{displayCount > 0 ? ` (${displayCount})` : ''}
        </button>
      </div>
    </Card>
  );
}
