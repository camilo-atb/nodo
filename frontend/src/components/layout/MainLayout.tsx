import { MarketplacePanel } from '@/components/layout/MarketplacePanel';

export function MainLayout() {
  return (
    <div className="flex-1 grid grid-cols-[390px_1fr] overflow-hidden">
      {/* Left: Marketplace */}
      <aside className="border-r border-border overflow-y-auto">
        <MarketplacePanel />
      </aside>

      {/* Right: Graph placeholder */}
      <main className="flex items-center justify-center text-muted">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-panel-2 border border-border flex items-center justify-center">
            <svg className="w-8 h-8 text-violet/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
          </div>
          <p className="text-sm font-medium">Graph</p>
          <p className="text-xs text-muted-2 mt-1">Network visualization coming soon</p>
        </div>
      </main>
    </div>
  );
}
