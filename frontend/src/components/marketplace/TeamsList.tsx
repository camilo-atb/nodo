import { useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { TeamCard } from '@/components/marketplace/TeamCard';
import { EmptyState } from '@/components/base/EmptyState';
import { Button } from '@/components/base/Button';
import { CreateTeamModal } from '@/components/team/CreateTeamModal';

export function TeamsList() {
  const nodes = useGraphStore((s) => s.nodes);
  const [showAll, setShowAll] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const teams = Array.from(nodes.values()).filter((n) => n.kind === 'team');
  const filtered = showAll ? teams : teams.filter((t) => t.status === 'recruiting');

  return (
    <div className="flex flex-col gap-2">
      {/* Create Team button */}
      <Button onClick={() => setCreateOpen(true)} className="w-full mb-2">
        + Create Team
      </Button>

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

      <CreateTeamModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
