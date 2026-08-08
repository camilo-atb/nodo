import { findChallenge, findExpired, leaderboard, setStatus } from '../db/challenges-repo.js';
import type { Db } from '../db/client.js';
import { challengeEnded } from '../domain/envelopes.js';
import type { EventPublisher } from '../portal/event-publisher.js';

/** Mismo intervalo que el barrido de sugerencias: cinco minutos (docs/12). */
export const INTERVAL_MS = 5 * 60_000;

/**
 * Guardarraíl 8 (docs/12): cierra los retos que nadie avanzó.
 *
 * Es la contrapartida de que el plazo sea un dato y no un temporizador
 * (ADR-012): como nada programa el avance, un reto cuyo líder se desconecta se
 * quedaría en `question` para siempre. Este barrido lo termina y publica el
 * ranking parcial, que es el resultado correcto — quien abandonó conserva su
 * puntaje acumulado y no se penaliza a nadie.
 */
export const expireDueChallenges = async (db: Db, publisher: EventPublisher): Promise<number> => {
  const due = await findExpired(db, new Date());

  for (const id of due) {
    const row = await findChallenge(db, id);
    if (!row) continue;

    await setStatus(db, id, 'ended', { endedAt: new Date() });
    await publisher.publishChallenge(row.teamId, id, challengeEnded(await leaderboard(db, id)));
  }

  return due.length;
};
