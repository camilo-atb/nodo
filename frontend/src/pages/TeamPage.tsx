import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useSessionStore } from '@/stores/sessionStore';
import { useTeamStore } from '@/stores/teamStore';
import { useEventStore, getExperienceMode } from '@/stores/eventStore';
import { useGraphStore } from '@/stores/graphStore';
import { Spinner } from '@/components/base/Spinner';
import { Badge } from '@/components/base/Badge';
import { MembersList } from '@/components/team/MembersList';
import { NeedsList } from '@/components/team/NeedsList';
import { ApplicationsPanel } from '@/components/team/ApplicationsPanel';
import { ApplyButton } from '@/components/team/ApplyButton';
import type { TeamDTO, TeamStatus, PersonRef, NeedRef } from '@nodo/contracts';

const STATUS_COLORS: Record<TeamStatus, 'green' | 'amber' | 'accent' | 'muted'> = {
  recruiting: 'accent',
  almost_full: 'amber',
  complete: 'green',
  building: 'green',
};

const STATUS_LABELS: Record<TeamStatus, string> = {
  recruiting: 'Recruiting',
  almost_full: 'Almost Full',
  complete: 'Complete',
  building: 'Building',
};

export function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const personId = useSessionStore((s) => s.personId);
  const myApplication = useTeamStore((s) => s.myApplication);
  const currentEvent = useEventStore((s) => s.events.find((e) => e.id === s.currentEventId));
  const mode = currentEvent ? getExperienceMode(currentEvent.type) : 'competition';
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

  const [team, setTeam] = useState<TeamDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Experience mode copy
  const membersLabel = mode === 'collaboration' ? 'Contributors' : 'Members';

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;

    apiFetch<{ team: TeamDTO }>(`/v1/teams/${teamId}`)
      .then((res) => {
        if (!cancelled) setTeam(res.team);
      })
      .catch(() => {
        // Fallback: try to build team data from graphStore
        if (!cancelled) {
          const teamNode = nodes.get(teamId);
          if (teamNode) {
            const memberEdges = Array.from(edges.values()).filter(
              (e) => e.kind === 'member_of' && e.to === teamId,
            );
            const members: PersonRef[] = memberEdges
              .map((e) => {
                const personNode = nodes.get(e.from);
                return personNode
                  ? { id: personNode.id, handle: (personNode.meta?.['handle'] as string) ?? personNode.id, displayName: personNode.label }
                  : null;
              })
              .filter((m): m is PersonRef => m !== null);

            const needEdges = Array.from(edges.values()).filter(
              (e) => e.kind === 'needs' && e.from === teamId,
            );
            const needs: NeedRef[] = needEdges
              .map((e) => {
                const skillNode = nodes.get(e.to);
                return skillNode
                  ? {
                      slug: skillNode.id,
                      label: skillNode.label,
                      category: (skillNode.meta?.['category'] as NeedRef['category']) ?? 'other',
                      priority: ((e.meta?.['priority'] as string) ?? 'required') as NeedRef['priority'],
                    }
                  : null;
              })
              .filter((n): n is NeedRef => n !== null);

            const leadEdge = Array.from(edges.values()).find(
              (e) => e.kind === 'leads' && e.to === teamId,
            );
            const leadNode = leadEdge ? nodes.get(leadEdge.from) : null;
            const lead: PersonRef = leadNode
              ? { id: leadNode.id, handle: (leadNode.meta?.['handle'] as string) ?? leadNode.id, displayName: leadNode.label }
              : { id: 'unknown', handle: 'unknown', displayName: 'Unknown' };

            setTeam({
              id: teamId,
              name: teamNode.label,
              pitch: (teamNode.meta?.['pitch'] as string) ?? null,
              status: (teamNode.status as TeamStatus) ?? 'recruiting',
              lead,
              members: members.length > 0 ? members : [lead],
              // `members` del grafo puede venir recortado (ADR-014): en un
              // sobre viaja acotado a 8. `memberCount` es el censo real.
              memberCount: (teamNode.meta?.['memberCount'] as number) ?? Math.max(members.length, 1),
              needs,
              // El contenedor viaja en el meta del nodo: `Event` no es un
              // NodeKind (ADR-013), es la dimensión por la que se filtra.
              eventId: (teamNode.meta?.['eventId'] as string) ?? 'ev_open',
              ideaId: (teamNode.meta?.['ideaId'] as string) ?? null,
              maxSize: (teamNode.meta?.['maxSize'] as number) ?? 4,
              createdAt: Date.now(),
            });
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [teamId, nodes, edges]);

  // Also load user's existing application for this team
  useEffect(() => {
    if (!teamId || !personId) return;
    // If we don't have a myApplication in the store, try to fetch it
    if (myApplication && myApplication.teamId === teamId) return;
    // We can't fetch individual application status without listing — leave it as null
  }, [teamId, personId, myApplication]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted">Team not found.</p>
      </div>
    );
  }

  const isLeader = personId === team.lead.id;
  const isMember = team.members.some((m) => m.id === personId);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted hover:text-white transition-colors mb-6 flex items-center gap-1"
        >
          ← Back
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{team.name}</h1>
            {team.pitch && (
              <p className="text-sm text-muted mt-1 max-w-md">{team.pitch}</p>
            )}
          </div>
          <Badge color={STATUS_COLORS[team.status]}>
            {STATUS_LABELS[team.status]}
          </Badge>
        </div>

        {/* Membership status */}
        {isMember && !isLeader && (
          <Badge color="green" className="mb-4">
            You&apos;re a {mode === 'collaboration' ? 'contributor' : 'member'}
          </Badge>
        )}

        {/* Members section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            {membersLabel} ({team.members.length}/{team.maxSize})
          </h2>
          <MembersList members={team.members} leadId={team.lead.id} />
        </section>

        {/* Needs section */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Looking For
          </h2>
          <NeedsList needs={team.needs} />
        </section>

        {/* Apply button for non-members */}
        {!isMember && (
          <section className="mb-6">
            <ApplyButton teamId={team.id} teamName={team.name} />
          </section>
        )}

        {/* Applications panel for leader */}
        {isLeader && (
          <section className="mt-8 border-t border-border pt-6">
            <ApplicationsPanel teamId={team.id} />
          </section>
        )}
      </div>
    </div>
  );
}
