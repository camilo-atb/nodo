import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isFromAgent, verifyHmac } from './webhook.js';

describe('verifyHmac — orden obligatorio de docs/05', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ id: 'evt_1', type: 'team.updated' });
  const sign = (raw: string) => createHmac('sha256', secret).update(raw).digest('hex');

  it('acepta una firma válida', () => {
    expect(verifyHmac(body, sign(body), secret)).toBe(true);
  });

  it('rechaza una firma incorrecta', () => {
    expect(verifyHmac(body, sign('otro body'), secret)).toBe(false);
  });

  it('rechaza cuando falta el header', () => {
    expect(verifyHmac(body, undefined, secret)).toBe(false);
  });

  it('rechaza una firma de otro largo sin lanzar', () => {
    expect(verifyHmac(body, 'abc', secret)).toBe(false);
  });
});

describe('isFromAgent — guardarraíl anti-bucle de ADR-004', () => {
  it('detecta al matchmaker', () => {
    expect(isFromAgent({ data: { senderId: 'agent:matchmaker' } })).toBe(true);
  });

  /**
   * La razón de comparar por prefijo y no por id exacto (docs/12): mientras el
   * filtro decía `=== 'agent:matchmaker'`, el segundo agente lo atravesaba y
   * el webhook reprocesaba sus propias publicaciones. Es el riesgo que docs/07
   * marca como *fatal*.
   */
  it('detecta también al quizmaster', () => {
    expect(isFromAgent({ data: { senderId: 'agent:quizmaster' } })).toBe(true);
  });

  it('detecta a cualquier agente futuro', () => {
    expect(isFromAgent({ data: { senderId: 'agent:loquesea' } })).toBe(true);
  });

  it('deja pasar eventos de otro origen', () => {
    expect(isFromAgent({ data: { senderId: 'per_camilo' } })).toBe(false);
  });

  it('no confunde a una persona cuyo id empieza por "agent"', () => {
    expect(isFromAgent({ data: { senderId: 'per_agentina' } })).toBe(false);
  });

  it('deja pasar un evento sin data', () => {
    expect(isFromAgent({})).toBe(false);
  });
});
