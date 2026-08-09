import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { useEventStore, type NodoEvent, type EventType } from '@/stores/eventStore';
import { CreateEventModal } from '@/components/discover/CreateEventModal';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_EVENTS: NodoEvent[] = [
  {
    id: 'mock-1',
    name: 'Realtime AI Hackathon',
    description:
      'Build AI-powered realtime tools in 48 hours. Teams of 2-4, prizes for top 3.',
    kind: 'hackathon',
    tags: ['AI', 'Open Source', 'WebSockets'],
    startsAt: new Date('2026-08-08T09:00:00Z').getTime(),
    endsAt: new Date('2026-08-10T18:00:00Z').getTime(),
    participantCount: 128,
    createdAt: Date.now(),
  },
  {
    id: 'mock-2',
    name: 'nodo/health-ai-platform',
    description:
      'Open source platform for AI-assisted triage in rural clinics. Looking for contributors with ML and React experience.',
    kind: 'project',
    tags: ['AI', 'Healthcare', 'TypeScript', 'Open Source'],
    startsAt: null,
    endsAt: null,
    participantCount: 12,
    createdAt: Date.now(),
  },
  {
    id: 'mock-3',
    name: 'Developer Tools Hackathon',
    description:
      'Build the next great developer tool. CLI, IDE extensions, code generators — anything goes.',
    kind: 'hackathon',
    tags: ['Developer Tools', 'Web', 'Go'],
    startsAt: new Date('2026-08-15T08:00:00Z').getTime(),
    endsAt: new Date('2026-08-17T23:59:00Z').getTime(),
    participantCount: 65,
    createdAt: Date.now(),
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterValue = EventType | 'all';

interface FilterDef {
  value: FilterValue;
  label: string;
  dot?: string; // color for the dot indicator
}

const FILTERS: FilterDef[] = [
  { value: 'all', label: 'All' },
  { value: 'hackathon', label: 'Hackathons', dot: '#12c7e5' },
  { value: 'project', label: 'Projects', dot: '#21d69a' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonth(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function formatDay(epochMs: number): string {
  return new Date(epochMs).getDate().toString();
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-gray-400 dark:text-[#68717d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({
  onCreateClick,
  isDark,
}: {
  onCreateClick: () => void;
  isDark: boolean;
}) {
  return (
    <header
      className="sticky top-0 z-50 h-[72px] flex items-center justify-between px-6 md:px-9 border-b backdrop-blur-xl
        bg-white/90 border-gray-200
        dark:bg-[#0a0c0f]/90 dark:border-[#20262d]"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <NodoLogo />
        <span className="text-xl font-bold tracking-tight text-[#111318] dark:text-[#f4f6f8]">
          Nodo
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex items-center justify-center w-10 h-10 rounded-xl border transition-colors duration-200
            bg-white border-gray-200 text-[#111318] hover:bg-gray-50
            dark:bg-[#101317] dark:border-[#20262d] dark:text-[#f4f6f8] dark:hover:bg-[#15191e]"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Create button */}
        <button
          onClick={onCreateClick}
          className="h-10 px-4 rounded-xl bg-[#12c7e5] text-[#001a20] text-sm font-bold transition-colors duration-200 hover:bg-[#0fb8d4]"
        >
          Create
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="mb-10">
      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#12c7e5]" />
        <span className="text-[11px] font-bold tracking-[1.5px] text-[#12c7e5]">
          DISCOVER
        </span>
      </div>

      {/* Title */}
      <h1 className="text-[42px] md:text-[60px] font-bold tracking-[-2px] leading-[1.02] max-w-[700px]">
        <span className="text-[#111318] dark:text-[#f4f6f8]">Find something</span>
        <br />
        <span className="text-gray-500 dark:text-[#9da6b1]">worth building.</span>
      </h1>

      {/* Description */}
      <p className="mt-5 text-sm md:text-base text-gray-500 dark:text-[#9da6b1] max-w-xl">
        Discover hackathons, open-source projects and people to build with.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Search + Filters
// ---------------------------------------------------------------------------

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="relative flex items-center h-14 rounded-xl border transition-colors duration-200
        bg-white border-gray-200 focus-within:border-[#12c7e5] focus-within:shadow-[0_0_0_4px_rgba(18,199,229,.10)]
        dark:bg-[#101317] dark:border-[#20262d] dark:focus-within:border-[#12c7e5]"
    >
      <div className="pl-4 flex items-center">
        <SearchIcon />
      </div>
      <input
        type="text"
        placeholder="Search opportunities..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-full bg-transparent px-3 text-sm text-[#111318] dark:text-[#f4f6f8] placeholder:text-gray-400 dark:placeholder:text-[#68717d] outline-none"
      />
      <div className="pr-4 hidden sm:flex items-center">
        <kbd className="px-1.5 py-0.5 text-[10px] font-semibold border rounded-md text-gray-400 border-gray-200 dark:text-[#68717d] dark:border-[#20262d]">
          ⌘K
        </kbd>
      </div>
    </div>
  );
}

function FilterBar({
  active,
  onChange,
  counts,
}: {
  active: FilterValue;
  onChange: (v: FilterValue) => void;
  counts: Record<FilterValue, number>;
}) {
  return (
    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mb-1">
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={`shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-all duration-200
              ${
                isActive
                  ? 'bg-[#111318] text-white border-[#111318] dark:bg-white dark:text-[#07090c] dark:border-white'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 dark:bg-[#101317] dark:text-[#9da6b1] dark:border-[#20262d] dark:hover:border-[#252b32]'
              }`}
          >
            {f.dot && (
              <span
                className="inline-block w-[6px] h-[6px] rounded-full"
                style={{ backgroundColor: f.dot }}
              />
            )}
            <span>{f.label}</span>
            <span className={`${isActive ? 'opacity-70' : 'opacity-50'}`}>
              {counts[f.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function HackathonCard({ event }: { event: NodoEvent }) {
  const navigate = useNavigate();

  return (
    <article
      onClick={() => navigate(`/event/${event.id}`)}
      className="group cursor-pointer min-h-[350px] flex flex-col rounded-2xl border p-5 transition-all duration-200
        bg-white border-gray-200 shadow-sm hover:-translate-y-1 hover:shadow-xl
        dark:bg-[#101317] dark:border-[#20262d] dark:hover:border-[#252b32]"
    >
      {/* Top: badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#12c7e5]/10 text-[9px] font-extrabold tracking-[0.8px] text-[#12c7e5] uppercase">
          ✦ HACKATHON
        </span>
        {event.participantCount > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#21d69a]">
            <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#21d69a]" />
            {event.participantCount} joined
          </span>
        )}
      </div>

      {/* Date block + title area */}
      <div className="flex gap-4 mb-3">
        {event.startsAt && (
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg border border-gray-200 dark:border-[#20262d] shrink-0">
            <span className="text-[9px] font-bold tracking-[0.5px] text-[#12c7e5] uppercase">
              {formatMonth(event.startsAt)}
            </span>
            <span className="text-[22px] font-bold leading-none text-[#111318] dark:text-[#f4f6f8]">
              {formatDay(event.startsAt)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold tracking-tight text-[#111318] dark:text-[#f4f6f8] truncate">
            {event.name}
          </h3>
          <p className="mt-1 text-[13px] text-gray-500 dark:text-[#9da6b1] line-clamp-2">
            {event.description}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-[#68717d]">
        <span className="flex items-center gap-1">
          <GlobeIcon />
          Online
        </span>
        <span className="flex items-center gap-1">
          <PersonIcon />
          {event.participantCount} participants
        </span>
      </div>

      {/* Tags */}
      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-1 rounded-md border
                bg-gray-50 border-gray-200 text-gray-500
                dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#9da6b1]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-[#20262d] flex items-center justify-between">
        {/* Participant info */}
        <div className="flex items-center">
          {event.participantCount > 0 ? (
            <>
              <div className="flex -space-x-1">
                {Array.from({ length: Math.min(event.participantCount, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-[#101317] bg-gray-200 dark:bg-[#20262d]"
                  />
                ))}
              </div>
              {event.participantCount > 3 && (
                <span className="ml-2 text-[11px] text-gray-400 dark:text-[#68717d]">
                  +{event.participantCount - 3} joined
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-gray-400 dark:text-[#68717d]">
              Be the first to join
            </span>
          )}
        </div>

        {/* Arrow button */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200
            border-gray-200 text-gray-400 group-hover:bg-[#111318] group-hover:text-white group-hover:border-[#111318]
            dark:border-[#20262d] dark:text-[#68717d] dark:group-hover:bg-white dark:group-hover:text-[#07090c] dark:group-hover:border-white"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </article>
  );
}

function ProjectCard({ event }: { event: NodoEvent }) {
  const navigate = useNavigate();

  return (
    <article
      onClick={() => navigate(`/event/${event.id}`)}
      className="group cursor-pointer min-h-[350px] flex flex-col rounded-2xl border p-5 transition-all duration-200
        bg-white border-gray-200 shadow-sm hover:-translate-y-1 hover:shadow-xl
        dark:bg-[#101317] dark:border-[#20262d] dark:hover:border-[#252b32]"
    >
      {/* Top: badge */}
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-[#21d69a]/10 text-[9px] font-extrabold tracking-[0.8px] text-[#21d69a] uppercase">
          ◉ PROJECT
        </span>
        {event.participantCount > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#21d69a]">
            <span className="inline-block w-[6px] h-[6px] rounded-full bg-[#21d69a]" />
            {event.participantCount} contributors
          </span>
        )}
      </div>

      {/* Project identifier */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#15191e] border border-gray-200 dark:border-[#20262d]">
          <svg className="w-4 h-4 text-[#21d69a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-base font-bold font-mono text-[#111318] dark:text-[#f4f6f8] truncate">
          {event.name}
        </span>
      </div>

      {/* Description */}
      <p className="text-[13px] text-gray-500 dark:text-[#9da6b1] line-clamp-2 mb-3">
        {event.description}
      </p>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-[#68717d]">
        <span className="flex items-center gap-1">
          <PersonIcon />
          {event.participantCount} contributors
        </span>
      </div>

      {/* Tags */}
      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-1 rounded-md border
                bg-gray-50 border-gray-200 text-gray-500
                dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#9da6b1]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-[#20262d] flex items-center justify-between">
        {/* Contributor info */}
        <div className="flex items-center">
          {event.participantCount > 0 ? (
            <>
              <div className="flex -space-x-1">
                {Array.from({ length: Math.min(event.participantCount, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-[#101317] bg-gray-200 dark:bg-[#20262d]"
                  />
                ))}
              </div>
              {event.participantCount > 3 && (
                <span className="ml-2 text-[11px] text-gray-400 dark:text-[#68717d]">
                  +{event.participantCount - 3} contributors
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-gray-400 dark:text-[#68717d]">
              Looking for contributors
            </span>
          )}
        </div>

        {/* Arrow button */}
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200
            border-gray-200 text-gray-400 group-hover:bg-[#111318] group-hover:text-white group-hover:border-[#111318]
            dark:border-[#20262d] dark:text-[#68717d] dark:group-hover:bg-white dark:group-hover:text-[#07090c] dark:group-hover:border-white"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DiscoverPage() {
  const { events, setEvents } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterValue>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isDark = useIsDark();

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await apiFetch<{ events: NodoEvent[] }>('/v1/events');
        setEvents(data.events);
      } catch {
        setEvents(MOCK_EVENTS);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [setEvents]);

  const filtered = events.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || e.kind === typeFilter;
    return matchesSearch && matchesType;
  });

  const getCounts = useCallback((): Record<FilterValue, number> => {
    const searchFiltered = events.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()),
    );
    return {
      all: searchFiltered.length,
      hackathon: searchFiltered.filter((e) => e.kind === 'hackathon').length,
      project: searchFiltered.filter((e) => e.kind === 'project').length,
    };
  }, [events, search]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#111318] dark:bg-[#07090c] dark:text-[#f4f6f8]">
      <Header onCreateClick={() => setShowCreateModal(true)} isDark={isDark} />

      <main className="mx-auto w-[calc(100%-28px)] max-w-[1120px] md:w-[calc(100%-40px)] pt-12 md:pt-[72px] pb-24">
        <Hero />

        {/* Search + Filters */}
        <section className="mb-8">
          <SearchBar value={search} onChange={setSearch} />
          <FilterBar active={typeFilter} onChange={setTypeFilter} counts={getCounts()} />
        </section>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-[#111318] dark:text-[#f4f6f8]">
            Recommended for you
          </span>
          <span className="text-xs text-gray-400 dark:text-[#68717d]">
            {filtered.length} {filtered.length === 1 ? 'opportunity' : 'opportunities'}
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-h-[350px] rounded-2xl border animate-pulse
                  bg-gray-100 border-gray-200
                  dark:bg-[#101317] dark:border-[#20262d]"
              />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filtered.map((event) =>
              event.kind === 'hackathon' ? (
                <HackathonCard key={event.id} event={event} />
              ) : (
                <ProjectCard key={event.id} event={event} />
              ),
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#15191e] mb-4">
              <SearchIcon />
            </div>
            <p className="text-base font-bold text-[#111318] dark:text-[#f4f6f8] mb-1">
              No opportunities found
            </p>
            <p className="text-sm text-gray-500 dark:text-[#9da6b1]">
              Try another search or change the filters.
            </p>
          </div>
        )}
      </main>

      <CreateEventModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
