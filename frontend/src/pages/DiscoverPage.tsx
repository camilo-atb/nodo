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
    name: 'AI Builders Hackathon',
    description: 'Build AI-powered tools in 48 hours. Teams of 2-5, prizes for top 3.',
    type: 'hackathon',
    startsAt: '2025-02-01T09:00:00Z',
    endsAt: '2025-02-03T18:00:00Z',
    status: 'open',
    participantCount: 42,
  },
  {
    id: 'mock-2',
    name: 'Open Source Sprint',
    description: 'Contribute to popular open-source projects. Mentors available for newcomers.',
    type: 'open_source',
    startsAt: '2025-02-10T10:00:00Z',
    endsAt: '2025-02-10T20:00:00Z',
    status: 'open',
    participantCount: 28,
  },
  {
    id: 'mock-3',
    name: 'LLM Challenge: Agents',
    description: 'Design and deploy autonomous agents using LLMs. Solo or team entries welcome.',
    type: 'ai_challenge',
    startsAt: '2025-02-15T08:00:00Z',
    endsAt: '2025-02-17T23:59:00Z',
    status: 'open',
    participantCount: 65,
  },
];

const FILTER_TYPES: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'open_source', label: 'Open Source' },
  { value: 'ai_challenge', label: 'AI' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'recruiting', label: 'Recruiting' },
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
            <circle cx="12" cy="12" r="3" />
            <circle cx="5" cy="6" r="2" />
            <circle cx="19" cy="6" r="2" />
            <circle cx="5" cy="18" r="2" />
            <circle cx="19" cy="18" r="2" />
            <line x1="7" y1="7" x2="10" y2="10" />
            <line x1="17" y1="7" x2="14" y2="10" />
            <line x1="7" y1="17" x2="10" y2="14" />
            <line x1="17" y1="17" x2="14" y2="14" />
          </svg>
          <span className="text-lg font-bold text-white">Nodo</span>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create Event</Button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-1">Discover Events</h1>
        <p className="text-muted text-sm mb-6">Find hackathons, challenges, and collaboration opportunities.</p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search events..."
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
                No events match your filters.
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
