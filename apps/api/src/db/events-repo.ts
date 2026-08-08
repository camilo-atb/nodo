import type { EventDTO, EventKind } from '@nodo/contracts';
import { count, eq } from 'drizzle-orm';
import { events, teams } from './schema.js';
import type { Db } from './client.js';

/**
 * Contenedor de ADR-013. **No es un nodo del grafo**: es una dimensión de
 * filtro, así que este repositorio no toca `nodes` ni `edges`.
 */

const epoch = (value: Date | null): number | null => (value === null ? null : value.getTime());

const selectEvent = (db: Db) =>
  db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      kind: events.kind,
      tags: events.tags,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      createdAt: events.createdAt,
    })
    .from(events);

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  tags: string[];
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
};

/**
 * `participantCount` se cuenta al leer y no se guarda: una columna
 * desnormalizada exigiría mantenerla en cada alta y baja de equipo, y en ese
 * momento nadie está mirando este contador.
 */
const toEventDTO = (row: EventRow, participantCount: number): EventDTO => ({
  id: row.id,
  name: row.name,
  description: row.description,
  kind: row.kind as EventKind,
  tags: row.tags,
  startsAt: epoch(row.startsAt),
  endsAt: epoch(row.endsAt),
  participantCount,
  createdAt: row.createdAt.getTime(),
});

const countTeams = async (db: Db, eventId: string): Promise<number> => {
  const [row] = await db.select({ n: count() }).from(teams).where(eq(teams.eventId, eventId));
  return row?.n ?? 0;
};

export const listEvents = async (db: Db, kind?: EventKind): Promise<EventDTO[]> => {
  const rows = kind
    ? await selectEvent(db).where(eq(events.kind, kind))
    : await selectEvent(db);

  return Promise.all(rows.map(async (r) => toEventDTO(r, await countTeams(db, r.id))));
};

export const findEvent = async (db: Db, id: string): Promise<EventDTO | undefined> => {
  const [row] = await selectEvent(db).where(eq(events.id, id));
  if (!row) return undefined;
  return toEventDTO(row, await countTeams(db, id));
};

export type CreateEventInput = {
  id: string;
  name: string;
  description: string | null;
  kind: EventKind;
  tags: string[];
  startsAt: Date | null;
  endsAt: Date | null;
};

export const createEvent = async (db: Db, input: CreateEventInput): Promise<void> => {
  await db.insert(events).values(input);
};
