import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import { applyTypingResult, kbdChip, matchesAnswer } from './shared.js';

function buildHtml(challenge: Challenge): string {
  return `
    <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full rounded-DEFAULT py-xl px-lg flex flex-col items-center gap-lg relative overflow-hidden">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">ZIN AFMAKEN</span>
        </div>
        <p class="font-label-sm text-label-sm text-on-surface-variant opacity-60 uppercase w-full">Fill in the blank</p>
        <h1 class="font-display-sentence text-display-sentence text-on-surface w-full text-center">${challenge.prompt}</h1>
        <input id="typing-input" type="text" autocomplete="off" spellcheck="false"
          class="w-full bg-surface-container-low border-b-2 border-outline-variant text-on-surface font-body-lg py-sm focus:outline-none focus:border-primary-container"
          placeholder="Type the missing word...">
        <div id="typing-error-icon" class="hidden"><span class="material-symbols-outlined text-on-tertiary-container">error</span></div>
        <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT w-full"></div>
      </div>
      <button id="skip-link" type="button" class="mt-lg font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-widest py-xs">Ik weet het niet zeker</button>
      <div class="mt-xl flex justify-center items-center gap-lg">
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Enter')}<span>Submit</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Space')}<span>Skip</span></div>
      </div>
    </div>`;
}

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  container.innerHTML = buildHtml(challenge);

  return new Promise((resolve) => {
    let answered = false;
    const input = container.querySelector('#typing-input') as HTMLInputElement;
    input?.focus();

    const cleanup = () => {
      document.removeEventListener('keydown', onKey);
      skipLink?.removeEventListener('click', onSkip);
      input?.removeEventListener('keydown', onInputKey);
    };

    const done = (response: UserResponse) => {
      if (answered) return;
      answered = true;
      cleanup();
      resolve(response);
    };

    const submit = () => {
      const value = input?.value.trim();
      if (!value) return;
      done({ kind: 'answer', value });
    };

    const onSkip = () => done({ kind: 'skip' });

    const onInputKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        done({ kind: 'skip' });
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        done({ kind: 'dismiss' });
        return;
      }
      if (e.key === ' ') {
        e.preventDefault();
        done({ kind: 'skip' });
      }
    };

    const skipLink = container.querySelector('#skip-link');
    skipLink?.addEventListener('click', onSkip);
    input?.addEventListener('keydown', onInputKey);
    document.addEventListener('keydown', onKey);
  });
}

function showResult(
  container: HTMLElement,
  challenge: Challenge,
  userAnswer: string,
  correct: boolean,
): void {
  applyTypingResult(container, userAnswer, challenge.correctAnswer, correct);
}

function isCorrect(challenge: Challenge, answer: string): boolean {
  return matchesAnswer(challenge.correctAnswer, answer, challenge.acceptableAnswers);
}

export const completeSentenceModule: ChallengeModule = {
  present,
  showResult,
  isCorrect,
};
