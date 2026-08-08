/**
 * Segunda costura de docs/07 y docs/10, junto a `PortalPublisher`.
 *
 * Toda llamada a un modelo pasa por esta interfaz (ADR-007). La salida
 * estructurada usa `response_format: json_object` + validación Zod
 * obligatoria en `prompts.ts`, no *tool use*: es lo que se comporta igual en
 * todos los proveedores compatibles con OpenAI.
 */
export type RawExtractedSkill = { slug: string; confidence: number };

export type RationaleInput = {
  personDisplayName: string;
  personHeadline: string | null;
  personSkills: string[];
  teamName: string;
  teamPitch: string | null;
  needs: Array<{ label: string; priority: 'required' | 'nice' }>;
  matchedSkillLabels: string[];
  sameLanguage: boolean;
  language: string;
};

/**
 * Entrada de `quizmaster` (docs/12).
 *
 * `quizmaster` es un **actor del dominio**, no una credencial: comparte esta
 * misma interfaz, la misma `LLM_API_KEY` y el mismo `LLM_MODEL` que el
 * matchmaker. Lo único que añade es este tercer método.
 */
export type ChallengeInput = {
  skillSlug: string;
  skillLabel: string;
  theme: string | null;
  questionCount: number;
  language: string;
};

export type DraftQuestion = {
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
};

export interface LlmProvider {
  extractSkills(text: string): Promise<RawExtractedSkill[]>;
  writeRationale(input: RationaleInput): Promise<string>;
  /**
   * Genera el borrador de un reto. **No hay fallback de plantilla**: a
   * diferencia del rationale, una pregunta mal generada no degrada un texto,
   * corrompe la selección. Si falla, no hay reto (docs/12).
   */
  generateChallenge(input: ChallengeInput): Promise<DraftQuestion[]>;
}
