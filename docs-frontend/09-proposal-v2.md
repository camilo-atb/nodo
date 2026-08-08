# 09 — Propuesta técnica v2 (FINAL) — Nodo

> **STATUS: CONGELADA** — No se agregan features después de este documento.
>
> Stack: React + TypeScript + Vite + Tailwind + Zustand (frontend),
> Hono + TypeScript + PostgreSQL + Drizzle (backend), Portal (realtime), Groq LLM (AI).
>
> Auth: JWT RS256 emitido por el backend, verificado por Portal via JWKS.
>
> Hackathon start: viernes 7 de agosto, 7:00 AM. ~36 horas efectivas.

---

## Visión

**"Discover opportunities, find the right people, validate what they know, form a team, and start building together — all in real time."**

Nodo es una plataforma realtime de eventos colaborativos. No es una herramienta de hackathons.
Es una plataforma donde cualquier persona puede crear una oportunidad y cualquier participante
puede descubrir talento, validar competencias y colaborar — todo sincronizado vía Portal.

### Flujo del producto

```
DISCOVER EVENT → JOIN → EXPLORE (marketplace + graph) → MATCH (AI) → VALIDATE (challenge) → TEAM UP → COLLABORATE (board) → BUILD
```

---

## Modelo conceptual

```
Event
 ├── People (participants)
 ├── Projects (ideas con equipo = spawned)
 └── Teams
       ├── Members
       ├── Skills / Requirements (needs)
       ├── Challenges (skill validation)
       └── Workspace (board)
```

| Relación | Cardinalidad | Nota |
|---|---|---|
| Person → Event | N:N | Puede estar en varios eventos |
| Person → Team | 1:1 por evento | No puedes estar en dos equipos del mismo evento |
| Team → Event | N:1 | Un equipo pertenece a un evento |
| Challenge → Team + Skill | N:1 + 1:1 | Un equipo puede lanzar varios challenges, cada uno valida una skill |

**Project ≈ Idea con equipo.** No hay entidad separada — una Idea con arista `spawned` ES el proyecto.

### Scope de evento: `network-main` con filtro lógico

Se mantiene `network-main` como canal (ya funciona en el backend). El `eventId` es un filtro
lógico en frontend — todos los datos pertenecen conceptualmente al evento activo.
La arquitectura queda preparada para evolucionar a `event-{id}` sin rediseño.


---

## Portal: realtime where it matters

### Regla

> "Every shared and collaborative interaction happens in real time through Portal."

Portal se usa cuando **varios clientes necesitan observar cambios compartidos**. No se agrega
realtime artificialmente.

### SÍ usa Portal

| Feature | Canal | Mecanismo |
|---|---|---|
| Presence (quién online) | `network-main` | Presence nativa |
| Graph updates (nodo/arista aparece) | `network-main` | Sobre con GraphPatch |
| AI Suggestions | `network-main` | Sobre `match.suggested` |
| Team formation (member_joined) | `network-main` | Sobre con GraphPatch |
| Applications (llega solicitud) | `team-{id}` | Sobre `application.created` |
| Board: crear/mover/votar cards | `team-{id}` | Sobres `board.*` |
| Challenge: preguntas + leaderboard | `challenge-{id}` | Sobres `challenge.*` |
| Notifications personales | Inbox nativo | `useInbox` + `onItem` |
| Activity feed | `network-main` | `summary` de cada sobre |

### NO usa Portal (operaciones sin estado compartido)

- Cargar un perfil (GET)
- Consultar lista de eventos (GET)
- Consultar datos históricos
- Editar datos privados (PATCH propio)
- Crear un evento (POST — se refleja en el marketplace via sobre posterior)


---

## "Why Realtime?" — justificación por feature

| Feature | WHY REALTIME | PORTAL MECHANISM |
|---|---|---|
| Graph updates | Todos ven la red cambiar sin recargar — prueba visual de ecosistema vivo | Sobre con GraphPatch en `network-main` |
| Presence | Muestra vida real; counter es la primera señal de "esto está pasando AHORA" | Presence nativa del canal |
| AI Suggestions | Sugerencia en <5s — si tarda 30s pierde el efecto | Sobre `match.suggested` |
| Team Formation | Validar que el matchmaking no es teatro: el equipo cambió para todos | Sobre `team.member_joined` |
| Applications | Sensación de demanda real y urgencia para el líder | Sobre `application.created` en `team-{id}` |
| Challenge questions | Experiencia Kahoot: todos ven la misma pregunta al mismo tiempo | Sobre `challenge.question_revealed` |
| Leaderboard | La competencia pierde sentido si el ranking se ve después | Sobre `challenge.leaderboard_update` |
| Board: crear card | Otro miembro ve la card aparecer — colaboración simultánea | Sobre `board.card_created` en `team-{id}` |
| Board: mover card | La pizarra "respira" con actividad de otros | Sobre `board.card_moved` |
| Board: votar | El voto solo tiene sentido si todos ven el mismo counter | Sobre `board.vote_cast` |
| Notifications | Novedades llegan solas — el usuario no va a buscarlas | Inbox nativo + `onItem` para toasts |
| Feed | Prueba de que la red tiene pulso | `summary` de cada sobre |


---

## Skill Challenge — spec final

- **5 preguntas**, 4 opciones cada una, una correcta
- **30 segundos** por pregunta (server-controlled)
- Duración total: ~2-3 minutos
- Preguntas **pre-generadas por LLM** al crear el challenge (NO durante la ejecución)
- Score: puntos por correcta + bonus velocidad
- Leaderboard: actualizado tras cada pregunta via Portal
- Valida UNA skill específica

### Presentación del resultado

```
Validated Skill
Hexagonal Architecture — 91%
```

**NO usar:** Certified, Certification, Expert. Es una señal de compatibilidad, no una credencial.

### Integración con MatchMaker

El `matchedSkills` del payload de `match.suggested` lleva `validatedScore` (nullable):

```json
{ "slug": "hexagonal-architecture", "priority": "required", "validatedScore": 91 }
```

Frontend muestra badge "Validated 91%" solo cuando `validatedScore !== null`.

---

## Brainstorming Board — spec final

### MVP exacto

| ✓ Incluido | ✗ NO incluido |
|---|---|
| Crear card (texto) | Rich text, images, files |
| Mover card (drag) | Resize, rotate, zoom |
| Editar texto | Markdown, formatting |
| Votar (1 persona = 1 voto por card, toggle) | Weighted votes |
| Select winner (líder) | Multiple winners |
| Realtime sync (Portal) | Cursors de otros, infinite canvas |

- Cards: `<div>` con `position: absolute` + transform.
- Drag: `pointerdown` → track → `pointerup` → publish posición final.
- Área fija (~1200x800). No zoom, no infinite canvas.
- Conflicto simultáneo: last-write-wins (3-4 personas, rarísimo).

---

## Event Creation — spec final

Un form simple. Nada más.

```
Create Event
[Name]         [Description]
[Type ▼]       [Start date]  [End date]
                              [Create Event]
```

**Es P0** porque cambia la percepción: de "tool para UN hackathon" a "platform donde cualquiera crea oportunidades".

NO incluye: admin dashboard, analytics, moderación, roles, configuración avanzada.


---

## El grafo — posición final

**Es una visualización del ecosistema, NO el producto principal.**

Muestra: People, Teams, Ideas/Projects, Skills, y sus relaciones.
Comportamiento clave en la demo: nodos/aristas aparecen en realtime → prueba visual de Portal.

NO implementar: graph editor, complex physics, infinite canvas, advanced node config.

**Si el grafo consume demasiado tiempo, priorizar:**
1. Realtime (sobres funcionando)
2. MatchMaker (sugerencias)
3. Challenge (quiz)
4. Board (colaboración)

...por encima de sofisticación del grafo.

---

## AI Usage

| Uso | Input | Output | Cuándo |
|---|---|---|---|
| Skill extraction | Texto libre (bio) | Skills canónicos | Al crear perfil |
| Match rationale | Skills matcheados + contexto | Texto explicativo | Tras scoring |
| Challenge questions | Skill slug + nivel | 5 preguntas multiple-choice | Al crear challenge (pre-generate) |

La AI aporta valor REAL y VISIBLE. No es un chatbot, no es un sistema de ML complejo.

---

## Demo Flow — dos navegadores

### Setup

- **Browser A:** Líder (tiene equipo "Health AI")
- **Browser B:** Camilo (busca equipo)

### Script (~5 minutos)

```
─── ACTO 1: DISCOVER ─────────────────────────────────────────────
[A + B] Abren Nodo → Discover con eventos.
[B]     Camilo entra al evento.
[A]     Líder ve presence counter subir.
        → AMBOS ven nodo nuevo en el grafo.

─── ACTO 2: MATCH ────────────────────────────────────────────────
[A]     Líder publica needs: "Go + Hexagonal Architecture"
        → <5s: arista punteada del MatchMaker aparece en AMBOS browsers.
[B]     Camilo recibe toast: "94% match con Health AI"
        → Abre SuggestionCard: "Go ✓, Hex Arch: validated 91%"

─── ACTO 3: VALIDATE ─────────────────────────────────────────────
[A]     Líder lanza Skill Challenge: "Hexagonal Architecture"
[A + B] AMBOS entran al challenge.
        → Pregunta aparece SIMULTÁNEAMENTE.
        → Timer corre sincronizado.
[A + B] Ambos responden → Leaderboard se actualiza en AMBOS.

─── ACTO 4: TEAM UP ──────────────────────────────────────────────
[B]     Camilo aplica.
[A]     Líder ve solicitud llegar EN VIVO → acepta.
[A + B] AMBOS ven: arista MEMBER_OF en el grafo + nodo cambia de estado.

─── ACTO 5: COLLABORATE ──────────────────────────────────────────
[A + B] Abren Team Workspace → Board.
[A]     Líder crea card → [B] Camilo la ve INMEDIATAMENTE.
[B]     Camilo crea card → [A] Líder la ve.
[B]     Camilo vota → [A] Counter sube.
[A]     Líder selecciona winner → [B] Badge aparece en AMBOS.

─── CIERRE ────────────────────────────────────────────────────────
"Nodo: discover, validate, team up, collaborate. All in real time.
 Powered by Portal."
```

**El jurado VE el realtime** — no solo lo escuchamos decir.


---

## FINAL SCOPE LOCK

### P0 — MUST HAVE

- Authentication (session token + Portal JWT)
- Event Discovery
- Basic Event Creation
- Event Overview + Join
- People (profiles, skills)
- Projects (ideas)
- Teams (create, needs)
- Skills (declared, categorized)
- Team Requirements
- AI MatchMaker (scoring + rationale)
- Team Formation (apply, accept, reject)
- Portal Realtime (sobres, presence, patches)
- Basic Graph (force-graph, realtime updates)

### P1 — DEMO MAGIC

- Skill Challenge (5-question realtime quiz)
- Live Leaderboard
- Validated Score (signal for MatchMaker)
- Brainstorming Board (cards, drag, vote)
- Realtime Voting
- Select Winner

### P2 — ONLY IF EVERYTHING WORKS

- Advanced skill taxonomy (visual categories)
- Duplicate idea detection
- Advanced AI matching (multi-signal)
- Advanced graph interactions
- Multiple simultaneous events
- Rich event configuration
- Advanced board features (colors, resize)

### P3 — DO NOT BUILD

- Chat / messaging
- Video calls
- Kanban / project management
- Advanced analytics
- Mobile app
- Complex RBAC / permissions
- Social feed
- Advanced admin system
- Full Miro-like editor
- OAuth / SSO
- Internationalization
- CI/CD


---

## Plan de ejecución — 36 horas (desde 7:00 AM viernes)

### Bloque 0: Foundation Lock (7:00–9:00 AM)

| Frontend | Backend |
|---|---|
| Integrar `@nodo/contracts` real del backend | Event model + migration + seed |
| Verificar conexión Portal SDK (`useChannel`) | `POST /v1/events`, `GET /v1/events` |
| Confirmar que se recibe un sobre real | Verificar publicación funciona |

**Exit criteria:** frontend recibe un sobre real del backend via Portal.

### Bloque 1: Core Event + Marketplace (9:00 AM – 3:00 PM)

| Frontend | Backend |
|---|---|
| DiscoverPage + EventCard | Event join endpoint |
| CreateEventModal (form simple) | Skills categories (si no están) |
| EventPage + join flow | Seed data (3 eventos, personas, equipos) |
| PeopleList + PersonCard | — (API ya existe) |
| TeamsList + TeamCard | — |
| Routing base + Layout | — |

**Exit criteria:** usuario ve eventos, entra a uno, ve marketplace con personas y equipos.

### Bloque 2: MatchMaker + Teams + Graph (3:00 PM – 9:00 PM)

| Frontend | Backend |
|---|---|
| Onboarding + ProfileForm + SkillPicker | — (API ya existe) |
| GraphPanel (react-force-graph + renderers) | — (GET /v1/graph ya existe) |
| usePortalChannel (recibir sobres, aplicar patches) | — (publicación ya existe) |
| TeamPage + CreateTeamModal | — |
| ApplyButton + ApplicationsPanel | — |
| SuggestionCard + feed | — (MatchMaker ya funciona) |

**Exit criteria:** flujo completo P0: crear perfil → ver sugerencia → aplicar → ser aceptado → todo en realtime.

### ⚠️ CHECKPOINT hora 12 (7:00 PM viernes)

Para este momento DEBE existir una demo mínima funcional:

```
Discover → Event → Marketplace → Match → Team formation
```

Si NO está listo → priorizar cerrar P0 antes de tocar P1.
Si SÍ está listo → avanzar a P1.

### Bloque 3: Skill Challenge (9:00 PM – 3:00 AM)

| Frontend | Backend |
|---|---|
| challengeStore | Challenge model + migration |
| ChallengePage + ChallengeView | Question generation (LLM, pre-generate) |
| QuestionCard (grid 2x2) | Timer logic (server-controlled) |
| TimerBar | `POST /v1/challenges/:id/answer` |
| Leaderboard | Scoring + publish leaderboard_update |
| useChallengeChannel | Portal config: canal `challenge-{id}` |

**Exit criteria:** dos browsers ven la misma pregunta, responden, leaderboard se actualiza en ambos.

### Bloque 4: Brainstorming Board (3:00 AM – 9:00 AM)

| Frontend | Backend |
|---|---|
| boardStore | Board model + CRUD endpoints |
| BoardCanvas + BoardCard | Move, vote, winner endpoints |
| Drag (pointer events) | Publish board events via `team-{id}` |
| VoteButton (toggle) | — |
| BoardToolbar + Winner | — |
| useBoardSync hook | — |

**Exit criteria:** dos browsers: crear card, mover, votar — todo sincronizado.

### Bloque 5: Integration + Polish (9:00 AM – 1:00 PM sábado)

| Frontend | Backend |
|---|---|
| ConnectionBanner | Seed data final para demo |
| NotificationBell + toasts | Deploy a Railway |
| Layout polish + responsive mínimo | Integration fixes |
| Loading states, empty states | Edge cases |
| Validated score badge en SuggestionCard | Smoke test producción |

**Exit criteria:** app funcional end-to-end contra backend desplegado.

### Bloque 6: Demo Polish (1:00 PM – 3:00 PM sábado)

| Frontend | Backend |
|---|---|
| Animaciones/transiciones clave | — |
| Graph visual polish (colores proposal) | — |
| Fix bugs encontrados en ensayo | Fix bugs |

### Bloque 7: Buffer + Rehearsal (3:00 PM – 7:00 PM sábado)

- Ensayo completo del demo (2 browsers)
- Fix de lo que falle
- Plan B si algo no funciona: desactivar feature, no arreglar en pánico
- Deployment final


---

## División del trabajo

### Persona A — Frontend (React + UX)

| Responsabilidad |
|---|
| All React components |
| Zustand stores (graph, feed, presence, session, team, event, challenge, board) |
| Portal SDK integration (consumer: `useChannel`, `useInbox`) |
| react-force-graph-2d |
| Tailwind / UX / visual design |
| Routing + guards |
| Board drag/vote UI |
| Challenge UI (quiz, timer, leaderboard) |

### Persona B — Backend (Hono + AI + Portal)

| Responsabilidad |
|---|
| API endpoints (REST) |
| Database schema + Drizzle migrations |
| Portal config (`portal.config.ts`) + publishing |
| AI orchestration (Groq/LLM calls) |
| Challenge logic (questions gen, timer, scoring) |
| Board persistence + Portal events |
| Auth (JWT signing, JWKS) |
| Deploy (Railway) |

### Tareas paralelas (no se bloquean mutuamente)

| Frontend | Backend | Bloque |
|---|---|---|
| UI con mocks / local state | API + DB + Portal publish | Todo el tiempo |
| Componentes base + Tailwind | Event model + CRUD | 1 |
| GraphPanel (datos de GET /v1/graph) | MatchMaker ajustes | 2 |
| Challenge UI (mock questions) | Challenge backend + LLM | 3 |
| Board UI (local state) | Board backend + events | 4 |

### Dependencias bloqueantes

| Qué bloquea | A quién | Deadline | Resolución si no está |
|---|---|---|---|
| `@nodo/contracts` compilable | Frontend | Hora 0 | Copiar directamente al workspace |
| Portal connection real (un sobre recibido) | Frontend realtime | Hora 2 | Frontend usa mocks, escala inmediatamente |
| `GET /v1/events` + seed data | DiscoverPage con datos reales | Hora 4 | Frontend usa datos hardcoded |
| Canal `challenge-{id}` en portal.config | Challenge realtime | Hora 16 | Frontend mockea con fake provider |
| Board endpoints | Board persiste | Hora 22 | Frontend usa local state (sin persist) |

### Principio: frontend nunca espera

Si la API no está → MSW mocks o local state.
Si Portal no conecta → datos estáticos del store.
La integración real se valida en los exit criteria de cada bloque.

---

## Critical dependencies / blockers

1. **Portal SDK funciona con React** — validar en hora 0-2. El graph-explorer del backend
   ya conecta via WebSocket raw, señal positiva. Si `@portalsdk/react` falla, fallback es
   wrappear `@portalsdk/core` en un hook custom.

2. **Backend desplegado o accesible** — para hora 2 debe haber un backend donde el frontend
   pueda hacer GET /v1/graph y recibir un sobre. Puede ser localhost.

3. **Contracts compartidos** — el `@nodo/contracts` del backend usa Zod 4. Nuestro scaffold
   tiene un placeholder. Reemplazar en hora 0. Si hay conflicto de versiones, copiar solo los
   types (sin Zod runtime) como `.d.ts`.

4. **LLM disponible (Groq)** — si Groq está caído, el challenge no genera preguntas.
   Fallback: pool hardcoded de preguntas para 3-4 skills comunes (go, hexagonal, react, postgres).

5. **CORS de Portal en producción** — no documentado cómo se configura. Probar en deploy
   temprano (bloque 5). Si falla, proxy via backend o contactar soporte Portal.

---

## Priority principle

```
Working product > Realtime experience > AI value > Demo quality > Visual polish > Extra features
```

---

**PROPUESTA CONGELADA. IMPLEMENTACIÓN COMIENZA AHORA.**
