import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  SKIP_LINK_HTML,
  applyWordOrderResult,
  highlightDiff,
  kbdChip,
  matchesAnswer,
  shuffle,
} from './shared.js';

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  let wordPool = shuffle(challenge.orderItems ?? []);
  let wordBuilt: string[] = [];

  return new Promise((resolve) => {
    let answered = false;

    const cleanup = () => document.removeEventListener('keydown', onKey);

    const done = (response: UserResponse) => {
      if (answered) return;
      answered = true;
      cleanup();
      resolve(response);
    };

    const bindInteractions = () => {
      container
        .querySelector('#skip-link')
        ?.addEventListener('click', () => done({ kind: 'skip' }));
      container.querySelector('#word-clear')?.addEventListener('click', () => {
        if (answered) return;
        wordPool.push(...wordBuilt);
        wordBuilt = [];
        render();
      });
      container.querySelectorAll('.word-pool-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (answered) return;
          const idx = parseInt((btn as HTMLElement).dataset.wordIdx || '0', 10);
          const word = wordPool.splice(idx, 1)[0];
          if (word) {
            wordBuilt.push(word);
            render();
          }
        });
      });
    };

    const render = () => {
      const builtHtml = wordBuilt.length
        ? wordBuilt
            .map(
              (w) =>
                `<span class="px-sm py-xs bg-primary-container/20 rounded font-body-md">${w}</span>`,
            )
            .join(' ')
        : '<span class="text-on-surface-variant opacity-40 font-label-sm">Click words to build the sentence</span>';

      const poolHtml = wordPool
        .map(
          (w, i) =>
            `<button type="button" data-word-idx="${i}" class="word-pool-btn px-md py-sm rounded-full border border-outline-variant bg-surface-container font-body-md">${w}</button>`,
        )
        .join('');

      container.innerHTML = `
      <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
        <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg">
          <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant self-center">
            <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">WOORDVOLGORDE</span>
          </div>
          <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
          <div id="word-built" class="min-h-[3rem] p-md border border-dashed border-outline-variant rounded-DEFAULT flex flex-wrap gap-xs items-center">${builtHtml}</div>
          <div id="word-pool" class="flex flex-wrap gap-sm justify-center">${poolHtml}</div>
          <button type="button" id="word-clear" class="text-label-sm text-on-surface-variant hover:text-on-surface">Clear</button>
          <div id="word-feedback" class="hidden"></div>
        </div>
        ${SKIP_LINK_HTML}
        <div class="mt-xl flex justify-center items-center gap-lg">
          <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Enter')}<span>Submit</span></div>
          <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Space')}<span>Skip</span></div>
        </div>
      </div>`;
      bindInteractions();
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
        return;
      }
      if (e.key === 'Enter' && wordBuilt.length > 0) {
        e.preventDefault();
        done({ kind: 'answer', value: wordBuilt.join(' ') });
      }
    };

    render();
    document.addEventListener('keydown', onKey);
  });
}

function showResult(
  container: HTMLElement,
  challenge: Challenge,
  userAnswer: string,
  correct: boolean,
): void {
  applyWordOrderResult(container, correct);
  if (correct) return;
  const feedback = container.querySelector('#word-feedback');
  if (feedback) {
    feedback.innerHTML = `<p class="text-sm text-on-surface-variant">Correct: <span class="text-secondary">${highlightDiff(userAnswer, challenge.correctAnswer)}</span></p>`;
    feedback.classList.remove('hidden');
  }
}

function isCorrect(challenge: Challenge, answer: string): boolean {
  return matchesAnswer(challenge.correctAnswer, answer, challenge.acceptableAnswers);
}

export const wordOrderModule: ChallengeModule = { present, showResult, isCorrect };
