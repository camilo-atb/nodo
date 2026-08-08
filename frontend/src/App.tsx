import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PortalProvider } from '@portalsdk/react';
import { portal, fetchPortalToken } from '@/lib/portal';
import { useSessionStore } from '@/stores/sessionStore';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { EventPage } from '@/pages/EventPage';
import { TeamPage } from '@/pages/TeamPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { RequireSession } from '@/routes/guards/RequireSession';

export function App() {
  const sessionToken = useSessionStore((s) => s.sessionToken);

  return (
    <PortalProvider
      client={portal}
      token={sessionToken ? fetchPortalToken : undefined}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireSession />}>
            <Route path="/event/:eventId/*" element={<EventPage />} />
            <Route path="/event/:eventId/team/:teamId" element={<TeamPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PortalProvider>
  );
}
