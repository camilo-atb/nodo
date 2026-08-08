import { createHmac, timingSafeEqual } from 'node:crypto';

import { AGENT_SENDER_PREFIX } from '@nodo/contracts';

/**
 * HMAC-SHA256 del webhook de Portal, verificado **antes** de parsear el body
 * (docs/05). El orden importa: parsear un body no verificado abre la puerta a
 * procesar un evento falsificado antes de descartarlo.
 */
export const verifyHmac = (rawBody: string, signatureHeader: string | undefined, secret: string): boolean => {
  if (!signatureHeader) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);

  // Igual longitud es precondición de timingSafeEqual; una firma con largo
  // distinto ya es inválida y no hace falta comparar en tiempo constante.
  if (provided.length !== expectedBuf.length) return false;
  return timingSafeEqual(provided, expectedBuf);
};

/**
 * Guardarraíl anti-bucle de ADR-004: sin este filtro, el receptor de webhook
 * reprocesaría las propias publicaciones de un agente y se retroalimentaría.
 *
 * Compara **por prefijo, no por id exacto**. Comparar contra
 * `'agent:matchmaker'` dejaría pasar a `quizmaster` (docs/12), y el bucle del
 * agente es el riesgo que docs/07 marca como *fatal*.
 */
export const isFromAgent = (event: { data?: { senderId?: string } }): boolean =>
  event.data?.senderId?.startsWith(AGENT_SENDER_PREFIX) ?? false;
