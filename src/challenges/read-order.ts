import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import { SKIP_LINK_HTML, applyOrderResult, kbdChip, matchesAnswer, shuffle } from './shared.js';

function buildListHtml(items: string[], selected: number): string {
  return items
    .map(
      (item, i) =>
        `<button type="button" data-order-idx="${i}" class="order-item w-full text-left p-md rounded-lg border font-body-md ${i === selected ? 'border-primary-container bg-surface-container-high' : 'border-outline-variant bg-surface-container'}">${i + 1}. ${item}</button>`,
    )
    .join('');
}

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  const orderItems = challenge.orderItems ?? [];
  let currentOrder = shuffle([...orderItems]);
  let orderSelected = 0;

  return new Promise((resolve) => {
    let answered = false;

    const cleanup = () => document.removeEventListener('keydown', onKey);

    const done = (response: UserResponse) => {
      if (answered) return;
      answered = true;
      cleanup();
      resolve(response);
    };

    const submit = () => done({ kind: 'answer', value: currentOrder.join('|') });

    const bindList = () => {
      container
        .querySelector('#skip-link')
        ?.addEventListener('click', () => done({ kind: 'skip' }));
      container.querySelectorAll('.order-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (answered) return;
          orderSelected = parseInt((btn as HTMLElement).dataset.orderIdx || '0', 10);
          render();
        });
      });
    };

    const render = () => {
      container.innerHTML = `
      <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
        <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg">
          <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant self-center">
            <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">ORDENEN</span>
          </div>
          <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
          <div id="order-list" class="flex flex-col gap-sm w-full">${buildListHtml(currentOrder, orderSelected)}</div>
          <div id="order-feedback" class="hidden"></div>
        </div>
        ${SKIP_LINK_HTML}
        <div class="mt-xl flex justify-center items-center gap-lg">
          <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('\u2191\u2193')}<span>Move</span></div>
          <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Enter')}<span>Submit</span></div>
          <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Space')}<span>Skip</span></div>
        </div>
      </div>`;
      bindList();
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
      if (e.key === 'ArrowUp' && orderSelected > 0) {
        e.preventDefault();
        [currentOrder[orderSelected], currentOrder[orderSelected - 1]] = [
          currentOrder[orderSelected - 1],
          currentOrder[orderSelected],
        ];
        orderSelected--;
        render();
        return;
      }
      if (e.key === 'ArrowDown' && orderSelected < currentOrder.length - 1) {
        e.preventDefault();
        [currentOrder[orderSelected], currentOrder[orderSelected + 1]] = [
          currentOrder[orderSelected + 1],
          currentOrder[orderSelected],
        ];
        orderSelected++;
        render();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    };

    render();
    document.addEventListener('keydown', onKey);
  });
}

function showResult(
  container: HTMLElement,
  challenge: Challenge,
  _userAnswer: string,
  correct: boolean,
): void {
  applyOrderResult(container, challenge.correctAnswer, correct);
}

function isCorrect(challenge: Challenge, answer: string): boolean {
  return matchesAnswer(challenge.correctAnswer, answer, challenge.acceptableAnswers);
}

export const readOrderModule: ChallengeModule = { present, showResult, isCorrect };
