# Guía de revisión — Scaffold Fase 0

> Este archivo NO se sube al repo. Bórralo cuando termines de revisar.

---

## ¿Qué se desarrolló?

### Lo que SÍ está implementado (funcional):

| Qué | Archivo | Nivel |
|---|---|---|
| Proyecto Vite funcional | `frontend/` completo | Corre con `pnpm dev` |
| TypeScript strict + path aliases | `tsconfig.json`, `vite.config.ts` | Compila sin errores |
| Tailwind con paleta del diseño | `tailwind.config.ts` | Colores del proposal |
| 5 Zustand stores | `src/stores/*.ts` | Lógica real (graphStore con applyPatch, sessionStore con localStorage) |
| Componentes base | `src/components/base/` | 8 componentes con Tailwind, listos para usar |
| Guard de sesión | `src/routes/guards/RequireSession.tsx` | Funcional |
| Utils (pipes) | `src/utils/` | formatRelativeTime y graphStyles implementados |
| @nodo/contracts | `packages/contracts/` | Tipos placeholder, importables |
| Vitest + setup | `vitest.config.ts` + test placeholder | Tests corren |

### Lo que es solo PLACEHOLDER (estructura sin lógica):

| Qué | Archivo |
|---|---|
| Hooks de Portal | `src/hooks/usePortalChannel.ts`, `useTeamChannel.ts` |
| Hook del grafo visual | `src/hooks/useGraphData.ts` |
| Selectores | `src/hooks/useGraphSelectors.ts` |
| Carpetas de componentes de dominio | `components/graph/`, `marketplace/`, etc. (solo .gitkeep) |
| Pages | `src/pages/` (vacío) |
| lib/portal.ts | Comentado — espera al SDK real |
| lib/api.ts | Estructura lista, pero import dinámico del store |

### ¿Qué veo si corro el proyecto?

Una pantalla negra centrada con el texto **"Nodo"** en violeta. Eso es todo visualmente — el valor está en la infraestructura, no en la UI todavía.

---

## Cómo revisarlo

### 1. Correr el proyecto (30 seg)

```bash
cd frontend
pnpm dev
```

Abre http://localhost:5173 → deberías ver "Nodo" en violeta sobre fondo oscuro.

### 2. Verificar que compila (10 seg)

```bash
cd frontend
npx tsc --noEmit
```

Debe dar 0 errores.

### 3. Correr tests (10 seg)

```bash
cd frontend
pnpm test
```

1 test pasa.

### 4. Revisar la lógica real — stores (5 min)

Los stores son lo más importante que se escribió. Revisalos en este orden:

1. **`src/stores/sessionStore.ts`** — el más simple. Persistencia en localStorage.
2. **`src/stores/graphStore.ts`** — el core. Lee `applyPatch`: shallow merge, upsert, delete + orphan cleanup.
3. **`src/stores/presenceStore.ts`** — manejo de detailed vs aggregate.
4. **`src/stores/feedStore.ts`** — trivial (array con cap de 100).
5. **`src/stores/teamStore.ts`** — CRUD de applications.

**Pregunta clave al revisar graphStore:** ¿el `applyPatch` hace lo que describe el doc `02-state-model.md`?

### 5. Revisar los componentes base (3 min)

Abre `src/components/base/` — son componentes tontos (sin lógica de dominio). Fíjate en:

- ¿Los estilos coinciden con la paleta del `nodo-proposal.html`?
- ¿El Modal usa `<dialog>` nativo (accesibilidad)?
- ¿El ErrorBoundary es class component (requerido por React)?

### 6. Revisar utils (2 min)

- `src/utils/graphStyles.ts` — ¿los colores y formas corresponden al proposal?
- `src/utils/formatRelativeTime.ts` — usa `Intl.RelativeTimeFormat`, locale `es`.

### 7. Verificar la estructura de carpetas (1 min)

Compara con `docs-frontend/07-architecture.md` → la estructura debe coincidir 1:1.

### 8. Revisar @nodo/contracts (2 min)

`packages/contracts/src/index.ts` — ¿los tipos tienen sentido según la documentación? Esto es temporal; cuando el backend publique los suyos, se reemplazan.

---

## Qué NO revisar ahora

- Los `.gitkeep` — son solo para que Git trackee carpetas vacías
- `lib/api.ts` — tiene un import dinámico feo que se arreglará en T-012
- `lib/portal.ts` — está comentado, se activa en T-013

---

## Siguiente paso después de aprobar

Pasamos a **Fase 1 (Stores)** en la rama `feat/stores`:
- T-004 ya está parcialmente cubierto (graphStore tiene applyPatch)
- Falta T-005 (tests del store) y T-006/T-007 (selector activeSuggestions)

O si prefieres avanzar visualmente, podemos saltar a **Fase 3** (layout + routing) para ver algo en pantalla.
