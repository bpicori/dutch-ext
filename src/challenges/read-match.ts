import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  challengeLabel,
  challengeShell,
  dutchPromptSentence,
  kbdFooter,
} from '../ui/primitives.js';
import { applyMatchResult, bindChallengeSession, shuffle, updateMatchLines } from './shared.js';

const LEFT_IDLE = 'bg-card border border-border opacity-70';
const LEFT_ACTIVE = 'bg-card-hover border border-accent/50';
const LEFT_MATCHED = 'bg-success-dim/20 border border-success/40';
const RIGHT_IDLE = 'bg-card border border-border';
const RIGHT_TAKEN = 'bg-success-dim border-success text-ink pointer-events-none';
const LEFT_BASE = 'match-left-btn w-full text-left p-sm rounded-lg border type-body-md';
const RIGHT_BASE = 'choice-btn w-full text-center p-sm rounded-lg border';

function leftBtnClass(matched: boolean, active: boolean): string {
  if (matched) return `${LEFT_BASE} ${LEFT_MATCHED}`;
  if (active) return `${LEFT_BASE} ${LEFT_ACTIVE}`;
  return `${LEFT_BASE} ${LEFT_IDLE}`;
}

function rightBtnClass(taken: boolean): string {
  return `${RIGHT_BASE} ${taken ? RIGHT_TAKEN : RIGHT_IDLE}`;
}

function buildShellHtml(
  challenge: Challenge,
  matchShuffle: number[],
  leftItems: string[],
  rightItems: string[],
): string {
  const leftHtml = leftItems
    .map((item, i) => {
      const cls = i === 0 ? LEFT_ACTIVE : LEFT_IDLE;
      return `<button data-speaker="${i}" type="button" class="${LEFT_BASE} ${cls}">${item}</button>`;
    })
    .join('');

  const rightHtml = matchShuffle
    .map((origIdx) => {
      const text = rightItems[origIdx];
      return `<button data-choice="${origIdx}" type="button" class="${RIGHT_BASE} ${RIGHT_IDLE}">
        <span class="type-body-md">${text}</span></button>`;
    })
    .join('');

  const contextHtml = challenge.context
    ? `<div class="context-block mb-sm"><p class="context-block__text text-sm">${challenge.context}</p></div>`
    : '';

  const cardBody = `${challengeLabel('MATCHEN')}
    <div class="prompt-area py-sm">${dutchPromptSentence(challenge.prompt)}</div>
    ${contextHtml}
    <svg id="match-lines" class="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg"></svg>
    <div class="grid grid-cols-2 gap-md relative z-10">
      <div id="read-match-left" class="flex flex-col gap-sm">${leftHtml}</div>
      <div id="read-match-right" class="flex flex-col gap-sm">${rightHtml}</div>
    </div>`;

  const footer = kbdFooter([
    { key: '1-3', label: 'Select' },
    { key: 'Space', label: 'Skip' },
  ]);

  return challengeShell(
    `<div id="challenge" class="challenge-card">${cardBody}</div>
    <button id="skip-link" type="button" class="skip-link">Ik weet het niet zeker</button>
    <button id="ignore-link" type="button" class="skip-link">Ignore</button>
    ${footer}`,
    ' data-match-pairs="[]"',
  );
}

type MatchController = {
  setActiveRow: (index: number) => void;
  pairChoice: (choiceIdx: number) => boolean;
  getMatchPairs: () => number[];
  syncLines: () => void;
};

function createMatchController(container: HTMLElement, total: number): MatchController {
  const matchPairs = Array(total).fill(-1);
  let matchActive = 0;
  let matchCount = 0;

  const updateLeftButtons = () => {
    container.querySelectorAll('.match-left-btn').forEach((btn, i) => {
      const el = btn as HTMLButtonElement;
      const matched = matchPairs[i] !== -1;
      const active = i === matchActive && !matched;
      el.className = leftBtnClass(matched, active);
      el.disabled = matched;
    });
  };

  const markRightTaken = (choiceIdx: number) => {
    const btn = container.querySelector(`[data-choice="${choiceIdx}"]`) as HTMLButtonElement | null;
    if (btn) btn.className = rightBtnClass(true);
  };

  return {
    setActiveRow(index: number) {
      matchActive = index;
      updateLeftButtons();
    },

    pairChoice(choiceIdx: number) {
      if (choiceIdx < 0 || matchPairs.includes(choiceIdx)) return false;
      matchPairs[matchActive] = choiceIdx;
      matchCount++;
      updateLeftButtons();
      markRightTaken(choiceIdx);
      this.syncLines();
      if (matchCount >= total) return true;
      const next = matchPairs.findIndex((p) => p === -1);
      if (next >= 0) matchActive = next;
      updateLeftButtons();
      return false;
    },

    getMatchPairs: () => [...matchPairs],

    syncLines: () => {
      requestAnimationFrame(() => updateMatchLines(container, matchPairs));
    },
  };
}

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  const leftItems = challenge.matchLeft ?? [];
  const rightItems = challenge.matchRight ?? [];
  const total = leftItems.length;
  const matchShuffle = shuffle(rightItems.map((_, i) => i));

  container.innerHTML = buildShellHtml(challenge, matchShuffle, leftItems, rightItems);
  const controller = createMatchController(container, total);

  return new Promise((resolve) => {
    const { done, isAnswered } = bindChallengeSession(resolve, {
      skipOnEnter: true,
      onKey(e) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= total) {
          e.preventDefault();
          controller.setActiveRow(num - 1);
        }
      },
    });

    const finish = () => {
      const matchPairs = controller.getMatchPairs();
      const allCorrect = matchPairs.every((c, i) => c === i);
      const wrapper = container.querySelector('#challenge-wrapper') as HTMLElement;
      wrapper.dataset.matchPairs = JSON.stringify(matchPairs);
      done({ kind: 'answer', value: allCorrect ? 'ok' : 'fail' });
    };

    container.querySelector('#skip-link')?.addEventListener('click', () => done({ kind: 'skip' }));

    container.addEventListener('click', (e) => {
      if (isAnswered()) return;
      const target = e.target as HTMLElement;

      const leftBtn = target.closest('.match-left-btn') as HTMLButtonElement | null;
      if (leftBtn && !leftBtn.disabled) {
        controller.setActiveRow(parseInt(leftBtn.dataset.speaker || '0', 10));
        return;
      }

      const rightBtn = target.closest('.choice-btn') as HTMLButtonElement | null;
      if (!rightBtn) return;
      const choiceIdx = parseInt(rightBtn.dataset.choice || '-1', 10);
      if (controller.pairChoice(choiceIdx)) finish();
    });
  });
}

function showResult(
  container: HTMLElement,
  _challenge: Challenge,
  _userAnswer: string,
  _correct: boolean,
): void {
  const wrapper = container.querySelector('#challenge-wrapper') as HTMLElement | null;
  const matchPairs: number[] = wrapper?.dataset.matchPairs
    ? JSON.parse(wrapper.dataset.matchPairs)
    : [];
  applyMatchResult(container, matchPairs);
}

function isCorrect(_challenge: Challenge, answer: string): boolean {
  return answer === 'ok';
}

export const readMatchModule: ChallengeModule = { present, showResult, isCorrect };
