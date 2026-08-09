import {
  CreateEventRequest,
  EventKind,
  type EventDTO,
  type EventSubscriptionResponse,
  type EventsResponse,
} from '@nodo/contracts';
import {
  createEvent,
  findEvent,
  isSubscribedToEvent,
  listEvents,
  subscribeToEvent,
} from '../../db/events-repo.js';
import { getPersonSkills, loadPersonDTO } from '../../db/people-repo.js';
import { triggerPersonSeeksTeam } from '../../agent/triggers.js';
import { errors } from '../../domain/errors.js';
import { personUpserted } from '../../domain/envelopes.js';
import { nodoEventId } from '../../domain/ids.js';
import type { AppContext } from '../context.js';
import { requireAuth } from '../middleware/auth.js';
import { createRouter } from '../types.js';

/**
 * Contenedor de ADR-013.
 *
 * No publica a Portal ni encola al matchmaker: un `Event` no es un nodo del
 * grafo, así que crearlo no produce ningún parche que aplicar. Es la razón de
 * que estas rutas no sigan la secuencia `commit → publish` de docs/05 — no
 * tienen nada que publicar.
 */
export const eventsRoutes = (ctx: AppContext) => {
  const router = createRouter();

  /** El catálogo es público; el grafo interno de cada Event no lo es. */
  router.get('/v1/events', async (c) => {
    const raw = c.req.query('kind');
    const kind = raw === undefined ? undefined : EventKind.safeParse(raw);
    if (kind && !kind.success) throw errors.validation(kind.error.issues);

    const body: EventsResponse = { events: await listEvents(ctx.db, kind?.data) };
    return c.json(body);
  });

  router.get('/v1/events/:id', async (c) => {
    const found = await findEvent(ctx.db, c.req.param('id'));
    if (!found) throw errors.notFound('El evento no existe.');
    return c.json(found satisfies EventDTO);
  });

  router.get('/v1/events/:id/subscription', requireAuth(ctx), async (c) => {
    const eventId = c.req.param('id');
    if (!(await findEvent(ctx.db, eventId))) throw errors.notFound('El evento no existe.');
    const subscribed = await isSubscribedToEvent(ctx.db, eventId, c.get('auth').personId);
    return c.json({ subscribed } satisfies EventSubscriptionResponse);
  });

  router.post('/v1/events/:id/subscription', requireAuth(ctx), async (c) => {
    const eventId = c.req.param('id');
    if (!(await findEvent(ctx.db, eventId))) throw errors.notFound('El evento no existe.');

    const personId = c.get('auth').personId;
    const created = await subscribeToEvent(ctx.db, eventId, personId);
    if (created) {
      const person = (await loadPersonDTO(ctx.db, personId))!;
      await ctx.publisher.publishEvent(
        eventId,
        personUpserted(person, await getPersonSkills(ctx.db, personId)),
      );
      triggerPersonSeeksTeam(ctx.db, ctx.matchmaker, ctx.scheduler, personId, 'event.subscribed');
    }
    return c.json({ subscribed: true } satisfies EventSubscriptionResponse, created ? 201 : 200);
  });

  router.post('/v1/events', requireAuth(ctx), async (c) => {
    const parsed = CreateEventRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) throw errors.validation(parsed.error.issues);
    const input = parsed.data;

    const id = nodoEventId();
    await createEvent(ctx.db, {
      id,
      name: input.name,
      description: input.description ?? null,
      kind: input.kind,
      tags: input.tags,
      // Un `project` no tiene fechas; un `hackathon` sí. Por eso son nulables.
      startsAt: input.startsAt == null ? null : new Date(input.startsAt),
      endsAt: input.endsAt == null ? null : new Date(input.endsAt),
    });

    const created = (await findEvent(ctx.db, id))!;
    return c.json(created satisfies EventDTO, 201);
  });

  return router;
};
