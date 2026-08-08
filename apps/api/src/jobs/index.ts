import type { Db } from '../db/client.js';
import type { EventPublisher } from '../portal/event-publisher.js';
import type { PortalPublisher } from '../portal/publisher.js';
import { drainOutbox, INTERVAL_MS as DRAIN_INTERVAL_MS } from './drain-outbox.js';
import {
  expireDueChallenges,
  INITIAL_DELAY_MS as CHALLENGE_DELAY_MS,
  INTERVAL_MS as CHALLENGE_INTERVAL_MS,
} from './expire-challenges.js';
import { expireDueSuggestions, INTERVAL_MS as EXPIRE_INTERVAL_MS } from './expire-suggestions.js';

export type JobHandles = { stop: () => void };

/** Arranca los tres jobs de docs/07 y docs/12 y devuelve cómo detenerlos (para tests y para un apagado limpio). */
export const startJobs = (db: Db, publisher: EventPublisher, portal: PortalPublisher): JobHandles => {
  const expireTimer = setInterval(() => {
    expireDueSuggestions(db, publisher).catch((error: unknown) => {
      console.error('[jobs] fallo caducando sugerencias', error);
    });
  }, EXPIRE_INTERVAL_MS);

  // Guardarraíl 8 de docs/12: sin esto, un reto que nadie avanza se queda
  // colgado para siempre — que es el precio de no tener temporizadores.
  let challengeTimer: ReturnType<typeof setInterval> | undefined;
  const challengeStart = setTimeout(() => {
    challengeTimer = setInterval(() => {
      expireDueChallenges(db, publisher).catch((error: unknown) => {
        console.error('[jobs] fallo cerrando retos abandonados', error);
      });
    }, CHALLENGE_INTERVAL_MS);
    challengeTimer.unref();
  }, CHALLENGE_DELAY_MS);
  challengeStart.unref();

  const drainTimer = setInterval(() => {
    drainOutbox(db, portal).catch((error: unknown) => {
      console.error('[jobs] fallo drenando outbox', error);
    });
  }, DRAIN_INTERVAL_MS);

  // No deben mantener el proceso vivo por sí solos.
  expireTimer.unref();
  drainTimer.unref();

  return {
    stop: () => {
      clearInterval(expireTimer);
      clearTimeout(challengeStart);
      if (challengeTimer) clearInterval(challengeTimer);
      clearInterval(drainTimer);
    },
  };
};

export { drainOutbox, expireDueChallenges, expireDueSuggestions };
