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
 */
export async function fetchPortalToken(): Promise<string> {
  const sessionToken = useSessionStore.getState().sessionToken;
  if (!sessionToken) {
    throw new Error('No session token available');
  }

  const res = await fetch(`${API_URL}/v1/portal/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Portal token request failed: ${res.status}`);
  }

  const { token } = await res.json();
  return token;
}
