import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PortalProvider } from '@portalsdk/react';
import { portal, fetchPortalToken } from '@/lib/portal';
import { useSessionStore } from '@/stores/sessionStore';
import { LandingPage } from '@/pages/LandingPage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { EventPage } from '@/pages/EventPage';
import { TeamPage } from '@/pages/TeamPage';
import { ChallengePage } from '@/pages/ChallengePage';
import { BoardPage } from '@/pages/BoardPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { ProfilePage } from '@/pages/ProfilePage';
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireSession />}>
            <Route path="/event/:eventId/profile/:personId" element={<ProfilePage />} />
            <Route path="/event/:eventId/team/:teamId" element={<TeamPage />} />
            <Route path="/event/:eventId/team/:teamId/board" element={<BoardPage />} />
            <Route path="/event/:eventId/challenge/:challengeId" element={<ChallengePage />} />
            <Route path="/event/:eventId/*" element={<EventPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PortalProvider>
  );
}
