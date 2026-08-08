import { BrowserRouter } from 'react-router-dom';
import { PortalProvider } from '@portalsdk/react';
import { portal, fetchPortalToken } from '@/lib/portal';
import { useSessionStore } from '@/stores/sessionStore';

export function App() {
  const sessionToken = useSessionStore((s) => s.sessionToken);

  return (
    <PortalProvider
      client={portal}
      token={sessionToken ? fetchPortalToken : undefined}
    >
      <BrowserRouter>
        <div className="min-h-screen flex items-center justify-center">
          <h1 className="text-2xl font-bold text-violet">Nodo</h1>
        </div>
      </BrowserRouter>
    </PortalProvider>
  );
}
