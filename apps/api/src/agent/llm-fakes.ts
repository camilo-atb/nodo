import type { DraftQuestion, LlmProvider, RationaleInput, RawExtractedSkill } from './llm.js';

/** Borrador válido por defecto: 4 opciones distintas y un índice en rango. */
const draft = (n: number): DraftQuestion[] =>
  Array.from({ length: n }, (_, i) => ({
    text: `Pregunta ${i + 1}`,
    options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`] as [string, string, string, string],
    correctIndex: i % 4,
  }));

/**
 * Los tres dobles de docs/10. `HallucinatingLlm` y `FailingLlm` importan más
 * que `FakeLlm`: cubren las rutas que en producción aparecen bajo fallo y que
 * nunca se ejercitan a mano.
 */

/** Camino feliz: respuesta fija y válida. */
export class FakeLlm implements LlmProvider {
  constructor(
    private readonly skills: RawExtractedSkill[] = [],
    private readonly rationale = 'Rationale de prueba.',
  ) {}

  async extractSkills(): Promise<RawExtractedSkill[]> {
    return this.skills;
  }

  async writeRationale(): Promise<string> {
    return this.rationale;
  }

  async generateChallenge(input: { questionCount: number }): Promise<DraftQuestion[]> {
    return draft(input.questionCount);
  }
}

/** Devuelve slugs fuera del vocabulario: verifica que la validación posterior los descarta. */
export class HallucinatingLlm implements LlmProvider {
  async extractSkills(): Promise<RawExtractedSkill[]> {
    return [
      { slug: 'cobol-avanzado', confidence: 1.0 },
      { slug: 'go', confidence: 1.0 },
    ];
  }

  async writeRationale(input: RationaleInput): Promise<string> {
    return `${input.personDisplayName} es LA MEJOR PERSONA DEL MUNDO, van a ganar seguro.`;
  }

  /** Opciones duplicadas: la validación posterior debe descartar la pregunta. */
  async generateChallenge(): Promise<DraftQuestion[]> {
    return [
      {
        text: '¿Cuál es la respuesta?',
        options: ['igual', 'igual', 'igual', 'igual'],
        correctIndex: 0,
      },
    ];
  }
}

/** Lanza excepción o excede el timeout: verifica que entra el fallback de plantilla. */
export class FailingLlm implements LlmProvider {
  constructor(private readonly mode: 'throw' | 'hang' = 'throw') {}

  async extractSkills(): Promise<RawExtractedSkill[]> {
    if (this.mode === 'hang') await new Promise(() => {});
    throw new Error('El proveedor de LLM no está disponible.');
  }

  async writeRationale(): Promise<string> {
    if (this.mode === 'hang') await new Promise(() => {});
    throw new Error('El proveedor de LLM no está disponible.');
  }

  async generateChallenge(): Promise<DraftQuestion[]> {
    if (this.mode === 'hang') await new Promise(() => {});
    throw new Error('El proveedor de LLM no está disponible.');
  }
}
