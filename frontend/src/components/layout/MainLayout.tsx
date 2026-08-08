import { MarketplacePanel } from '@/components/layout/MarketplacePanel';
import { GraphPanel } from '@/components/graph/GraphPanel';

export function MainLayout() {
  return (
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
  );
}
