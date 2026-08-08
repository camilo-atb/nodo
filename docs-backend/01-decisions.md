# 01 — Decisiones de arquitectura (ADR)

## Stack

Todo lo que se usa, en un solo lugar. Si algo no está en esta tabla, no entra al proyecto.

| Capa | Tecnología | Detalle | ADR |
|---|---|---|---|
| Lenguaje | **TypeScript 5** | `strict: true` | [003](#adr-003--backend-en-typescript-con-hono) |
| Runtime | **Node 22** + pnpm | idéntico en local y en Railway | 003 |
| Framework HTTP | **Hono** | | 003 |
| Validación | **Zod** | entrada, salida y respuestas del LLM | |
| Firma de JWT | **`jose`** (npm) | firma RS256 y publicación del JWKS | [006](#adr-006--identidad-sin-contraseñas) |
| Base de datos | **PostgreSQL 16** (Supabase) | grafo en `nodes` / `edges` | [001](#adr-001--postgresql-con-el-grafo-modelado-en-nodes--edges) |
| Migraciones y tipos | **Drizzle** | consultas del grafo en SQL crudo | 001 |
| Tiempo real | **Portal** | `@portalsdk/cli`, `@portalsdk/config` | [005](#adr-005--postgres-es-la-fuente-de-verdad-portal-es-transporte) |
| LLM | **Groq** | vía SDK `openai` con `baseURL` | [007](#adr-007--capa-de-llm-intercambiable) |
| Cola del agente | **`p-queue`** (npm) | en memoria, concurrencia 2 | [004](#adr-004--el-matchmaker-se-dispara-en-proceso) |
| Deploy | **Railway** | | |
| Contrato compartido | **`@nodo/contracts`** | lo importa también el frontend | 003 |

**Fuera del alcance de estos documentos**, anotado aquí solo para centralizar: el frontend es **React + `@portalsdk/react`**, y consume `@nodo/contracts` y el canal definido en [03](03-portal-contract.md).

### Credenciales

Cuatro secretos. Ninguno se commitea; todos van en `.env` y en las variables de Railway ([08](08-operations.md)).

| Variable | Quién la usa | Nunca sale de |
|---|---|---|
| `PORTAL_SECRET` (`sk_`) | backend, para publicar | servidor |
| `PORTAL_WEBHOOK_SECRET` | backend, para verificar HMAC | servidor |
| `JWT_PRIVATE_KEY` | backend, para firmar el JWT de Portal | servidor |
| `LLM_API_KEY` | backend, para el agente | servidor |
| `DATABASE_URL` | backend | servidor |

Dos cosas son públicas por diseño y no son secretos: la clave publicable de Portal (`pk_`), que consume el frontend, y el JWKS en `/.well-known/jwks.json`, que contiene solo la clave pública de firma.

---

## Decisiones

Formato: decisión → por qué → consecuencias. Las decisiones marcadas **cerrada** no se reabren durante la implementación.

---

## ADR-001 — PostgreSQL con el grafo modelado en `nodes` / `edges`

**Estado:** cerrada

**Decisión.** PostgreSQL (Supabase). El grafo se modela de forma explícita en dos tablas: `nodes` y `edges`.

**Por qué.**
- La consulta central del producto (`team → skill → person`) es de **un salto**: un `JOIN` con `ORDER BY`. Con los índices de [04](04-data-model.md), milisegundos.
- El grafo de una red activa se mantiene en el orden de cientos de nodos y unos miles de aristas. `GET /v1/graph` son dos `SELECT` sin filtro y el cliente renderiza toda la profundidad en memoria.
- `nodes`/`edges` hace que agregar un tipo de arista sea una fila en un enum, y que el snapshot no necesite ensamblaje.

**Consecuencias.**
- El grafo es ciudadano de primera clase en el dominio, en la API y en la UI.
- Los invariantes se aplican con índices únicos parciales, no solo en código.
- El modelo es portable: exportar dos tablas si algún día cambia el motor.

**Revisar si** el matchmaking pasa a requerir traversal de 3+ saltos o algoritmos de grafo **calculados en servidor** (caminos, comunidades, centralidad).

---

## ADR-002 — Vocabulario canónico de skills

**Estado:** cerrada

**Decisión.** Los skills son un vocabulario cerrado (75 tags, 141 alias en el seed actual — [04](04-data-model.md)) con tabla de alias. El matching es intersección de conjuntos y el score es una fórmula ([06](06-matchmaker-agent.md)). El LLM se usa para **extraer** (texto libre → tags) y **explicar** (redactar el rationale).

**Por qué.**
- El score es determinista, reproducible y auditable: la respuesta a "por qué se emitió esta sugerencia" es una fórmula, no una inferencia opaca.
- El matching no depende de la disponibilidad ni de la calidad del LLM.
- Permite cambiar de modelo sin recalibrar el sistema ([007](#adr-007--capa-de-llm-intercambiable)).

**Consecuencias.**
- El vocabulario y sus alias son prerrequisito de despliegue: todo el matching depende de ellos.
- Los sinónimos fuera del vocabulario se pierden si la extracción falla; se mitiga con `skill_aliases`.

**Revisar si** aparecen muchos perfiles cuyos skills no mapean a ningún tag.

---

## ADR-003 — Backend en TypeScript con Hono

**Estado:** cerrada

**Decisión.** Hono sobre Node 22, TypeScript. Runtime único en local y en producción.

**Por qué.**
- El frontend es React/TypeScript. El paquete `@nodo/contracts` — sobres de mensaje, DTOs, tipos de grafo — lo importan backend y frontend, así que **el compilador verifica el contrato**. Con dos personas trabajando en paralelo, la integración se valida sola.
- `portal.config.ts` y `@portalsdk/config` son TypeScript: un solo lenguaje en todo el proyecto.
- Hono es mínimo y despliega directo en Railway.

**Consecuencias.**
- `@nodo/contracts` es prerrequisito de cualquier lógica de producto: se publica antes de escribir handlers.
- Un cambio de contrato rompe la compilación en ambos lados, que es el comportamiento buscado.

---

## ADR-004 — El MatchMaker se dispara en proceso

**Estado:** cerrada

**Decisión.** El agente se invoca en proceso tras cada escritura, con una cola en memoria y debounce de 800 ms. El receptor de webhook de Portal se implementa como camino secundario.

**Por qué.**
- Todos los eventos de dominio los publica el backend (los clientes escriben por REST), así que el backend ya conoce cada cambio en el instante en que ocurre.
- Menor latencia: la sugerencia aparece en el grafo en ~150 ms.
- Menos modos de fallo que depender de una entrega *at-least-once* con reintentos.

**Consecuencias.**
- El receptor de webhook **debe** descartar `senderId === 'agent:matchmaker'` como primera línea, o el agente se retroalimenta.
- Requiere `processed_events` para idempotencia en el camino de webhook.
- Un reinicio pierde la tanda de sugerencias en cola; la siguiente escritura la regenera.

---

## ADR-005 — Postgres es la fuente de verdad; Portal es transporte

**Estado:** cerrada

**Decisión.** El estado vive en Postgres. Portal notifica cambios. El cliente arranca con `GET /v1/graph` (snapshot + watermark `seq`) y aplica los deltas que llegan por el canal.

**Por qué.**
- El backfill de Portal es de 50 mensajes: insuficiente para reconstruir el grafo completo.
- Un único origen del estado elimina la ambigüedad de la escritura dual.

**Consecuencias.**
- Orden obligatorio: **commit → publish**. Publicar antes del commit anunciaría un estado que puede no existir.
- Si la publicación a Portal falla, el estado sigue correcto; la fila va a `outbox` para reintento.
- Ante hueco de `seq`, el cliente re-pide el snapshot en vez de reconstruir desde el historial.
- Cada sobre público lleva su propio `GraphPatch`, así el cliente aplica sin conocer el dominio.

---

## ADR-006 — Identidad sin contraseñas

**Estado:** cerrada

**Decisión.** Al crear el perfil, el backend emite un `person_id` y un `sessionToken` opaco que el cliente guarda en `localStorage`, más un código de recuperación de 6 caracteres. El backend intercambia ese token por un JWT de Portal de 15 minutos, **firmado con RS256** y verificable por Portal contra un JWKS público que expone el propio backend.

**Por qué.**
- Cero fricción: un participante tiene perfil operativo en segundos, sin registro previo ni verificación de correo.
- Los usuarios identificados son un requisito, no una preferencia: en Portal **el inbox de un usuario anónimo está permanentemente vacío**, y las notificaciones son parte del núcleo del producto ([008](#adr-008--notificaciones-con-el-bridge-notify)). `authz` también necesita identidad real para autorizar los canales de equipo.

**Mecanismo.** Portal verifica nuestros JWT con un bloque `auth` en `portal.config.ts` que apunta a nuestro JWKS:

```ts
auth: {
  issuer:   'https://api.nodo.app',
  jwksUrl:  'https://api.nodo.app/.well-known/jwks.json',
  claimMap: {
    userId:   'sub',        // obligatorio
    username: 'name',
    handle:   'handle',
    teams:    'teams',      // { [teamId]: 'member' | 'applicant' }
  },
},
```

`claimMap` mapea **por ruta con puntos**, no con funciones. Lo que se declare aquí es exactamente lo que aparece en `room.me.claims` y en `ctx.claims` dentro de `authz`.

Ambos lados los cubre el paquete npm **`jose`**: firma el token y deriva el JWKS de la misma clave, sin construir el JSON a mano.

```ts
import { SignJWT, importPKCS8, exportJWK } from 'jose';

const key = await importPKCS8(env.JWT_PRIVATE_KEY, 'RS256');

// POST /v1/portal/token
const token = await new SignJWT({ handle, name, teams })
  .setProtectedHeader({ alg: 'RS256', kid: 'nodo-1' })
  .setIssuer(env.JWT_ISSUER)
  .setSubject(personId)
  .setExpirationTime('15m')
  .sign(key);

// GET /.well-known/jwks.json
const jwks = { keys: [{ ...(await exportJWK(publicKey)), kid: 'nodo-1', alg: 'RS256', use: 'sig' }] };
```

**Consecuencias.**
- El backend genera un par de claves RS256 y expone `GET /.well-known/jwks.json`. Es un endpoint público y sin auth: solo contiene la clave pública.
- El `kid` debe coincidir entre la cabecera del token y la entrada del JWKS, o Portal no puede seleccionar la clave para verificar.
- La clave privada es un secreto más (`JWT_PRIVATE_KEY`), al mismo nivel que `PORTAL_SECRET`.
- El JWT lleva el claim `teams` y por eso es de vida corta: al aceptar una solicitud, la membresía cambia y el token anterior queda obsoleto.
- El cliente pasa un **callback `async`** al SDK, no un string: el callback se reinvoca en conexión, reconexión y expiración.
- La identidad es suplantable: quien obtenga un `sessionToken` ajeno actúa como esa persona. **Deuda declarada.** Sustituir por un proveedor de identidad es un cambio local a este ADR, ya que el resto del sistema solo consume `person_id`.
- Perder el `localStorage` pierde la identidad; el código de recuperación lo mitiga.

---

## ADR-008 — Notificaciones con el bridge `notify`

**Estado:** cerrada

**Decisión.** Las notificaciones personales se generan **en `portal.config.ts`** con un bridge `notify`, no publicándolas desde el backend. El backend envía el mensaje de dominio dirigido con `to`, y Portal lo convierte en `InboxItem`.

```ts
// portal.config.ts
channels: {
  'network-main': {
    notify: (ctx) => {
      if (ctx.message.type === 'match.suggested') {
        const s = ctx.message.content.suggestion;
        return { title: `Encaje con ${s.teamName}`, data: s, to: [s.personId] };
      }
      if (ctx.message.type === 'application.created') {
        return { title: 'Nueva solicitud para tu equipo', data: ctx.message.content, to: [ctx.message.content.leadId] };
      }
      return null;
    },
  },
},
```

**Por qué.**
- Una sola publicación por evento: el mismo mensaje alimenta el feed público y la notificación personal.
- Portal aporta ya resueltos el estado de leído, el contador de no vistos, la deduplicación por clave de idempotencia y el `onItem` para toasts. El frontend consume `useInbox` y no construye nada.
- La lógica de "a quién le importa este evento" queda declarada en un solo sitio, junto a las reglas del canal.

**Consecuencias.**
- Desaparecen del contrato los tipos `notify.suggestion`, `notify.application_received` y `notify.application_resolved`: eran un segundo mensaje por evento ([03](03-portal-contract.md)).
- `notify` corre dentro de Portal, así que solo puede decidir con lo que venga en el propio mensaje. Todo dato que determine el destinatario — por ejemplo `leadId` — debe viajar en el `content`.
- Los usuarios anónimos tienen inbox vacío por diseño, lo que refuerza [006](#adr-006--identidad-sin-contraseñas).

---

## ADR-007 — Capa de LLM intercambiable

**Estado:** cerrada

**Decisión.** Toda llamada a un modelo pasa por una interfaz de dos métodos — `extractSkills` y `writeRationale` — implementada con el SDK `openai` apuntado a una `baseURL` configurable.

Proveedor de este proyecto: **Groq**.

```ts
// src/agent/llm.ts — el único archivo que conoce al proveedor
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey:  env.LLM_API_KEY,
  baseURL: env.LLM_BASE_URL,     // https://api.groq.com/openai/v1
});
```

Cambiar de proveedor son **tres variables de entorno**, sin tocar código:

```bash
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL=llama-3.3-70b-versatile
```

**Por qué.**
- Groq expone una API compatible con OpenAI, así que el mismo cliente sirve para OpenAI, Together, Fireworks, OpenRouter, Cerebras, DeepSeek y Ollama local. Un fallo del proveedor se resuelve cambiando tres variables y reiniciando.
- La latencia de Groq es muy baja, lo que refuerza la publicación en dos fases del agente ([06](06-matchmaker-agent.md)).
- La salida se valida siempre con Zod, así que un modelo peor degrada la calidad del texto pero **no puede corromper datos**.

**Consecuencias.**
- La salida estructurada usa `response_format: { type: 'json_object' }` + Zod, no *tool use*. Es lo que se comporta igual en todos los proveedores compatibles.
- El ID del modelo vive en `LLM_MODEL`, nunca en código: Groq rota y deprecia modelos con frecuencia y hay que poder cambiarlo sin desplegar.
- Un proveedor **no** compatible con OpenAI necesitaría su propio adaptador detrás de la misma interfaz. La interfaz ya está preparada; el adaptador no se escribe hasta que haga falta.
- El fallback de plantilla del agente cubre el caso de que ningún proveedor responda.

---

## ADR-009 — La marca de agua `seq` es la de `network-main`

**Estado:** cerrada

**Decisión.** El `seq` que devuelve `GET /v1/graph` es el último `seq` que Portal asignó a una publicación en `network-main`. No agrega canales. Se persiste en una tabla propia, `channel_watermarks`, y `GET /v1/graph` lo lee **antes** de consultar el grafo.

```sql
create table channel_watermarks (
  channel     text primary key,
  seq         bigint not null,
  updated_at  timestamptz not null default now()
);
```

**Por qué.**
- El snapshot describe el grafo público, y el grafo público solo lo mutan los sobres de `network-main`: los de `team-*` no llevan `GraphPatch` ([ADR-010](#adr-010--el-sobre-distingue-eventos-de-grafo-de-eventos-de-canal-privado)). Una sola marca cubre exactamente lo que el snapshot promete.
- Leer el `seq` antes que el grafo acota el peor caso a reaplicar un parche que el snapshot ya incluía, y el upsert por `id` es idempotente ([ADR-005](#adr-005--postgres-es-la-fuente-de-verdad-portal-es-transporte)).
- Una tabla dedicada se rellena en toda publicación, también en las que tienen éxito. `outbox` solo recibe filas cuando la publicación falla, así que no puede sostener la marca.

**Consecuencias.**
- Cada publicación exitosa hace `upsert` de una fila. Es una escritura más por evento, fuera de la transacción de dominio.
- Tras un reinicio la marca sobrevive en la tabla. Si está vacía —entorno nuevo—, `seq` es `0` y el cliente acepta todos los sobres: correcto, porque el snapshot ya trae el estado completo.
- Un cliente suscrito a `team-{id}` no detecta huecos en ese canal con esta marca, y no lo necesita: esos sobres no mutan el grafo y su pérdida no desincroniza nada.

---

## ADR-010 — El sobre distingue eventos de grafo de eventos de canal privado

**Estado:** cerrada

**Decisión.** `Envelope` declara `graph?: GraphPatch`. Dos alias lo estrechan y son los que se usan: `MainEnvelope` exige el parche, `TeamEnvelope` lo prohíbe con `graph?: never`. `MainEvent` se construye sobre el primero y `TeamEvent` sobre el segundo.

```ts
type MainEnvelope<T extends string, P> = Envelope<T, P> & { graph: GraphPatch };
type TeamEnvelope<T extends string, P> = Envelope<T, P> & { graph?: never };
```

**Por qué.**
- Los sobres de `team-*` no tocan el grafo público por diseño: quién solicita a qué equipo es información sensible y no aparece en el grafo abierto ([03](03-portal-contract.md)). El tipo lo declara en vez de dejarlo a la disciplina de quien publica.
- Con `graph?: never`, adjuntar un parche a un evento de canal privado deja de compilar en backend y en frontend a la vez, que es la garantía que motivó [ADR-003](#adr-003--backend-en-typescript-con-hono).

**Consecuencias.**
- El cliente aplica `envelope.graph` sin ramificar por `type`: el tipo ya determina cuándo existe.
- Un `type` nuevo elige explícitamente su base. No hay opción por defecto.

---

## ADR-011 — Los clientes publican señales efímeras en el canal del tablero

**Estado:** cerrada

**Decisión.** El canal `board-*` otorga `publish: true` a sus miembros, acotado por un middleware `onPublish` que **solo** admite mensajes efímeros de una lista blanca (`board.cursor`, `board.note_dragging`, `board.note_focus`). El resto de canales mantiene `publish: false`. Todo estado durable del tablero sigue escribiéndose por REST.

**Por qué.**
- Arrastrar una nota produce decenas de eventos por segundo. Un `POST` por cada uno es inviable, y publicarlos como estado de dominio saturaría el canal y la base de datos.
- El principio 1 de [03](03-portal-contract.md) dice que los clientes **nunca publican eventos de dominio**, y ya admitía explícitamente las señales efímeras (typing, presence). Un cursor y un arrastre en curso son exactamente eso: la regla no cambia, se nombra con precisión.
- Portal documenta este patrón como su caso de uso para cursores en vivo, con `send({ ephemeral: true })` y `setMetadata` throttleado como respaldo para quien llega tarde.
- [ADR-005](#adr-005--postgres-es-la-fuente-de-verdad-portal-es-transporte) sobrevive intacto: **nada efímero es verdad**. No se persiste, no tiene `seq`, no entra en el historial y nadie lo reconstruye. Es previsualización.

**Alternativa descartada.** Una *extension* de Portal manteniendo el estado del tablero en su almacenamiento durable. Resuelve la hidratación sin ida y vuelta, pero crea una **segunda fuente de verdad**, añade una segunda capa de idempotencia (`batchSeq`) en paralelo a `processed_events`, y su protocolo está en `0.1.0`. Queda como evolución posible solo en el papel de caché, con `onInit` hidratando desde este API.

**Consecuencias.**
- `publish: true` abre la puerta a que un cliente publique cualquier cosa: **`onPublish` es obligatorio**, no opcional. Sin él, la decisión es un agujero.
- Verificar que un mensaje no efímero es rechazado se convierte en criterio de aceptación (AC-09 en [11](11-collab-board.md)).
- La posición de una nota entre el `pointerdown` y el `pointerup` no existe para nadie más que para los ojos. Recargar durante un arrastre devuelve la nota a su última posición comprometida, y eso es correcto.

---

## ADR-012 — El plazo del reto es un dato, no un temporizador

**Estado:** cerrada

**Decisión.** Un reto en vivo no tiene reloj corriendo en ningún proceso. El backend publica `questionEndsAt` (epoch ms) en el sobre de cada pregunta; cada cliente descuenta en local; el backend valida contra su propio reloj al recibir la respuesta; y el avance lo dispara `POST /v1/quiz-runs/:id/advance`, **idempotente**, guardado por `current_question`.

**Por qué.**
- El principio rector del proyecto es que el backend no sostiene conexiones de tiempo real y puede reiniciarse en cualquier momento. Un temporizador que avanza preguntas viviría en el proceso, y un redespliegue a mitad de partida la mataría.
- Portal tampoco puede sostenerlo. Sus *extensions* son instancias durables, pero sus cuatro handlers —`onInit`, `onBatch`, `onSnapshot`, `onShutdown`— son **todos reactivos**, y `ExtensionContext.storage` expone únicamente `get`/`put`/`delete`/`list`. No hay alarma ni handler al que despertarla.
- El cliente no es de fiar para medir, pero sí para *mostrar*. La cuenta atrás es presentación; la validación es del servidor.

**Consecuencias.**
- Un reinicio del backend no interrumpe una partida: el estado vive en `quiz_runs` y el siguiente `advance` la continúa.
- `advance` puede llegar de varias fuentes a la vez —el líder, varios clientes cuyo contador expiró— y **debe** ser idempotente. El segundo no hace nada.
- Una partida que nadie avanza queda colgada. Se cierra con `expires_at` y el job de barrido que ya corre cada 5 minutos.
- El sistema no depende de que los relojes de los clientes estén sincronizados: solo cuenta el del servidor.

---

## ADR-013 — `Space` es el contenedor obligatorio, con un espacio abierto por defecto

**Estado:** cerrada

**Decisión.** Todo `Team` y toda `Idea` pertenecen a un `Space`, con `kind: 'hackathon' | 'project'` y fechas nullable. La clave foránea **no** es nullable. `db:seed` siembra un espacio abierto por defecto, y `spaceId` entra como campo **opcional** en los payloads de creación: si falta, cae al espacio abierto.

**Por qué.**
- El producto dejó de limitarse a hackathones: un proyecto de código abierto también recluta, y no tiene fechas ni compite con nadie.
- La alternativa —`space_id` nullable, donde «sin espacio» significa proyecto libre— ramifica cada consulta, parte el descubrimiento en dos superficies y deja el contexto en `null` en el frontend, que ya deriva de él su modo de experiencia.
- Un nullable en un par de columnas de fecha, en una tabla que casi nadie consulta, es más barato que un nullable en la clave foránea que consulta todo el mundo.
- El espacio por defecto es lo que permite que la clave foránea sea obligatoria **sin romper `POST /v1/teams`**, que hoy no envía `spaceId`. El contrato solo crece.

**Por qué `Space` y no `Event`.** La misma entidad alberga un hackathon de 48 horas y un proyecto que dura años. Llamarla «evento» dejaría en el glosario un sustantivo que incluye cosas que no son eventos, y el frontend que lo usaba era un store sin cablear al API.

**Consecuencias.**
- `Space` **no entra al grafo**: `NodeKind` no cambia, así que los `Record<NodeKind, …>` exhaustivos del frontend siguen compilando. Es una dimensión de filtro, no un ámbito de canal.
- `network-main` sigue siendo un solo canal para toda la red, coherente con el principio 2 de [03](03-portal-contract.md). El cliente filtra por espacio con `room.view()`.
- El `spaceId` de un equipo o una idea viaja en `GraphNode.meta`, que ya es `Record<string, unknown>`.
- Renombrar `eventStore`/`NodoEvent`/`EventPage` en el frontend queda como tarea de seguimiento.

---

## ADR-014 — `members` en el sobre es una vista acotada; `memberCount` es la verdad

**Estado:** cerrada

**Decisión.** `teams.max_size` pierde su tope superior (`check (max_size >= 1)`). A cambio, `TeamDTO` gana `memberCount: number`, y en los **sobres publicados a Portal** el array `members` viaja acotado a 8 elementos, con el líder siempre primero. `GET /v1/teams/:id` sigue devolviendo la lista completa.

**Por qué.**
- Un proyecto de código abierto necesita más de cuatro colaboradores. El tope de 4 estaba pensado para equipos de hackathon.
- El `content` de un mensaje de Portal es **≤2KB**, y [09](09-contracts.md) justificaba enviar `members` completo precisamente por estar acotado a 4. Sin tope, `team.updated` de un equipo grande excede el límite y **Portal lo rechaza** — el evento se pierde y el grafo se desincroniza.
- Quitar `members` del contrato sería el único cambio no aditivo, y el frontend ya lo consume.
- Las altas y bajas no dependen de este array: fluyen por `team.member_joined` y `team.member_left`, que llevan una sola `PersonRef` y no tienen problema de tamaño.

**Consecuencias.**
- `members` en un sobre es una **vista**, no un censo. Quien necesite la lista completa la pide por REST.
- El frontend debe leer `memberCount` para el contador «X de Y». Mientras siga usando `members.length` mostrará un número corto en equipos de más de 8. Es tarea de seguimiento.
- La cascada de `Team.status` no cambia: «queda un hueco» significa lo mismo con 4 que con 40.
