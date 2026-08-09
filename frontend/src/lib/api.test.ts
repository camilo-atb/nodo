import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';

describe('apiFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('acepta respuestas 204 sin intentar parsear JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 204,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(apiFetch('/v1/test', { method: 'POST' })).resolves.toBeUndefined();
  });
});
