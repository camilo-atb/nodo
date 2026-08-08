/**
 * Cliente HTTP tipado — cumple el rol de HttpInterceptor de Angular.
 * Toda llamada REST pasa por aquí: agrega Bearer token, maneja errores globales.
 */

const API_URL = import.meta.env.VITE_API_URL;

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
  // Import dinámico para evitar dependencias circulares
  const { useSessionStore } = await import('@/stores/sessionStore');
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
    // TODO: redirect a onboarding (T-052)
  }

  if (res.status === 429) {
    // TODO: toast de rate limit (T-052)
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.json());
  }

  return res.json();
}
