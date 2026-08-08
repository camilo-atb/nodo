/**
 * Tarjeta de pregunta — muestra la pregunta y 4 opciones en grid 2x2.
 * Cada opción tiene un color distinto. Al seleccionar se envía la respuesta al backend.
 */

import { useState } from 'react';
import { useChallengeStore } from '@/stores/challengeStore';
import { apiFetch } from '@/lib/api';

const OPTION_COLORS = [
  { bg: 'bg-blue-600/20 border-blue-500/40 hover:bg-blue-600/30', active: 'bg-blue-600/40 border-blue-400 ring-2 ring-blue-400/50' },
  { bg: 'bg-green/20 border-green/40 hover:bg-green/30', active: 'bg-green/40 border-green ring-2 ring-green/50' },
  { bg: 'bg-amber/20 border-amber/40 hover:bg-amber/30', active: 'bg-amber/40 border-amber ring-2 ring-amber/50' },
  { bg: 'bg-red/20 border-red/40 hover:bg-red/30', active: 'bg-red/40 border-red ring-2 ring-red/50' },
] as const;

export function QuestionCard() {
  const challengeId = useChallengeStore((s) => s.challengeId);
  const currentQuestion = useChallengeStore((s) => s.currentQuestion);
  const currentQuestionIndex = useChallengeStore((s) => s.currentQuestionIndex);
  const totalQuestions = useChallengeStore((s) => s.totalQuestions);
  const myAnswers = useChallengeStore((s) => s.myAnswers);
  const [submitting, setSubmitting] = useState(false);

  const selectedAnswer = myAnswers[currentQuestionIndex];
  const hasAnswered = selectedAnswer !== null && selectedAnswer !== undefined;

  if (!currentQuestion) return null;

  async function handleSelect(answerIndex: number) {
    if (hasAnswered || submitting || !challengeId) return;

    setSubmitting(true);
    useChallengeStore.getState().submitAnswer(currentQuestionIndex, answerIndex);

    try {
      await apiFetch(`/v1/challenges/${challengeId}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          answerIndex,
        }),
      });
    } catch {
      // Answer already recorded locally — backend failure is non-blocking
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Question number */}
      <div className="text-center">
        <span className="text-sm text-muted font-medium">
          Question {currentQuestionIndex + 1}/{totalQuestions}
        </span>
      </div>

      {/* Question text */}
      <h2 className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
        {currentQuestion.text}
      </h2>

      {/* Options grid 2x2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentQuestion.options.map((option, idx) => {
          const isSelected = selectedAnswer === idx;
          const isDimmed = hasAnswered && !isSelected;
          const colorSet = OPTION_COLORS[idx];

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={hasAnswered || submitting}
              className={`
                relative p-4 rounded-xl border text-left transition-all duration-200
                ${isSelected ? colorSet.active : colorSet.bg}
                ${isDimmed ? 'opacity-40' : ''}
                ${hasAnswered ? 'cursor-default' : 'cursor-pointer'}
                disabled:hover:opacity-100
              `}
            >
              <span className="text-sm md:text-base font-medium text-white">
                {option}
              </span>
              {isSelected && (
                <span className="absolute top-2 right-2 text-xs font-bold text-white/70">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
