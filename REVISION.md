estamos asumiendo algo que no necesariamente debería ser cierto:

que todos los tipos de oportunidad de Nodo tienen el mismo flujo de interacción.

Y no lo tienen.

La diferencia entre Hackathon y Project cambia bastante el producto.

1. La diferencia fundamental

Yo lo modelaría así:

                    NODO
                      │
             DISCOVER OPPORTUNITY
                      │
             ┌────────┴────────┐
             │                 │
         HACKATHON          PROJECT
             │                 │
       COMPETITION        COLLABORATION
             │                 │
      formar equipos      encontrar personas
             │                 │
      competir / crear     construir juntos

Esto es mucho más importante que simplemente poner:

type = "hackathon"
type = "project"

Porque el tipo determina la experiencia.

2. En un Hackathon el grafo tiene sentido como ecosistema

Aquí sí me encanta el concepto que ustedes diseñaron inicialmente:

                    HACKATHON
                         │
          ┌──────────────┼──────────────┐
          │              │              │
        PEOPLE         IDEAS          TEAMS
          │              │              │
       Camilo          Health AI      Team A
       Laura           FinTech        Team B
       Pedro           Climate        Team C
          │              │              │
          └──────────────┴──────────────┘

Porque hay muchos actores simultáneos.

Una persona puede:

"Estoy buscando equipo."

Una idea puede:

"Necesito 2 personas."

Un equipo puede:

"Nos falta alguien de backend."

Y el MatchMaker puede decir:

"Camilo tiene 91% validado en Hexagonal Architecture y encaja con Team A."

Aquí el grafo es realmente una representación del ecosistema vivo del hackathon.

3. Pero en un Project tienes razón

Imagina:

Health AI — Open Source Project

El objetivo es:

"Quiero construir esto y estoy buscando gente que quiera colaborar."

No necesitas:

People
Ideas
Teams
Ideas
Teams
Ideas

compitiendo entre sí.

El centro es:

                 HEALTH AI
                     │
        ┌────────────┼────────────┐
        │            │            │
     Camilo        Laura        Pedro
        │            │            │
       Go          React       ML
        │            │            │
        └────────────┴────────────┘
                     │
              Requirements
                     │
           ┌─────────┼─────────┐
           │         │         │
          Go       React       ML

Es prácticamente un hub de colaboración.

Y ahí sí tienes toda la razón:

No estás formando equipos que compiten dentro del proyecto.

Estás reclutando colaboradores para un proyecto existente.

4. Y esto cambia también la lluvia de ideas

Aquí también detectaste algo importante.

En un Hackathon:

Idea
 ↓
personas
 ↓
formar equipo
 ↓
brainstorm
 ↓
seleccionar idea
 ↓
construir

La lluvia de ideas tiene muchísimo sentido.

Pero en:

Open Source Project: Health AI

la idea ya existe.

No necesitas:

"¿Qué proyecto hacemos?"

Porque el proyecto ya fue creado.

Entonces el Board podría existir, pero con otro propósito:

Hackathon

Brainstorming

¿Qué vamos a construir?

Project

Collaboration Board

¿Cómo vamos a construirlo?

Por ejemplo:

Project Board

┌─────────────────────────────┐
│ Features                    │
│                             │
│ ○ Authentication            │
│ ○ Realtime dashboard        │
│ ○ AI matching               │
│                             │
│ [ + Add idea ]              │
└─────────────────────────────┘

Pero yo incluso pondría esto como P1/P2 para Project.

No es imprescindible para demostrar el concepto.

5. El Skill Challenge sí funciona en ambos

Esta es una de las cosas bonitas de su arquitectura.

Hackathon

Un equipo necesita:

Go + Hexagonal Architecture

Entonces:

Team A
Looking for:
Go
Hexagonal Architecture

       ↓

Skill Challenge

       ↓

Camilo — 91%

       ↓

AI Match: 94%
Project

El proyecto dice:

Buscamos un contributor con Go + PostgreSQL.

Entonces:

Health AI
Looking for:
Go
PostgreSQL

       ↓

Camilo

       ↓

Skill Challenge

       ↓

Validated Score

Por lo tanto:

Skill Challenge no depende del tipo de oportunidad.

Es una capacidad transversal de Nodo.

Eso está muy bien.

6. El grafo también puede existir en ambos

Pero no debe representar lo mismo.

Esto es lo que yo cambiaría.

Hackathon Graph
"Live Hackathon Network"

Representa:

People ↔ Ideas ↔ Teams

y potencialmente:

People ↔ People
People ↔ Teams
People ↔ Ideas
Ideas ↔ Teams

Es dinámico y relativamente caótico.

Y eso es precisamente lo interesante.

Project Graph
"Project Network"

Representa:

                  PROJECT
                     │
          ┌──────────┼──────────┐
          │          │          │
       PEOPLE      SKILLS    REQUIREMENTS
          │
      contributors

Mucho más limpio.

Incluso podría haber:

             HEALTH AI
                 ●
              /  |  \
             /   |   \
           ●     ●     ●
        Camilo  Laura  Pedro

Y alrededor:

Go
React
ML
PostgreSQL
AI

El proyecto es claramente el centro gravitacional.

7. Esto significa que NO deberíamos crear dos productos

Aquí está la parte importante para Kiro.

No quiero que ahora hagan:

HackathonGraph.tsx
ProjectGraph.tsx

HackathonMarketplace.tsx
ProjectMarketplace.tsx

HackathonBoard.tsx
ProjectBoard.tsx

Eso sería una locura para 36 horas.

La solución correcta es:

Un mismo sistema con diferentes modos.

Por ejemplo:

type OpportunityType =
  | "hackathon"
  | "project";

Y luego:

const experience = getOpportunityExperience(type);

Conceptualmente:

Hackathon
    ├── ecosystem graph
    ├── team formation
    ├── idea discovery
    ├── skill challenge
    └── brainstorming

Project
    ├── project-centered graph
    ├── contributor discovery
    ├── skill challenge
    └── collaboration

Los componentes internos pueden seguir siendo reutilizables.

8. Yo introduciría un concepto más: experienceMode

Esto puede ayudar muchísimo.

En lugar de que todo dependa de type, podrían conceptualizar:

type OpportunityType =
  | "hackathon"
  | "project";

y:

type ExperienceMode =
  | "competition"
  | "collaboration";

Entonces:

Hackathon
    ↓
competition

y:

Project
    ↓
collaboration

Esto tiene una ventaja enorme.

Porque en el futuro podrían existir:

Hackathon → competition

Open Source Project → collaboration

Startup Challenge → competition

Community Project → collaboration

Y no tienen que reconstruir toda la aplicación.

9. Incluso el lenguaje de la UI debería cambiar

Esto es importante.

En un Hackathon:

Find a Team

Join Team

Looking for teammates

Build an idea

Pero en un Project:

Find Contributors

Join Project

Looking for contributors

Contribute to this project

No deberíamos mostrar:

"Find Team"

cuando realmente estamos buscando colaboradores.

10. Mira cómo cambia el Marketplace
Hackathon
People

Camilo
Go · Angular
Looking for a team

Laura
React · UX
Looking for a team


Ideas

Health AI
Needs:
Backend
Designer


Teams

Team Alpha
3/4 members
Looking for:
Backend

Tiene muchísimo sentido.

Project
Project

Health AI
Open Source

Building an AI assistant
for healthcare.

Team
──────────────
Camilo     Backend
Laura      Frontend
Pedro      ML

Looking for
──────────────
Backend Go
ML Engineer

[ Find Contributors ]

Aquí no necesitas una lista gigante de:

Teams / Ideas / People

porque el proyecto es el contexto.

11. Y esto afecta incluso al onboarding

Cuando alguien entra a un Hackathon:

What are you looking for?

○ Find a team
○ Start an idea
○ Join an existing team

Mientras que en un Project:

What do you want to do?

○ Contribute
○ Find a role
○ Validate my skills

No necesariamente tienen que implementar estas pantallas ahora, pero el modelo debe permitirlo.