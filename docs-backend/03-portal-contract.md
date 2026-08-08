# 03 — Contrato Portal

> **Este es el documento que desbloquea al frontend.** Es un entregable del backend porque el backend define `portal.config.ts`, publica todos los sobres y controla `authz`. El frontend lo consume.
>
> Todo lo que hay aquí vive en el paquete `@nodo/contracts`, importado por backend y frontend. **Si un tipo no está en el paquete, no existe.**

## Principios

1. **Los clientes nunca publican eventos de dominio a Portal.** Escriben por REST; el backend publica. Los clientes solo emiten señales efímeras (typing, presence), que Portal maneja nativamente.
2. **Un canal público, no varios.** Portal soporta vistas filtradas en cliente (`room.view()`) sin abrir sockets extra. Un socket = menos modos de fallo.
3. **Cada sobre público lleva su propio parche de grafo.** El cliente aplica el parche sin conocer el dominio.
4. **Postgres manda.** Portal notifica. Ver [ADR-005](01-decisions.md).

## Canales

| Canal | Persistencia | Quién publica | Quién lee |
|---|---|---|---|
| `network-main` | persistente | backend + agentes | todos |
| `team-{teamId}` | persistente | backend | miembros + solicitantes |
| `challenge-{teamId}-{challengeId}` | persistente, `mode: 'broadcast'` | backend | miembros + solicitantes |
| *inbox* (nativo de Portal) | persistente | backend + agentes | destinatario |

**El tablero no tiene canal propio: reutiliza `team-{teamId}`** ([ADR-015](01-decisions.md#adr-015--el-contrato-se-alinea-con-el-frontend-ya-implementado)). Su `authz` ya está desplegado y ya distingue miembros de solicitantes, así que el tablero no añade ni una línea de configuración. Los seis sobres `board.*` van por ahí ([11](11-collab-board.md)).

**El canal del reto lleva el `teamId` dentro por obligación, no por estética.** `authz` corre dentro de Portal **sin acceso a la base de datos**: solo puede leer `ctx.channel.id` y el claim `teams`. Un canal llamado `challenge-{challengeId}` sería imposible de autorizar, porque nadie ahí dentro puede traducir ese id a un equipo ([12](12-live-quiz.md)).

**Ningún cliente publica, en ningún canal.** `publish: false` es universal: el tablero escribe su estado por REST y el reto envía las respuestas por REST.

**Presence vive en `network-main`.** Es la única fuente de "quién está en línea". Recordatorio: presence es **exclusivamente websocket**; el backend no puede leerlo. Cualquier lógica de servidor que dependa de presence está mal planteada.

Las notificaciones personales van por el **inbox nativo de Portal** usando el campo `to` del sobre, no por un canal por persona.

## Sobre base

Todo mensaje publicado por el backend cumple:

```ts
type Envelope<T extends string, P> = {
  v: 1;                    // versión del contrato
  type: T;                 // discriminante
  id: string;              // id del evento de dominio, prefijo evt_ (idempotencia)
  at: number;              // epoch ms del servidor
  actor: ActorRef;         // quién lo provocó
  payload: P;
  summary: FeedLine;       // línea lista para el feed
  graph?: GraphPatch;      // parche a aplicar al grafo
};

// Los sobres se publican siempre a través de uno de estos dos alias,
// nunca del tipo base. Ver ADR-010.
type MainEnvelope<T extends string, P> = Envelope<T, P> & { graph: GraphPatch };
type TeamEnvelope<T extends string, P> = Envelope<T, P> & { graph?: never };

type AgentId = 'matchmaker' | 'quizmaster';

type ActorRef =
  | { kind: 'person'; id: string; handle: string; displayName: string }
  | { kind: 'agent';  id: AgentId; displayName: string };

type FeedLine = {
  text: string;            // "Laura creó el equipo Health AI"
  icon: string;            // emoji
  refs: Array<{ kind: NodeKind; id: string; label: string }>; // para enlazar
};
```

### GraphPatch

El cliente aplica esto sin ramificar por `type`:

```ts
type NodeKind = 'person' | 'idea' | 'team' | 'skill' | 'agent';
type EdgeKind = 'has_skill' | 'needs' | 'member_of' | 'leads'
              | 'interested_in' | 'authored' | 'spawned'
              | 'applied_to' | 'suggested';

type GraphPatch = {
  nodes?: GraphNode[];       // upsert por id
  edges?: GraphEdge[];       // upsert por id
  removeNodes?: string[];
  removeEdges?: string[];
};

type GraphNode = {
  id: string; kind: NodeKind; label: string;
  status?: string; meta?: Record<string, unknown>;
};

type GraphEdge = {
  id: string; kind: EdgeKind;
  from: string; to: string;
  weight?: number;
  transient?: boolean;       // true en 'suggested' → se dibuja punteada
  expiresAt?: number;
  meta?: Record<string, unknown>;
};
```

**Semántica del upsert:** siempre por `id`. Reaplicar el mismo parche es idempotente. Esto importa porque la entrega de Portal es *at-least-once*.

**Sobre de transporte.** Lo de arriba es el sobre de *dominio*. `POST /v1/channels/{id}/messages` — el endpoint real de Portal, no documentado en `docs.useportal.co` — exige además su propio sobre de transporte: `{ senderId, type, content }`, donde `content` es el `Envelope` completo y `senderId`/`type` se duplican en el nivel superior. El backend arma este envoltorio en `http-publisher.ts`; nada de esto lo ve el cliente, que solo recibe el `Envelope` de dominio por el canal.

## Tipos de mensaje — `network-main`

Todos persistentes salvo indicación. Los tipos del payload están definidos en [09](09-contracts.md).

| `type` | Payload | Parche típico |
|---|---|---|
| `person.upserted` | `{ person: PersonDTO; skills: SkillRef[] }` | nodo `person` + aristas `has_skill` |
| `person.status_changed` | `{ personId, status, previous }` | upsert del nodo (cambia `status`) |
| `idea.published` | `{ idea: IdeaDTO }` | nodo `idea` + arista `authored` |
| `team.created` | `{ team: TeamDTO }` | nodos `team` + `leads`, `member_of`, `needs` |
| `team.updated` | `{ team: TeamDTO }` | upsert `team`, needs añadidas/quitadas |
| `team.member_joined` | `{ teamId, person: PersonRef, status }` | arista `member_of` + status de ambos |
| `team.member_left` | `{ teamId, personId, status }` | `removeEdges` + status |
| `match.suggested` | `{ suggestion: SuggestionDTO }` | arista `suggested` (`transient: true`) |
| `match.expired` | `{ suggestionId }` | `removeEdges` |

`TeamDTO` ya incluye `needs` y `members`, por eso no viajan como campos aparte.

**Nota sobre `applied_to`:** las applications **no** se publican en `network-main`. Quién solicita a qué equipo es información sensible; va solo al canal del equipo. En el grafo público no aparecen.

### El sobre estrella

```jsonc
{
  "v": 1,
  "type": "match.suggested",
  "id": "evt_01J8K...",
  "at": 1754600000000,
  "actor": { "kind": "agent", "id": "matchmaker", "displayName": "MatchMaker" },
  "payload": {
    "suggestion": {
      "id": "sug_01J8K...",
      "personId": "per_camilo",
      "personName": "Camilo",
      "teamId": "tm_healthai",
      "teamName": "Health AI",
      "score": 7,
      "direction": "team_needs_person",
      "matchedSkills": [
        { "slug": "go",      "label": "Go",      "category": "backend",  "priority": "required" },
        { "slug": "angular", "label": "Angular", "category": "frontend", "priority": "required" }
      ],
      "rationale": "Camilo domina Angular y Go, exactamente los dos perfiles que Health AI marcó como imprescindibles. Ambos trabajan en español.",
      "expiresAt": 1754607200000,
      "createdAt": 1754600000000
    }
  },
  "summary": {
    "text": "MatchMaker sugirió conectar a Camilo con Health AI",
    "icon": "🔗",
    "refs": [
      { "kind": "person", "id": "per_camilo",  "label": "Camilo" },
      { "kind": "team",   "id": "tm_healthai", "label": "Health AI" }
    ]
  },
  "graph": {
    "edges": [{
      "id": "sug_01J8K...", "kind": "suggested",
      "from": "per_camilo", "to": "tm_healthai",
      "weight": 7, "transient": true, "expiresAt": 1754607200000
    }]
  }
}
```

`personName` y `teamName` no son adorno: el bridge `notify` construye con ellos el título del `InboxItem` y no tiene acceso a la base de datos para resolverlos ([09](09-contracts.md)). Un sobre sin ellos publica bien y no notifica a nadie.

`rationale` **siempre** nombra skills concretos. Un rationale genérico ("parecen compatibles") es un bug, no un texto flojo — ver el guardarraíl en [06](06-matchmaker-agent.md).

## Tipos de mensaje — `team-{teamId}`

| `type` | Payload | Quién lo ve |
|---|---|---|
| `application.created` | `{ application: ApplicationDTO }` | miembros |
| `application.resolved` | `{ application: ApplicationDTO }` | miembros + solicitante |
| `team.need_changed` | `{ teamId, needs: NeedRef[] }` | miembros |

`ApplicationDTO` embebe `person: PersonRef`, `teamName` y `leadId`, que son los datos que el bridge `notify` necesita para resolver destinatario y título sin consultar la base de datos ([09](09-contracts.md)).

Estos sobres **no llevan `graph`**: no afectan al grafo público. Se construyen con `TeamEnvelope`, que lo prohíbe en tiempo de compilación ([ADR-010](01-decisions.md#adr-010--el-sobre-distingue-eventos-de-grafo-de-eventos-de-canal-privado)).

## Notificaciones personales (inbox)

**No hay tipos de mensaje propios para notificar.** El bridge `notify` de `portal.config.ts` convierte mensajes de dominio ya existentes en `InboxItem` ([ADR-008](01-decisions.md#adr-008--notificaciones-con-el-bridge-notify)).

| Mensaje que la origina | Destinatario | Canal |
|---|---|---|
| `match.suggested` | la persona sugerida | `network-main` |
| `application.created` | el líder del equipo | `team-{id}` |
| `application.resolved` | el solicitante | `team-{id}` |

El frontend usa `useInbox`, que ya trae `items`, `unseen`, `markAllRead()`, `item.markAsRead()` y un `onItem` que dispara solo para lo que llega después del montaje — apto para toasts sin deduplicar a mano, porque `InboxItem.id` es la clave de idempotencia.

**Requisito:** el inbox de un usuario anónimo está permanentemente vacío. Por eso todos los usuarios son identificados ([ADR-006](01-decisions.md#adr-006--identidad-sin-contraseñas)).

## `portal.config.ts`

Owner: backend. Se despliega con `portal deploy`.

```ts
import { defineConfig, allow, block } from '@portalsdk/config';

export default defineConfig({
  webhooks: {
    url: 'https://api.nodo.app/v1/portal/webhooks',
  },

  // El JWT lo emite nuestro backend (RS256). Portal lo verifica contra
  // nuestro JWKS. claimMap mapea por ruta con puntos, no con funciones.
  auth: {
    issuer:  'https://api.nodo.app',
    jwksUrl: 'https://api.nodo.app/.well-known/jwks.json',
    claimMap: {
      userId:   'sub',      // único obligatorio
      username: 'name',
      handle:   'handle',
      teams:    'teams',    // { [teamId]: 'member' | 'applicant' }
    },
  },

  channels: {
    'network-main': {
      anonymous: false,
      // Sin esto, `anonymous: false` cae al default 'membership' y bloquea
      // a todo el mundo con not_member antes de que authz llegue a correr.
      access: 'authz',

      // Los clientes leen y emiten señales efímeras. Nadie publica
      // eventos de dominio: eso es del backend con la sk_.
      authz: (ctx) => {
        if (ctx.claims.anon) return block('Crea tu perfil para entrar.');
        return allow({ publish: false, sendDirect: false });
      },

      // Un mensaje dirigido se convierte en InboxItem. Sin publicación extra.
      notify: (ctx) => {
        const c = ctx.message.content as any;
        switch (ctx.message.type) {
          case 'match.suggested':
            return { title: `Encaje con ${c.suggestion.teamName}`,
                     data: c.suggestion, to: [c.suggestion.personId] };
          default:
            return null;
        }
      },
    },

    'team-*': {
      anonymous: false,
      access: 'authz',

      // Solo miembros y solicitantes con solicitud activa.
      authz: (ctx) => {
        if (ctx.claims.anon) return block('Crea tu perfil para entrar.');
        // ctx.channelId es una idea de conveniencia; el SDK real entrega
        // un ChannelRef ({ id, key, mode }) — el id de canal es ctx.channel.id.
        const teamId = ctx.channel.id.slice('team-'.length);
        const role = (ctx.claims.teams as Record<string, string> | undefined)?.[teamId];
        if (!role) return block('No perteneces a este equipo.');
        return allow({ publish: false, isMember: role === 'member' });
      },

      notify: (ctx) => {
        const { application: a } = ctx.message.content as { application: ApplicationDTO };
        switch (ctx.message.type) {
          case 'application.created':
            return { title: `${a.person.displayName} quiere unirse a ${a.teamName}`,
                     data: a, to: [a.leadId] };
          case 'application.resolved':
            return { title: a.status === 'accepted'
                       ? `Te uniste a ${a.teamName}`
                       : `Solicitud resuelta en ${a.teamName}`,
                     data: a, to: [a.person.id] };
          default:
            return null;
        }
      },
    },

    // El tablero (11) no aparece aquí: reutiliza 'team-*' tal cual (ADR-015).

    // Reto en vivo (12). Nadie publica: las respuestas van por REST.
    'challenge-*': {
      anonymous: false,
      access: 'authz',
      mode: 'broadcast',

      authz: (ctx) => {
        if (ctx.claims.anon) return block('Crea tu perfil para entrar.');
        // "challenge-{teamId}-{challengeId}" → el teamId es el segmento del medio.
        const rest = ctx.channel.id.slice('challenge-'.length);
        const teamId = rest.slice(0, rest.lastIndexOf('-'));
        const role = (ctx.claims.teams as Record<string, string> | undefined)?.[teamId];
        if (!role) return block('No participas en este reto.');
        return allow({ publish: false, isMember: role === 'member' });
      },
    },
  },
});
```

`mode: 'broadcast'` en `challenge-*` porque el patrón es uno-a-muchos, y **el modo es inmutable una vez creado el canal**: elegirlo mal obliga a cambiar el id. En broadcast, `sendActivity` y `sendTyping` son no-op; aquí no se usan.

Los dos features nuevos añaden **un solo canal** entre ambos. El tablero no añade ninguno.

**Punto no obvio:** `publish: false` en todos los canales para clientes. La única forma de escribir estado es la API REST. Así el backend conserva la fuente de verdad y ningún cliente puede inyectar un evento falso en el grafo. Las señales efímeras (typing, presence) no pasan por `publish`.

`authz` y `notify` son campos **por canal**, no de nivel raíz. Junto a `publish` y `sendDirect` se pueden devolver capacidades propias — `isMember` arriba — y leerlas después en middleware.

El claim `teams` se calcula al emitir el JWT y por eso el token es **de vida corta (15 min)** con refresh: al aceptar una solicitud, la membresía cambia y el token viejo ya no refleja la realidad.

**`notify` solo ve el mensaje.** Corre dentro de Portal, sin acceso a la base de datos, así que todo dato que determine el destinatario — `leadId`, `personId`, `teamName` — tiene que viajar en el `content`.

## Contrato de arranque del cliente

Secuencia obligatoria. Está aquí porque el backend la provee.

```
1. POST /v1/people             → { person, skills, sessionToken, recoveryCode }
                                                                    (una vez, en localStorage)
2. POST /v1/portal/token       → { token, expiresIn }               (async callback, refrescable)
3. GET  /v1/graph              → { nodes, edges, seq }              snapshot completo
4. subscribe('network-main') → aplicar parches con seq > snapshot.seq
```

El paso 1 acuña identidad y perfil en el mismo acto, así que es la única ruta sin autenticar de las cuatro ([ADR-006](01-decisions.md#adr-006--identidad-sin-contraseñas)). Quien ya tiene un `recoveryCode` y perdió el `localStorage` entra por `POST /v1/session/recover` y sigue desde el paso 2.

**Nunca** pasar el token como string estático al SDK: un string no se refresca y a los 15 min aparece `TokenExpiredError`. Se pasa un callback `async`.

**Trampa del SDK, no del backend:** el websocket real es `wss://realtime.useportal.co/v1/channels/{id}` — con `/v1`. El ejemplo del README de `@portalsdk/wire-protocol` lo omite y esa forma da 404 contra el host real. No afecta a este backend (no abre websockets, [07](07-architecture.md)), pero sí a quien conecte directo con el wire protocol en vez del SDK de alto nivel.

**Refresco tras solicitar.** El claim `teams` se calcula al emitir el JWT, así que quien acaba de crear una `Application` no aparece como `applicant` en el token que tiene en memoria y `authz` le niega `team-{id}`. El cliente reinvoca su callback de token tras un `POST /v1/teams/:id/applications` con éxito. La notificación de `application.resolved` le llega igualmente al inbox —`notify` la dirige con `to`, sin depender de la suscripción—; lo que se pierde sin refrescar es el feed en vivo del equipo.

**Detección de huecos:** cada sobre trae el `seq` de Portal. Si `seq_recibido > ultimo_seq + 1`, el cliente vuelve al paso 3. No intenta reconstruir desde el historial — el backfill es de 50 mensajes y no alcanza.

La marca de agua es exclusivamente la de `network-main` ([ADR-009](01-decisions.md#adr-009--la-marca-de-agua-seq-es-la-de-network-main)). Los sobres de `team-*` no mutan el grafo, así que el cliente no lleva cuenta de sus huecos.

## Versionado

`v: 1` en todos los sobres. Un cambio incompatible se introduce **añadiendo** un `type` nuevo, sin modificar el existente: renombrar un campo ya publicado rompe al consumidor sin aviso.
