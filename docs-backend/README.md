# Nodo — Documentación de backend

**Nodo: The Realtime Talent Network.** Mercado de talento en tiempo real donde personas, ideas, equipos y un agente de IA conviven en un grafo vivo: las personas publican lo que saben hacer, los equipos publican lo que les falta, y un agente conecta ambos lados de forma continua y explicada.

## Alcance

Estos documentos especifican **el backend**: un API REST sobre Node, con PostgreSQL como fuente de verdad y Portal como capa de tiempo real. No cubren la interfaz de usuario.

[03 — Contrato Portal](03-portal-contract.md) es la excepción aparente: define canales y sobres de mensaje. Es un entregable del backend porque el backend configura `portal.config.ts`, publica los sobres y define las capacidades de `authz`. El frontend lo consume; no lo define.

## Documentos

Los diez primeros están organizados **por preocupación** y cada uno asume cerrados los anteriores. Describen la red: identidad, grafo, matching.

| # | Documento | Qué fija |
|---|---|---|
| 01 | [Decisiones](01-decisions.md) | Stack, credenciales y los ADR que los justifican. |
| 02 | [Modelo de dominio](02-domain-model.md) | Nodos, aristas, estados, invariantes y criterios de aceptación. |
| 03 | [Contrato Portal](03-portal-contract.md) | Canales, sobres, `authz`, `notify` y `onPublish`. Es lo que consume el frontend. |
| 04 | [Modelo de datos](04-data-model.md) | Esquema SQL, índices e invariantes en base de datos. |
| 05 | [API REST](05-rest-api.md) | Rutas, payloads y errores. |
| 06 | [Agente MatchMaker](06-matchmaker-agent.md) | Disparadores, scoring, prompts y guardarraíles. |
| 07 | [Arquitectura](07-architecture.md) | Flujos, secuencias, consistencia y riesgos. |
| 08 | [Configuración y despliegue](08-operations.md) | Provisión de Portal, variables de entorno, despliegue y diagnóstico. |
| 09 | [Contratos compartidos](09-contracts.md) | Los tipos de `@nodo/contracts`. Referencia ejecutable de 03 y 05. |
| 10 | [Estrategia de pruebas](10-testing.md) | Niveles, dobles de Portal y del LLM, y el mapa de los criterios de aceptación. |

Del 11 en adelante están organizados **por superficie**: cada uno es un feature de tiempo real autocontenido, con su dominio, sus datos, su canal, sus rutas y sus criterios en un solo sitio.

| # | Documento | Qué fija |
|---|---|---|
| 11 | [Tablero colaborativo](11-collab-board.md) | Notas, votos y cursores en vivo. El reparto entre lo efímero y lo durable. |
| 12 | [Reto en vivo](12-live-quiz.md) | Quiz sincrónico para elegir entre solicitantes. `quizmaster` y el plazo como dato. |

**Por qué dos formas de organizar.** Los features nuevos cruzan las diez preocupaciones a la vez; repartirlos en cinco documentos los volvería ilegibles. Pero los tipos, canales, tablas y rutas **sí** se insertan en 02/03/04/05/09, porque esos documentos se autodeclaran la referencia única y el frontend depende de ellos. Los documentos 11 y 12 llevan el diseño y el porqué; los contratos viven donde ya vivían sus hermanos.

El glosario del dominio, incluidos los términos a evitar, está en [`CONTEXT.md`](../CONTEXT.md).

Si una decisión posterior contradice un ADR, se escribe un ADR nuevo que lo supersede; el anterior no se edita. Así el acuerdo vigente es siempre verificable.

## Registro de correcciones

Revisión previa a la implementación de `@nodo/contracts`. Ningún ADR quedó superseded: las siete resoluciones cierran huecos o corrigen documentos que se habían desviado de un ADR vigente. Las dos decisiones que ninguna anterior cubría se registraron como ADR nuevos.

| Qué se resolvió | Dónde |
|---|---|
| La identidad se acuña en `POST /v1/people`, no en un `POST /v1/session` previo; la recuperación pasa a `POST /v1/session/recover` | 03, 05, 09 — restablece lo que ya decía ADR-006 |
| `Team.status` se deriva por cascada con precedencia explícita; `recruiting` es el caso por defecto | 02 |
| `HAS_SKILL` pierde `level`: ninguna ruta lo producía ni ningún cálculo lo consumía | 02, 09 |
| `matchedSkills` viaja con `label` y `category`; la consulta une `skills` | 03, 04, 06 |
| El score completo y el umbral se calculan en SQL, antes del recorte | 04, 06 |
| `bio` es público; se retira la condición que ninguna columna sostenía | 09 |
| Los ids de arista son deterministas | 04 |
| Semántica de la marca de agua `seq` | **ADR-009** |
| Partición del sobre en `MainEnvelope` / `TeamEnvelope` | **ADR-010** |

El ejemplo de `notify` en ADR-008 lee `content.leadId` donde el payload es `{ application }`. No se edita, por la regla de arriba: la versión vigente y correcta es la de [03](03-portal-contract.md).

### Revisión posterior a la verificación contra servicios reales

Auditoría de fidelidad entre estos documentos y `apps/api/src/` tras verificar el backend contra Portal, Groq y una Postgres real. Ningún ADR quedó superseded: son correcciones de deriva, no decisiones nuevas.

| Qué se resolvió | Dónde |
|---|---|
| `portal.config.ts` real exige `access: 'authz'` por canal (si no, el default `'membership'` bloquea antes de que `authz` corra) y el id de canal se lee de `ctx.channel.id`, no de `ctx.channelId` | 03 |
| `POST /v1/channels/{id}/messages` de Portal exige su propio sobre de transporte `{ senderId, type, content }`; el `Envelope` de dominio viaja dentro de `content` | 03 |
| El websocket real es `wss://realtime.useportal.co/v1/channels/{id}` — con `/v1`, que el README de `@portalsdk/wire-protocol` omite en su ejemplo | 03 |
| El webhook de Portal no reprocesa el dominio (no existe `handle(evt)`): solo descarta el eco del agente y registra idempotencia. Documentado como deuda, no como red de seguridad activa | 05, 07 |
| Faltaban `GET /health` y `GET /.well-known/jwks.json` en el listado de rutas | 05 |
| Índice `suggestions_status_expires_idx` sin documentar, usado por el job de caducidad | 04 |
| Vocabulario real: 75 skills, 141 alias (no ~70) | 01, 04 |
| `pnpm db:local` (Postgres real vía `pglite`, sin Docker) no estaba documentado como ruta de desarrollo local | 08, este README |
| El backend sí se verificó contra una Postgres real (local) y contra Portal/Groq reales; la nota de "no ejecutado" y el conteo de pruebas habían quedado desactualizados | este README |

### Ampliación con las dos superficies de tiempo real

Diseño de [11](11-collab-board.md) y [12](12-live-quiz.md), y las correcciones que salieron al contrastarlos con el código y con la API real de Portal. Ningún ADR quedó superseded: los cuatro nuevos cubren decisiones que ninguno anterior alcanzaba.

| Qué se resolvió | Dónde |
|---|---|
| Los clientes publican señales efímeras en `board-*`, acotadas por `onPublish`. `publish: false` sigue vigente en el resto | **ADR-011**, 03, 11 |
| El plazo del reto es un dato, no un temporizador — las *extensions* de Portal no tienen alarmas ni handler que las despierte | **ADR-012**, 12 |
| `Space` es contenedor obligatorio, con espacio abierto por defecto para no romper `POST /v1/teams` | **ADR-013**, 02, 04, 05, 09 |
| `max_size` pierde el tope de 4; `members` en el sobre se acota a 8 y `memberCount` pasa a ser la verdad | **ADR-014**, 02, 04, 09 |
| El guardarraíl anti-bucle comparaba `senderId === 'agent:matchmaker'` y **dejaría pasar a `quizmaster`**. Pasa a `startsWith('agent:')` | 05, 07, 09, 12 |
| `ActorRef.id` era un literal `'matchmaker'`; se ensancha a unión con `quizmaster` | 03, 09 |
| El umbral `3` no equivale a "un `required` o dos `nice`" — con la fórmula real ninguno de los dos llega. Corregido con la tabla de casos mínimos | 06 |
| `GET /v1/_debug/matchmaker` se usaba en 06 y 08 pero faltaba en el listado de rutas | 05 |
| El vocabulario seguía documentado como "~70 skills" en un sitio que la corrección anterior no alcanzó | 08 |
| El límite de **2KB por mensaje** de Portal es lo que fija el recorte de `members` y el tope de participantes del reto | 07, 08, 09 |
| `NodeKind` no gana valores nuevos: el frontend construye `Record<NodeKind, …>` exhaustivos y añadir uno rompe su compilación | 02, 09, 11 |

La consecuencia de ADR-004 sigue diciendo `senderId === 'agent:matchmaker'`. **No se edita**, por la misma regla que dejó intacto el ejemplo de ADR-008: la versión vigente es la del guardarraíl 8 de [06](06-matchmaker-agent.md) y la de [12](12-live-quiz.md).

Dos tareas de seguimiento quedan **en el frontend**, no aquí: renombrar `eventStore`/`NodoEvent`/`EventPage` a `Space`, y leer `memberCount` en lugar de `members.length` para el contador de integrantes.

## Principio rector

> **El backend nunca sostiene una conexión de tiempo real.**

Portal mantiene los websockets (`wss://realtime.useportal.co`). El backend solo emite JWTs, publica por HTTP cuando cambia el estado, y ejecuta sus agentes. Cualquier diseño que requiera que el backend mantenga clientes conectados contradice este principio y debe revisarse.

**Las dos superficies de tiempo real lo respetan sin excepciones.** El tablero recibe estado por HTTP y deja lo efímero íntegramente a Portal ([ADR-011](01-decisions.md#adr-011--los-clientes-publican-señales-efímeras-en-el-canal-del-tablero)); el reto no tiene reloj propio porque el plazo viaja como dato ([ADR-012](01-decisions.md#adr-012--el-plazo-del-reto-es-un-dato-no-un-temporizador)). El backend sigue sin sostener ni un solo websocket, y un redespliegue no interrumpe ni un tablero abierto ni una partida en curso.

## Arranque

```bash
pnpm install
cp .env.example .env      # ver 08-operations.md
pnpm db:local             # otra terminal — Postgres real sin Docker, ver 08-operations.md
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Runtime Node 22 + pnpm, idéntico en local y en producción. `db:local` es solo para desarrollo sin acceso a Supabase; en producción `DATABASE_URL` apunta al pooler real.

## Estado de la implementación

**La red (01–10) está escrita**: `@nodo/contracts`, esquema y migraciones, dominio, agente MatchMaker, publicación a Portal, rutas HTTP y `portal.config.ts`, con 76 pruebas en verde (61 en `apps/api` + 15 en `@nodo/contracts`, `pnpm test` en cada paquete). Se verificó además contra servicios reales, no solo contra dobles: una Postgres real (local, vía `pglite` — ver [08](08-operations.md)), la cuenta real de Portal y una clave real de Groq. `portal.config.ts` sigue sin desplegarse (`portal deploy` requiere `portal login` interactivo).

**Las dos superficies de tiempo real (11–12) están especificadas, no implementadas.** El diseño está cerrado y los contratos definidos; falta escribir el código.

## Pendiente

### Del diseño ya implementado

| Tarea | Por qué bloquea |
|---|---|
| Calibrar `MATCH_SCORE_THRESHOLD` con tráfico real | gobierna el volumen de sugerencias del agente; no se puede fijar de forma teórica |
| Verificar `authz`/`notify` de `portal.config.ts` contra un cliente real | docs/10: es la única verificación que queda manual, deliberadamente |
| Provisionar Portal y ejecutar `portal deploy` | [08](08-operations.md): prerrequisito de despliegue, no de código |

### De los features nuevos

| Tarea | Por qué va primero |
|---|---|
| Ensanchar el guardarraíl anti-bucle a `startsWith('agent:')` | sin esto, `quizmaster` se retroalimenta. Riesgo *fatal* de [07](07-architecture.md) |
| Migración: `spaces`, `space_id`, `max_size` sin tope, tablas de 11 y 12 | todo lo demás depende del esquema |
| Sembrar el espacio abierto por defecto | sin él, `POST /v1/teams` falla ([ADR-013](01-decisions.md#adr-013--space-es-el-contenedor-obligatorio-con-un-espacio-abierto-por-defecto)) |
| Ampliar `@nodo/contracts` — solo adiciones | el frontend lo importa en 19 archivos |
| `onPublish` en `board-*` | `publish: true` sin middleware es un agujero. Riesgo *fatal* |
| Calibrar `QUIZ_QUESTION_SECONDS` y `QUIZ_QUESTION_COUNT` con gente real | igual que el umbral del matchmaker: no se fija de forma teórica |

En el frontend, dos tareas menores: renombrar `eventStore`/`NodoEvent`/`EventPage` a `Space`, y usar `memberCount` en vez de `members.length`.
