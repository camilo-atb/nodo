import { useState } from 'react';
import { PeopleList } from '@/components/marketplace/PeopleList';
import { TeamsList } from '@/components/marketplace/TeamsList';

type MarketplaceTab = 'people' | 'teams' | 'ideas' | 'feed';

export function MarketplacePanel() {
  const [tab, setTab] = useState<MarketplaceTab>('people');

  const tabs: { value: MarketplaceTab; label: string }[] = [
    { value: 'people', label: 'People' },
    { value: 'teams', label: 'Teams' },
    { value: 'ideas', label: 'Ideas' },
    { value: 'feed', label: 'Feed' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              tab === t.value
                ? 'bg-violet/15 text-violet'
                : 'text-muted hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === 'people' && <PeopleList />}
        {tab === 'teams' && <TeamsList />}
        {tab === 'ideas' && (
          <div className="flex items-center justify-center h-32 text-muted text-xs">
            Ideas — coming soon
          </div>
        )}
        {tab === 'feed' && (
          <div className="flex items-center justify-center h-32 text-muted text-xs">
            Feed — coming soon
          </div>
        )}
      </div>
    </div>
  );
}
