import { MarketplacePanel } from '@/components/layout/MarketplacePanel';
import { GraphPanel } from '@/components/graph/GraphPanel';
import { ConnectionBanner } from '@/components/layout/ConnectionBanner';

export function MainLayout() {
  return (
    <>
      <ConnectionBanner />
      <div className="flex-1 grid grid-cols-[390px_1fr] overflow-hidden">
        {/* Left: Marketplace */}
        <aside className="border-r border-border overflow-y-auto">
          <MarketplacePanel />
        </aside>

        {/* Right: Graph */}
        <main className="relative w-full h-full">
          <GraphPanel />
        </main>
      </div>
    </>
  );
}
