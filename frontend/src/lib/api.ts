/**
 * Cliente HTTP tipado — cumple el rol de HttpInterceptor.
 * Toda llamada REST pasa por aquí.
 */

import { useSessionStore } from '@/stores/sessionStore';
import { API_URL } from './constants';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API Error ${status}`);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = useSessionStore.getState().sessionToken;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (res.status === 401) {
    useSessionStore.getState().clearSession();
    window.location.href = '/onboarding';
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'UNKNOWN', message: res.statusText }));
    throw new ApiError(res.status, body);
  }

  return res.json();
}
