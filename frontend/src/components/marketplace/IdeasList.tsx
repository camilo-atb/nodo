import { useGraphStore } from '@/stores/graphStore';
import { Card } from '@/components/base/Card';

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
      {ideas.map((idea) => {
        const author = typeof idea.meta?.['author'] === 'string' ? idea.meta['author'] : null;
        const interestedCount = typeof idea.meta?.['interestedCount'] === 'number' ? idea.meta['interestedCount'] : 0;

        return (
          <Card key={idea.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{idea.label}</p>
                {author && (
                  <p className="text-[11px] text-muted mt-0.5">by {author}</p>
                )}
              </div>
              <button
                onClick={() => console.log(`[Nodo] POST /v1/ideas/${idea.id}/interest`)}
                className="shrink-0 px-2 py-1 text-[11px] font-medium rounded-md bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
              >
                Interested{interestedCount > 0 ? ` (${interestedCount})` : ''}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
