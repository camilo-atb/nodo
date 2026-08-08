import { MAX_MEMBERS_IN_ENVELOPE, type PersonRef, type TeamDTO } from '@nodo/contracts';
import { describe, expect, it } from 'vitest';
import { forEnvelope } from './mappers.js';

/**
 * ADR-014: `max_size` perdió su tope, así que `members` puede desbordar el
 * límite de 2KB por mensaje de Portal. Si lo desborda, Portal **rechaza la
 * publicación** y el evento se pierde en silencio: el grafo del cliente queda
 * desincronizado sin que nada falle de forma visible.
 */
describe('forEnvelope — recorte de members (ADR-014)', () => {
  const person = (n: number): PersonRef => ({
    id: `per_${String(n).padStart(3, '0')}`,
    handle: `persona${n}`,
    displayName: `Persona ${n}`,
  });

  const team = (memberCount: number): TeamDTO => {
    const lead = person(0);
    const members = [lead, ...Array.from({ length: memberCount - 1 }, (_, i) => person(i + 1))];
    return {
      id: 'tm_test',
      name: 'Health AI',
      pitch: null,
      status: 'recruiting',
      lead,
      members,
      memberCount: members.length,
      needs: [],
      ideaId: null,
      maxSize: 40,
      createdAt: 0,
    };
  };

  it('deja intacto un equipo que ya cabe', () => {
    const small = team(4);
    expect(forEnvelope(small)).toBe(small);
  });

  it('recorta a MAX_MEMBERS_IN_ENVELOPE cuando no cabe', () => {
    expect(forEnvelope(team(40)).members).toHaveLength(MAX_MEMBERS_IN_ENVELOPE);
  });

  it('conserva al líder el primero tras el recorte', () => {
    const big = team(40);
    expect(forEnvelope(big).members[0]).toEqual(big.lead);
  });

  /** `members.length` deja de ser el censo; `memberCount` sigue siéndolo. */
  it('no toca memberCount: es la verdad', () => {
    expect(forEnvelope(team(40)).memberCount).toBe(40);
  });

  it('no duplica al líder si ya venía dentro de la lista', () => {
    const cut = forEnvelope(team(40));
    const leadOccurrences = cut.members.filter((m) => m.id === cut.lead.id);
    expect(leadOccurrences).toHaveLength(1);
  });
});
