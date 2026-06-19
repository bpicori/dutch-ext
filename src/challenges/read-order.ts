import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  SKIP_LINK_HTML,
  applyOrderResult,
  bindChallengeSession,
  kbdChip,
  matchesAnswer,
  shuffle,
} from './shared.js';

function buildListHtml(items: string[]): string {
  return items
    .map(
      (item, i) =>
        `<div draggable="true" data-order-idx="${i}" class="order-item flex items-center gap-sm w-full p-md rounded-lg border border-outline-variant bg-surface-container cursor-grab active:cursor-grabbing transition-all duration-150 select-none">
      <span class="material-symbols-outlined text-on-surface-variant opacity-50 shrink-0 pointer-events-none" style="font-size: 20px">drag_indicator</span>
      <span class="order-item-text flex-1 text-left font-body-md">${i + 1}. ${item}</span>
    </div>`,
    )
    .join('');
}

function createOrderListController(
  container: HTMLElement,
  initialOrder: string[],
  isAnswered: () => boolean,
): { getOrder: () => string[]; disable: () => void } {
  let currentOrder = [...initialOrder];
  let dragIndex: number | null = null;

  const clearDropTargets = () => {
    container.querySelectorAll('.order-item').forEach((el) => {
      el.classList.remove('border-primary-container', 'bg-surface-container-high', 'scale-[1.01]');
    });
  };

  const refreshItemLabels = () => {
    container.querySelectorAll('.order-item').forEach((el, i) => {
      const item = el as HTMLElement;
      item.dataset.orderIdx = String(i);
      const textEl = item.querySelector('.order-item-text');
      if (textEl) textEl.textContent = `${i + 1}. ${currentOrder[i]}`;
    });
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const [item] = currentOrder.splice(from, 1);
    currentOrder.splice(to, 0, item);

    const listEl = container.querySelector('#order-list');
    if (!listEl) return;
    const nodes = [...listEl.querySelectorAll('.order-item')] as HTMLElement[];
    const movedNode = nodes[from];
    const targetNode = nodes[to];
    if (!movedNode || !targetNode) return;

    if (from < to) {
      listEl.insertBefore(movedNode, targetNode.nextSibling);
    } else {
      listEl.insertBefore(movedNode, targetNode);
    }
    refreshItemLabels();
  };

  container.querySelectorAll('.order-item').forEach((el) => {
    const item = el as HTMLElement;

    item.addEventListener('dragstart', (e) => {
      if (isAnswered()) return;
      dragIndex = parseInt(item.dataset.orderIdx || '0', 10);
      item.classList.add('opacity-50', 'scale-[0.98]');
      e.dataTransfer?.setData('text/plain', String(dragIndex));
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('opacity-50', 'scale-[0.98]');
      clearDropTargets();
      dragIndex = null;
    });

    item.addEventListener('dragover', (e) => {
      if (isAnswered() || dragIndex === null) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      clearDropTargets();
      item.classList.add('border-primary-container', 'bg-surface-container-high', 'scale-[1.01]');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('border-primary-container', 'bg-surface-container-high', 'scale-[1.01]');
    });

    item.addEventListener('drop', (e) => {
      if (isAnswered() || dragIndex === null) return;
      e.preventDefault();
      const to = parseInt(item.dataset.orderIdx || '0', 10);
      clearDropTargets();
      reorder(dragIndex, to);
    });
  });

  return {
    getOrder: () => [...currentOrder],
    disable: () => {
      container.querySelectorAll('.order-item').forEach((el) => {
        const item = el as HTMLElement;
        item.draggable = false;
        item.style.pointerEvents = 'none';
        item.classList.remove('cursor-grab');
      });
    },
  };
}

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  const orderItems = challenge.orderItems ?? [];
  const shuffled = shuffle([...orderItems]);

  container.innerHTML = `
    <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant self-center">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">ORDENEN</span>
        </div>
        <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
        <div id="order-list" class="flex flex-col gap-sm w-full">${buildListHtml(shuffled)}</div>
        <button type="button" id="order-submit" class="w-full py-md rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity btn-active">
          Controleer
        </button>
        <div id="order-feedback" class="hidden"></div>
      </div>
      ${SKIP_LINK_HTML}
      <div class="mt-xl flex justify-center items-center gap-lg">
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60"><span class="material-symbols-outlined" style="font-size: 16px">drag_indicator</span><span>Drag to reorder</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Enter')}<span>Submit</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${kbdChip('Space')}<span>Skip</span></div>
      </div>
    </div>`;

  return new Promise((resolve) => {
    const { done, isAnswered } = bindChallengeSession(resolve, {
      onKey(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      },
    });

    const orderList = createOrderListController(container, shuffled, isAnswered);
    const submit = () => done({ kind: 'answer', value: orderList.getOrder().join('|') });

    container.querySelector('#skip-link')?.addEventListener('click', () => done({ kind: 'skip' }));
    container.querySelector('#order-submit')?.addEventListener('click', submit);
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