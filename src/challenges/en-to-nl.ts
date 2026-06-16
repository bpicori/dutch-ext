import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import { applyChoiceResult, kbdChip, matchesAnswer, shuffle } from './shared.js';

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}

function buildHtml(challenge: Challenge, choices: string[]): string {
  const choicesHtml = choices
    .map(
      (choice, i) => `
      <button data-answer="${escapeAttr(choice)}" data-index="${i}" type="button"
        class="choice-btn group flex items-center justify-between w-full p-md bg-surface-container rounded-DEFAULT border border-outline-variant hover:border-primary-container hover:bg-surface-container-high transition-all">
        <span class="font-body-lg text-body-lg text-on-surface">${choice}</span>
        <span class="text-label-sm text-on-surface-variant opacity-40 group-hover:opacity-100 transition-opacity">${i + 1}</span>
      </button>`,
    )
    .join('');

  return `
    <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full rounded-DEFAULT p-lg flex flex-col items-center gap-lg relative overflow-hidden">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">Engels \u2192 Nederlands</span>
        </div>
        <div class="py-xl flex flex-col items-center">
          <h1 class="font-display-word text-display-word text-primary">${challenge.prompt}</h1>
          <p class="text-on-surface-variant font-label-sm mt-xs opacity-60">Choose the correct translation</p>
        </div>
        <div class="w-full flex flex-col gap-sm">${choicesHtml}</div>
      </div>
      <button id="skip-link" type="button" class="mt-lg font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-widest py-xs">Ik weet het niet zeker</button>
      <div class="mt-xl flex justify-center items-center gap-lg">
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('1')}<span>Choose</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('2')}</div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('3')}</div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Space')}<span>Skip</span></div>
      </div>
    </div>`;
}

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  const choices = challenge.choices;
  if (!choices?.length) {
    throw new Error(`en_to_nl challenge ${challenge.id} is missing choices`);
  }

  container.innerHTML = buildHtml(challenge, shuffle(choices));

  return new Promise((resolve) => {
    let answered = false;

    const cleanup = () => {
      document.removeEventListener('keydown', onKey);
      skipLink?.removeEventListener('click', onSkip);
      buttons.forEach((btn) => btn.removeEventListener('click', onChoice));
    };

    const done = (response: UserResponse) => {
      if (answered) return;
      answered = true;
      cleanup();
      resolve(response);
    };

    const onSkip = () => done({ kind: 'skip' });

    const onChoice = (e: Event) => {
      const answer = (e.currentTarget as HTMLElement).dataset.answer;
      if (answer) done({ kind: 'answer', value: answer });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        done({ kind: 'dismiss' });
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        done({ kind: 'skip' });
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 3) {
        e.preventDefault();
        const btn = buttons[num - 1] as HTMLElement | undefined;
        const answer = btn?.dataset.answer;
        if (answer) done({ kind: 'answer', value: answer });
      }
    };

    const skipLink = container.querySelector('#skip-link');
    const buttons = container.querySelectorAll('.choice-btn');

    skipLink?.addEventListener('click', onSkip);
    buttons.forEach((btn) => btn.addEventListener('click', onChoice));
    document.addEventListener('keydown', onKey);
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
  return matchesAnswer(challenge.correctAnswer, answer, challenge.acceptableAnswers);
}

export const enToNlModule: ChallengeModule = {
  present,
  showResult,
  isCorrect,
};
