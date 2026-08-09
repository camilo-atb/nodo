/**
 * TeamPanel — side drawer showing current team info, members, challenges, board.
 * Opens from the team button in the graph navbar.
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useTeamStore } from '@/stores/teamStore';
import { useEventStore } from '@/stores/eventStore';
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
  const onlineIds = usePresenceStore((s) => s.online);
  const edgesMap = useGraphStore((s) => s.edges);

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
  const [challenges, setChallenges] = useState<{ id: string; title: string; status: string; skillSlug: string }[]>([]);
  const [_loading, setLoading] = useState(false);
  const [launchModalOpen, setLaunchModalOpen] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);

  const isLeader = team?.lead.id === personId;

  // Load team data when panel opens
  useEffect(() => {
    if (!open || !myTeamId) return;
    setLoading(true);

    Promise.all([
      apiFetch<{ team: TeamDTO }>(`/v1/teams/${myTeamId}`).catch(() => null),
      apiFetch<{ applications: ApplicationDTO[] }>(`/v1/teams/${myTeamId}/applications`).catch(() => ({ applications: [] as ApplicationDTO[] })),
      apiFetch<{ challenges: { id: string; title: string; status: string; skillSlug: string }[] }>(`/v1/teams/${myTeamId}/challenges`).catch(() => null),
    ]).then(([teamRes, appsRes, challengesRes]) => {
      if (teamRes) setTeam(teamRes.team);
      if (appsRes) setApplications(appsRes.applications.filter((a) => a.status === 'pending'));
      if (challengesRes && Array.isArray(challengesRes.challenges)) {
        setChallenges(challengesRes.challenges);
      } else {
        setChallenges([]);
      }
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

  async function handleLaunchChallenge(skillSlug: string) {
    if (!myTeamId) return;
    try {
      const res = await apiFetch<{ challenge: { id: string; title: string; status: string; skillSlug: string } }>(
        `/v1/teams/${myTeamId}/challenges`,
        { method: 'POST', body: JSON.stringify({ skillSlug }) },
      );
      setChallenges((prev) => [...prev, res.challenge]);
      setLaunchModalOpen(false);
      // Navigate to challenge
      if (currentEventId) {
        navigate(`/event/${currentEventId}/challenge/${res.challenge.id}`);
        onClose();
      }
    } catch { /* silent */ }
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
            <p className="text-sm font-semibold text-[#111318] dark:text-[#f4f6f8]">No team yet</p>
            <p className="text-xs text-gray-500 dark:text-[#9da6b1] mt-1">Join or create a team to access this panel.</p>
          </div>
        </aside>
      </>
    );
  }

  const onlineCount = team ? team.members.filter((m) => onlineIds.has(m.id)).length : 0;
  const activeChallenge = challenges.find((c) => c && (c.status === 'active' || c.status === 'running'));

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
            <span className="text-[10px] font-bold uppercase tracking-[.14em] text-gray-400 dark:text-[#68717d]">Current team</span>
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
                  <span className="rounded-md border border-[#21d69a]/20 bg-[#21d69a]/[.08] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#21d69a]">
                    {team.status}
                  </span>
                </div>
                {team.pitch && <p className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">{team.pitch}</p>}
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">Your role</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${isLeader ? 'bg-[#8b5cf6]/10 text-[#a78bfa]' : 'bg-[#12c7e5]/[.08] text-[#12c7e5]'}`}>
                    {isLeader ? 'LEADER' : 'MEMBER'}
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
                  <h2 className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">Members</h2>
                  <p className="mt-0.5 text-[10px] text-gray-400 dark:text-[#68717d]">{team.members.length} / {team.maxSize} people</p>
                </div>
                {onlineCount > 0 && (
                  <span className="flex items-center gap-1 text-[9px] text-[#21d69a]">
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
                          {isMemberLeader && <span className="rounded-[5px] bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[8px] font-bold text-[#a78bfa]">LEADER</span>}
                        </div>
                      </div>
                      <span className={`text-[9px] ${isOnline ? 'text-[#21d69a]' : 'text-gray-400'}`}>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Active challenge */}
          {activeChallenge && (
            <section className="border-b border-gray-200 dark:border-[#202832] px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">Active challenge</h2>
                  <p className="mt-0.5 text-[10px] text-gray-400 dark:text-[#68717d]">Your team is currently testing</p>
                </div>
                <span className="rounded-md border border-[#21d69a]/20 bg-[#21d69a]/[.07] px-1.5 py-1 text-[8px] font-bold uppercase text-[#21d69a]">● Live</span>
              </div>
              <div className="rounded-xl border border-[#21d69a]/15 bg-[#21d69a]/[.035] p-3.5" style={{ boxShadow: 'inset 0 0 0 1px rgba(33,214,154,.14), 0 0 30px rgba(33,214,154,.055)' }}>
                <div className="text-sm font-semibold text-[#111318] dark:text-[#f4f6f8]">{activeChallenge.title}</div>
                <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">Skill challenge · {activeChallenge.skillSlug}</div>
                <button
                  onClick={() => {
                    if (currentEventId) {
                      navigate(`/event/${currentEventId}/challenge/${activeChallenge.id}`);
                      onClose();
                    }
                  }}
                  className="mt-3.5 h-9 w-full rounded-[9px] bg-[#21d69a] text-xs font-bold text-[#03150f] hover:brightness-105 transition-all"
                >
                  Join Challenge →
                </button>
              </div>
            </section>
          )}

          {/* Quick actions */}
          <section className="border-b border-gray-200 dark:border-[#202832] px-5 py-5">
            <div className="mb-3.5">
              <h2 className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">Quick actions</h2>
              <p className="mt-0.5 text-[10px] text-gray-400 dark:text-[#68717d]">Jump into your team's workspace</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Open Board */}
              <button
                onClick={() => {
                  if (currentEventId && myTeamId) {
                    navigate(`/event/${currentEventId}/team/${myTeamId}/board`);
                    onClose();
                  }
                }}
                className="min-h-[78px] rounded-[10px] border p-3 text-left transition-all hover:-translate-y-0.5
                  border-gray-200 bg-gray-50 dark:border-[#202832] dark:bg-[#10151b]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#12c7e5]/[.08] text-[#12c7e5] text-base">▤</span>
                <span className="mt-3 flex justify-between text-[11px] font-semibold text-[#111318] dark:text-[#f4f6f8]">
                  Open Board <span className="text-gray-400">→</span>
                </span>
              </button>

              {/* Launch Challenge (leader only) */}
              {isLeader && (
                <button
                  onClick={() => setLaunchModalOpen(true)}
                  className="min-h-[78px] rounded-[10px] border p-3 text-left transition-all hover:-translate-y-0.5
                    border-gray-200 bg-gray-50 dark:border-[#202832] dark:bg-[#10151b]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#8b5cf6]/[.09] text-[#a78bfa] text-base">ϟ</span>
                  <span className="mt-3 flex justify-between text-[11px] font-semibold text-[#111318] dark:text-[#f4f6f8]">
                    Launch Challenge <span className="text-gray-400">→</span>
                  </span>
                  <span className="block text-[8px] text-gray-400 mt-0.5">Leader only</span>
                </button>
              )}
            </div>
          </section>

          {/* Pending applications (leader only) */}
          {isLeader && applications.length > 0 && (
            <section className="border-b border-gray-200 dark:border-[#202832] px-5 py-5">
              <div className="mb-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">Pending requests</h2>
                  <span className="rounded-full bg-amber-500/10 px-1.5 text-[8px] font-bold text-amber-500">{applications.length}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-gray-400 dark:text-[#68717d]">Visible to team leaders</p>
              </div>
              <div className="space-y-2">
                {applications.map((app) => (
                  <div key={app.id} className="rounded-[10px] border p-2.5 border-gray-200 dark:border-[#202832]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-500 shrink-0 dark:border-[#29333f] dark:bg-[#151b22] dark:text-gray-300">
                        {getInitials(app.person.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-[#111318] dark:text-[#f4f6f8]">{app.person.displayName}</div>
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

          {/* Challenge history */}
          {challenges.length > 0 && (
            <section className="px-5 py-5">
              <div className="mb-3.5">
                <h2 className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">Challenge history</h2>
                <p className="mt-0.5 text-[10px] text-gray-400 dark:text-[#68717d]">Previous team skill checks</p>
              </div>
              <div className="space-y-1">
                {challenges.filter((c) => c.status !== 'active' && c.status !== 'running').map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      if (currentEventId) {
                        navigate(`/event/${currentEventId}/challenge/${ch.id}`);
                        onClose();
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-[9px] p-2.5 text-left hover:bg-gray-50 dark:hover:bg-[#10151b] transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[#8b5cf6]/[.09] text-[#a78bfa] text-xs shrink-0">✦</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-semibold text-[#111318] dark:text-[#f4f6f8]">{ch.title}</span>
                      <span className="block mt-0.5 text-[9px] text-gray-400 dark:text-[#68717d]">{ch.skillSlug} · {ch.status}</span>
                    </span>
                    <span className="text-[10px] text-gray-400">→</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 dark:border-[#202832] p-4">
          <div className="text-[10px] text-center text-gray-400 dark:text-[#68717d]">
            {team?.members.length ?? 0} / {team?.maxSize ?? 4} members
          </div>
        </div>
      </aside>

      {/* Launch Challenge Modal */}
      {launchModalOpen && team && (
        <LaunchChallengeModal
          needs={team.needs}
          onClose={() => setLaunchModalOpen(false)}
          onLaunch={handleLaunchChallenge}
        />
      )}
    </>
  );
}

// ─── Launch Challenge Modal ──────────────────────────────────────────────────

function LaunchChallengeModal({ needs, onClose, onLaunch }: {
  needs: { slug: string; label: string }[];
  onClose: () => void;
  onLaunch: (skillSlug: string) => void;
}) {
  const [selectedSkill, setSelectedSkill] = useState(needs[0]?.slug ?? '');
  const [launching, setLaunching] = useState(false);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[410px] rounded-[14px] border p-5 shadow-2xl
        bg-white border-gray-200
        dark:bg-[#0d1116] dark:border-[#202832]">
        <div className="flex justify-between">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[.14em] text-[#8b5cf6]">Launch challenge</div>
            <h3 className="mt-1 text-base font-semibold text-[#111318] dark:text-[#f4f6f8]">Test a team skill</h3>
            <p className="mt-1 text-[10px] text-gray-400 dark:text-[#68717d]">Nodo generates the questions automatically.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-lg">×</button>
        </div>

        <label className="mt-5 block text-[10px] font-semibold text-gray-500 dark:text-[#9da6b1]">Skill</label>
        <select
          value={selectedSkill}
          onChange={(e) => setSelectedSkill(e.target.value)}
          className="mt-1.5 h-10 w-full rounded-[9px] border px-3 text-xs
            border-gray-200 bg-white text-[#111318]
            dark:border-[#29333f] dark:bg-[#10151b] dark:text-white
            focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
        >
          {needs.map((n) => (
            <option key={n.slug} value={n.slug}>{n.label}</option>
          ))}
        </select>

        <div className="mt-4 rounded-[9px] bg-[#8b5cf6]/[.06] p-3 text-[10px] text-gray-500 dark:text-gray-400">
          ✦ All team members receive the challenge in realtime.
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="h-9 flex-1 rounded-[9px] border text-xs font-medium
              border-gray-200 text-gray-600 hover:bg-gray-50
              dark:border-[#29333f] dark:text-gray-400 dark:hover:bg-[#10151b] transition-colors"
          >Cancel</button>
          <button
            onClick={async () => { setLaunching(true); await onLaunch(selectedSkill); setLaunching(false); }}
            disabled={!selectedSkill || launching}
            className="h-9 flex-1 rounded-[9px] bg-[#8b5cf6] text-xs font-bold text-white hover:bg-[#7c3aed] disabled:opacity-50 transition-colors"
          >{launching ? 'Launching...' : 'Launch'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
