import { Card } from '@/components/base/Card';
import { Badge } from '@/components/base/Badge';
import { Avatar } from '@/components/base/Avatar';
import { usePresenceStore } from '@/stores/presenceStore';
import { useGraphStore } from '@/stores/graphStore';
import type { GraphNode } from '@nodo/contracts';

interface PersonCardProps {
  person: GraphNode;
}

export function PersonCard({ person }: PersonCardProps) {
  const online = usePresenceStore((s) => s.online);
  const edges = useGraphStore((s) => s.edges);
  const nodes = useGraphStore((s) => s.nodes);

  const isOnline = online.has(person.id);

  // Get skills via has_skill edges
  const skills: string[] = [];
  edges.forEach((edge) => {
    if (edge.kind === 'has_skill' && edge.from === person.id) {
      const skillNode = nodes.get(edge.to);
      if (skillNode) skills.push(skillNode.label);
    }
  });

  const statusColor = person.status === 'looking' ? 'green' : 'muted';

  return (
    <Card
      className="cursor-pointer"
      onClick={() => console.log(`Navigate to profile: ${person.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar name={person.label} size="md" />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green rounded-full border-2 border-panel" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">
              {person.label}
            </span>
            <Badge color={statusColor}>{person.status ?? 'idle'}</Badge>
          </div>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {skills.slice(0, 4).map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 4 && (
                <span className="text-[10px] text-muted-2">+{skills.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
