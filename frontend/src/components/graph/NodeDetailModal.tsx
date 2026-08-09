/**
 * NodeDetailModal — floating panel that shows full details about a selected graph node.
 * Appears over the graph canvas without navigating away.
 */

import { useEffect, useRef } from 'react';
import type { ForceNode } from '@/hooks/useGraphData';

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
            className={`inline-block px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-[0.8px]
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
            <h3 className="text-base font-bold text-[#111318] dark:text-[#f4f6f8] truncate">
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
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Bio
                </div>
                <p className="text-sm text-[#111318] dark:text-[#f4f6f8] leading-relaxed">
                  {bio}
                </p>
              </div>
            )}

            {/* Team membership */}
            {team && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
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
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1.5">
                  Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium border
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
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Availability
                </div>
                <span className="text-xs text-[#111318] dark:text-[#f4f6f8] capitalize">{availability}</span>
              </div>
            )}

            {/* Status */}
            {node.status && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Status
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-[6px] h-[6px] rounded-full ${
                    node.status === 'looking' ? 'bg-[#12c7e5]' : 'bg-[#21d69a]'
                  }`} />
                  <span className="text-xs text-[#111318] dark:text-[#f4f6f8] capitalize">{node.status}</span>
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
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1">
                  Status
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-[6px] h-[6px] rounded-full ${
                    node.status === 'recruiting' ? 'bg-[#12c7e5]' : 'bg-[#21d69a]'
                  }`} />
                  <span className="text-xs text-[#111318] dark:text-[#f4f6f8] capitalize">{node.status}</span>
                </div>
              </div>
            )}

            {/* Members */}
            {members.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1.5">
                  Members ({members.length})
                </div>
                <div className="space-y-1.5">
                  {members.slice(0, 8).map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#12c7e5]/10 border border-[#12c7e5]/30 flex items-center justify-center text-[8px] font-bold text-[#12c7e5]">
                        {getInitials(member.label)}
                      </div>
                      <span className="text-xs text-[#111318] dark:text-[#f4f6f8]">{member.label}</span>
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
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#68717d] mb-1.5">
                  Looking for
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {needs.map((need) => (
                    <span
                      key={need}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium border
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
