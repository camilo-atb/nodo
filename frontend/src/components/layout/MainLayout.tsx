import { useState } from 'react';
import { MarketplacePanel } from '@/components/layout/MarketplacePanel';
import { GraphPanel } from '@/components/graph/GraphPanel';
import { ConnectionBanner } from '@/components/layout/ConnectionBanner';
import { Header } from '@/components/layout/Header';
import { ActivityFeed } from '@/components/marketplace/ActivityFeed';
import { usePortalChannel } from '@/hooks/usePortalChannel';

export type MainTab = 'marketplace' | 'graph' | 'activity';

export function MainLayout({ eventId }: { eventId: string }) {
  const [activeTab, setActiveTab] = useState<MainTab>('marketplace');

  /**
   * Montar este hook **es** la suscripción a `event-{eventId}`: el SDK de Portal
   * no tiene un `.subscribe()` aparte, la conexión se abre al montar
   * `useChannel` (docs-frontend/PORTAL-API-REAL). También dispara la carga
   * inicial del grafo.
   */
  usePortalChannel(eventId);

  return (
    <>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <ConnectionBanner />

      {activeTab === 'marketplace' && (
        <div className="flex-1 grid grid-cols-[390px_1fr] overflow-hidden h-full">
          {/* Left: Marketplace */}
          <aside className="border-r border-border overflow-y-auto h-full pb-4">
            <MarketplacePanel />
          </aside>

          {/* Right: Graph */}
          <main className="relative w-full h-full overflow-hidden">
            <GraphPanel />
          </main>
        </div>
      )}

      {activeTab === 'graph' && (
        <main className="flex-1 relative w-full h-full overflow-hidden">
          <GraphPanel />
        </main>
      )}

      {activeTab === 'activity' && (
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-white mb-4">Activity</h2>
            <ActivityFeed />
          </div>
        </main>
      )}
    </>
  );
}
