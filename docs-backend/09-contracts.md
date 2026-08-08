# 09 — Contratos compartidos (`@nodo/contracts`)

Paquete TypeScript que importan **el backend y el frontend**. Es la definición ejecutable de [03](03-portal-contract.md) y [05](05-rest-api.md): si un tipo no está aquí, no forma parte del contrato.

Los tipos se derivan de esquemas Zod, no se escriben dos veces:

```ts
export const PersonDTO = z.object({ /* … */ });
export type  PersonDTO = z.infer<typeof PersonDTO>;
```

El backend valida con el esquema en el borde; el frontend usa el tipo. Una sola fuente.

## Convenciones

| Regla | Detalle |
|---|---|
| Identificadores | `string` con prefijo por tipo: `per_`, `spc_`, `tm_`, `idea_`, `app_`, `sug_`, `evt_`, `brd_`, `note_`, `quiz_`, `qst_`, `run_`, `ans_` |
| Fechas | `number`, epoch en milisegundos. Nunca `Date` ni ISO string |
| Nombres de campo | `camelCase` en el contrato, aunque la columna sea `snake_case` |
| Campos opcionales | `?` solo cuando la ausencia es semántica, no cuando el valor puede ser vacío |

## Regla de exposición

Dos campos existen en la base de datos y **nunca** aparecen en un DTO:

| Campo | Motivo |
|---|---|
| `session_token` | credencial de sesión |
| `recovery_code` | permite recuperar una identidad |

Ambos se devuelven una sola vez, en la respuesta que los acuña ([05](05-rest-api.md)), y no vuelven a viajar en ningún sobre ni en ninguna lectura.

`bio` sí es público. Es el texto que la persona escribió para presentarse y viaja en `PersonDTO` a todo el mundo, coherente con que `GET /v1/graph` no tenga autenticación y con que la red sea información abierta: quien participa elige qué escribe, no quién lo lee.

El backend construye los DTO con un mapeador explícito. No serializa filas de base de datos directamente: una columna nueva no debe filtrarse al contrato por omisión.

## Referencias ligeras

Aparecen embebidas dentro de otros DTO cuando solo hace falta identificar y mostrar.

```ts
export type PersonRef = {
  id: string;
  handle: string;
  displayName: string;
};

export type TeamRef = {
  id: string;
  name: string;
};

export type SkillRef = {
  slug: string;
  label: string;
  category: SkillCategory;
};

export type SkillCategory =
  | 'frontend' | 'backend' | 'mobile' | 'data-ai'
  | 'design'   | 'product' | 'infra'  | 'other';
```

Una especialización de `SkillRef`, para la única arista que añade un atributo propio:

```ts
/** Arista NEEDS: qué le falta a un equipo y con qué prioridad. */
export type NeedRef = SkillRef & {
  priority: 'required' | 'nice';
};
```

`HAS_SKILL` no tiene atributos: lo que una persona sabe se representa con `SkillRef` a secas. El scoring no pondera por profundidad ([06](06-matchmaker-agent.md)) y ninguna ruta acepta un valor que la exprese, así que un campo de nivel no tendría origen ni consumidor.

## DTOs de dominio

### PersonDTO

```ts
export type PersonStatus = 'looking' | 'teamed' | 'idle';
export type Availability = 'full' | 'partial' | 'evenings';

export type PersonDTO = {
  id: string;
  handle: string;
  displayName: string;
  headline: string | null;
  bio: string | null;              // texto libre que la persona escribió
  availability: Availability;
  language: string;                // ISO 639-1: 'es', 'en'
  status: PersonStatus;
  teamId: string | null;           // MEMBER_OF materializado
  createdAt: number;
};
```

### TeamDTO

```ts
export type TeamStatus = 'recruiting' | 'almost_full' | 'complete' | 'building';

export type TeamDTO = {
  id: string;
  name: string;
  pitch: string | null;
  status: TeamStatus;              // derivado salvo 'building' (ver 02)
  lead: PersonRef;
  members: PersonRef[];            // en un sobre: hasta 8, lead primero
  memberCount: number;             // la verdad, siempre
  needs: NeedRef[];
  spaceId: string;
  ideaId: string | null;
  boardId: string;                 // 1:1, nace con el equipo
  maxSize: number;                 // por defecto 4, sin tope superior
  createdAt: number;
};
```

**`members` significa cosas distintas según por dónde llegue.** En `GET /v1/teams/:id` es la lista completa. En un sobre publicado a Portal viaja **acotado a 8 elementos**, con el líder primero, porque el `content` de un mensaje es ≤2KB y un equipo grande lo desbordaría — Portal rechazaría el mensaje y el grafo se desincronizaría ([ADR-014](01-decisions.md#adr-014--members-en-el-sobre-es-una-vista-acotada-membercount-es-la-verdad)).

Por eso existe `memberCount`: **es el campo del que fiarse para «X de Y»**, nunca `members.length`. `lead` está siempre incluido en `members` ([invariante 3](02-domain-model.md#invariantes)).

Las altas y bajas no dependen de este array: viajan por `team.member_joined` y `team.member_left`, que llevan una sola `PersonRef` y no tienen problema de tamaño.

### SpaceDTO

```ts
export type SpaceKind = 'hackathon' | 'project';

export type SpaceDTO = {
  id: string;
  name: string;
  description: string | null;
  kind: SpaceKind;
  tags: string[];
  startsAt: number | null;         // null en 'project': no tiene fechas
  endsAt: number | null;
  participantCount: number;
  createdAt: number;
};
```

`kind` determina el modo de experiencia en la interfaz —`hackathon` compite, `project` colabora— y por eso no se deriva ni se guarda por separado.

### IdeaDTO

```ts
export type IdeaDTO = {
  id: string;
  title: string;
  summary: string | null;
  author: PersonRef;
  spaceId: string;
  teamId: string | null;           // arista SPAWNED, si ya derivó en equipo
  interestedCount: number;
  createdAt: number;
};
```

### ApplicationDTO

```ts
export type ApplicationStatus =
  | 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'auto_rejected';

export type ApplicationDTO = {
  id: string;
  person: PersonRef;
  teamId: string;
  teamName: string;
  leadId: string;                  // requerido por el bridge notify
  status: ApplicationStatus;
  message: string | null;
  quizScore: number | null;        // resultado del último reto, si participó
  quizRank: number | null;         // su puesto en ese reto
  createdAt: number;
  resolvedAt: number | null;
};
```

`quizScore` y `quizRank` **ordenan** la bandeja del líder y marcan al primero. No cambian el estado de nada por sí solos: aceptar sigue siendo un acto explícito ([12](12-live-quiz.md#el-ranking-no-acepta-a-nadie)).

### SuggestionDTO

```ts
export type SuggestionDirection = 'team_needs_person' | 'person_seeks_team';

export type SuggestionDTO = {
  id: string;
  personId: string;
  personName: string;              // requerido por el bridge notify
  teamId: string;
  teamName: string;                // requerido por el bridge notify
  score: number;
  direction: SuggestionDirection;
  matchedSkills: NeedRef[];
  rationale: string;
  expiresAt: number;
  createdAt: number;
};
```

### DTOs del tablero

```ts
export type NoteColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'gray';

export type NoteDTO = {
  id: string;
  boardId: string;
  author: PersonRef;
  text: string;                    // ≤ 500 caracteres
  x: number;
  y: number;
  z: number;
  color: NoteColor;
  votes: number;                   // ya agregado
  reactions: Record<string, number>;   // emoji → cuántos
  createdAt: number;
  updatedAt: number;
};

export type BoardSnapshot = {
  board: { id: string; teamId: string; createdAt: number };
  notes: NoteDTO[];
  seq: number;                     // marca de agua de board-{teamId}
};
```

`votes` y `reactions` viajan **ya agregados** para que el cliente no lleve la cuenta. Es lo que hace inocua la reaplicación cuando Portal entrega dos veces ([03](03-portal-contract.md)).

### DTOs del reto

```ts
export type QuizStatus = 'draft' | 'ready';
export type QuizRunMode = 'live' | 'solo';
export type QuizRunStatus = 'lobby' | 'running' | 'ended' | 'abandoned';

/** Lo que se publica. Nunca lleva la respuesta correcta. */
export type QuestionDTO = {
  id: string;
  position: number;
  prompt: string;
  options: [string, string, string, string];
  seconds: number;
};

export type QuizDTO = {
  id: string;
  teamId: string;
  title: string;
  needSlugs: string[];
  status: QuizStatus;              // 'draft' no se puede lanzar
  questions: QuestionDTO[];
  createdAt: number;
};

export type LeaderboardRow = {
  person: PersonRef;
  score: number;
  answeredCount: number;
  left: boolean;                   // abandonó; conserva su puntaje
};

export type QuizRunDTO = {
  id: string;
  quizId: string;
  teamId: string;
  mode: QuizRunMode;
  status: QuizRunStatus;
  currentQuestion: number | null;
  questionEndsAt: number | null;   // epoch ms — el plazo es dato, no temporizador
  leaderboard: LeaderboardRow[];
  createdAt: number;
};
```

**`QuestionDTO` no tiene `correctIndex` y no puede tenerlo.** El `content` de un mensaje lo reciben todos los suscriptores del canal, rivales incluidos. La respuesta correcta solo existe en Postgres y aparece por primera vez en `quiz.question_closed`, cuando la pregunta ya cerró para todos ([12](12-live-quiz.md#las-respuestas-no-viajan-por-el-canal)).

## Por qué hay campos denormalizados

`ApplicationDTO.leadId`, `ApplicationDTO.teamName`, `SuggestionDTO.personName` y `SuggestionDTO.teamName` duplican información que ya está en otros nodos. No es un descuido.

El bridge `notify` de `portal.config.ts` ([ADR-008](01-decisions.md#adr-008--notificaciones-con-el-bridge-notify)) se ejecuta **dentro de Portal**, sin acceso a la base de datos. Solo puede leer el `content` del mensaje. Todo dato que determine el destinatario o el título de la notificación tiene que viajar en el propio sobre.

Quitar cualquiera de esos cuatro campos rompe las notificaciones en silencio: el mensaje se publica, `notify` devuelve `undefined` donde esperaba un nombre, y no llega nada al inbox.

## Payloads de mensaje

Union discriminada por `type`. El sobre base (`Envelope`, `ActorRef`, `FeedLine`, `GraphPatch`) está en [03](03-portal-contract.md), junto con los dos alias que lo estrechan ([ADR-010](01-decisions.md#adr-010--el-sobre-distingue-eventos-de-grafo-de-eventos-de-canal-privado)).

```ts
export type MainEvent =
  | MainEnvelope<'person.upserted',       { person: PersonDTO; skills: SkillRef[] }>
  | MainEnvelope<'person.status_changed', { personId: string; status: PersonStatus; previous: PersonStatus }>
  | MainEnvelope<'idea.published',        { idea: IdeaDTO }>
  | MainEnvelope<'team.created',          { team: TeamDTO }>
  | MainEnvelope<'team.updated',          { team: TeamDTO }>
  | MainEnvelope<'team.member_joined',    { teamId: string; person: PersonRef; status: TeamStatus }>
  | MainEnvelope<'team.member_left',      { teamId: string; personId: string; status: TeamStatus }>
  | MainEnvelope<'match.suggested',       { suggestion: SuggestionDTO }>
  | MainEnvelope<'match.expired',         { suggestionId: string }>;

export type TeamEvent =
  | TeamEnvelope<'application.created',   { application: ApplicationDTO }>
  | TeamEnvelope<'application.resolved',  { application: ApplicationDTO }>
  | TeamEnvelope<'team.need_changed',     { teamId: string; needs: NeedRef[] }>;

/** Canal board-{teamId}. Los publica el backend, tras el commit. */
export type BoardEvent =
  | TeamEnvelope<'note.created',  { note: NoteDTO }>
  | TeamEnvelope<'note.updated',  { note: NoteDTO }>
  | TeamEnvelope<'note.deleted',  { noteId: string }>
  | TeamEnvelope<'note.voted',    { noteId: string; personId: string; votes: number }>
  | TeamEnvelope<'note.reacted',  { noteId: string; personId: string; emoji: string;
                                    reactions: Record<string, number> }>;

/** Canal quiz-{teamId}-{runId}. Los publica el backend. */
export type QuizEvent =
  | TeamEnvelope<'quiz.lobby_updated',   { runId: string; participants: PersonRef[] }>
  | TeamEnvelope<'quiz.started',         { runId: string; questionCount: number }>
  | TeamEnvelope<'quiz.question_opened', { runId: string; position: number;
                                           question: QuestionDTO; questionEndsAt: number }>
  | TeamEnvelope<'quiz.question_closed', { runId: string; position: number;
                                           correctIndex: number;
                                           leaderboard: LeaderboardRow[] }>
  | TeamEnvelope<'quiz.ended',           { runId: string; leaderboard: LeaderboardRow[] }>;

export type AnyEvent = MainEvent | TeamEvent | BoardEvent | QuizEvent;
```

`team.created` y `team.updated` llevan el `TeamDTO` completo, que ya incluye `needs`. No hay un campo `needs` separado.

Los sobres de `TeamEvent`, `BoardEvent` y `QuizEvent` no llevan `graph`: no afectan al grafo público ([03](03-portal-contract.md)).

### Señales efímeras — las publica el cliente

Estas **no son `Envelope`**. Viajan por `send({ ephemeral: true, type, content })`, no se persisten, no tienen `seq` y no entran en el historial. Solo existen en `board-{teamId}` ([ADR-011](01-decisions.md#adr-011--los-clientes-publican-señales-efímeras-en-el-canal-del-tablero)).

```ts
export type BoardSignal =
  | { type: 'board.cursor';        content: { x: number; y: number } }
  | { type: 'board.note_dragging'; content: { noteId: string; x: number; y: number } }
  | { type: 'board.note_focus';    content: { noteId: string | null } };
```

Se tipan aquí para que backend y frontend compartan la lista blanca que aplica `onPublish`. Un tipo fuera de esta unión lo rechaza Portal.

### Un segundo agente

`ActorRef` deja de fijar el id en un literal:

```ts
export type AgentId = 'matchmaker' | 'quizmaster';

export type ActorRef =
  | { kind: 'person'; id: string; handle: string; displayName: string }
  | { kind: 'agent';  id: AgentId; displayName: string };
```

Es un ensanchamiento, no un cambio de forma. Pero **obliga a un arreglo en el backend que no es opcional**: el guardarraíl anti-bucle de `webhook.ts` compara `senderId === 'agent:matchmaker'` y dejaría pasar al segundo agente. Pasa a `senderId.startsWith('agent:')` ([12](12-live-quiz.md#requisito-el-guardarraíl-anti-bucle-se-ensancha)). Es el riesgo que [07](07-architecture.md#riesgos-y-mitigaciones) marca como *fatal*.

## Respuestas REST

```ts
/** POST /v1/people — acuña identidad y perfil en el mismo acto. */
export type CreatePersonResponse = {
  person: PersonDTO;
  skills: SkillRef[];
  sessionToken: string;            // se devuelve una vez, aquí
  recoveryCode: string;            // se muestra una vez, aquí
};

/** POST /v1/session/recover */
export type RecoverSessionResponse = {
  personId: string;
  sessionToken: string;            // nuevo; el anterior queda anulado
};

export type PortalTokenResponse = {
  token: string;
  expiresIn: number;               // segundos, 900
};

export type GraphSnapshot = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  seq: number;
};

export type SkillsResponse = {
  skills: SkillRef[];
};

export type ExtractSkillsResponse = {
  skills: Array<SkillRef & { confidence: number }>;
};
```

## Errores

```ts
export type ErrorCode =
  | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'HANDLE_TAKEN'    | 'TEAM_FULL' | 'ALREADY_IN_TEAM'
  | 'DUPLICATE_APPLICATION' | 'UNKNOWN_SKILL'
  | 'VALIDATION_ERROR' | 'RATE_LIMITED'
  // Tablero (11)
  | 'BOARD_FULL'
  // Reto (12)
  | 'QUIZ_NOT_READY' | 'RUN_ALREADY_STARTED' | 'RUN_FULL'
  | 'ANSWER_TOO_LATE' | 'ALREADY_ANSWERED';

export type ApiError = {
  error: ErrorCode;
  message: string;                 // texto para persona usuaria, en español
  details?: Record<string, unknown>;
};
```

`DUPLICATE_APPLICATION` devuelve la solicitud existente en `details.application` ([invariante 4](02-domain-model.md#invariantes)).

## Estructura del paquete

```
packages/contracts/
  src/
    primitives.ts    PersonRef · TeamRef · SkillRef · NeedRef · AgentId · enums
    dto.ts           PersonDTO · SpaceDTO · TeamDTO · IdeaDTO · ApplicationDTO · SuggestionDTO
    board.ts         NoteDTO · BoardSnapshot · BoardSignal
    quiz.ts          QuizDTO · QuestionDTO · QuizRunDTO · LeaderboardRow
    graph.ts         GraphNode · GraphEdge · GraphPatch
    envelope.ts      Envelope · MainEnvelope · TeamEnvelope · ActorRef · FeedLine
    events.ts        MainEvent · TeamEvent · BoardEvent · QuizEvent · AnyEvent
    rest.ts          respuestas REST · ApiError · ErrorCode
    index.ts
```

**El paquete solo crece.** El frontend ya lo importa en 19 archivos, así que ningún tipo existente cambia de forma y ningún campo se renombra: todo lo de los features nuevos es adición. Las dos únicas excepciones son ensanchamientos compatibles —`ActorRef.id` a unión y `ErrorCode` con códigos nuevos— y una reinterpretación semántica documentada, la de `TeamDTO.members` en sobres ([ADR-014](01-decisions.md#adr-014--members-en-el-sobre-es-una-vista-acotada-membercount-es-la-verdad)).

Se publica a un registro privado o se consume por workspace de pnpm. Lo relevante es que **backend y frontend importen la misma versión**: una copia manual de los tipos elimina la garantía que motivó [ADR-003](01-decisions.md#adr-003--backend-en-typescript-con-hono).

## Versionado

`Envelope.v` es `1`. Un cambio incompatible añade un `type` nuevo en lugar de modificar el existente. Añadir un campo opcional a un DTO es compatible; cambiar el tipo de uno existente o quitarlo, no.
