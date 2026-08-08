import { z } from 'zod';
import { ApplicationId, ApplicationStatus, Availability, EpochMs, Handle, IdeaId, LanguageCode, MAX_TEAM_SIZE, NeedRef, PersonId, PersonRef, PersonStatus, SuggestionDirection, SuggestionId, TeamId, TeamStatus } from './primitives.js';

export const PersonDTO = z.object({
  id: PersonId, handle: Handle, displayName: z.string().min(1), headline: z.string().nullable(),
  bio: z.string().nullable(), availability: Availability, language: LanguageCode,
  status: PersonStatus, teamId: TeamId.nullable(), createdAt: EpochMs,
});
export type PersonDTO = z.infer<typeof PersonDTO>;

export const TeamDTO = z.object({
  id: TeamId, name: z.string().min(1), pitch: z.string().nullable(), status: TeamStatus,
  lead: PersonRef, members: z.array(PersonRef).min(1).max(MAX_TEAM_SIZE), needs: z.array(NeedRef),
  ideaId: IdeaId.nullable(), maxSize: z.number().int().min(1).max(MAX_TEAM_SIZE), createdAt: EpochMs,
});
export type TeamDTO = z.infer<typeof TeamDTO>;

export const IdeaDTO = z.object({
  id: IdeaId, title: z.string().min(1), summary: z.string().nullable(), author: PersonRef,
  teamId: TeamId.nullable(), interestedCount: z.number().int().nonnegative(), createdAt: EpochMs,
});
export type IdeaDTO = z.infer<typeof IdeaDTO>;

export const ApplicationDTO = z.object({
  id: ApplicationId, person: PersonRef, teamId: TeamId, teamName: z.string().min(1),
  leadId: PersonId, status: ApplicationStatus, message: z.string().nullable(),
  createdAt: EpochMs, resolvedAt: EpochMs.nullable(),
});
export type ApplicationDTO = z.infer<typeof ApplicationDTO>;

export const SuggestionDTO = z.object({
  id: SuggestionId, personId: PersonId, personName: z.string().min(1), teamId: TeamId,
  teamName: z.string().min(1), score: z.number().nonnegative(), direction: SuggestionDirection,
  matchedSkills: z.array(NeedRef).min(1), rationale: z.string().min(1), expiresAt: EpochMs, createdAt: EpochMs,
});
export type SuggestionDTO = z.infer<typeof SuggestionDTO>;
