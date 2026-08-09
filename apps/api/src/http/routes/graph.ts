import type { GraphSnapshot } from '@nodo/contracts';
import { EventId } from '@nodo/contracts';
import { getGraphSnapshot, getEventWatermark } from '../../db/graph-repo.js';
import { isSubscribedToEvent } from '../../db/events-repo.js';
import { errors } from '../../domain/errors.js';
import type { AppContext } from '../context.js';
import { requireAuth } from '../middleware/auth.js';
import { createRouter } from '../types.js';

/**
 * `GET /v1/graph?eventId=...`. Privado para suscriptores del Event (ADR-017).
 *
 * El orden importa (ADR-009): la marca de agua se lee **antes** que el
 * grafo. El peor caso al revés sería un sobre publicado entre ambas lecturas
 * que el cliente descarta por `seq` y el snapshot tampoco trae.
 */
export const graphRoutes = (ctx: AppContext) => {
  const router = createRouter();

  router.get('/v1/graph', requireAuth(ctx), async (c) => {
    const parsedEventId = EventId.safeParse(c.req.query('eventId'));
    if (!parsedEventId.success) throw errors.validation(parsedEventId.error.issues);
    const eventId = parsedEventId.data;
    if (!(await isSubscribedToEvent(ctx.db, eventId, c.get('auth').personId))) {
      throw errors.forbidden('Debes suscribirte al evento para ver su grafo.');
    }

    const seq = await getEventWatermark(ctx.db, eventId);
    const { nodes, edges } = await getGraphSnapshot(ctx.db, eventId);
    const body: GraphSnapshot = { nodes, edges, seq };
    return c.json(body);
  });

  return router;
};
