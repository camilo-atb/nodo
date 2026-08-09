import { describe, expect, it } from 'vitest';
import type { MainEvent } from '@nodo/contracts';
import { FakePortalPublisher } from './fake-publisher.js';
import { EventPublisher, type OutboxStore, type WatermarkStore } from './event-publisher.js';

class InMemoryWatermarks implements WatermarkStore {
  seqByChannel = new Map<string, number>();
  async record(channel: string, seq: number): Promise<void> {
    this.seqByChannel.set(channel, seq);
  }
}

class InMemoryOutbox implements OutboxStore {
  queued: Array<{ channel: string; envelope: unknown }> = [];
  async enqueue(channel: string, envelope: unknown): Promise<void> {
    this.queued.push({ channel, envelope });
  }
}

const envelope = { type: 'team.updated', payload: {} } as unknown as MainEvent;

describe('EventPublisher — commit → publish (ADR-005)', () => {
  it('publica cada grafo en el canal y watermark de su Event', async () => {
    const portal = new FakePortalPublisher();
    const watermarks = new InMemoryWatermarks();
    const publisher = new EventPublisher(portal, watermarks, new InMemoryOutbox());

    await publisher.publishEvent('ev_hack', envelope);

    expect(portal.published[0]?.channel).toBe('event-ev_hack');
    expect(watermarks.seqByChannel.get('event-ev_hack')).toBe(1);
  });

  it('un sobre de equipo no toca la marca de agua', async () => {
    const portal = new FakePortalPublisher();
    const watermarks = new InMemoryWatermarks();
    const outbox = new InMemoryOutbox();
    const publisher = new EventPublisher(portal, watermarks, outbox);

    await publisher.publishTeam('tm_healthai', envelope as never);

    expect(portal.published[0]?.channel).toBe('team-tm_healthai');
    expect(watermarks.seqByChannel.size).toBe(0);
  });

  it('si Portal falla, encola en outbox y no lanza — el estado en Postgres ya es correcto', async () => {
    const portal = new FakePortalPublisher();
    portal.failNext = true;
    const watermarks = new InMemoryWatermarks();
    const outbox = new InMemoryOutbox();
    const publisher = new EventPublisher(portal, watermarks, outbox);

    await expect(publisher.publishEvent('ev_hack', envelope)).resolves.toBeUndefined();

    expect(outbox.queued).toHaveLength(1);
    expect(outbox.queued[0]?.channel).toBe('event-ev_hack');
    expect(watermarks.seqByChannel.size).toBe(0);
  });
});
