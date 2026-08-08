# 11 — Tablero colaborativo

Un equipo que acaba de formarse tiene un `pitch` de una línea y nada más. El tablero es donde ese pitch se convierte en un plan: tarjetas que la gente escribe, mueve y vota, y de las que sale una ganadora.

**Este documento describe el contrato que el frontend ya implementa** (`frontend/src/pages/BoardPage.tsx`, `components/board/`, `hooks/useBoardSync.ts`). Lo que falta es el lado del servidor.

## Alcance

Un tablero por equipo, creado con el equipo. Tarjetas de texto sobre un lienzo, con posición, color y votos. Una tarjeta puede marcarse ganadora. Sin dibujo libre, sin imágenes, sin conectores, sin reacciones.

## Decisiones de forma

Tres, y las tres vienen de lo que ya está construido:

**Reutiliza el canal `team-{teamId}`.** No hay canal propio del tablero. `useBoardSync` se suscribe a `team-${teamId}`, que ya existe, ya tiene `authz` desplegado y ya distingue miembros de solicitantes. Cero configuración nueva en `portal.config.ts` ([ADR-015](01-decisions.md#adr-015--el-contrato-se-alinea-con-el-frontend-ya-implementado)).

> **Consecuencia aceptada:** el `authz` de `team-*` admite a miembros **y a solicitantes con solicitud activa**, así que un solicitante ve el tablero. Se acepta a cambio de no duplicar la capa de autorización. Si algún día el plan del equipo debe ser privado, la solución es un canal propio, no un parche.

**Todo el estado se escribe por REST.** No hay publicación desde el cliente, ni efímera ni de ningún tipo. Arrastrar una tarjeta actualiza la posición en local y hace **un solo `POST` al soltar**. El principio 1 de [03](03-portal-contract.md) queda intacto: los clientes nunca publican, `publish: false` sigue en todos los canales.

> Ver una tarjeta moverse *mientras* otra persona la arrastra requeriría señales efímeras y `publish` acotado. No está en v1 y no hace falta para que el tablero funcione.

**El tablero no entra al grafo público.** `NodeKind` no gana valores. Es interno del equipo, y además el frontend construye `Record<NodeKind, …>` exhaustivos, así que añadir uno rompería su compilación.

## Modelo

```
Board  { id, team_id, winner_card_id?, created_at }
Card   { id, board_id, content, x, y, color, created_by, is_winner, created_at, updated_at }
Vote   { card_id, person_id }        -- un voto por persona y tarjeta
```

**`Card`, nunca «Idea».** `Idea` ya está tomado en [02](02-domain-model.md) y significa otra cosa: una propuesta de proyecto publicada por una Person, que existe con o sin equipo y es un nodo del grafo. Una tarjeta es un papelito en un lienzo de equipo.

Prefijos: `brd_`, `card_` ([09](09-contracts.md)).

Un tablero nace con su equipo, en la misma transacción. No hay ruta para crearlo aparte: un equipo sin tablero sería un estado que nadie sabe reparar. Se borra en cascada con el equipo.

## Contrato

### DTO

Es exactamente lo que consume `boardStore.ts`:

```ts
export type BoardCard = {
  id: string;
  content: string;
  x: number;
  y: number;
  color: string;
  createdBy: string;        // personId, no PersonRef
  votes: number;            // ya agregado
  isWinner: boolean;
  myVote: boolean;          // depende de quién pregunta
};
```

`votes` viaja agregado para que el cliente no lleve la cuenta: es lo que hace inocua la reaplicación cuando Portal entrega dos veces.

`myVote` es **relativo al solicitante**, así que solo tiene valor en la respuesta REST. En los sobres publicados a Portal va omitido: un mismo mensaje lo leen varias personas y no puede afirmar algo distinto para cada una. El cliente lo deriva de sus propios `board.vote_cast` / `board.vote_removed`.

### Rutas

```http
GET    /v1/teams/:teamId/board                      [auth: miembro]
POST   /v1/teams/:teamId/board/cards                [auth: miembro]  { content, x, y, color }
PATCH  /v1/teams/:teamId/board/cards/:cardId        [auth: autor o líder]  { content }
POST   /v1/teams/:teamId/board/cards/:cardId/move   [auth: miembro]  { x, y }
POST   /v1/teams/:teamId/board/cards/:cardId/vote   [auth: miembro]
DELETE /v1/teams/:teamId/board/cards/:cardId/vote   [auth: miembro]
POST   /v1/teams/:teamId/board/winner               [auth: líder]    { cardId }
```

`GET /v1/teams/:teamId/board` → `200 { cards: BoardCard[] }`.

El voto es **dos rutas, no un toggle**: `POST` vota, `DELETE` retira. Así la operación es idempotente y un reintento no invierte el voto sin querer.

`move` es `POST` y no `PATCH` porque expresa un hecho —«se soltó aquí»— y no un parche parcial del recurso. Se llama una sola vez, al terminar el arrastre.

### Sobres — canal `team-{teamId}`

Los publica el backend, tras el commit. Son los seis que `useBoardSync` ya maneja:

| `type` | Payload |
|---|---|
| `board.card_created` | `{ card: BoardCard }` |
| `board.card_moved` | `{ cardId, x, y }` |
| `board.card_updated` | `{ cardId, content }` |
| `board.vote_cast` | `{ cardId, personId, votes }` |
| `board.vote_removed` | `{ cardId, personId, votes }` |
| `board.winner_selected` | `{ cardId }` |

Se construyen con `TeamEnvelope`, que prohíbe `graph` en tiempo de compilación ([ADR-010](01-decisions.md#adr-010--el-sobre-distingue-eventos-de-grafo-de-eventos-de-canal-privado)).

`board.card_moved` y `board.card_updated` llevan solo el delta, no la tarjeta entera: son los dos mensajes de mayor frecuencia y el `content` de Portal está limitado a 2KB.

## Datos

```sql
create table boards (
  id             text primary key,
  team_id        text not null unique references teams(id) on delete cascade,
  winner_card_id text,                       -- FK diferida: la tarjeta aún no existe
  created_at     timestamptz not null default now()
);

create table board_cards (
  id          text primary key,
  board_id    text not null references boards(id) on delete cascade,
  content     text not null default '',
  x           real not null,
  y           real not null,
  color       text not null default 'yellow',
  created_by  text not null references people(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index board_cards_board_idx on board_cards (board_id);

-- Un voto por persona y tarjeta. El segundo POST no hace nada.
create table board_votes (
  card_id     text not null references board_cards(id) on delete cascade,
  person_id   text not null references people(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (card_id, person_id)
);
```

`boards.team_id` es `unique`: la relación 1:1 se aplica en la base de datos, no en la capa de servicio ([02](02-domain-model.md#invariantes)).

`isWinner` **no es una columna de la tarjeta** sino `boards.winner_card_id`. Así solo puede haber una ganadora por tablero por construcción, en vez de por disciplina. El DTO lo expone como booleano porque es lo que el frontend ya consume.

## Límites

| # | Regla | Cómo se aplica |
|---|---|---|
| 1 | Solo el equipo entra al tablero | `authz` de `team-*`, ya desplegado |
| 2 | Un voto por persona y tarjeta | clave primaria compuesta |
| 3 | Edita el autor o el líder | comprobado en el handler → `403 FORBIDDEN` |
| 4 | Solo el líder marca ganadora | `403 FORBIDDEN` |
| 5 | Máx. 200 tarjetas por tablero | validación en transacción → `409 BOARD_FULL` |
| 6 | Contenido ≤ 500 caracteres | Zod en el borde → `422 VALIDATION_ERROR` |

El límite 5 no es arbitrario: 200 tarjetas son unos 40 KB de JSON en `GET /v1/teams/:id/board`, del mismo orden que el snapshot del grafo. Más allá, habría que paginar.

## Criterios de aceptación

**AC-07 — La posición sobrevive al soltar**
> **Dado** dos miembros con el mismo tablero abierto
> **Cuando** uno arrastra una tarjeta y la suelta
> **Entonces** el otro recibe `board.card_moved` y la ve en la posición nueva
> **Y** un tercero que abre el tablero por primera vez la ve ahí también.

**AC-08 — El voto es idempotente**
> **Dado** una tarjeta sin votos
> **Cuando** la misma persona hace `POST .../vote` dos veces
> **Entonces** `votes` es 1, no 2
> **Y** solo se publica un `board.vote_cast`.

**AC-09 — Una sola ganadora**
> **Dado** un tablero con una tarjeta ya marcada ganadora
> **Cuando** el líder marca otra
> **Entonces** la primera deja de serlo
> **Y** se publica `board.winner_selected` con la nueva.

## Pruebas

Al nivel de **servicio**, con el doble de Portal de [10](10-testing.md): sembrar equipo y miembros, ejecutar cada handler y afirmar sobre el canal, el `type` y la ausencia de `graph` en el sobre.
