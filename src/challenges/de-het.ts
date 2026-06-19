import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import { applyChoiceResult, bindChallengeSession, kbdChip, normalizeAnswer } from './shared.js';

function buildHtml(challenge: Challenge): string {
  return `
    <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full rounded-DEFAULT p-lg flex flex-col items-center gap-lg relative overflow-hidden">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">DE / HET</span>
        </div>
        <div class="py-xl flex flex-col items-center">
          <h1 class="font-display-word text-display-word text-primary lowercase">${challenge.prompt}</h1>
        </div>
        <div class="w-full grid grid-cols-2 gap-md">
          <button data-answer="de" type="button" class="choice-btn btn-active group relative flex flex-col items-center justify-center py-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant rounded-lg transition-all">
            <span class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">DE</span>
          </button>
          <button data-answer="het" type="button" class="choice-btn btn-active group relative flex flex-col items-center justify-center py-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant rounded-lg transition-all">
            <span class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">HET</span>
          </button>
        </div>
      </div>
      <button id="skip-link" type="button" class="mt-lg font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-widest py-xs">Ik weet het niet zeker</button>
      <div class="mt-xl flex justify-center items-center gap-lg">
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('\u2190')}<span>DE</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('\u2192')}<span>HET</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Space')}<span>Skip</span></div>
      </div>
    </div>`;
}

function present(container: HTMLElement, challenge: Challenge) {
  container.innerHTML = buildHtml(challenge);

  return new Promise<UserResponse>((resolve) => {
    const { done } = bindChallengeSession(resolve, {
      skipOnEnter: true,
      onKey(e) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          done({ kind: 'answer', value: 'de' });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          done({ kind: 'answer', value: 'het' });
        }
      },
    });

    const onChoice = (e: Event) => {
      const answer = (e.currentTarget as HTMLElement).dataset.answer;
      if (answer) done({ kind: 'answer', value: answer });
    };

    container.querySelector('#skip-link')?.addEventListener('click', () => done({ kind: 'skip' }));
    container.querySelectorAll('.choice-btn').forEach((btn) => btn.addEventListener('click', onChoice));
  });
}

function showResult(
  container: HTMLElement,
  challenge: Challenge,
  userAnswer: string,
  correct: boolean,
): void {
  applyChoiceResult(container, challenge.correctAnswer, userAnswer, correct);
}

function isCorrect(challenge: Challenge, answer: string): boolean {
  return normalizeAnswer(answer) === normalizeAnswer(challenge.correctAnswer);
}

export const deHetModule: ChallengeModule = {
  present,
  showResult,
  isCorrect,
};