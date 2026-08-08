import { useState } from 'react';
import { PeopleList } from '@/components/marketplace/PeopleList';
import { TeamsList } from '@/components/marketplace/TeamsList';
import { ActivityFeed } from '@/components/marketplace/ActivityFeed';
import { IdeasList } from '@/components/marketplace/IdeasList';
import { useEventStore, getExperienceMode } from '@/stores/eventStore';
import { apiFetch } from '@/lib/api';

type MarketplaceTab = 'people' | 'teams' | 'ideas' | 'feed' | 'contributors' | 'roles';

interface TabDef {
  value: MarketplaceTab;
  label: string;
}

const COMPETITION_TABS: TabDef[] = [
  { value: 'people', label: 'People' },
  { value: 'teams', label: 'Teams' },
  { value: 'ideas', label: 'Ideas' },
  { value: 'feed', label: 'Feed' },
];

const COLLABORATION_TABS: TabDef[] = [
  { value: 'contributors', label: 'Contributors' },
  { value: 'roles', label: 'Roles' },
  { value: 'feed', label: 'Feed' },
];

export function MarketplacePanel() {
  const currentEventId = useEventStore((s) => s.currentEventId);
  const events = useEventStore((s) => s.events);
  const currentEvent = events.find((e) => e.id === currentEventId);

  const mode = currentEvent ? getExperienceMode(currentEvent.kind) : 'competition';
  const tabs = mode === 'competition' ? COMPETITION_TABS : COLLABORATION_TABS;
  const defaultTab = mode === 'competition' ? 'people' : 'contributors';

  const [tab, setTab] = useState<MarketplaceTab>(defaultTab);

  // Reset tab if mode changes and current tab is invalid
  const validValues = tabs.map((t) => t.value);
  const activeTab = validValues.includes(tab) ? tab : defaultTab;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === t.value
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {/* Competition mode */}
        {activeTab === 'people' && <PeopleList />}
        {activeTab === 'teams' && <TeamsList />}
        {activeTab === 'ideas' && <IdeasTab />}

        {/* Collaboration mode */}
        {activeTab === 'contributors' && <PeopleList />}
        {activeTab === 'roles' && (
          <div className="flex items-center justify-center h-32 text-muted text-xs">
            Open Roles — coming soon
          </div>
        )}

        {/* Shared */}
        {activeTab === 'feed' && <ActivityFeed />}
      </div>
    </div>
  );
}

// ─── Inline Create Idea Form + Ideas List ────────────────────────────────────

function IdeasTab() {
  const [title, setTitle] = useState('');
  const [publishing, setPublishing] = useState(false);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    setPublishing(true);
    try {
      await apiFetch('/v1/ideas', {
        method: 'POST',
        body: JSON.stringify({ title: trimmed, summary: null }),
      });
      setTitle('');
    } catch (err) {
      console.error('[Nodo] Failed to create idea:', err);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Inline form */}
      <form onSubmit={handlePublish} className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your idea title..."
          className="flex-1 rounded-lg bg-panel-2 border border-border px-3 py-2 text-sm text-white placeholder:text-muted-2 focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={publishing || !title.trim()}
          className="px-4 py-2 rounded-lg font-semibold text-sm bg-accent text-white hover:bg-accent-2 transition-colors disabled:opacity-50"
        >
          {publishing ? '...' : 'Publish'}
        </button>
      </form>

      {/* Ideas list */}
      <IdeasList />
    </div>
  );
}
