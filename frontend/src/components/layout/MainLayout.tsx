import { MarketplacePanel } from '@/components/layout/MarketplacePanel';
import { GraphPanel } from '@/components/graph/GraphPanel';
import { ConnectionBanner } from '@/components/layout/ConnectionBanner';
import { usePortalChannel } from '@/hooks/usePortalChannel';

export function MainLayout() {
  /**
   * Montar este hook **es** la suscripción a `network-main`: el SDK de Portal
   * no tiene un `.subscribe()` aparte, la conexión se abre al montar
   * `useChannel` (docs-frontend/PORTAL-API-REAL). También dispara la carga
   * inicial del grafo.
   *
   * Estaba escrito pero no lo llamaba nadie, así que ni el tiempo real ni el
   * snapshot llegaban a ejecutarse: de ahí el «Connecting…» eterno y el grafo
   * vacío pese a tener datos en el API.
   */
  usePortalChannel();

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
