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

const BUILT_PLACEHOLDER_HTML =
  '<span class="word-built-placeholder text-on-surface-variant opacity-40 font-label-sm">Click words to build the sentence</span>';

function buildPoolHtml(wordPool: string[]): string {
  return wordPool
    .map(
      (w, i) =>
        `<button type="button" data-word-idx="${i}" class="word-pool-btn px-md py-sm rounded-full border border-outline-variant bg-surface-container font-body-md transition-transform duration-150 active:scale-95">${w}</button>`,
    )
    .join('');
}

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

    const submit = () => {
      if (wordPool.length > 0 || wordBuilt.length === 0) return;
      done({ kind: 'answer', value: wordBuilt.join(' ') });
    };

    const updateSubmitButton = () => {
      const submitBtn = container.querySelector('#word-submit') as HTMLButtonElement | null;
      if (!submitBtn) return;
      const complete = wordPool.length === 0 && wordBuilt.length > 0;
      submitBtn.classList.toggle('hidden', !complete);
      submitBtn.disabled = !complete;
    };

    const reindexPoolButtons = () => {
      const activeButtons = [...container.querySelectorAll('.word-pool-btn')].filter(
        (btn) => !btn.classList.contains('animate-word-out'),
      );
      activeButtons.forEach((btn, i) => {
        (btn as HTMLElement).dataset.wordIdx = String(i);
      });
    };

    const addWordToBuilt = (word: string) => {
      const builtEl = container.querySelector('#word-built');
      if (!builtEl) return;
      builtEl.querySelector('.word-built-placeholder')?.remove();
      const span = document.createElement('span');
      span.className =
        'word-built-token px-sm py-xs bg-primary-container/20 rounded font-body-md animate-word-in';
      span.textContent = word;
      builtEl.appendChild(span);
    };

    const clearBuilt = () => {
      const builtEl = container.querySelector('#word-built');
      if (!builtEl) return;
      builtEl.innerHTML = BUILT_PLACEHOLDER_HTML;
    };

    const bindPool = () => {
      container.querySelectorAll('.word-pool-btn').forEach((btn) => {
        btn.addEventListener('click', onPoolClick);
      });
    };

    const onPoolClick = (e: Event) => {
      if (answered) return;
      const btn = e.currentTarget as HTMLButtonElement;
      const idx = parseInt(btn.dataset.wordIdx || '0', 10);
      const word = wordPool.splice(idx, 1)[0];
      if (!word) return;
      wordBuilt.push(word);

      btn.disabled = true;
      btn.classList.add('animate-word-out');
      reindexPoolButtons();
      btn.addEventListener('animationend', () => btn.remove(), { once: true });

      addWordToBuilt(word);
      updateSubmitButton();
    };

    const onClear = () => {
      if (answered) return;
      wordPool.push(...wordBuilt);
      wordBuilt = [];
      clearBuilt();
      const poolEl = container.querySelector('#word-pool');
      if (poolEl) {
        poolEl.innerHTML = buildPoolHtml(wordPool);
        bindPool();
      }
      updateSubmitButton();
    };

    const renderShell = () => {
      container.innerHTML = `
      <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
        <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg">
          <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant self-center">
            <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">WOORDVOLGORDE</span>
          </div>
          <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
          <div id="word-built" class="min-h-[3rem] p-md border border-dashed border-outline-variant rounded-DEFAULT flex flex-wrap gap-xs items-center">${BUILT_PLACEHOLDER_HTML}</div>
          <div id="word-pool" class="flex flex-wrap gap-sm justify-center">${buildPoolHtml(wordPool)}</div>
          <button type="button" id="word-clear" class="text-label-sm text-on-surface-variant hover:text-on-surface">Clear</button>
          <button type="button" id="word-submit" class="hidden w-full py-md rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity btn-active">
            Controleer
          </button>
          <div id="word-feedback" class="hidden"></div>
        </div>
        ${SKIP_LINK_HTML}
        <div class="mt-xl flex justify-center items-center gap-lg">
          <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Enter')}<span>Submit</span></div>
          <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Space')}<span>Skip</span></div>
        </div>
      </div>`;

      container.querySelector('#skip-link')?.addEventListener('click', () => done({ kind: 'skip' }));
      container.querySelector('#word-clear')?.addEventListener('click', onClear);
      container.querySelector('#word-submit')?.addEventListener('click', submit);
      bindPool();
      updateSubmitButton();
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
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    };

    renderShell();
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