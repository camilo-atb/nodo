import { useState } from 'react';
import { usePresenceStore } from '@/stores/presenceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Avatar } from '@/components/base/Avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';

type Tab = 'marketplace' | 'graph' | 'activity';

export function Header() {
  const [activeTab, setActiveTab] = useState<Tab>('marketplace');
  const onlineCount = usePresenceStore((s) => s.count);
  const profile = useSessionStore((s) => s.profile);
  const name = profile?.name ?? 'User';

  const tabs: { value: Tab; label: string }[] = [
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'graph', label: 'Graph' },
    { value: 'activity', label: 'Activity' },
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 border-b border-border bg-bg/80 backdrop-blur-md">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <span className="text-sm font-bold text-white">Nodo</span>
      </div>

      {/* Center: Nav tabs */}
      <nav className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === tab.value
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right: Online counter, bell, avatar */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="w-2 h-2 bg-green rounded-full animate-pulse" />
          {onlineCount}
        </span>

        <NotificationBell unseenCount={0} />

        <Avatar name={name} size="sm" />
      </div>
    </header>
  );
}
