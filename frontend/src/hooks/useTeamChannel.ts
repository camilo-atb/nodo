/**
 * Hook that subscribes to the team channel for realtime application notifications.
 * Only active when the user has a team.
 */

import { useEffect } from 'react';
import { useChannel } from '@portalsdk/react';
import { useTeamStore } from '@/stores/teamStore';
import { teamChannel } from '@nodo/contracts';
import type { ApplicationDTO } from '@nodo/contracts';

interface TeamEventContent {
  type?: string;
  payload?: {
    application?: ApplicationDTO;
  };
  [key: string]: unknown;
}

export function useTeamChannel(teamId: string | null) {
  const { status } = useChannel<TeamEventContent>({
    channelId: teamId ? teamChannel(teamId) : '__noop__',
    history: teamId ? 10 : 0,
    enabled: !!teamId,
    onMessage: (msg) => {
      if (!teamId) return;
      const content = (msg as unknown as { content?: TeamEventContent }).content;
      if (!content) return;

      if (content.type === 'application.created' && content.payload?.application) {
        useTeamStore.getState().addApplication(content.payload.application);
      }
    },
  });

  // Log connection for debugging
  useEffect(() => {
    if (teamId && status === 'ready') {
      console.log(`[Nodo] Team channel connected: ${teamChannel(teamId)}`);
    }
  }, [teamId, status]);

  return { status };
}
