import { useParams, useNavigate } from 'react-router-dom';
import { useGraphStore } from '@/stores/graphStore';
import { useEventStore } from '@/stores/eventStore';
import { Badge } from '@/components/base/Badge';
import { Avatar } from '@/components/base/Avatar';
import { Spinner } from '@/components/base/Spinner';
import { Card } from '@/components/base/Card';

export function ProfilePage() {
  const { personId, eventId } = useParams<{ personId: string; eventId: string }>();
  const navigate = useNavigate();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const currentEventId = useEventStore((s) => s.currentEventId) ?? eventId;

  const person = personId ? nodes.get(personId) : undefined;

  if (!person) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Get skills via has_skill edges
  const skills: string[] = [];
  edges.forEach((edge) => {
    if (edge.kind === 'has_skill' && edge.from === person.id) {
      const skillNode = nodes.get(edge.to);
      if (skillNode) skills.push(skillNode.label);
    }
  });

  // Get team via member_of edge
  const memberEdge = Array.from(edges.values()).find(
    (e) => e.kind === 'member_of' && e.from === person.id,
  );
  const teamInfo = memberEdge ? nodes.get(memberEdge.to) : undefined;

  // Get ideas via authored edge
  const ideas: { id: string; label: string }[] = [];
  edges.forEach((edge) => {
    if (edge.kind === 'authored' && edge.from === person.id) {
      const ideaNode = nodes.get(edge.to);
      if (ideaNode && ideaNode.kind === 'idea') {
        ideas.push({ id: ideaNode.id, label: ideaNode.label });
      }
    }
  });

  const statusColor = person.status === 'looking' ? 'green' : person.status === 'teamed' ? 'accent' : 'muted';

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center pt-16 px-4 pb-12">
      <div className="max-w-md w-full border border-border bg-panel rounded-2xl p-6">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-muted hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Profile header */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={person.label} size="lg" />
          <div>
            <h1 className="text-lg font-bold text-white">{person.label}</h1>
            <Badge color={statusColor}>{person.status ?? 'idle'}</Badge>
          </div>
        </div>

        {/* Team */}
        {teamInfo && (
          <div className="mb-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Team</h2>
            <Card
              className="cursor-pointer"
              onClick={() => currentEventId && navigate(`/event/${currentEventId}/team/${teamInfo!.id}`)}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#2dd4bf]" />
                <span className="text-sm font-medium text-white">{teamInfo.label}</span>
                <span className="text-xs text-muted ml-auto">View →</span>
              </div>
            </Card>
          </div>
        )}

        {/* Ideas */}
        {ideas.length > 0 && (
          <div className="mb-5">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Ideas</h2>
            <div className="flex flex-col gap-1.5">
              {ideas.map((idea) => (
                <div key={idea.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel-2 border border-border">
                  <span className="w-3 h-3 rounded-sm bg-[#8b5cf6] rotate-45" />
                  <span className="text-sm text-white">{idea.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {!teamInfo && ideas.length === 0 && skills.length === 0 && (
          <p className="text-xs text-muted-2">No additional info available.</p>
        )}
      </div>
    </div>
  );
}
