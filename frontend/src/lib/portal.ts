/**
 * Configuración del SDK de Portal.
 * La instancia se crea UNA VEZ a nivel de módulo (síncrono y pasivo).
 * El token se obtiene bajo demanda vía callback async.
 */

import { Portal } from '@portalsdk/core';
import { useSessionStore } from '@/stores/sessionStore';
import { API_URL } from './constants';

export const portal = new Portal({
  apiKey: import.meta.env.VITE_PORTAL_PUBLIC_KEY,
});

/**
 * Callback async que el SDK invoca en connect, reconnect y token expiry.
 * Llama al backend para obtener un JWT fresco de 15 min.
 * Reintenta hasta 3 veces si el backend da 500 (Portal cloud timeout).
 */
export async function fetchPortalToken(): Promise<string> {
  const sessionToken = useSessionStore.getState().sessionToken;
  if (!sessionToken) {
    throw new Error('No session token available');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Wait before retry: 1s, then 2s
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }

    try {
      const res = await fetch(`${API_URL}/v1/portal/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (res.ok) {
        const { token } = await res.json();
        return token;
      }

      lastError = new Error(`Portal token request failed: ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Network error');
    }
  }

  throw lastError ?? new Error('Portal token failed after retries');
}
