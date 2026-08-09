/**
 * NodeDetailModal — floating panel that shows full details about a selected graph node.
 * Appears over the graph canvas without navigating away.
 */

import { useEffect, useRef, useState } from 'react';
import type { ForceNode } from '@/hooks/useGraphData';
import { useSessionStore } from '@/stores/sessionStore';
import { useTeamStore } from '@/stores/teamStore';
import { apiFetch, ApiError } from '@/lib/api';
import type { ApplicationDTO } from '@nodo/contracts';

interface NodeDetailModalProps {
  node: ForceNode | null;
  onClose: () => void;
  skills: string[];
  members: { id: string; label: string }[];
  needs: string[];
  team: { id: string; label: string } | null;
}

export function NodeDetailModal({ node, onClose, skills, members, needs, team }: NodeDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!node) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [node, onClose]);

  // Escape key to close
  useEffect(() => {
    if (!node) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [node, onClose]);

  if (!node) return null;

  // Extract meta fields
  const meta = node.meta ?? {};
  const headline = meta.headline as string | undefined;
  const bio = meta.bio as string | undefined;
  const availability = meta.availability as string | undefined;

  return (
    <div className="absolute inset-0 z-40">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 dark:bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
          w-[360px] max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-2xl border p-5 shadow-2xl
          bg-white border-gray-200
          dark:bg-[#101317] dark:border-[#20262d]"
        role="dialog"
        aria-label={`${node.kind} details: ${node.label}`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg
            text-gray-400 hover:text-gray-700 hover:bg-gray-100
            dark:text-[#68717d] dark:hover:text-white dark:hover:bg-[#15191e] transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Kind badge */}
        <div className="mb-3">
          <span
            className={`inline-block px-2 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-[0.8px]
              ${node.kind === 'person'
                ? 'bg-[#12c7e5]/10 text-[#12c7e5]'
                : node.kind === 'team'
                  ? 'bg-[#21d69a]/10 text-[#21d69a]'
                  : node.kind === 'skill'
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-[#15191e] dark:text-[#9da6b1]'
              }`}
          >
            {node.kind}
          </span>
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-3 mb-1">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0
              ${node.kind === 'person'
                ? 'bg-[#12c7e5]/10 border border-[#12c7e5]/30 text-[#12c7e5]'
                : node.kind === 'team'
                  ? 'bg-[#21d69a]/10 border border-[#21d69a]/30 text-[#21d69a]'
                  : 'bg-gray-100 border border-gray-200 text-gray-500 dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#9da6b1]'
              }`}
          >
            {getInitials(node.label)}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#111318] dark:text-[#f4f6f8] truncate">
              {node.label}
            </h3>
            {headline && (
              <p className="text-xs text-gray-500 dark:text-[#9da6b1] truncate">{headline}</p>
            )}
            {!headline && node.status && (
              <p className="text-xs text-gray-500 dark:text-[#9da6b1]">{node.status}</p>
            )}
          </div>
        </div>

        {/* Person details */}
        {node.kind === 'person' && (
          <div className="mt-4 space-y-3">
            {/* Bio */}
            {bio && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Bio
                </div>
                <p className="text-[15px] text-[#111318] dark:text-[#f4f6f8] leading-relaxed">
                  {bio}
                </p>
              </div>
            )}

            {/* Team membership */}
            {team && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Team
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-[#21d69a]/5 border-[#21d69a]/20">
                  <span className="w-[6px] h-[6px] rounded-full bg-[#21d69a]" />
                  <span className="text-sm font-medium text-[#111318] dark:text-[#f4f6f8]">{team.label}</span>
                </div>
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1.5">
                  Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md text-xs font-medium border
                        bg-gray-50 border-gray-200 text-gray-600
                        dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#9da6b1]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            {availability && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Availability
                </div>
                <span className="text-[13px] text-[#111318] dark:text-[#f4f6f8] capitalize">{availability}</span>
              </div>
            )}

            {/* Status */}
            {node.status && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Status
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-[6px] h-[6px] rounded-full ${
                    node.status === 'looking' ? 'bg-[#12c7e5]' : 'bg-[#21d69a]'
                  }`} />
                  <span className="text-[13px] text-[#111318] dark:text-[#f4f6f8] capitalize">{node.status}</span>
                </div>
              </div>
            )}

            {!bio && !team && skills.length === 0 && !availability && (
              <p className="text-xs text-gray-400 dark:text-[#68717d] italic">No additional details available yet.</p>
            )}
          </div>
        )}

        {/* Team details */}
        {node.kind === 'team' && (
          <div className="mt-4 space-y-3">
            {/* Status */}
            {node.status && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Status
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-[6px] h-[6px] rounded-full ${
                    node.status === 'recruiting' ? 'bg-[#12c7e5]' : 'bg-[#21d69a]'
                  }`} />
                  <span className="text-[13px] text-[#111318] dark:text-[#f4f6f8] capitalize">{node.status}</span>
                </div>
              </div>
            )}

            {/* Members */}
            {members.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1.5">
                  Members ({members.length})
                </div>
                <div className="space-y-1.5">
                  {members.slice(0, 8).map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#12c7e5]/10 border border-[#12c7e5]/30 flex items-center justify-center text-[8px] font-bold text-[#12c7e5]">
                        {getInitials(member.label)}
                      </div>
                      <span className="text-[13px] text-[#111318] dark:text-[#f4f6f8]">{member.label}</span>
                    </div>
                  ))}
                  {members.length > 8 && (
                    <span className="text-[10px] text-gray-400 dark:text-[#68717d]">
                      +{members.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Needs */}
            {needs.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1.5">
                  Looking for
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {needs.map((need) => (
                    <span
                      key={need}
                      className="px-2 py-0.5 rounded-md text-xs font-medium border
                        bg-amber-50 border-amber-200 text-amber-600
                        dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400"
                    >
                      {need}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 && needs.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-[#68717d] italic">No additional details available yet.</p>
            )}

            {/* Apply to team */}
            <InlineApplyButton teamId={node.id} teamName={node.label} members={members} />

            {/* Applications panel for leader */}
            <InlineApplicationsPanel teamId={node.id} members={members} />
          </div>
        )}

        {/* Skill details */}
        {node.kind === 'skill' && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-[#9da6b1]">
              This skill connects people and teams in the network.
            </p>
          </div>
        )}
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

// ─── Inline Apply Button ─────────────────────────────────────────────────────

function InlineApplyButton({ teamId, teamName, members }: { teamId: string; teamName: string; members: { id: string; label: string }[] }) {
  const personId = useSessionStore((s) => s.personId);
  const myTeamId = useTeamStore((s) => s.myTeamId);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'already'>('idle');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Don't show if user is the leader or a member
  const isMember = members.some((m) => m.id === personId);
  if (isMember || myTeamId === teamId) return null;

  // If user already has a team, don't show apply
  if (myTeamId) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#20262d]">
        <p className="text-[10px] text-gray-400 dark:text-[#68717d] text-center">You're already in a team</p>
      </div>
    );
  }

  async function handleApply() {
    setStatus('sending');
    try {
      await apiFetch<{ application: ApplicationDTO }>(
        `/v1/teams/${teamId}/applications`,
        {
          method: 'POST',
          body: JSON.stringify({ message: message.trim() || null }),
        },
      );
      setStatus('sent');
      setShowForm(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('already');
      } else {
        setStatus('error');
      }
    }
  }

  if (status === 'sent') {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#20262d]">
        <div className="flex items-center justify-center gap-1.5 py-2">
          <svg className="w-3.5 h-3.5 text-[#21d69a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-semibold text-[#21d69a]">Application sent!</span>
        </div>
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#20262d]">
        <p className="text-[10px] text-gray-400 dark:text-[#68717d] text-center">You already applied to this team</p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#20262d]">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full h-9 flex items-center justify-center gap-2 rounded-[10px] text-xs font-bold transition-colors
            bg-[#12c7e5] text-[#001a20] hover:bg-[#0fb5d0]"
        >
          Apply to {teamName}
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself (optional)..."
            rows={2}
            className="w-full rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#12c7e5] border
              bg-gray-50 border-gray-200 text-[#111318] placeholder:text-gray-400
              dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#f4f6f8] dark:placeholder:text-[#68717d]"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 h-8 rounded-lg text-[11px] font-semibold transition-colors
                text-gray-500 hover:text-[#111318] hover:bg-gray-100
                dark:text-[#9da6b1] dark:hover:text-white dark:hover:bg-[#15191e]"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={status === 'sending'}
              className="flex-1 h-8 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50
                bg-[#12c7e5] text-[#001a20] hover:bg-[#0fb5d0]"
            >
              {status === 'sending' ? 'Sending...' : 'Send'}
            </button>
          </div>
          {status === 'error' && (
            <p className="text-[10px] text-red-500 text-center">Something went wrong. Try again.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Inline Applications Panel (for team leader) ─────────────────────────────

function InlineApplicationsPanel({ teamId, members }: { teamId: string; members: { id: string; label: string }[] }) {
  const personId = useSessionStore((s) => s.personId);
  const [applications, setApplications] = useState<ApplicationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Check if current user is the leader (first member is typically the leader,
  // but we check via the leads edge in GraphPanel — here we use a heuristic:
  // try to fetch applications, 403 means not leader)
  useEffect(() => {
    if (!personId || loaded) return;
    // Only attempt to load if user might be leader (is a member)
    const isMember = members.some((m) => m.id === personId);
    if (!isMember) return;

    setLoading(true);
    apiFetch<{ applications: ApplicationDTO[] }>(`/v1/teams/${teamId}/applications`)
      .then((res) => {
        setApplications(res.applications.filter((a) => a.status === 'pending'));
        setLoaded(true);
      })
      .catch(() => {
        // 403 = not leader, or other error — just hide the panel
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [teamId, personId, members, loaded]);

  async function handleResolve(applicationId: string, action: 'accept' | 'reject') {
    try {
      await apiFetch(`/v1/applications/${applicationId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setApplications((prev) => prev.filter((a) => a.id !== applicationId));
    } catch (err) {
      // Remove from list on 403 (already resolved) or show error on 500
      if (err instanceof ApiError && (err.status === 403 || err.status === 409)) {
        setApplications((prev) => prev.filter((a) => a.id !== applicationId));
      } else {
        // 500 = backend issue (likely Portal publish failure)
        // The operation may have succeeded despite the 500, remove optimistically
        setApplications((prev) => prev.filter((a) => a.id !== applicationId));
      }
    }
  }

  if (!loaded || loading) return null;
  if (applications.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#20262d]">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-2">
        Pending Applications ({applications.length})
      </div>
      <div className="space-y-2">
        {applications.map((app) => (
          <div
            key={app.id}
            className="rounded-lg border p-2.5
              bg-gray-50 border-gray-200
              dark:bg-[#15191e] dark:border-[#20262d]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#111318] dark:text-[#f4f6f8]">
                {app.person.displayName}
              </span>
              <span className="text-[9px] text-gray-400 dark:text-[#68717d]">
                @{app.person.handle}
              </span>
            </div>
            {app.message && (
              <p className="text-[10px] text-gray-500 dark:text-[#9da6b1] mb-2 leading-relaxed">
                {app.message}
              </p>
            )}
            <div className="flex gap-1.5">
              <button
                onClick={() => handleResolve(app.id, 'accept')}
                className="flex-1 h-7 rounded-md text-[10px] font-bold transition-colors
                  bg-[#21d69a] text-[#00261a] hover:bg-[#1bc48b]"
              >
                Accept
              </button>
              <button
                onClick={() => handleResolve(app.id, 'reject')}
                className="flex-1 h-7 rounded-md text-[10px] font-semibold transition-colors
                  text-gray-500 hover:text-[#111318] hover:bg-gray-100 border border-gray-200
                  dark:text-[#9da6b1] dark:hover:text-white dark:hover:bg-[#20262d] dark:border-[#20262d]"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
