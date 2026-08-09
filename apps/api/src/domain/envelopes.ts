import {
  AGENT_DISPLAY_NAME,
  AGENT_ID,
  QUIZMASTER_DISPLAY_NAME,
  QUIZMASTER_ID,
  edgeId,
  type ActorRef,
  type BoardCard,
  type ChallengeEvent,
  type ChallengeQuestion,
  type LeaderboardRow,
  type ApplicationDTO,
  type GraphPatch,
  type IdeaDTO,
  type MainEvent,
  type NeedRef,
  type PersonDTO,
  type PersonRef,
  type PersonStatus,
  type SkillRef,
  type SuggestionDTO,
  type TeamDTO,
  type TeamEvent,
} from '@nodo/contracts';
import { eventId } from './ids.js';
import { forEnvelope } from './mappers.js';

/**
 * Construcción de sobres. Un solo sitio sabe qué parche de grafo acompaña a
 * cada evento.
 *
 * Está en `domain/` a propósito: no importa Hono ni el cliente de Portal, así
 * que las pruebas afirman sobre el sobre emitido sin levantar nada (docs/10).
 * Un handler que escribe en Postgres pero olvida el parche pasa cualquier
 * prueba de base de datos y rompe la interfaz; esto es lo que lo detecta.
 */

export const agentActor: ActorRef = {
  kind: 'agent',
  id: AGENT_ID,
  displayName: AGENT_DISPLAY_NAME,
};

export const personActor = (person: PersonRef): ActorRef => ({
  kind: 'person',
  id: person.id,
  handle: person.handle,
  displayName: person.displayName,
});

const base = (actor: ActorRef, at = Date.now()) => ({
  v: 1 as const,
  id: eventId(),
  at,
  actor,
});

// ─── Parches ────────────────────────────────────────────────────────────────

const personNode = (person: PersonDTO) => ({
  id: person.id,
  kind: 'person' as const,
  label: person.displayName,
  status: person.status,
  meta: { handle: person.handle, headline: person.headline, availability: person.availability },
});

const teamNode = (team: TeamDTO) => ({
  id: team.id,
  kind: 'team' as const,
  label: team.name,
  status: team.status,
  meta: {
    pitch: team.pitch,
    maxSize: team.maxSize,
    memberCount: team.memberCount,
    eventId: team.eventId,
  },
});

const skillEdges = (personId: string, skills: SkillRef[]) =>
  skills.map((skill) => ({
    id: edgeId('has_skill', personId, skill.slug),
    kind: 'has_skill' as const,
    from: personId,
    to: skill.slug,
  }));

const needEdges = (teamId: string, needs: NeedRef[]) =>
  needs.map((need) => ({
    id: edgeId('needs', teamId, need.slug),
    kind: 'needs' as const,
    from: teamId,
    to: need.slug,
    weight: need.priority === 'required' ? 2 : 1,
    meta: { priority: need.priority },
  }));

const teamPatch = (team: TeamDTO, removedNeedSlugs: string[] = []): GraphPatch => ({
  nodes: [teamNode(team)],
  edges: [
    { id: edgeId('leads', team.lead.id, team.id), kind: 'leads', from: team.lead.id, to: team.id },
    ...team.members.map((member) => ({
      id: edgeId('member_of', member.id, team.id),
      kind: 'member_of' as const,
      from: member.id,
      to: team.id,
    })),
    ...needEdges(team.id, team.needs),
  ],
  removeEdges: removedNeedSlugs.map((slug) => edgeId('needs', team.id, slug)),
});

// ─── event-{eventId} ────────────────────────────────────────────────────────

export const personUpserted = (
  person: PersonDTO,
  skills: SkillRef[],
  removedSkillSlugs: string[] = [],
): MainEvent => ({
  ...base(personActor(person)),
  type: 'person.upserted',
  payload: { person, skills },
  summary: {
    text: `${person.displayName} se sumó a la red`,
    icon: '👤',
    refs: [{ kind: 'person', id: person.id, label: person.displayName }],
  },
  graph: {
    nodes: [personNode(person)],
    edges: skillEdges(person.id, skills),
    removeEdges: removedSkillSlugs.map((slug) => edgeId('has_skill', person.id, slug)),
  },
});

export const personStatusChanged = (
  person: PersonDTO,
  previous: PersonStatus,
): MainEvent => ({
  ...base(personActor(person)),
  type: 'person.status_changed',
  payload: { personId: person.id, status: person.status, previous },
  summary: {
    text:
      person.status === 'looking'
        ? `${person.displayName} está buscando equipo`
        : `${person.displayName} ya no está buscando`,
    icon: person.status === 'looking' ? '🔎' : '🌙',
    refs: [{ kind: 'person', id: person.id, label: person.displayName }],
  },
  graph: { nodes: [personNode(person)] },
});

export const ideaPublished = (idea: IdeaDTO): MainEvent => ({
  ...base(personActor(idea.author)),
  type: 'idea.published',
  payload: { idea },
  summary: {
    text: `${idea.author.displayName} publicó la idea ${idea.title}`,
    icon: '💡',
    refs: [
      { kind: 'person', id: idea.author.id, label: idea.author.displayName },
      { kind: 'idea', id: idea.id, label: idea.title },
    ],
  },
  graph: {
    nodes: [{
      id: idea.id,
      kind: 'idea',
      label: idea.title,
      meta: { summary: idea.summary, eventId: idea.eventId },
    }],
    edges: [
      {
        id: edgeId('authored', idea.author.id, idea.id),
        kind: 'authored',
        from: idea.author.id,
        to: idea.id,
      },
    ],
  },
});

export const teamCreated = (team: TeamDTO): MainEvent => ({
  ...base(personActor(team.lead)),
  type: 'team.created',
  payload: { team: forEnvelope(team) },
  summary: {
    text: `${team.lead.displayName} creó el equipo ${team.name}`,
    icon: '🚀',
    refs: [
      { kind: 'person', id: team.lead.id, label: team.lead.displayName },
      { kind: 'team', id: team.id, label: team.name },
    ],
  },
  graph: teamPatch(team),
});

export const teamUpdated = (
  team: TeamDTO,
  actor: ActorRef,
  removedNeedSlugs: string[] = [],
): MainEvent => ({
  ...base(actor),
  type: 'team.updated',
  payload: { team: forEnvelope(team) },
  summary: {
    text: `${team.name} actualizó lo que busca`,
    icon: '🧩',
    refs: [{ kind: 'team', id: team.id, label: team.name }],
  },
  graph: teamPatch(team, removedNeedSlugs),
});

export const teamMemberJoined = (
  team: TeamDTO,
  person: PersonRef,
  personStatus: PersonStatus,
): MainEvent => ({
  ...base(personActor(person)),
  type: 'team.member_joined',
  payload: { teamId: team.id, person, status: team.status },
  summary: {
    text: `${person.displayName} se unió a ${team.name}`,
    icon: '🤝',
    refs: [
      { kind: 'person', id: person.id, label: person.displayName },
      { kind: 'team', id: team.id, label: team.name },
    ],
  },
  graph: {
    nodes: [
      teamNode(team),
      { id: person.id, kind: 'person', label: person.displayName, status: personStatus },
    ],
    edges: [
      {
        id: edgeId('member_of', person.id, team.id),
        kind: 'member_of',
        from: person.id,
        to: team.id,
      },
    ],
  },
});

export const teamMemberLeft = (
  team: TeamDTO,
  person: PersonRef,
  personStatus: PersonStatus,
): MainEvent => ({
  ...base(personActor(person)),
  type: 'team.member_left',
  payload: { teamId: team.id, personId: person.id, status: team.status },
  summary: {
    text: `${person.displayName} salió de ${team.name}`,
    icon: '👋',
    refs: [
      { kind: 'person', id: person.id, label: person.displayName },
      { kind: 'team', id: team.id, label: team.name },
    ],
  },
  graph: {
    nodes: [
      teamNode(team),
      { id: person.id, kind: 'person', label: person.displayName, status: personStatus },
    ],
    edges: [],
    removeEdges: [edgeId('member_of', person.id, team.id)],
  },
});

/**
 * La arista usa el id de la sugerencia, no uno derivado del par: así
 * `match.expired` puede retirarla con el `suggestionId` que ya lleva en su
 * payload, y la segunda fase de la publicación es un upsert sobre la misma
 * arista, que es lo que hace que el texto se enriquezca en sitio (docs/06).
 */
export const matchSuggested = (suggestion: SuggestionDTO): MainEvent => ({
  ...base(agentActor),
  type: 'match.suggested',
  payload: { suggestion },
  summary: {
    text: `MatchMaker sugirió conectar a ${suggestion.personName} con ${suggestion.teamName}`,
    icon: '🔗',
    refs: [
      { kind: 'person', id: suggestion.personId, label: suggestion.personName },
      { kind: 'team', id: suggestion.teamId, label: suggestion.teamName },
    ],
  },
  graph: {
    edges: [
      {
        id: suggestion.id,
        kind: 'suggested',
        from: suggestion.personId,
        to: suggestion.teamId,
        weight: suggestion.score,
        transient: true,
        expiresAt: suggestion.expiresAt,
      },
    ],
  },
});

export const matchExpired = (suggestionId: string): MainEvent => ({
  ...base(agentActor),
  type: 'match.expired',
  payload: { suggestionId },
  summary: { text: 'Una sugerencia caducó', icon: '⌛', refs: [] },
  graph: { removeEdges: [suggestionId] },
});

// ─── team-{teamId} ──────────────────────────────────────────────────────────
// Sin `graph`: las applications no aparecen en el grafo público (ADR-010).

export const applicationCreated = (application: ApplicationDTO): TeamEvent => ({
  ...base(personActor(application.person)),
  type: 'application.created',
  payload: { application },
  summary: {
    text: `${application.person.displayName} quiere unirse a ${application.teamName}`,
    icon: '✋',
    refs: [
      { kind: 'person', id: application.person.id, label: application.person.displayName },
      { kind: 'team', id: application.teamId, label: application.teamName },
    ],
  },
});

export const applicationResolved = (
  application: ApplicationDTO,
  actor: ActorRef,
): TeamEvent => ({
  ...base(actor),
  type: 'application.resolved',
  payload: { application },
  summary: {
    text:
      application.status === 'accepted'
        ? `${application.person.displayName} entró a ${application.teamName}`
        : `Se resolvió una solicitud en ${application.teamName}`,
    icon: application.status === 'accepted' ? '✅' : '📮',
    refs: [
      { kind: 'person', id: application.person.id, label: application.person.displayName },
      { kind: 'team', id: application.teamId, label: application.teamName },
    ],
  },
});

export const teamNeedChanged = (
  team: TeamDTO,
  actor: ActorRef,
): TeamEvent => ({
  ...base(actor),
  type: 'team.need_changed',
  payload: { teamId: team.id, needs: team.needs },
  summary: {
    text: `${team.name} actualizó sus necesidades`,
    icon: '🧩',
    refs: [{ kind: 'team', id: team.id, label: team.name }],
  },
});

// ─── Tablero (docs/11) ──────────────────────────────────────────────────────
// Van por `team-{teamId}`, el canal que ya existe (ADR-015). Son `TeamEvent`,
// así que `graph?: never` impide adjuntarles un parche en compilación.

/** El sobre no lleva `myVote`: lo leen varias personas a la vez (docs/11). */
const publicCard = ({ myVote: _mine, ...card }: BoardCard): BoardCard => card;

export const boardCardCreated = (actor: ActorRef, card: BoardCard): TeamEvent => ({
  ...base(actor),
  type: 'board.card_created',
  payload: { card: publicCard(card) },
  summary: {
    text: 'Nueva tarjeta en el tablero',
    icon: '📝',
    refs: [],
  },
});

export const boardCardMoved = (
  actor: ActorRef,
  cardId: string,
  x: number,
  y: number,
): TeamEvent => ({
  ...base(actor),
  type: 'board.card_moved',
  payload: { cardId, x, y },
  summary: { text: 'Una tarjeta cambió de sitio', icon: '↔️', refs: [] },
});

export const boardCardUpdated = (actor: ActorRef, cardId: string, content: string): TeamEvent => ({
  ...base(actor),
  type: 'board.card_updated',
  payload: { cardId, content },
  summary: { text: 'Una tarjeta cambió de texto', icon: '✏️', refs: [] },
});

export const boardVoteCast = (
  actor: ActorRef,
  cardId: string,
  personId: string,
  votes: number,
): TeamEvent => ({
  ...base(actor),
  type: 'board.vote_cast',
  payload: { cardId, personId, votes },
  summary: { text: 'Alguien votó una tarjeta', icon: '👍', refs: [] },
});

export const boardVoteRemoved = (
  actor: ActorRef,
  cardId: string,
  personId: string,
  votes: number,
): TeamEvent => ({
  ...base(actor),
  type: 'board.vote_removed',
  payload: { cardId, personId, votes },
  summary: { text: 'Alguien retiró su voto', icon: '↩️', refs: [] },
});

export const boardWinnerSelected = (actor: ActorRef, cardId: string): TeamEvent => ({
  ...base(actor),
  type: 'board.winner_selected',
  payload: { cardId },
  summary: { text: 'El equipo eligió una idea ganadora', icon: '🏆', refs: [] },
});

// ─── Reto (docs/12) ─────────────────────────────────────────────────────────
// Los publica `quizmaster`, actor de dominio con identidad propia en el feed.

const quizmasterActor: ActorRef = {
  kind: 'agent',
  id: QUIZMASTER_ID,
  displayName: QUIZMASTER_DISPLAY_NAME,
};

/** `endsAt` es el plazo como dato (ADR-012). Nadie programa un temporizador. */
export const challengeQuestionRevealed = (
  questionIndex: number,
  question: ChallengeQuestion,
  endsAt: number,
): ChallengeEvent => ({
  ...base(quizmasterActor),
  type: 'challenge.question_revealed',
  payload: { questionIndex, question, endsAt },
  summary: { text: `Pregunta ${questionIndex + 1}`, icon: '⏱️', refs: [] },
});

/**
 * `correctIndex` aparece aquí y en ningún sitio antes: cuando este sobre se
 * publica, la pregunta ya cerró para todos y revelarla deja de ser una
 * filtración (docs/12).
 */
export const challengeLeaderboardUpdate = (
  questionIndex: number,
  correctIndex: number,
  rankings: LeaderboardRow[],
): ChallengeEvent => ({
  ...base(quizmasterActor),
  type: 'challenge.leaderboard_update',
  payload: { questionIndex, correctIndex, rankings },
  summary: { text: 'Ranking actualizado', icon: '📊', refs: [] },
});

export const challengeEnded = (rankings: LeaderboardRow[]): ChallengeEvent => ({
  ...base(quizmasterActor),
  type: 'challenge.ended',
  payload: { rankings },
  summary: { text: 'El reto terminó', icon: '🏁', refs: [] },
});
