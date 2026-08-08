# 12 — Skill Challenge

Un equipo con hueco y una necesidad concreta —«nos falta alguien de Go»— recibe cinco solicitudes y no tiene forma de distinguirlas. El perfil dice `go`; el reto muestra quién sabe Go.

Es un quiz sincrónico estilo Kahoot: mismas preguntas, mismo plazo, todos a la vez, ranking recalculado entre preguntas.

**El frontend ya está implementado** (`frontend/src/pages/ChallengePage.tsx`, `components/challenge/`, `hooks/useChallengeChannel.ts`) y funciona hoy en modo mock. Este documento fija el contrato que le falta al servidor.

## El principio que lo gobierna todo

> **El plazo es un dato, no un temporizador.**

El backend no sostiene conexiones de tiempo real y puede reiniciarse en cualquier momento (README, principio rector). Un reloj que avanza preguntas viviría en el proceso, y un redespliegue a mitad de partida la mataría.

Portal tampoco puede sostenerlo: sus *extensions* son instancias durables, pero sus cuatro handlers —`onInit`, `onBatch`, `onSnapshot`, `onShutdown`— son **todos reactivos**, y `ExtensionContext.storage` expone únicamente `get`/`put`/`delete`/`list`. No hay alarma ni handler al que despertarla.

Así que no hay temporizador en ninguna parte:

1. Al abrir una pregunta, el backend escribe `question_started_at` y publica `endsAt` (epoch ms) en el sobre.
2. Cada cliente descuenta **en local** desde ese valor — es lo que `TimerBar` ya hace.
3. El backend acepta una respuesta solo si, **contra su propio reloj**, `now <= endsAt`. El cliente no es de fiar.
4. El avance lo dispara `POST /v1/challenges/:id/advance`, **idempotente**, guardado por `current_question`.

Un reinicio del backend no interrumpe la partida. Ver [ADR-012](01-decisions.md#adr-012--el-plazo-del-reto-es-un-dato-no-un-temporizador).

El frontend ya está escrito así: `revealQuestion(idx, q, Date.now() + questionDuration)` recibe un instante de fin, no una duración que él cronometre.

## Modelo

```
Challenge  { id, team_id, skill_slug, title, status, duration_sec,
             current_question, question_started_at, started_at, ended_at, expires_at }
Question   { id, challenge_id, position, text, options[4], correct_index }
Entry      { challenge_id, person_id, score, answered_count, joined_at, left_at }
Answer     { id, challenge_id, person_id, question_index, answer_index, received_at, points }
```

| Término | Definición |
|---|---|
| **Challenge** | Un reto sobre **un** skill, con sus preguntas, sus participantes y su reloj. |
| **Entry** | La participación de una Person en un Challenge. Guarda su puntaje acumulado. |

Prefijos: `chl_`, `qst_`, `ans_` ([09](09-contracts.md)).

`Challenge.status` ∈ `draft` · `waiting` · `question` · `reviewing` · `ended` — los mismos que `challengeStore` ya maneja, más `draft` para el borrador sin aprobar.

**Un reto, un skill.** El frontend usa `skillSlug` en singular y muestra el tema en la pantalla de espera. No se ancla a varios `NEEDS` a la vez: un reto que mezcla Go y Figma no distingue a nadie.

## Quién escribe las preguntas

Las genera **`quizmaster`**, un actor de dominio nuevo.

### `quizmaster` es un actor, no una credencial

| | Qué es | Cuántas hay |
|---|---|---|
| `LlmProvider` | la costura técnica hacia el modelo ([ADR-007](01-decisions.md#adr-007--capa-de-llm-intercambiable)) | **una, siempre** |
| Agent | actor del dominio: nodo del grafo, `actor.kind: 'agent'` | dos: `matchmaker`, `quizmaster` |

`quizmaster` **no trae credenciales nuevas**. Misma `LLM_API_KEY`, mismo `LLM_BASE_URL`, mismo `LLM_MODEL`. Lo único que se añade es un tercer método a una interfaz interna:

```ts
// apps/api/src/agent/llm.ts — no está en @nodo/contracts.
generateChallenge(input: ChallengeInput): Promise<ChallengeDraft>;
```

Es un actor separado y no una capacidad más del MatchMaker porque [06](06-matchmaker-agent.md) abre declarando que el agente hace **una sola cosa** extremadamente bien. `agent` ya es un `NodeKind` válido, así que no toca el enum.

### Requisito: el guardarraíl anti-bucle se ensancha

`webhook.ts` compara hoy `senderId === 'agent:matchmaker'`. Con un segundo agente publicando, ese filtro **lo dejaría pasar**, y es el riesgo que [07](07-architecture.md#riesgos-y-mitigaciones) marca como *fatal*.

```ts
if (evt.data?.senderId?.startsWith('agent:')) return c.body(null, 204);
```

No es una nota al pie: es condición para desplegar este documento.

### El borrador y su aprobación

El líder indica el skill y la temática; `quizmaster` completa las preguntas.

```
System:
Escribes preguntas de opción múltiple para evaluar una habilidad técnica concreta.

- {count} preguntas. Cada una con exactamente 4 opciones y una sola correcta.
- Enunciado ≤ 160 caracteres. Cada opción ≤ 60 caracteres.
- Dificultad de práctica real, no de trivia ni de sintaxis memorizada.
- Nada ambiguo: dos opciones defendibles invalidan la pregunta.
- Escribe en {language}.

Habilidad: {label} ({slug}) · Temática: {theme}
```

Salida JSON validada con Zod: cuatro opciones, `correctIndex` entre 0 y 3.

**El líder aprueba antes de poder lanzar.** Un `Challenge` en `draft` no admite participantes. A diferencia del `rationale` del MatchMaker, aquí **no hay fallback de plantilla posible**: una pregunta mal generada no degrada un texto, corrompe la selección.

## Puntuación

Determinista, sin LLM:

```
puntos = 0                              si es incorrecta o llega tarde
puntos = 500 + 500 · (1 − t / T)        si es correcta

  t = ms entre question_started_at y la recepción en el servidor
  T = duration_sec · 1000
```

Máximo 1000 por pregunta; acertar en la bocina vale 500. Acertar pesa el doble que la velocidad.

`t` se toma **al recibir en el servidor**, nunca del cliente.

## Las respuestas no viajan por el canal

`POST /v1/challenges/:id/answer`, siempre — que es como el frontend ya lo hace.

Dos razones, ambas duras:

- El `content` de un mensaje lo reciben **todos los suscriptores del canal**. Una respuesta publicada sería visible para los rivales.
- Por lo mismo, **la respuesta correcta nunca viaja en el sobre de la pregunta**. Aparece por primera vez cuando la pregunta ya cerró.

## Contrato

### DTOs

Es exactamente lo que consume `ChallengePage.tsx`:

```ts
export type ChallengeInfo = {
  id: string;
  teamId: string;
  skillSlug: string;
  title: string;
  status: string;
  durationSec: number;
  questionCount: number;
};

/** Lo que se publica. Nunca lleva la respuesta correcta. */
export type ChallengeQuestion = {
  text: string;
  options: [string, string, string, string];
};

export type LeaderboardRow = {
  personId: string;
  displayName: string;
  score: number;
  position: number;
};
```

### Rutas

```http
GET  /v1/challenges/:id                      [auth]          info del reto
POST /v1/teams/:teamId/challenges            [auth: líder]   genera el borrador
PATCH /v1/challenges/:id                     [auth: líder]   edita y aprueba → 'waiting'
POST /v1/challenges/:id/join                 [auth]          entra al lobby
POST /v1/challenges/:id/start                [auth: líder]   arranca
POST /v1/challenges/:id/advance              [auth]          idempotente
POST /v1/challenges/:id/answer               [auth]          { questionIndex, answerIndex }
```

`GET /v1/challenges/:id` y `POST .../answer` son las dos que el frontend ya llama. Las otras cinco son las que faltan para poder crear y conducir un reto.

`POST .../answer` → `200 { points, correct }`. Devuelve si acertó y cuántos puntos, pero **no cuál era la correcta**: eso llega en `challenge.leaderboard_update`, cuando la pregunta ya cerró para todos.

Códigos nuevos:

| Código | HTTP | Cuándo |
|---|---|---|
| `CHALLENGE_NOT_READY` | 409 | lanzar un reto en `draft` |
| `CHALLENGE_ALREADY_STARTED` | 409 | entrar a un reto ya arrancado |
| `ANSWER_TOO_LATE` | 409 | `now > endsAt` contra el reloj del servidor |
| `ALREADY_ANSWERED` | 409 | segunda respuesta a la misma pregunta |

### Sobres — canal `challenge-{teamId}-{challengeId}`

Los tres que `useChallengeChannel` ya maneja:

| `type` | Payload |
|---|---|
| `challenge.question_revealed` | `{ questionIndex, question: ChallengeQuestion, endsAt }` |
| `challenge.leaderboard_update` | `{ questionIndex, correctIndex, rankings: LeaderboardRow[] }` |
| `challenge.ended` | `{ rankings: LeaderboardRow[] }` |

> **Cambio obligatorio en el frontend.** Hoy `useChallengeChannel` usa `challenge-${challengeId}`. El id del canal **tiene que llevar el `teamId` dentro**, porque `authz` corre dentro de Portal **sin acceso a la base de datos** y no puede traducir un `challengeId` a un equipo. Es una línea en `hooks/useChallengeChannel.ts`.

```ts
'challenge-*': {
  anonymous: false,
  access: 'authz',
  mode: 'broadcast',

  authz: (ctx) => {
    if (ctx.claims.anon) return block('Crea tu perfil para entrar.');
    const rest = ctx.channel.id.slice('challenge-'.length);
    const teamId = rest.slice(0, rest.lastIndexOf('-'));
    const role = (ctx.claims.teams as Record<string, string> | undefined)?.[teamId];
    if (!role) return block('No participas en este reto.');
    return allow({ publish: false, isMember: role === 'member' });
  },
}
```

`mode: 'broadcast'` porque el patrón es uno-a-muchos, y **el modo es inmutable una vez creado el canal**.

Miembros y solicitantes entran: el claim `teams` ya marca `applicant` a quien tiene una solicitud `pending`, así que el lobby no necesita autorización propia.

## Datos

```sql
create table challenges (
  id                  text primary key,
  team_id             text not null references teams(id) on delete cascade,
  skill_slug          text not null references skills(slug),
  title               text not null,
  status              text not null default 'draft'
                        check (status in ('draft','waiting','question','reviewing','ended')),
  duration_sec        int  not null default 20,
  current_question    int,
  question_started_at timestamptz,
  started_at          timestamptz,
  ended_at            timestamptz,
  expires_at          timestamptz not null,
  created_at          timestamptz not null default now()
);

-- Un reto vivo por equipo y skill: dos a la vez repartirían a los solicitantes.
create unique index one_live_challenge_per_team_skill
  on challenges (team_id, skill_slug)
  where status in ('waiting','question','reviewing');

create index challenges_status_expires_idx on challenges (status, expires_at);

create table challenge_questions (
  id            text primary key,
  challenge_id  text not null references challenges(id) on delete cascade,
  position      int  not null,
  text          text not null,
  options       text[] not null check (array_length(options, 1) = 4),
  correct_index int  not null check (correct_index between 0 and 3),
  unique (challenge_id, position)
);

create table challenge_entries (
  challenge_id   text not null references challenges(id) on delete cascade,
  person_id      text not null references people(id) on delete cascade,
  score          int  not null default 0,
  answered_count int  not null default 0,
  joined_at      timestamptz not null default now(),
  left_at        timestamptz,
  primary key (challenge_id, person_id)
);

create table challenge_answers (
  id             text primary key,
  challenge_id   text not null references challenges(id) on delete cascade,
  person_id      text not null references people(id) on delete cascade,
  question_index int  not null,
  answer_index   int  not null check (answer_index between 0 and 3),
  received_at    timestamptz not null default now(),
  points         int  not null,
  unique (challenge_id, person_id, question_index)
);
```

## El ranking no acepta a nadie

El resultado **ordena** la bandeja del líder y marca al primero. No acepta, no rechaza, no descarta.

Aceptar es la única operación del sistema que dispara el invariante 5 completo: crea `MEMBER_OF`, pasa a la persona a `teamed`, recalcula `Team.status`, marca `auto_rejected` las demás solicitudes de esa persona e invalida sus sugerencias vivas. Automatizar eso a partir de un juego convierte cada empate, desconexión o abandono en una escritura irreversible que nadie autorizó.

Y resuelve sin ceremonia el caso incómodo: si el ganador entró a otro equipo mientras jugaba, el líder lo ve y pasa al siguiente.

`ApplicationDTO` gana `challengeScore: number | null` y `challengeRank: number | null` (aditivos).

### El reto no entra en el score del MatchMaker

Y no puede: el guardarraíl 1 de [06](06-matchmaker-agent.md) mantiene `unique (person_id, team_id)` **sin cláusula `WHERE` y sin borrar filas**, así que un par queda quemado de forma permanente. Una sugerencia caduca a las 2 h; un reto dura minutos. Para cuando existe el resultado, el par ya está quemado.

Mantenerlos separados preserva lo más valioso de [ADR-002](01-decisions.md#adr-002--vocabulario-canónico-de-skills): que la respuesta a «por qué se emitió esta sugerencia» siga siendo una fórmula auditable.

## Guardarraíles

| # | Regla | Cómo se aplica |
|---|---|---|
| 1 | Solo se lanza un reto en `waiting` | `409 CHALLENGE_NOT_READY` |
| 2 | Un reto vivo por equipo y skill | índice único parcial |
| 3 | Sin entrada tardía | `409 CHALLENGE_ALREADY_STARTED` |
| 4 | Una respuesta por persona y pregunta | índice único → `409 ALREADY_ANSWERED` |
| 5 | Fuera de plazo no puntúa | `now > endsAt` contra el reloj del servidor |
| 6 | `advance` es idempotente | guardado por `current_question` |
| 7 | Abandonar conserva el puntaje | `left_at`; el `score` acumulado no se toca |
| 8 | Reto abandonado se cierra solo | `expires_at` + job cada 5 min |
| 9 | Máx. 50 participantes | `409 CHALLENGE_FULL` |

**Sin entrada tardía (3):** quien llega empezado entra como espectador. Con menos preguntas contestadas su puntaje dejaría de comparar lo mismo, y comparar es el único propósito de la función.

**Sin penalizaciones (7):** quien se va conserva lo acumulado y ese es su resultado.

**El barrido (8)** cuelga del job runner que ya ejecuta `expire-suggestions.ts` cada 5 minutos.

**El tope de 50 (9)** viene del límite de 2KB de Portal: `challenge.leaderboard_update` lleva el ranking completo.

## Criterios de aceptación

**AC-10 — Mismo plazo para todos**
> **Dado** tres participantes en un reto arrancado
> **Cuando** el backend abre una pregunta
> **Entonces** los tres reciben el mismo `endsAt`
> **Y** una respuesta recibida después puntúa 0 con `ANSWER_TOO_LATE`.

**AC-11 — La respuesta correcta no se filtra**
> **Dado** un `challenge.question_revealed` publicado
> **Cuando** se inspecciona el sobre completo
> **Entonces** no contiene `correctIndex` en ningún campo
> **Y** sí aparece en el `challenge.leaderboard_update` posterior.

**AC-12 — Un redespliegue no mata el reto**
> **Dado** un reto en la pregunta 2
> **Cuando** el proceso del backend se reinicia
> **Entonces** el siguiente `POST /v1/challenges/:id/advance` abre la pregunta 3
> **Y** los puntajes acumulados están intactos.

**AC-13 — El ranking ordena, no decide**
> **Dado** un reto terminado con ganador claro
> **Cuando** el líder abre la bandeja de solicitudes
> **Entonces** están ordenadas por puntaje con el primero marcado
> **Y** ninguna `Application` cambió de estado por sí sola.

AC-12 protege [ADR-012](01-decisions.md#adr-012--el-plazo-del-reto-es-un-dato-no-un-temporizador) y exige que la prueba levante el servicio dos veces. AC-11 es la que hace que el reto mida algo.

## Parámetros

```bash
CHALLENGE_QUESTION_COUNT=5
CHALLENGE_DURATION_SEC=20
CHALLENGE_MAX_PARTICIPANTS=50
CHALLENGE_TTL_MINUTES=60
```

Ninguno se calibra de forma teórica. Los dos primeros gobiernan cuánto dura un reto y hay que probarlos con gente real.
