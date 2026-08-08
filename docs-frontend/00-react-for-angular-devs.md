# 00 — React para Angular devs: mapeo de patrones en Nodo

> Este documento mapea conceptos de Angular a su equivalente **concreto** en nuestro proyecto.
> No es un tutorial genérico — cada fila apunta al archivo/carpeta donde vive la implementación.

---

## Tabla de equivalencias

| Concepto Angular | Equivalente en Nodo (React) | Ubicación | Notas |
|---|---|---|---|
| **Service con estado** (singleton inyectable con `BehaviorSubject`) | Store de Zustand | `src/stores/*.ts` | Cada store es un singleton de módulo. Se consume con el hook exportado: `useGraphStore(selector)`. No hay providers ni inyección — el import ES la instancia. |
| **Service sin estado** (lógica pura, helpers, llamadas HTTP) | Función exportada en `lib/` | `src/lib/api.ts`, `src/lib/portal.ts`, `src/lib/constants.ts` | Equivale a un service `@Injectable({ providedIn: 'root' })` sin estado. Se importa directamente. |
| **HttpInterceptor** (agregar Bearer, manejar 401/429) | Wrapper de fetch en `lib/api.ts` | `src/lib/api.ts` | Una función `apiFetch` que agrega el token, parsea errores, y redirige en 401. Cumple exactamente el rol del interceptor: no se llama a `fetch` directo desde componentes. |
| **Guard (`CanActivate`)** | Componente wrapper de ruta | `src/routes/guards/RequireSession.tsx` | Un componente que verifica `sessionStore` y redirige a `/onboarding` si no hay sesión. Se usa envolviendo las rutas protegidas en React Router. |
| **Pipe** (transformación pura para la vista) | Función pura en `utils/` | `src/utils/formatRelativeTime.ts`, `src/utils/graphStyles.ts` | En Angular `{{ date \| relativeTime }}` → en React `{formatRelativeTime(date)}`. Sin magia, sin decoradores. |
| **Directive** (comportamiento reutilizable sobre un elemento) | Custom hook | `src/hooks/use*.ts` | Ej: un `useClickOutside(ref, callback)` o `useDebounce(value, ms)`. El hook encapsula el efecto; el componente lo consume. |
| **Module** (agrupación de componentes por dominio) | Subcarpeta en `components/` | `src/components/graph/`, `src/components/marketplace/`, `src/components/team/`, etc. | No hay `NgModule`. La carpeta agrupa por dominio y el barrel export (`index.ts`) es opcional. |
| **Dependency Injection** (providedIn, constructor injection) | Hooks de Zustand + React Context (PortalProvider) | Stores: import directo. Portal: `<PortalProvider>` en `App.tsx` | Zustand no necesita provider — el store es global por import. Portal sí usa un Context (`PortalProvider`) porque el SDK lo requiere. No hay DI container genérico. |
| **Resolver** (pre-fetch de datos antes de activar ruta) | Lógica en `AppBootstrap` + componente de página con loading state | `src/components/layout/AppBootstrap.tsx`, cada `Page` | No hay equivalente 1:1 de resolver. El bootstrap carga el snapshot inicial; cada página maneja su propio loading si necesita datos extra. |
| **RxJS Observable / BehaviorSubject** | Zustand subscribe + selector reactivo | `src/stores/*.ts` | `useGraphStore(state => state.nodes)` re-renderiza solo cuando `nodes` cambia. Para side-effects fuera de React: `graphStore.subscribe(listener)`. |
| **Environment files** (`environment.ts` / `environment.prod.ts`) | Variables de entorno Vite | `.env`, `.env.example` | Acceso vía `import.meta.env.VITE_*`. No hay build-time file switching — Vite inyecta las vars directamente. |

---

## Patrones clave: cómo pensar en React viniendo de Angular

### 1. No hay inyección — hay imports y hooks

En Angular, un componente declara `constructor(private graphService: GraphService)` y el framework resuelve la instancia.

En React/Nodo:

```tsx
// Equivalente: consumir el "servicio" de estado
import { useGraphStore } from '@/stores/graphStore';

function MyComponent() {
  const nodes = useGraphStore(state => state.nodes);
  // ...
}
```

El store ya es un singleton. No hay que registrarlo en ningún lado.

### 2. Los guards son componentes, no clases con `canActivate()`

```tsx
// src/routes/guards/RequireSession.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';

export function RequireSession() {
  const token = useSessionStore(state => state.sessionToken);
  if (!token) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

// En el router:
<Route element={<RequireSession />}>
  <Route path="/app" element={<AppPage />} />
  <Route path="/app/profile/:id" element={<ProfilePage />} />
  {/* ... rutas protegidas */}
</Route>
```

### 3. Los pipes son funciones — se llaman en el JSX

```tsx
// src/utils/formatRelativeTime.ts
export function formatRelativeTime(date: string | Date): string {
  // implementación...
}

// En un componente:
<span>{formatRelativeTime(activity.createdAt)}</span>
```

No hay pipe puro con caché automático. Si el cómputo es costoso, se envuelve en `useMemo`.

### 4. El interceptor es un wrapper, no un middleware registrado

```tsx
// src/lib/api.ts — extracto conceptual
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = sessionStore.getState().sessionToken;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (res.status === 401) { /* redirect a onboarding */ }
  if (res.status === 429) { /* toast de rate limit */ }
  if (!res.ok) throw new ApiError(res.status, await res.json());

  return res.json();
}
```

Todo componente que necesite hacer un request usa `apiFetch` — nunca `fetch` directo. Esa convención reemplaza al `HTTP_INTERCEPTORS` de Angular.

### 5. El equivalente de `OnDestroy` es el cleanup del `useEffect`

```tsx
useEffect(() => {
  const unsubscribe = graphStore.subscribe(listener);
  return () => unsubscribe(); // ← cleanup = ngOnDestroy
}, []);
```

---

## Mapeo visual: dónde buscar cada cosa

```
src/
├── lib/           ← Services sin estado (api, portal, constants)
├── stores/        ← Services con estado (BehaviorSubject → Zustand)
├── hooks/         ← Directives + lógica reutilizable
├── utils/         ← Pipes (funciones puras de transformación)
├── routes/
│   └── guards/    ← Guards (CanActivate → componente wrapper)
├── components/    ← Modules (agrupados por dominio en subcarpetas)
├── pages/         ← Routed components (equivalente a componentes de ruta lazy)
└── types/         ← Interfaces/types locales de UI
```

---

## Regla de oro

> Si en Angular lo harías como **service inyectable con estado** → va en `stores/`.
> Si es **lógica pura sin estado** → va en `lib/` (si es infra) o `utils/` (si es transformación de datos para la vista).
> Si es **comportamiento reutilizable que usa hooks de React** → va en `hooks/`.
> Si es **protección de ruta** → va en `routes/guards/`.
