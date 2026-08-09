import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraphPanel } from '@/components/graph/GraphPanel';
import { ConnectionBanner } from '@/components/layout/ConnectionBanner';
import type { GraphFilter } from '@/types/ui';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { Avatar } from '@/components/base/Avatar';
import { usePortalChannel } from '@/hooks/usePortalChannel';
import { useEventStore } from '@/stores/eventStore';
import { useSessionStore } from '@/stores/sessionStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useGraphStore } from '@/stores/graphStore';
import type { GraphNode } from '@nodo/contracts';

export function MainLayout({ eventId }: { eventId: string }) {
  usePortalChannel(eventId);
  const [graphFilter, setGraphFilter] = useState<GraphFilter>({
    showPersons: true,
    showTeams: true,
    showSkills: true,
  });
  const [graphSearch, setGraphSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <>
      <NavBar />
      <div className="relative h-[calc(100vh-72px)]">
        <ConnectionBanner />
        {/* Graph background */}
        <div
          className="absolute inset-0 pointer-events-none
            bg-[#f7f8fa] dark:bg-[#07090c]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 46%, rgba(18,199,229,.035), transparent 30%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none dark:hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 46%, rgba(18,199,229,.035), transparent 30%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 46%, rgba(18,199,229,.07), transparent 31%)',
          }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(18,199,229,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(18,199,229,.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Explorer Panel */}
        <ExplorerPanel
          filter={graphFilter}
          onFilterChange={setGraphFilter}
          search={graphSearch}
          onSearchChange={setGraphSearch}
          onSelectNode={(id) => setSelectedNodeId(id)}
        />

        {/* Fullscreen Graph */}
        <div className="absolute inset-0">
          <GraphPanel
            filter={graphFilter}
            searchQuery={graphSearch}
            selectedNodeId={selectedNodeId}
            onNodeSelect={() => setSelectedNodeId(null)}
          />
        </div>
      </div>
    </>
  );
}

// ─── Nav Bar ─────────────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentEventId = useEventStore((s) => s.currentEventId);
  const events = useEventStore((s) => s.events);
  const profile = useSessionStore((s) => s.profile);
  const clearSession = useSessionStore((s) => s.clearSession);
  const onlineCount = usePresenceStore((s) => s.count);

  const isDark = useIsDark();
  const personId = useSessionStore((s) => s.personId);
  const personNode = useGraphStore((s) => personId ? s.nodes.get(personId) : undefined);
  const name = profile?.name ?? personNode?.label ?? 'User';

  const eventName = useMemo(() => {
    if (!currentEventId) return 'Event';
    const ev = events.find((e) => e.id === currentEventId);
    return ev?.name ?? 'Event';
  }, [currentEventId, events]);

  // Click-outside for dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  function handleLogout() {
    clearSession();
    setDropdownOpen(false);
    navigate('/');
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 h-[72px] flex items-center justify-between px-6 md:px-9 border-b backdrop-blur-xl
          bg-white border-gray-200
          dark:bg-[#0a0c0f]/90 dark:border-[#202832]"
      >
        {/* Left: Logo */}
        <button
          onClick={() => navigate('/discover')}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          aria-label="Go to Discover"
        >
          <NodoLogo />
          <span className="text-xl font-bold tracking-tight text-[#111318] dark:text-[#f4f6f8]">Nodo</span>
        </button>

        {/* Center: Event name + subtitle */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <div className="text-sm font-semibold text-[#111318] dark:text-[#f4f6f8] truncate max-w-[200px]">
            {eventName}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-[#68717d]">
            Nodo · Graph
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Online count — first */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-[#9da6b1]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#21d69a] shadow-[0_0_8px_#21d69a]" />
            <span>{onlineCount || 1}</span>
          </div>

          {/* Button group: theme + bell + team */}
          <div className="flex items-center overflow-hidden rounded-[10px] border border-gray-200 dark:border-[#202832]">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex items-center justify-center w-9 h-9 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#15191e] transition-colors"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-[#202832]" />
            <div className="flex items-center justify-center w-9 h-9 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#15191e] transition-colors">
              <NotificationBell unseenCount={0} />
            </div>
            <div className="w-px h-5 bg-gray-200 dark:bg-[#202832]" />
            <button
              onClick={() => console.log('[Nodo] Team button')}
              aria-label="My team"
              className="flex items-center justify-center w-9 h-9 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#15191e] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </button>
          </div>

          {/* Avatar / Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="cursor-pointer"
              aria-label="User menu"
            >
              <Avatar name={name} size="sm" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-[#101317] border border-gray-200 dark:border-[#20262d] rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setEditProfileOpen(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[#111318] dark:text-[#f4f6f8] hover:bg-gray-50 dark:hover:bg-[#15191e] transition-colors"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-[#111318] dark:text-[#f4f6f8] hover:bg-gray-50 dark:hover:bg-[#15191e] transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    </>
  );
}

// ─── Explorer Panel ──────────────────────────────────────────────────────────

function ExplorerPanel({ filter, onFilterChange, search, onSearchChange, onSelectNode }: {
  filter: GraphFilter;
  onFilterChange: (f: GraphFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);

  const nodesMap = useGraphStore((s) => s.nodes);
  const edgesMap = useGraphStore((s) => s.edges);

  const people = useMemo(() => {
    const result: GraphNode[] = [];
    for (const [, node] of nodesMap) {
      if (node.kind === 'person') result.push(node);
    }
    return result.filter((p) => !search || p.label.toLowerCase().includes(search.toLowerCase()));
  }, [nodesMap, search]);

  const teams = useMemo(() => {
    const result: GraphNode[] = [];
    for (const [, node] of nodesMap) {
      if (node.kind === 'team') result.push(node);
    }
    return result.filter((t) => !search || t.label.toLowerCase().includes(search.toLowerCase()));
  }, [nodesMap, search]);

  const getPersonSkills = (personId: string): string[] => {
    const skills: string[] = [];
    for (const [, edge] of edgesMap) {
      if (edge.kind === 'has_skill' && edge.from === personId) {
        const skillNode = nodesMap.get(edge.to);
        if (skillNode) skills.push(skillNode.label);
      }
    }
    return skills;
  };

  return (
    <div
      className="absolute top-4 left-4 md:left-6 z-20 w-[200px] rounded-xl border overflow-hidden
        bg-white/95 backdrop-blur-md border-gray-200 shadow-sm
        dark:bg-[#0d1116]/95 dark:border-[#202832] dark:shadow-none"
    >
      {/* Header: EXPLORE / Graph */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-[#202832]">
        <span className="text-[10px] font-bold uppercase tracking-[1.2px] text-gray-500 dark:text-[#68717d]">
          Explore
        </span>
        <span className="text-[10px] font-semibold text-[#12c7e5]">
          Graph
        </span>
      </div>

      {/* Filter buttons (People / Teams / Skills) — toggle graph visibility */}
      <div className="grid grid-cols-3 gap-1 p-1.5 border-b border-gray-100 dark:border-[#202832]">
        <button
          onClick={() => onFilterChange({ ...filter, showPersons: !filter.showPersons })}
          className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors
            ${filter.showPersons
              ? 'bg-[#12c7e5]/10 text-[#12c7e5]'
              : 'text-gray-400 dark:text-[#68717d] hover:bg-gray-100 dark:hover:bg-[#15191e]'
            }`}
        >
          People
        </button>
        <button
          onClick={() => onFilterChange({ ...filter, showTeams: !filter.showTeams })}
          className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors
            ${filter.showTeams
              ? 'bg-[#12c7e5]/10 text-[#12c7e5]'
              : 'text-gray-400 dark:text-[#68717d] hover:bg-gray-100 dark:hover:bg-[#15191e]'
            }`}
        >
          Teams
        </button>
        <button
          onClick={() => onFilterChange({ ...filter, showSkills: !filter.showSkills })}
          className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors
            ${filter.showSkills
              ? 'bg-[#12c7e5]/10 text-[#12c7e5]'
              : 'text-gray-400 dark:text-[#68717d] hover:bg-gray-100 dark:hover:bg-[#15191e]'
            }`}
        >
          Skills
        </button>
      </div>

      {/* Search input */}
      <div className="px-2 py-2 border-b border-gray-100 dark:border-[#202832]">
        <div className="flex items-center gap-1.5 px-2 h-7 rounded-lg border border-gray-200 dark:border-[#202832] bg-gray-50 dark:bg-[#0d1116]">
          <svg className="w-3 h-3 text-gray-400 dark:text-[#68717d] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-[10px] text-[#111318] dark:text-[#f4f6f8] placeholder:text-gray-400 dark:placeholder:text-[#68717d] outline-none"
          />
        </div>
      </div>

      {/* People drawer */}
      <div>
        <button
          onClick={() => setPeopleOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold
            text-[#111318] dark:text-[#f4f6f8]
            hover:bg-gray-50 dark:hover:bg-[#15191e] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-[#6d7aa3]" />
            People
            <span className="text-[9px] text-gray-400 dark:text-[#68717d] font-normal">
              {people.length}
            </span>
          </span>
          <ChevronIcon open={peopleOpen} />
        </button>

        {peopleOpen && (
          <div className="max-h-[280px] overflow-y-auto px-1.5 pb-2 border-t border-gray-50 dark:border-[#202832]">
            {people.length === 0 ? (
              <div className="px-2 py-3 text-[10px] text-gray-400 dark:text-[#68717d] text-center">
                {search ? 'No matches' : 'No people yet'}
              </div>
            ) : (
              people.map((person) => {
                const skills = getPersonSkills(person.id);
                return (
                  <button
                    key={person.id}
                    onClick={() => onSelectNode(person.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                      hover:bg-gray-100 dark:hover:bg-[#15191e] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full border flex items-center justify-center text-[8px] font-bold shrink-0
                      bg-gray-50 border-gray-200 text-gray-500
                      dark:bg-[#15191e] dark:border-[#202832] dark:text-[#9da6b1]">
                      {getInitials(person.label)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium text-[#111318] dark:text-[#f4f6f8] truncate">
                        {person.label}
                      </div>
                      {skills.length > 0 && (
                        <div className="text-[9px] text-gray-400 dark:text-[#68717d] truncate">
                          {skills.slice(0, 2).join(' · ')}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Teams drawer */}
      <div className="border-t border-gray-100 dark:border-[#202832]">
        <button
          onClick={() => setTeamsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold
            text-[#111318] dark:text-[#f4f6f8]
            hover:bg-gray-50 dark:hover:bg-[#15191e] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-[#2dd4bf]" />
            Teams
            <span className="text-[9px] text-gray-400 dark:text-[#68717d] font-normal">
              {teams.length}
            </span>
          </span>
          <ChevronIcon open={teamsOpen} />
        </button>

        {teamsOpen && (
          <div className="max-h-[280px] overflow-y-auto px-1.5 pb-2 border-t border-gray-50 dark:border-[#202832]">
            {teams.length === 0 ? (
              <div className="px-2 py-3 text-[10px] text-gray-400 dark:text-[#68717d] text-center">
                {search ? 'No matches' : 'No teams yet'}
              </div>
            ) : (
              teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => onSelectNode(team.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left
                    hover:bg-gray-100 dark:hover:bg-[#15191e] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full border flex items-center justify-center text-[8px] font-bold shrink-0
                    bg-[#2dd4bf]/10 border-[#2dd4bf]/30 text-[#2dd4bf]">
                    {getInitials(team.label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-[#111318] dark:text-[#f4f6f8] truncate">
                      {team.label}
                    </div>
                    <div className="text-[9px] text-gray-400 dark:text-[#68717d]">
                      {team.status ?? 'recruiting'}
                    </div>
                  </div>
                </button>
              ))
            )}
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

function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  html.classList.toggle('dark');
  localStorage.setItem('nodo-theme', isDark ? 'light' : 'dark');
}

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark'),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function NodoLogo() {
  return (
    <svg
      className="h-6 w-6 text-[#12c7e5]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="12" cy="18" r="2.3" />
      <path d="M8 7.2l7.7 0M7.2 8l3.7 7.5M16.8 8l-3.7 7.5" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 text-gray-400 dark:text-[#68717d] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
