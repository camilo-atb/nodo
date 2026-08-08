import { useState } from 'react';
import { PeopleList } from '@/components/marketplace/PeopleList';
import { TeamsList } from '@/components/marketplace/TeamsList';
import { ActivityFeed } from '@/components/marketplace/ActivityFeed';
import { useEventStore, getExperienceMode } from '@/stores/eventStore';

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

  const mode = currentEvent ? getExperienceMode(currentEvent.type) : 'competition';
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
        {activeTab === 'ideas' && (
          <div className="flex items-center justify-center h-32 text-muted text-xs">
            Ideas — coming soon
          </div>
        )}

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
