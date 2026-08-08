import { CHALLENGE_BASE_POINTS } from '@nodo/contracts';

/**
 * Puntuación del reto (docs/12). Determinista, sin LLM, igual que el score del
 * matchmaker: la respuesta a «por qué este puntaje» es una fórmula.
 *
 * ```
 * puntos = 0                              si es incorrecta, o llega tarde
 * puntos = 500 + 500 · (1 − t / T)        si es correcta
 * ```
 *
 * Acertar pesa el doble que la velocidad: una respuesta correcta justo en la
 * bocina vale 500, y el máximo es 1000. Sin ese suelo, contestar rápido y mal
 * competiría con contestar bien y despacio.
 *
 * `t` se mide **al recibir en el servidor**, nunca con datos del cliente
 * (ADR-012). Los ~100 ms de latencia de red son ruido en una pregunta de 20 s
 * y afectan a todos por igual.
 */
export const scoreAnswer = (input: {
  correct: boolean;
  /** Epoch ms en que el servidor abrió la pregunta. */
  questionStartedAt: number;
  /** Epoch ms en que el servidor recibió la respuesta. */
  receivedAt: number;
  durationSec: number;
}): number => {
  if (!input.correct) return 0;

  const total = input.durationSec * 1000;
  const elapsed = input.receivedAt - input.questionStartedAt;

  // Fuera de plazo no puntúa. La ruta ya lo rechaza con ANSWER_TOO_LATE, pero
  // la fórmula no puede depender de que alguien más haya comprobado antes.
  if (elapsed > total) return 0;

  // Acotado por los dos lados. Por abajo lo pide el plazo; por arriba, un
  // `receivedAt` anterior al inicio —reloj hacia atrás, o un ajuste de NTP a
  // mitad de pregunta— daría un factor mayor que 1 y más de 1000 puntos.
  const remaining = Math.min(1, Math.max(0, 1 - elapsed / total));
  return CHALLENGE_BASE_POINTS + Math.round(CHALLENGE_BASE_POINTS * remaining);
};

/**
 * Ordena por puntaje y asigna posiciones 1..n.
 *
 * El desempate es por `answeredCount` y luego por id: sin un criterio estable,
 * dos recargas de la misma pantalla podrían mostrar órdenes distintos con los
 * mismos datos.
 */
export const rank = <T extends { personId: string; score: number; answeredCount: number }>(
  entries: T[],
): Array<T & { position: number }> =>
  [...entries]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.answeredCount - a.answeredCount ||
        a.personId.localeCompare(b.personId),
    )
    .map((e, i) => ({ ...e, position: i + 1 }));
