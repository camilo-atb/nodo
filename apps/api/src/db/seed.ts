import { loadEnv } from '../config.js';
import { createDb } from './client.js';
import { eq } from 'drizzle-orm';
import { eventSubscriptions, nodes, people, skillAliases, skills } from './schema.js';
import { SKILLS, SKILL_ALIASES } from './vocabulary.js';
import { createPerson } from './people-repo.js';
import {
  addMember,
  createTeam,
  deriveAndPersistTeamStatus,
  findTeamRow,
} from './teams-repo.js';
import { createIdea } from './ideas-repo.js';
import { getPersonTeamId } from './people-repo.js';
import { personId, recoveryCode, sessionToken, teamId, ideaId } from '../domain/ids.js';
import { DEFAULT_EVENT_ID, type SkillRef } from '@nodo/contracts';
import { events } from './schema.js';

/**
 * `pnpm db:seed` (docs/08). Dos conjuntos con propósitos distintos:
 *
 * - **Vocabulario** — obligatorio en cualquier entorno. Sin él no hay
 *   matching (ADR-002). Incluye el nodo del agente: `matchmaker` está
 *   presente desde el seed, no se crea en runtime (docs/06).
 * - **Conjunto representativo** — solo en desarrollo. No incluye
 *   sugerencias: las genera el agente al arrancar, que es lo que interesa
 *   observar.
 */
const seedVocabulary = async (db: ReturnType<typeof createDb>['db']): Promise<void> => {
  for (const skill of SKILLS) {
    await db.insert(skills).values(skill).onConflictDoNothing();
    await db
      .insert(nodes)
      .values({ id: skill.slug, kind: 'skill', label: skill.label, meta: { category: skill.category } })
      .onConflictDoNothing();
  }
  for (const alias of SKILL_ALIASES) {
    await db.insert(skillAliases).values(alias).onConflictDoNothing();
  }
  await db
    .insert(nodes)
    .values({ id: 'matchmaker', kind: 'agent', label: 'MatchMaker' })
    .onConflictDoNothing();
  // `quizmaster` (docs/12): el segundo actor del dominio. No trae credenciales
  // nuevas — comparte `LlmProvider`, `LLM_API_KEY` y `LLM_MODEL` con el
  // matchmaker. Es un nodo `agent` más, así que `NodeKind` no cambia.
  await db
    .insert(nodes)
    .values({ id: 'quizmaster', kind: 'agent', label: 'QuizMaster' })
    .onConflictDoNothing();

  console.log(`[seed] vocabulario: ${SKILLS.length} skills, ${SKILL_ALIASES.length} alias.`);
};

const skill = (slug: string): SkillRef => {
  const found = SKILLS.find((s) => s.slug === slug);
  if (!found) throw new Error(`Seed: slug "${slug}" no está en el vocabulario.`);
  return found;
};

const seedPerson = async (
  db: ReturnType<typeof createDb>['db'],
  input: {
    handle: string;
    displayName: string;
    headline: string;
    bioRaw: string;
    skillSlugs: string[];
    availability: 'full' | 'partial' | 'evenings';
    language: string;
  },
): Promise<string> => {
  const id = personId();
  await createPerson(db, {
    id,
    handle: input.handle,
    displayName: input.displayName,
    headline: input.headline,
    bioRaw: input.bioRaw,
    availability: input.availability,
    language: input.language,
    sessionToken: sessionToken(),
    recoveryCode: recoveryCode(),
    skills: input.skillSlugs.map(skill),
  });
  await db.insert(eventSubscriptions).values({ eventId: DEFAULT_EVENT_ID, personId: id });
  return id;
};

/** Conjunto representativo, solo desarrollo: variedad de estados y categorías. */
/**
 * El conjunto representativo usa handles fijos, así que **no es idempotente**:
 * reinsertarlo choca con `people_handle_unique`. Se comprueba antes en vez de
 * envolver cada inserción en `onConflictDoNothing`, porque a medias sería peor
 * que no estar: quedarían equipos sin líder y aristas colgando.
 *
 * Para regenerarlo, se borran los datos y se vuelve a sembrar (docs/08).
 */
const representativeSetExists = async (
  db: ReturnType<typeof createDb>['db'],
): Promise<boolean> => {
  const [row] = await db.select({ id: people.id }).from(people).where(eq(people.handle, 'laura'));
  return row !== undefined;
};

const seedRepresentativeSet = async (db: ReturnType<typeof createDb>['db']): Promise<void> => {
  const laura = await seedPerson(db, {
    handle: 'laura',
    displayName: 'Laura Gómez',
    headline: 'Backend + datos',
    bioRaw: 'Trabajo con Go, PostgreSQL y RAG.',
    skillSlugs: ['go', 'postgresql', 'rag', 'backend', 'data-ai'],
    availability: 'full',
    language: 'es',
  });

  const camilo = await seedPerson(db, {
    handle: 'camilo',
    displayName: 'Camilo Restrepo',
    headline: 'Frontend',
    bioRaw: 'Angular, TypeScript y un poco de Figma.',
    skillSlugs: ['angular', 'typescript', 'frontend', 'figma'],
    availability: 'full',
    language: 'es',
  });

  const nadia = await seedPerson(db, {
    handle: 'nadia',
    displayName: 'Nadia Kahn',
    headline: 'Producto',
    bioRaw: 'Pitching, investigación de usuarios y modelo de negocio.',
    skillSlugs: ['product', 'pitching', 'user-research'],
    availability: 'partial',
    language: 'en',
  });

  const santi = await seedPerson(db, {
    handle: 'santi',
    displayName: 'Santiago Ruiz',
    headline: 'Diseño de producto',
    bioRaw: 'Figma, sistemas de diseño, prototipado.',
    skillSlugs: ['figma', 'ui-design', 'design-systems'],
    availability: 'full',
    language: 'es',
  });

  const mei = await seedPerson(db, {
    handle: 'mei',
    displayName: 'Mei Zhang',
    headline: 'ML / Datos',
    bioRaw: 'Python, machine learning, visualización de datos.',
    skillSlugs: ['python', 'ml', 'data-viz', 'data-ai'],
    availability: 'evenings',
    language: 'en',
  });

  const diego = await seedPerson(db, {
    handle: 'diego',
    displayName: 'Diego Fernández',
    headline: 'Infra',
    bioRaw: 'Docker, AWS, CI/CD.',
    skillSlugs: ['docker', 'aws', 'ci-cd', 'infra'],
    availability: 'full',
    language: 'es',
  });

  const healthIdea = ideaId();
  await createIdea(db, {
    id: healthIdea,
    title: 'Health AI',
    summary: 'Asistente de triaje para clínicas rurales.',
    authorId: laura,
    eventId: DEFAULT_EVENT_ID,
  });

  // recruiting: 1/4, needs sin cubrir.
  await createTeam(db, {
    id: teamId(),
    name: 'Health AI',
    pitch: 'Asistente de triaje para clínicas rurales.',
    leadId: laura,
    ideaId: healthIdea,
    eventId: DEFAULT_EVENT_ID,
    maxSize: 4,
    needs: [
      { ...skill('go'), priority: 'required' },
      { ...skill('figma'), priority: 'nice' },
    ],
  });

  // almost_full: 3/4. Nadia lidera; Camilo y Santi ya se unieron.
  const growthTeamId = teamId();
  await createTeam(db, {
    id: growthTeamId,
    name: 'Growth Lab',
    pitch: 'Herramienta de crecimiento para founders early-stage.',
    leadId: nadia,
    ideaId: null,
    eventId: DEFAULT_EVENT_ID,
    maxSize: 4,
    needs: [{ ...skill('growth'), priority: 'required' }],
  });
  await addMember(db, growthTeamId, camilo);
  await addMember(db, growthTeamId, santi);
  await deriveAndPersistTeamStatus(db, growthTeamId, false);

  // Mei y Diego (creados arriba) quedan `looking`, sin equipo: el fondo de
  // candidatos que el matchmaker evalúa al arrancar contra las needs de
  // arriba — ninguno calza con `go`/`figma`/`growth`, a propósito: el AC-02
  // real se ejercita sembrando el par exacto, no dependiendo de este conjunto.

  console.log('[seed] conjunto representativo: 6 personas, 1 idea, 2 equipos.');
};

// Credenciales deliberadamente públicas y deterministas para probar el board
// realtime en dos navegadores. Este conjunto jamás se crea en producción.
export const BOARD_DEMO = {
  eventId: DEFAULT_EVENT_ID,
  teamId: 'tm_realtime_board',
  boardPath: `/event/${DEFAULT_EVENT_ID}/team/tm_realtime_board/board`,
  users: [
    {
      id: 'per_board_alice',
      handle: 'board_alice',
      displayName: 'Board Alice',
      recoveryCode: 'BRD001',
      sessionToken: 'dev_board_alice_session_token',
    },
    {
      id: 'per_board_bob',
      handle: 'board_bob',
      displayName: 'Board Bob',
      recoveryCode: 'BRD002',
      sessionToken: 'dev_board_bob_session_token',
    },
  ],
} as const;

const seedBoardDemo = async (db: ReturnType<typeof createDb>['db']): Promise<void> => {
  const personIds: string[] = [];

  for (const demo of BOARD_DEMO.users) {
    const [existing] = await db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.handle, demo.handle));

    const id = existing?.id ?? demo.id;
    if (!existing) {
      await createPerson(db, {
        id,
        handle: demo.handle,
        displayName: demo.displayName,
        headline: 'Realtime board tester',
        bioRaw: 'Perfil determinista para probar el tablero en dos navegadores.',
        availability: 'full',
        language: 'es',
        sessionToken: demo.sessionToken,
        recoveryCode: demo.recoveryCode,
        skills: [skill('frontend')],
      });
    } else {
      // Recuperar una cuenta rota siempre rota el session token. Re-sembrar
      // restaura las credenciales documentadas para que la demo sea repetible.
      await db
        .update(people)
        .set({
          displayName: demo.displayName,
          sessionToken: demo.sessionToken,
          recoveryCode: demo.recoveryCode,
        })
        .where(eq(people.id, id));
      await db.update(nodes).set({ label: demo.displayName }).where(eq(nodes.id, id));
    }

    await db
      .insert(eventSubscriptions)
      .values({ eventId: BOARD_DEMO.eventId, personId: id })
      .onConflictDoNothing();
    personIds.push(id);
  }

  if (!(await findTeamRow(db, BOARD_DEMO.teamId))) {
    await createTeam(db, {
      id: BOARD_DEMO.teamId,
      name: 'Realtime Board Demo',
      pitch: 'Equipo listo para probar sincronización del board en dos navegadores.',
      leadId: personIds[0]!,
      ideaId: null,
      eventId: BOARD_DEMO.eventId,
      maxSize: 4,
      needs: [],
    });
  }

  for (const id of personIds) {
    const currentTeamId = await getPersonTeamId(db, id);
    if (currentTeamId === null) await addMember(db, BOARD_DEMO.teamId, id);
    if (currentTeamId !== null && currentTeamId !== BOARD_DEMO.teamId) {
      throw new Error(`Seed board demo: ${id} ya pertenece a ${currentTeamId}.`);
    }
    await db.update(nodes).set({ status: 'teamed' }).where(eq(nodes.id, id));
  }
  await deriveAndPersistTeamStatus(db, BOARD_DEMO.teamId, false);

  console.log('[seed] board realtime listo:');
  console.log(`  URL: http://localhost:5173${BOARD_DEMO.boardPath}`);
  console.log(`  Browser A: ${BOARD_DEMO.users[0].handle} / ${BOARD_DEMO.users[0].recoveryCode}`);
  console.log(`  Browser B: ${BOARD_DEMO.users[1].handle} / ${BOARD_DEMO.users[1].recoveryCode}`);
};

/**
 * Evento abierto por defecto (ADR-013). **Obligatorio en cualquier entorno**,
 * como el vocabulario: `teams.event_id` e `ideas.event_id` son `NOT NULL` y
 * `eventId` es opcional en los payloads de creación, así que sin esta fila
 * `POST /v1/teams` falla con violación de clave foránea.
 */
const seedDefaultEvent = async (db: ReturnType<typeof createDb>['db']): Promise<void> => {
  await db
    .insert(events)
    .values({
      id: DEFAULT_EVENT_ID,
      name: 'Proyectos abiertos',
      description: 'Contenedor por defecto para todo lo que no pertenece a un hackathon.',
      kind: 'project',
      tags: [],
      startsAt: null,
      endsAt: null,
    })
    .onConflictDoNothing();
  console.log('[seed] evento abierto por defecto.');
};

const main = async (): Promise<void> => {
  const env = loadEnv();
  const { sql, db } = createDb(env.DATABASE_URL, { max: 1 });

  await seedVocabulary(db);
  await seedDefaultEvent(db);
  if (env.NODE_ENV !== 'production') {
    if (await representativeSetExists(db)) {
      console.log('[seed] conjunto representativo: ya estaba, no se toca.');
    } else {
      await seedRepresentativeSet(db);
    }
    await seedBoardDemo(db);
  }

  await sql.end();
  console.log('[seed] listo.');
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
