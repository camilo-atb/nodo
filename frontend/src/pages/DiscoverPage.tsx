import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useEventStore, type NodoEvent, type EventType } from '@/stores/eventStore';
import { EventCard } from '@/components/discover/EventCard';
import { CreateEventModal } from '@/components/discover/CreateEventModal';
import { Button } from '@/components/base/Button';
import { Spinner } from '@/components/base/Spinner';

const MOCK_EVENTS: NodoEvent[] = [
  {
    id: 'mock-1',
    name: 'Realtime AI Hackathon',
    description: 'Build AI-powered realtime tools in 48 hours. Teams of 2-4, prizes for top 3.',
    type: 'hackathon',
    tags: ['AI', 'Open Source'],
    startsAt: '2026-08-08T09:00:00Z',
    endsAt: '2026-08-10T18:00:00Z',
    status: 'active',
    participantCount: 42,
  },
  {
    id: 'mock-2',
    name: 'Health AI Platform',
    description: 'Open source platform for AI-assisted triage in rural clinics. Looking for contributors.',
    type: 'project',
    tags: ['AI', 'Healthcare', 'Open Source'],
    startsAt: '2026-08-01T00:00:00Z',
    endsAt: '2026-12-31T23:59:00Z',
    status: 'active',
    participantCount: 12,
  },
  {
    id: 'mock-3',
    name: 'Developer Tools Hackathon',
    description: 'Build the next great developer tool. CLI, IDE extensions, code generators — anything goes.',
    type: 'hackathon',
    tags: ['Developer Tools', 'Web'],
    startsAt: '2026-08-15T08:00:00Z',
    endsAt: '2026-08-17T23:59:00Z',
    status: 'active',
    participantCount: 65,
  },
];

const FILTER_TYPES: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'project', label: 'Projects' },
];

export function DiscoverPage() {
  const { events, setEvents } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await apiFetch<NodoEvent[]>('/v1/events');
        setEvents(data);
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
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-7 h-7 text-violet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="6" r="2.3" />
            <circle cx="18" cy="6" r="2.3" />
            <circle cx="12" cy="18" r="2.3" />
            <path d="M8 7.2l7.7 0M7.2 8l3.7 7.5M16.8 8l-3.7 7.5" />
          </svg>
          <span className="text-lg font-bold text-white">Nodo</span>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create</Button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-1">Discover</h1>
        <p className="text-muted text-sm mb-6">
          Find projects and opportunities to build with the right people.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search opportunities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-panel border border-border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:border-violet/50 mb-4"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTER_TYPES.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                typeFilter === f.value
                  ? 'bg-violet/20 text-violet border border-violet/30'
                  : 'bg-panel border border-border text-muted hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Event list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
            {filtered.length === 0 && (
              <p className="text-muted text-sm text-center py-8">
                No opportunities match your filters.
              </p>
            )}
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
