import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  challengeLabel,
  challengeLayout,
  dutchPromptWord,
  kbdFooter,
} from '../ui/primitives.js';
import { applyChoiceResult, bindChallengeSession, normalizeAnswer } from './shared.js';

function buildHtml(challenge: Challenge): string {
  const cardBody = `${challengeLabel('DE / HET')}
    <div class="prompt-area">
      ${dutchPromptWord(challenge.prompt, 'lowercase')}
    </div>
    <div class="w-full grid grid-cols-2 gap-md">
      <button data-answer="de" type="button" class="choice-btn choice-btn--grid btn-active group">
        <span class="type-headline-md text-ink group-hover:text-accent transition-colors">DE</span>
      </button>
      <button data-answer="het" type="button" class="choice-btn choice-btn--grid btn-active group">
        <span class="type-headline-md text-ink group-hover:text-accent transition-colors">HET</span>
      </button>
    </div>`;

  const footer = kbdFooter([
    { key: '\u2190', label: 'DE' },
    { key: '\u2192', label: 'HET' },
    { key: 'Space', label: 'Skip' },
  ]);

  return challengeLayout(cardBody, footer);
}

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  container.innerHTML = buildHtml(challenge);

  return new Promise((resolve) => {
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