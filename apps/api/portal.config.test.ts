import { describe, expect, it } from 'vitest';
import config from './portal.config.js';

const channel = (id: string, key: string) => ({ id, key, mode: 'standard' as const });

describe('portal.config.ts — event-*', () => {
  const event = config.channels!['event-*']!;

  it('admite únicamente a una Person suscrita al Event del canal', () => {
    const allowed = event.authz!({
      claims: { userId: 'per_camilo', anon: false, events: ['ev_hack'] },
      channel: channel('event-ev_hack', 'event-*'),
    });
    const blocked = event.authz!({
      claims: { userId: 'per_camilo', anon: false, events: ['ev_other'] },
      channel: channel('event-ev_hack', 'event-*'),
    });

    expect(allowed).toMatchObject({ action: 'allow', capabilities: { publish: false } });
    expect(blocked).toMatchObject({ action: 'block' });
  });
});

describe('portal.config.ts — network-main', () => {
  const main = config.channels!['network-main']!;

  it('bloquea incluso a usuarios identificados porque es un canal legado global', () => {
    const result = main.authz!({
      claims: { userId: 'per_camilo', anon: false },
      channel: channel('network-main', 'network-main'),
    });
    expect(result).toMatchObject({ action: 'block' });
  });
});

describe('portal.config.ts — team-*', () => {
  const team = config.channels!['team-*']!;

  it('bloquea a quien no pertenece al equipo', () => {
    const result = team.authz!({
      claims: { userId: 'per_extraño', anon: false, teams: {} },
      channel: channel('team-tm_healthai', 'team-*'),
    });
    expect(result).toMatchObject({ action: 'block' });
  });

  it('admite a un miembro con isMember true', () => {
    const result = team.authz!({
      claims: { userId: 'per_laura', anon: false, teams: { tm_healthai: 'member' } },
      channel: channel('team-tm_healthai', 'team-*'),
    });
    expect(result).toMatchObject({ action: 'allow', capabilities: { isMember: true } });
  });

  it('admite a un solicitante con isMember false', () => {
    const result = team.authz!({
      claims: { userId: 'per_camilo', anon: false, teams: { tm_healthai: 'applicant' } },
      channel: channel('team-tm_healthai', 'team-*'),
    });
    expect(result).toMatchObject({ action: 'allow', capabilities: { isMember: false } });
  });

  const application = {
    id: 'app_1',
    person: { id: 'per_camilo', handle: 'camilo', displayName: 'Camilo' },
    teamId: 'tm_healthai',
    teamName: 'Health AI',
    leadId: 'per_laura',
    status: 'pending',
    message: null,
    createdAt: 0,
    resolvedAt: null,
  };

  it('notify de application.created avisa al líder', async () => {
    const descriptor = await team.notify!({
      message: {
        id: 'evt_3',
        type: 'application.created',
        content: { application },
        kind: 'text',
        timestamp: Date.now(),
        ephemeral: false,
      },
      sender: { id: 'per_camilo', anon: false, claims: {} },
    });
    expect(descriptor).toMatchObject({ to: ['per_laura'] });
  });

  it('notify de application.resolved (accepted) avisa al solicitante', async () => {
    const descriptor = await team.notify!({
      message: {
        id: 'evt_4',
        type: 'application.resolved',
        content: { application: { ...application, status: 'accepted' } },
        kind: 'text',
        timestamp: Date.now(),
        ephemeral: false,
      },
      sender: { id: 'per_laura', anon: false, claims: {} },
    });
    expect(descriptor).toMatchObject({ title: 'Te uniste a Health AI', to: ['per_camilo'] });
  });
});
