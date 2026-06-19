import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  badgePill,
  challengeLayout,
  kbdFooter,
  primaryButton,
} from '../ui/primitives.js';
import {
  applyWordOrderResult,
  bindChallengeSession,
  highlightDiff,
  matchesAnswer,
  shuffle,
} from './shared.js';

const BUILT_PLACEHOLDER_HTML =
  '<span class="word-built-placeholder text-on-surface-variant opacity-40 type-label-sm">Click words to build the sentence</span>';

function buildPoolHtml(wordPool: string[]): string {
  return wordPool
    .map(
      (w, i) =>
        `<button type="button" data-word-idx="${i}" class="word-pool-btn px-md py-sm rounded-full border border-outline-variant bg-surface-container type-body-md transition-transform duration-150 active:scale-95">${w}</button>`,
    )
    .join('');
}

function createWordPoolController(
  container: HTMLElement,
  initialPool: string[],
  isAnswered: () => boolean,
): {
  getBuiltSentence: () => string | null;
  bindPool: () => void;
  bindClear: () => void;
  bindSubmit: (submit: () => void) => void;
} {
  let wordPool = [...initialPool];
  let wordBuilt: string[] = [];

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
      'word-built-token px-sm py-xs bg-primary-container/20 rounded type-body-md animate-word-in';
    span.textContent = word;
    builtEl.appendChild(span);
  };

  const clearBuilt = () => {
    const builtEl = container.querySelector('#word-built');
    if (!builtEl) return;
    builtEl.innerHTML = BUILT_PLACEHOLDER_HTML;
  };

  const onPoolClick = (e: Event) => {
    if (isAnswered()) return;
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
    if (isAnswered()) return;
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

  const bindPool = () => {
    container.querySelectorAll('.word-pool-btn').forEach((btn) => {
      btn.addEventListener('click', onPoolClick);
    });
  };

  updateSubmitButton();

  return {
    getBuiltSentence: () => {
      if (wordPool.length > 0 || wordBuilt.length === 0) return null;
      return wordBuilt.join(' ');
    },
    bindPool,
    bindClear: () => {
      container.querySelector('#word-clear')?.addEventListener('click', onClear);
    },
    bindSubmit: (submit) => {
      container.querySelector('#word-submit')?.addEventListener('click', submit);
    },
  };
}

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  const wordPool = shuffle(challenge.orderItems ?? []);

  const cardBody = `${badgePill('WOORDVOLGORDE')}
    <p class="type-body-md text-on-surface text-center">${challenge.prompt}</p>
    <div id="word-built" class="min-h-[3rem] p-md border border-dashed border-outline-variant rounded-DEFAULT flex flex-wrap gap-xs items-center">${BUILT_PLACEHOLDER_HTML}</div>
    <div id="word-pool" class="flex flex-wrap gap-sm justify-center">${buildPoolHtml(wordPool)}</div>
    <button type="button" id="word-clear" class="text-label-sm text-on-surface-variant hover:text-on-surface">Clear</button>
    ${primaryButton('word-submit', 'Controleer', true)}
    <div id="word-feedback" class="hidden"></div>`;

  const footer = kbdFooter([
    { key: 'Enter', label: 'Submit' },
    { key: 'Space', label: 'Skip' },
  ]);

  container.innerHTML = challengeLayout(cardBody, footer);

  return new Promise((resolve) => {
    const { done, isAnswered } = bindChallengeSession(resolve, {
      onKey(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      },
    });

    const pool = createWordPoolController(container, wordPool, isAnswered);
    const submit = () => {
      const sentence = pool.getBuiltSentence();
      if (sentence) done({ kind: 'answer', value: sentence });
    };

    container.querySelector('#skip-link')?.addEventListener('click', () => done({ kind: 'skip' }));
    pool.bindPool();
    pool.bindClear();
    pool.bindSubmit(submit);
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