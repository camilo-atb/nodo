import { useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { TeamCard } from '@/components/marketplace/TeamCard';
import { EmptyState } from '@/components/base/EmptyState';

export function TeamsList() {
  const nodes = useGraphStore((s) => s.nodes);
  const [showAll, setShowAll] = useState(false);

  const teams = Array.from(nodes.values()).filter((n) => n.kind === 'team');
  const filtered = showAll ? teams : teams.filter((t) => t.status === 'recruiting');

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-2 uppercase tracking-wide font-medium">
          {filtered.length} {showAll ? 'teams' : 'recruiting'}
        </span>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] text-accent hover:text-accent-2 transition-colors"
        >
          {showAll ? 'Show recruiting' : 'Show all'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Be the first to create a team."
        />
      ) : (
        filtered.map((team) => <TeamCard key={team.id} team={team} />)
      )}
    </div>
  );
}
