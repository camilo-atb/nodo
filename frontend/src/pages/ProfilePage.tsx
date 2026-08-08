import { useParams, useNavigate } from 'react-router-dom';
import { useGraphStore } from '@/stores/graphStore';
import { Badge } from '@/components/base/Badge';
import { Avatar } from '@/components/base/Avatar';
import { Spinner } from '@/components/base/Spinner';

export function ProfilePage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

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

  const statusColor = person.status === 'looking' ? 'green' : person.status === 'busy' ? 'amber' : 'muted';

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center pt-16 px-4">
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

        {skills.length === 0 && (
          <p className="text-xs text-muted-2">No skills listed yet.</p>
        )}
      </div>
    </div>
  );
}
