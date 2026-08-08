import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/base/Card';
import { Badge } from '@/components/base/Badge';
import { useGraphStore } from '@/stores/graphStore';
import { useEventStore } from '@/stores/eventStore';
import type { GraphNode } from '@nodo/contracts';

interface TeamCardProps {
  team: GraphNode;
}

export function TeamCard({ team }: TeamCardProps) {
  const navigate = useNavigate();
  const edges = useGraphStore((s) => s.edges);
  const nodes = useGraphStore((s) => s.nodes);
  const eventId = useEventStore((s) => s.currentEventId);

  // Count members
  let memberCount = 0;
  edges.forEach((edge) => {
    if (edge.kind === 'member_of' && edge.to === team.id) {
      memberCount++;
    }
  });

  // Get needs (skills the team is looking for)
  const needs: string[] = [];
  edges.forEach((edge) => {
    if (edge.kind === 'needs' && edge.from === team.id) {
      const skillNode = nodes.get(edge.to);
      if (skillNode) needs.push(skillNode.label);
    }
  });

  const statusColor = team.status === 'recruiting' ? 'green' : 'muted';

  return (
    <Card className="cursor-pointer" onClick={() => eventId && navigate(`/event/${eventId}/team/${team.id}`)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">
              {team.label}
            </span>
            <Badge color={statusColor}>{team.status ?? 'active'}</Badge>
          </div>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-2">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>

          {needs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] text-muted-2 mr-1">Needs:</span>
              {needs.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-cyan/10 text-cyan border border-cyan/20"
                >
                  {skill}
                </span>
              ))}
              {needs.length > 3 && (
                <span className="text-[10px] text-muted-2">+{needs.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
