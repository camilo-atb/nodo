# 08 — Configuración y despliegue

## Provisión de Portal

```bash
npm install -g @portalsdk/cli
portal login
portal projects create nodo
```

`portal projects create` imprime el id del entorno. Con él se emiten las claves:

```bash
portal keys create --env <ENV_ID> --type public   # pk_…  la consume el frontend
portal keys create --env <ENV_ID> --type secret   # sk_…  no sale del servidor
```

Los navegadores en orígenes no registrados quedan bloqueados, así que cada origen desde el que se sirva la aplicación debe declararse:

```bash
portal origins add https://nodo.app       --env <ENV_ID>
portal origins add http://localhost:5173  --env <ENV_ID>
```

La configuración de canales, `authz` y `notify` ([03](03-portal-contract.md)) se publica aparte del backend:

```bash
npm install -D @portalsdk/config
portal deploy
```

`portal origins add` y `portal deploy` forman parte del procedimiento de despliegue: el primero tras cualquier cambio de dominio, el segundo tras cualquier cambio en `portal.config.ts`.

## Variables de entorno

```bash
# Portal
PORTAL_SECRET=sk_...
PORTAL_PUBLIC_KEY=pk_...
PORTAL_ENV_ID=env_...
PORTAL_WEBHOOK_SECRET=whsec_...
PORTAL_API_URL=https://api.useportal.co

# Base de datos
DATABASE_URL=postgresql://...        # pooler en modo transaction

# Identidad
JWT_PRIVATE_KEY=...                  # RS256, PEM en una línea
JWT_ISSUER=https://api.nodo.app

# LLM — intercambiable, ver ADR-007
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL=llama-3.3-70b-versatile

# Agente — ajustables sin desplegar
MATCH_SCORE_THRESHOLD=3
MATCH_DEBOUNCE_MS=800
MATCH_MAX_PER_PERSON=3
MATCH_MAX_PER_TEAM=5
SUGGESTION_TTL_MINUTES=120
LLM_TIMEOUT_MS=4000

# Tablero (11) — ajustables sin desplegar
BOARD_MAX_NOTES=200
BOARD_NOTE_MAX_CHARS=500

# Reto (12) — ajustables sin desplegar
CHALLENGE_QUESTION_COUNT=5
CHALLENGE_DURATION_SEC=20
CHALLENGE_MAX_PARTICIPANTS=50
CHALLENGE_TTL_MINUTES=60

# App
SESSION_SECRET=...
PORT=8080
NODE_ENV=production
```

Los parámetros de los tres agentes y de las dos superficies de tiempo real son variables de entorno de forma deliberada: gobiernan comportamiento observable y se ajustan sin redesplegar código.

**`quizmaster` no añade credenciales.** Usa la misma `LLM_API_KEY`, `LLM_BASE_URL` y `LLM_MODEL` que el matchmaker: es un actor del dominio, no una cuenta ([12](12-live-quiz.md#quizmaster-es-un-actor-no-una-credencial)). Los cinco secretos del proyecto siguen siendo cinco.

Dos topes no son gustos y no conviene subirlos sin releer el porqué: `CHALLENGE_MAX_PARTICIPANTS` y el recorte de `members` a 8 en los sobres salen ambos del límite de **2KB por mensaje** de Portal ([ADR-014](01-decisions.md#adr-014--members-en-el-sobre-es-una-vista-acotada-membercount-es-la-verdad)). Pasado ese punto, Portal rechaza la publicación y el evento se pierde.

`.env.example` se versiona con las claves vacías. `.env` no se versiona nunca.

## Desarrollo local

Sin acceso a la Supabase real, `pnpm db:local` levanta una Postgres real (no un mock) compilada a WASM (`@electric-sql/pglite`), expuesta por el protocolo de cable de Postgres. Deja esa terminal abierta — el proceso es el servidor — y usa otra para el resto:

```bash
pnpm install
cp .env.example .env
pnpm db:local              # terminal aparte; deja corriendo. Imprime el DATABASE_URL a copiar en .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Los datos de `pglite` persisten en `apps/api/.pglite-data/` (no versionado). No sustituye a Supabase en producción — `DATABASE_URL` en Railway apunta al pooler real. Un `kill -9` a mitad de escritura puede corromper los datos locales (`RuntimeError: Aborted()` al reiniciar); no vale la pena depurarlo, se mueve `.pglite-data/` a un lado y se repite `db:migrate` + `db:seed`.

Verificación en cadena:

```bash
curl localhost:8080/health
curl localhost:8080/v1/skills | jq '.skills | length'
curl localhost:8080/.well-known/jwks.json | jq '.keys[0].kid'
curl localhost:8080/v1/graph | jq '{n:(.nodes|length), e:(.edges|length)}'
```

## Datos de semilla

`pnpm db:seed` carga dos conjuntos con propósitos distintos.

**Vocabulario** — obligatorio en cualquier entorno. Las 75 skills canónicas y sus 141 alias ([04](04-data-model.md)). Sin él no hay matching.

**Espacio abierto por defecto** — obligatorio en cualquier entorno. Un `Event` de tipo `project` al que caen los equipos e ideas creados sin `eventId`. Es lo que permite que la clave foránea sea obligatoria sin romper a ningún cliente ([ADR-013](01-decisions.md#adr-013--space-es-el-contenedor-obligatorio-con-un-espacio-abierto-por-defecto)). Sin él, `POST /v1/teams` falla.

**Conjunto representativo** — solo en desarrollo. Personas, equipos e ideas con skills y necesidades distribuidas por categoría, en estados variados (`recruiting`, `almost_full`, `building`, `complete`). Sirve para desarrollar y calibrar el matchmaker contra datos con forma realista.

El conjunto representativo **no incluye sugerencias**: las genera el agente al arrancar, que es el comportamiento que interesa observar.

## Despliegue

```bash
railway up
railway variables set PORTAL_SECRET=... LLM_API_KEY=... JWT_PRIVATE_KEY=...
```

El backend no sostiene conexiones persistentes ([07](07-architecture.md)), así que un redespliegue no desconecta clientes: las sesiones en vivo las mantiene Portal. Solo se pierden las publicaciones en vuelo, que quedan registradas en `outbox` para reintento.

## Diagnóstico

| Síntoma | Causa probable | Resolución |
|---|---|---|
| El cliente no conecta a Portal | origen no registrado | `portal origins add` |
| `TokenExpiredError` | el token se pasó como string en lugar de callback | corregir la integración del cliente |
| Portal rechaza el JWT | `kid` distinto entre cabecera y JWKS, o `issuer` no coincide | alinear ambos con `portal.config.ts` |
| El agente no emite sugerencias | umbral demasiado alto | reducir `MATCH_SCORE_THRESHOLD` |
| Volumen excesivo de sugerencias | umbral demasiado bajo o topes desactivados | subir el umbral, revisar los guardarraíles de [06](06-matchmaker-agent.md) |
| El feed se repite en bucle | el receptor de webhook no filtra al agente | aplicar el filtro `senderId` de [ADR-004](01-decisions.md#adr-004--el-matchmaker-se-dispara-en-proceso) |
| El grafo se desincroniza | huecos de `seq` sin detectar | el snapshot reconcilia; revisar la detección de huecos en el cliente |
| Rationale genérico | falta la validación posterior al LLM | activar el fallback de plantilla |
| El LLM falla, va lento o devuelve 429 | proveedor caído o límite de tasa | cambiar `LLM_BASE_URL`, `LLM_API_KEY` y `LLM_MODEL` |
| `LLM_MODEL` devuelve 404 | el proveedor retiró ese identificador | fijar un identificador vigente |

**Proveedores de LLM compatibles** sin cambios de código, por ser compatibles con la API de OpenAI: OpenAI, Together, Fireworks, OpenRouter, Cerebras, DeepSeek y Ollama local. Mantener uno configurado como alternativa deja verificado el procedimiento de conmutación.

`GET /v1/_debug/matchmaker` devuelve las últimas 50 evaluaciones del agente con sus latencias y candidatos, que es la vía para responder por qué una sugerencia se emitió o no.
