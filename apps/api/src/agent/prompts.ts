import { z } from 'zod';
import type { RationaleInput, RawExtractedSkill } from './llm.js';

/** Prompts literales de docs/06. */

export const buildExtractionSystemPrompt = (vocabularyCatalog: string): string => `
Extraes habilidades técnicas de la descripción libre de un participante.

Reglas estrictas:
- Devuelve ÚNICAMENTE slugs del vocabulario proporcionado. Nunca inventes uno.
- Si el texto menciona una tecnología que no está en el vocabulario, mapéala a
  la categoría más cercana que sí esté (ej. "Svelte" → "frontend").
- Infiere las categorías amplias además de las tecnologías concretas:
  quien menciona Angular sabe "frontend"; quien menciona Go y PostgreSQL sabe "backend".
- Máximo 8 slugs. Prioriza los explícitos sobre los inferidos.
- confidence: 1.0 explícito en el texto, 0.6 inferido.

Vocabulario: ${vocabularyCatalog}

Responde solo JSON: { "skills": [{ "slug": string, "confidence": number }] }
`.trim();

export const buildExtractionUserPrompt = (bioRaw: string): string => bioRaw;

const ExtractionResponse = z.object({
  skills: z.array(z.object({ slug: z.string(), confidence: z.number() })),
});

/**
 * Valida solo la *forma*. La pertenencia al vocabulario (invariante 6) se
 * comprueba después, contra `skills ∪ skill_aliases`, y no aquí: mezclar
 * ambas cosas dejaría slugs inventados pasar si la forma es correcta.
 */
export const parseExtractionResponse = (raw: string): RawExtractedSkill[] => {
  const parsed = ExtractionResponse.safeParse(JSON.parse(raw));
  if (!parsed.success) return [];
  return parsed.data.skills;
};

export const buildRationaleSystemPrompt = (): string => `
Escribes la explicación de por qué una persona encaja en un equipo de proyecto.

- 1 o 2 frases. Máximo 220 caracteres.
- NOMBRA los skills coincidentes de forma explícita. Sin ellos la explicación no sirve.
- Tono directo y cálido. Sin superlativos ni marketing.
- No inventes datos que no estén en la entrada.
- No prometas resultados ("van a ganar", "es el match perfecto").

Responde solo JSON: { "rationale": string }
`.trim();

export const buildRationaleUserPrompt = (input: RationaleInput): string => `
Persona: ${input.personDisplayName} — ${input.personHeadline ?? 'sin headline'}
Skills: ${input.personSkills.join(', ')}
Equipo: ${input.teamName} — ${input.teamPitch ?? 'sin pitch'}
Necesita: ${input.needs.map((n) => `${n.label} (${n.priority})`).join(', ')}
Coincidencias: ${input.matchedSkillLabels.join(', ')}
Idioma común: ${input.sameLanguage ? 'sí' : 'no'}
Escribe en idioma: ${input.language}
`.trim();

const RationaleResponse = z.object({ rationale: z.string() });

export const parseRationaleResponse = (raw: string): string | undefined => {
  const parsed = RationaleResponse.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data.rationale : undefined;
};

/**
 * Validación post-LLM obligatoria (docs/06): un rationale que no nombra
 * ningún skill coincidente es un bug, no un texto flojo, y se descarta.
 */
export const rationaleNamesAMatch = (rationale: string, matchedSkillLabels: string[]): boolean =>
  matchedSkillLabels.some((label) => rationale.toLowerCase().includes(label.toLowerCase()));

/** Nunca deja al usuario sin explicación. */
export const templateRationale = (
  personDisplayName: string,
  teamName: string,
  matchedSkillLabels: string[],
): string => {
  const [first, second] = matchedSkillLabels;
  const skillsText = second ? `${first} y ${second}` : (first ?? 'sus skills');
  return `${personDisplayName} sabe ${skillsText}, justo lo que ${teamName} está buscando.`;
};

// ─── quizmaster (docs/12) ───────────────────────────────────────────────────

/**
 * Un reto mal generado **no degrada, corrompe**: su ranking decide a quién
 * ficha el líder. Por eso la validación es estricta y no hay plantilla de
 * respaldo — si el modelo no cumple, no hay reto.
 */
const ChallengeResponse = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(1).max(160),
        options: z.array(z.string().min(1).max(60)).length(4),
        correctIndex: z.number().int().min(0).max(3),
      }),
    )
    .min(1),
});

export const buildChallengeSystemPrompt = (): string =>
  [
    'Escribes preguntas de opción múltiple para evaluar una habilidad técnica concreta.',
    '',
    '- Cada pregunta con exactamente 4 opciones y una sola correcta.',
    '- Enunciado como máximo 160 caracteres. Cada opción como máximo 60.',
    '- Dificultad de práctica real, no de trivia ni de sintaxis memorizada.',
    '- Nada ambiguo: dos opciones defendibles invalidan la pregunta.',
    '- Las opciones incorrectas deben ser plausibles, no absurdas.',
    '',
    'Devuelve JSON: { "questions": [{ "text", "options": [4], "correctIndex" }] }',
  ].join('\n');

export const buildChallengeUserPrompt = (input: {
  skillSlug: string;
  skillLabel: string;
  theme: string | null;
  questionCount: number;
  language: string;
}): string =>
  [
    `Habilidad: ${input.skillLabel} (${input.skillSlug})`,
    input.theme ? `Temática: ${input.theme}` : null,
    `Número de preguntas: ${input.questionCount}`,
    `Escribe en: ${input.language}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

/**
 * Descarta las preguntas con opciones duplicadas: dos opciones idénticas
 * dejarían más de una respuesta defendible y la pregunta ya no mediría nada.
 */
export const parseChallengeResponse = (
  raw: string,
  expected: number,
): Array<{ text: string; options: [string, string, string, string]; correctIndex: number }> => {
  const parsed = ChallengeResponse.safeParse(JSON.parse(raw));
  if (!parsed.success) return [];

  return parsed.data.questions
    .filter((q) => new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4)
    .slice(0, expected)
    .map((q) => ({
      text: q.text,
      options: q.options as [string, string, string, string],
      correctIndex: q.correctIndex,
    }));
};
