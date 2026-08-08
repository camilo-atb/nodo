import { z } from 'zod';
import { ApplicationDTO, IdeaDTO, PersonDTO, SuggestionDTO, TeamDTO } from './dto.js';
import { mainEnvelope, teamEnvelope, type NoGraph } from './envelope.js';
import { NeedRef, PersonId, PersonRef, PersonStatus, SkillRef, SuggestionId, TeamId, TeamStatus } from './primitives.js';

export const MAIN_CHANNEL = 'network-main';
export const teamChannel = (teamId: string): string => `team-${teamId}`;

export const PersonUpserted = mainEnvelope('person.upserted', z.object({ person: PersonDTO, skills: z.array(SkillRef) }));
export const PersonStatusChanged = mainEnvelope('person.status_changed', z.object({ personId: PersonId, status: PersonStatus, previous: PersonStatus }));
export const IdeaPublished = mainEnvelope('idea.published', z.object({ idea: IdeaDTO }));
export const TeamCreated = mainEnvelope('team.created', z.object({ team: TeamDTO }));
export const TeamUpdated = mainEnvelope('team.updated', z.object({ team: TeamDTO }));
export const TeamMemberJoined = mainEnvelope('team.member_joined', z.object({ teamId: TeamId, person: PersonRef, status: TeamStatus }));
export const TeamMemberLeft = mainEnvelope('team.member_left', z.object({ teamId: TeamId, personId: PersonId, status: TeamStatus }));
export const MatchSuggested = mainEnvelope('match.suggested', z.object({ suggestion: SuggestionDTO }));
export const MatchExpired = mainEnvelope('match.expired', z.object({ suggestionId: SuggestionId }));

export const MainEvent = z.discriminatedUnion('type', [
  PersonUpserted, PersonStatusChanged, IdeaPublished, TeamCreated, TeamUpdated,
  TeamMemberJoined, TeamMemberLeft, MatchSuggested, MatchExpired,
]);
export type MainEvent = z.infer<typeof MainEvent>;

export const ApplicationCreated = teamEnvelope('application.created', z.object({ application: ApplicationDTO }));
export const ApplicationResolved = teamEnvelope('application.resolved', z.object({ application: ApplicationDTO }));
export const TeamNeedChanged = teamEnvelope('team.need_changed', z.object({ teamId: TeamId, needs: z.array(NeedRef) }));

export const TeamEvent = z.discriminatedUnion('type', [ApplicationCreated, ApplicationResolved, TeamNeedChanged]);
export type TeamEvent = NoGraph<z.infer<typeof TeamEvent>>;
