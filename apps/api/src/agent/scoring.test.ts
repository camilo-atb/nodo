import { describe, expect, it } from 'vitest';
import { rank, scoreAnswer } from './scoring.js';

describe('scoreAnswer — puntuación del reto (docs/12)', () => {
  const base = { questionStartedAt: 1_000_000, durationSec: 20 };

  it('una respuesta incorrecta no puntúa por rápida que sea', () => {
    expect(scoreAnswer({ ...base, correct: false, receivedAt: 1_000_001 })).toBe(0);
  });

  it('acertar al instante vale el máximo', () => {
    expect(scoreAnswer({ ...base, correct: true, receivedAt: 1_000_000 })).toBe(1000);
  });

  /**
   * El suelo de 500 es lo que hace que acertar pese el doble que la velocidad.
   * Sin él, contestar rápido y mal competiría con contestar bien y despacio.
   */
  it('acertar justo en la bocina sigue valiendo la mitad', () => {
    expect(scoreAnswer({ ...base, correct: true, receivedAt: 1_020_000 })).toBe(500);
  });

  it('a mitad de plazo vale 750', () => {
    expect(scoreAnswer({ ...base, correct: true, receivedAt: 1_010_000 })).toBe(750);
  });

  /**
   * La ruta ya devuelve `ANSWER_TOO_LATE`, pero la fórmula no puede depender
   * de que alguien más haya comprobado el plazo antes que ella.
   */
  it('fuera de plazo no puntúa aunque sea correcta', () => {
    expect(scoreAnswer({ ...base, correct: true, receivedAt: 1_020_001 })).toBe(0);
  });

  it('un reloj hacia atrás no da más del máximo', () => {
    expect(scoreAnswer({ ...base, correct: true, receivedAt: 999_000 })).toBe(1000);
  });
});

describe('rank — leaderboard', () => {
  const e = (personId: string, score: number, answeredCount = 0) => ({
    personId,
    score,
    answeredCount,
  });

  it('ordena de mayor a menor puntaje', () => {
    const r = rank([e('per_a', 100), e('per_b', 300), e('per_c', 200)]);
    expect(r.map((x) => x.personId)).toEqual(['per_b', 'per_c', 'per_a']);
  });

  it('asigna posiciones desde 1', () => {
    expect(rank([e('per_a', 10), e('per_b', 20)]).map((x) => x.position)).toEqual([1, 2]);
  });

  /** Sin desempate estable, dos recargas mostrarían órdenes distintos. */
  it('desempata por respuestas contestadas y luego por id', () => {
    const r = rank([e('per_z', 100, 1), e('per_a', 100, 1), e('per_m', 100, 3)]);
    expect(r.map((x) => x.personId)).toEqual(['per_m', 'per_a', 'per_z']);
  });

  it('no muta la lista original', () => {
    const original = [e('per_a', 10), e('per_b', 20)];
    rank(original);
    expect(original[0]!.personId).toBe('per_a');
  });
});
