import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  SKIP_LINK_HTML,
  applyMatchResult,
  bindChallengeSession,
  kbdChip,
  shuffle,
  updateMatchLines,
} from './shared.js';

function buildHtml(
  challenge: Challenge,
  matchPairs: number[],
  matchActive: number,
  matchShuffle: number[],
  leftItems: string[],
  rightItems: string[],
): string {
  const leftHtml = leftItems
    .map((item, i) => {
      const matched = matchPairs[i] !== -1;
      const active = i === matchActive && !matched;
      let cls = 'bg-surface-container border border-outline-variant opacity-60';
      if (matched) cls = 'bg-secondary-container/10 border border-secondary-container/40';
      else if (active) cls = 'bg-surface-container-high border border-primary-container/30';
      return `<button data-speaker="${i}" type="button" class="match-left-btn w-full text-left p-sm rounded-lg border ${cls} font-body-md" ${matched ? 'disabled' : ''}>${item}</button>`;
    })
    .join('');

  const rightHtml = matchShuffle
    .map((origIdx) => {
      const text = rightItems[origIdx];
      const taken = matchPairs.includes(origIdx);
      const cls = taken
        ? 'bg-secondary-container text-on-secondary-container pointer-events-none'
        : 'bg-surface-container border border-outline-variant';
      return `<button data-choice="${origIdx}" type="button" class="choice-btn w-full text-center p-sm rounded-lg border ${cls}">
        <span class="font-body-md">${text}</span></button>`;
    })
    .join('');

  const contextHtml = challenge.context
    ? `<div class="max-h-24 overflow-y-auto p-sm bg-surface-container-low rounded text-sm text-on-surface-variant">${challenge.context}</div>`
    : '';

  return `
    <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center" data-match-pairs="${JSON.stringify(matchPairs)}">
      <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg relative">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant self-center">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">MATCHEN</span>
        </div>
        <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
        ${contextHtml}
        <svg id="match-lines" class="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg"></svg>
        <div class="grid grid-cols-2 gap-md relative z-10">
          <div id="read-match-left" class="flex flex-col gap-sm">${leftHtml}</div>
          <div id="read-match-right" class="flex flex-col gap-sm">${rightHtml}</div>
        </div>
      </div>
      ${SKIP_LINK_HTML}
      <div class="mt-xl flex justify-center items-center gap-lg">
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('1-3')}<span>Select</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Space')}<span>Skip</span></div>
      </div>
    </div>`;
}

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  const leftItems = challenge.matchLeft ?? [];
  const rightItems = challenge.matchRight ?? [];
  const total = leftItems.length;
  const matchPairs = Array(total).fill(-1);
  let matchActive = 0;
  let matchCount = 0;
  const matchShuffle = shuffle(rightItems.map((_, i) => i));

  return new Promise((resolve) => {
    const { done, isAnswered } = bindChallengeSession(resolve, {
      skipOnEnter: true,
      onKey(e) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= total) {
          e.preventDefault();
          matchActive = num - 1;
          render();
        }
      },
    });

    const finish = () => {
      const allCorrect = matchPairs.every((c, i) => c === i);
      const wrapper = container.querySelector('#challenge-wrapper') as HTMLElement;
      wrapper.dataset.matchPairs = JSON.stringify(matchPairs);
      done({ kind: 'answer', value: allCorrect ? 'ok' : 'fail' });
    };

    const bindInteractions = () => {
      container.querySelector('#skip-link')?.addEventListener('click', () => done({ kind: 'skip' }));

      container.querySelectorAll('.match-left-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (isAnswered()) return;
          matchActive = parseInt((btn as HTMLElement).dataset.speaker || '0', 10);
          render();
        });
      });

      container.querySelectorAll('.choice-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (isAnswered()) return;
          const choiceIdx = parseInt((btn as HTMLElement).dataset.choice || '-1', 10);
          if (choiceIdx < 0 || matchPairs.includes(choiceIdx)) return;
          matchPairs[matchActive] = choiceIdx;
          matchCount++;
          if (matchCount >= total) finish();
          else {
            const next = matchPairs.findIndex((p) => p === -1);
            if (next >= 0) matchActive = next;
            render();
          }
        });
      });
    };

    const render = () => {
      container.innerHTML = buildHtml(
        challenge,
        matchPairs,
        matchActive,
        matchShuffle,
        leftItems,
        rightItems,
      );
      bindInteractions();
      requestAnimationFrame(() => updateMatchLines(container, matchPairs));
    };

    render();
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