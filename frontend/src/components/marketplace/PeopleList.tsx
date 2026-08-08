import { useState } from 'react';
import { useGraphStore } from '@/stores/graphStore';
import { PersonCard } from '@/components/marketplace/PersonCard';
import { EmptyState } from '@/components/base/EmptyState';

export function PeopleList() {
  const nodes = useGraphStore((s) => s.nodes);
  const [showAll, setShowAll] = useState(false);

  const people = Array.from(nodes.values()).filter((n) => n.kind === 'person');
  const filtered = showAll ? people : people.filter((p) => p.status === 'looking');

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-2 uppercase tracking-wide font-medium">
          {filtered.length} {showAll ? 'people' : 'looking'}
        </span>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] text-violet hover:text-violet-2 transition-colors"
        >
          {showAll ? 'Show looking' : 'Show all'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No people yet"
          description="Waiting for participants to join this event."
        />
      ) : (
        filtered.map((person) => <PersonCard key={person.id} person={person} />)
      )}
    </div>
  );
}
