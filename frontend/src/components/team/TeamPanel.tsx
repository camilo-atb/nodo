/**
 * TeamPanel — side drawer showing current team info, members, challenges, board.
 * Opens from the team button in the graph navbar.
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useTeamStore } from '@/stores/teamStore';
import { useEventStore, getExperienceMode } from '@/stores/eventStore';
import { useSessionStore } from '@/stores/sessionStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useGraphStore } from '@/stores/graphStore';
import type { TeamDTO, ApplicationDTO, GraphSnapshot } from '@nodo/contracts';

interface TeamPanelProps {
  open: boolean;
  onClose: () => void;
}

export function TeamPanel({ open, onClose }: TeamPanelProps) {
  const navigate = useNavigate();
  const storeTeamId = useTeamStore((s) => s.myTeamId);
  const setMyTeamId = useTeamStore((s) => s.setMyTeamId);
  const personId = useSessionStore((s) => s.personId);
  const currentEventId = useEventStore((s) => s.currentEventId);
  const events = useEventStore((s) => s.events);
  const onlineIds = usePresenceStore((s) => s.online);
  const edgesMap = useGraphStore((s) => s.edges);

  // Derive experience mode
  const currentEvent = events.find((e) => e.id === currentEventId);
  const mode = currentEvent ? getExperienceMode(currentEvent.kind) : 'competition';
  const isProject = mode === 'collaboration';

  // Labels based on mode
  const labels = {
    panelTitle: isProject ? 'Current project' : 'Current team',
    membersTitle: isProject ? 'Contributors' : 'Members',
    leaderBadge: isProject ? 'OWNER' : 'LEADER',
    roleBadge: isProject ? 'CONTRIBUTOR' : 'MEMBER',
    yourRole: isProject ? 'Your role' : 'Your role',
    boardAction: isProject ? 'Roadmap Board' : 'Open Board',
    challengeAction: isProject ? 'Skill Check' : 'Launch Challenge',
    challengeNote: isProject ? 'Owner only' : 'Leader only',
    noTeam: isProject ? 'No project yet' : 'No team yet',
    noTeamHint: isProject ? 'Join a project to access this panel.' : 'Join or create a team to access this panel.',
  };

  // Derive teamId from graph if not in store
  const myTeamId = useMemo(() => {
    if (storeTeamId) return storeTeamId;
    if (!personId) return null;
    // Look for a member_of or leads edge from this person
    for (const [, edge] of edgesMap) {
      if ((edge.kind === 'member_of' || edge.kind === 'leads') && edge.from === personId) {
        return edge.to;
      }
    }
    return null;
  }, [storeTeamId, personId, edgesMap]);

  // Sync back to store if derived
  useEffect(() => {
    if (myTeamId && !storeTeamId) {
      setMyTeamId(myTeamId);
    }
  }, [myTeamId, storeTeamId, setMyTeamId]);

  const [team, setTeam] = useState<TeamDTO | null>(null);
  const [applications, setApplications] = useState<ApplicationDTO[]>([]);
  const [_loading, setLoading] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);

  const isLeader = team?.lead.id === personId;

  // Load team data when panel opens
  useEffect(() => {
    if (!open || !myTeamId) return;
    setLoading(true);

    Promise.all([
      apiFetch<{ team: TeamDTO }>(`/v1/teams/${myTeamId}`).catch(() => null),
      apiFetch<{ applications: ApplicationDTO[] }>(`/v1/teams/${myTeamId}/applications`).catch(() => ({ applications: [] as ApplicationDTO[] })),
    ]).then(([teamRes, appsRes]) => {
      if (teamRes) setTeam(teamRes.team);
      if (appsRes) setApplications(appsRes.applications.filter((a) => a.status === 'pending'));
    }).finally(() => setLoading(false));
  }, [open, myTeamId]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  async function handleResolveApp(appId: string, action: 'accept' | 'reject') {
    try {
      await apiFetch(`/v1/applications/${appId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
    } catch { /* backend might 500 on accept due to Portal */ }
    setApplications((prev) => prev.filter((a) => a.id !== appId));
    // Refresh graph
    if (currentEventId) {
      apiFetch<GraphSnapshot>(`/v1/graph?eventId=${encodeURIComponent(currentEventId)}`)
        .then((s) => useGraphStore.getState().loadSnapshot(s)).catch(() => {});
    }
  }

  if (!open) return null;

  // No team state
  if (!myTeamId) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/25 dark:bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
        <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-[460px] border-l flex flex-col items-center justify-center p-8
          bg-white border-gray-200 dark:bg-[#0b0f14] dark:border-[#202832]">
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#151b22] flex items-center justify-center">×</button>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#151b22] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <p className="text-sm font-semibold text-[#111318] dark:text-[#f4f6f8]">{labels.noTeam}</p>
            <p className="text-xs text-gray-500 dark:text-[#9da6b1] mt-1">{labels.noTeamHint}</p>
          </div>
        </aside>
      </>
    );
  }

  const onlineCount = team ? team.members.filter((m) => onlineIds.has(m.id)).length : 0;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/25 dark:bg-black/55 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[460px] flex-col border-l shadow-2xl
          bg-white border-gray-200
          dark:bg-[#0b0f14] dark:border-[#202832]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 dark:border-[#202832] px-5 pb-4 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[.14em] text-gray-400 dark:text-[#68717d]">{labels.panelTitle}</span>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-[#151b22] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {team && (
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#12c7e5]/20 bg-[#12c7e5]/[.08] text-[#12c7e5]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M16 20v-1.5a4 4 0 00-4-4H7a4 4 0 00-4 4V20"/><circle cx="9.5" cy="7" r="3.5"/><path d="M17 11a3.5 3.5 0 100-6.8M21 20v-1.5a4 4 0 00-3-3.87"/></svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold text-[#111318] dark:text-[#f4f6f8]">{team.name}</h1>
                  <span className="rounded-md border border-[#21d69a]/20 bg-[#21d69a]/[.08] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#21d69a]">
                    {team.status}
                  </span>
                </div>
                {team.pitch && <p className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">{team.pitch}</p>}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Your role</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isLeader ? 'bg-[#8b5cf6]/10 text-[#a78bfa]' : 'bg-[#12c7e5]/[.08] text-[#12c7e5]'}`}>
                    {isLeader ? labels.leaderBadge : labels.roleBadge}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Members section */}
          {team && (
            <section className="border-b border-gray-200 dark:border-[#202832] px-5 py-5">
              <div className="mb-3.5 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">{labels.membersTitle}</h2>
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-[#68717d]">{team.members.length} / {team.maxSize} {isProject ? 'contributors' : 'people'}</p>
                </div>
                {onlineCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-[#21d69a]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#21d69a]" />
                    {onlineCount} online
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {team.members.map((member) => {
                  const isOnline = onlineIds.has(member.id);
                  const isMemberLeader = member.id === team.lead.id;
                  return (
                    <div key={member.id} className="flex items-center gap-3 rounded-[10px] border p-2.5 border-gray-100 hover:bg-gray-50 dark:border-[#151b22] dark:hover:bg-[#10151b] transition-colors">
                      <div className="relative">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-[10px] font-bold shrink-0 ${
                          isMemberLeader
                            ? 'border-[#12c7e5]/20 bg-[#12c7e5]/[.07] text-[#12c7e5]'
                            : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-[#29333f] dark:bg-[#151b22] dark:text-gray-300'
                        }`}>
                          {getInitials(member.displayName)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-[#21d69a]' : 'bg-gray-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">{member.displayName}</span>
                          {isMemberLeader && <span className="rounded-[5px] bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[8px] font-bold text-[#a78bfa]">{labels.leaderBadge}</span>}
                        </div>
                      </div>
                      <span className={`text-[9px] ${isOnline ? 'text-[#21d69a]' : 'text-gray-400'}`}>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quick actions */}
          <section className="border-b border-gray-200 dark:border-[#202832] px-5 py-5">
            <div className="mb-3.5">
              <h2 className="text-sm font-semibold text-[#111318] dark:text-[#f4f6f8]">Workspace</h2>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-[#68717d]">Collaborate with your team</p>
            </div>
            <button
              onClick={() => {
                if (currentEventId && myTeamId) {
                  navigate(`/event/${currentEventId}/team/${myTeamId}/board`);
                  onClose();
                }
              }}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-[10px] text-sm font-bold transition-colors
                bg-[#12c7e5] text-[#001a20] hover:bg-[#0fb5d0]"
            >
              {labels.boardAction} →
            </button>
          </section>

          {/* Pending applications (leader only) */}
          {isLeader && applications.length > 0 && (
            <section className="border-b border-gray-200 dark:border-[#202832] px-5 py-5">
              <div className="mb-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">Pending requests</h2>
                  <span className="rounded-full bg-amber-500/10 px-1.5 text-[8px] font-bold text-amber-500">{applications.length}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-[#68717d]">Visible to {isProject ? 'owners' : 'team leaders'}</p>
              </div>
              <div className="space-y-2">
                {applications.map((app) => (
                  <div key={app.id} className="rounded-[10px] border p-2.5 border-gray-200 dark:border-[#202832]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 shrink-0 dark:border-[#29333f] dark:bg-[#151b22] dark:text-gray-300">
                        {getInitials(app.person.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">{app.person.displayName}</div>
                        {app.message && <div className="text-[9px] text-gray-400 dark:text-[#68717d] truncate mt-0.5">{app.message}</div>}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleResolveApp(app.id, 'accept')}
                          className="h-7 w-7 rounded-[7px] bg-[#21d69a]/[.07] text-[#21d69a] flex items-center justify-center text-sm font-bold hover:bg-[#21d69a]/20 transition-colors"
                        >✓</button>
                        <button
                          onClick={() => handleResolveApp(app.id, 'reject')}
                          className="h-7 w-7 rounded-[7px] border border-gray-200 dark:border-[#29333f] text-gray-400 flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-[#151b22] transition-colors"
                        >×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 dark:border-[#202832] p-4">
          <div className="text-[10px] text-center text-gray-400 dark:text-[#68717d]">
            {team?.members.length ?? 0} / {team?.maxSize ?? 4} {isProject ? 'contributors' : 'members'}
          </div>
        </div>
      </aside>

      {/* Launch Challenge Modal — hidden for MVP */}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
