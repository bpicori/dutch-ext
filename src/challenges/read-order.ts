import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  challengeLabel,
  challengeLayout,
  dutchPromptSentence,
  kbdFooter,
  primaryButton,
} from '../ui/primitives.js';
import { applyOrderResult, bindChallengeSession, matchesAnswer, shuffle } from './shared.js';

function buildListHtml(items: string[]): string {
  return items
    .map(
      (item, i) =>
        `<div draggable="true" data-order-idx="${i}" class="order-item flex items-center gap-sm w-full p-md rounded-lg border border-border bg-card cursor-grab active:cursor-grabbing transition-all duration-150 select-none">
      <span class="material-symbols-outlined text-muted opacity-50 shrink-0 pointer-events-none" style="font-size: 20px">drag_indicator</span>
      <span class="order-item-text flex-1 text-left type-body-md text-ink">${i + 1}. ${item}</span>
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
      el.classList.remove('border-accent', 'bg-card-hover', 'scale-[1.01]');
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
      item.classList.add('border-accent', 'bg-card-hover', 'scale-[1.01]');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('border-accent', 'bg-card-hover', 'scale-[1.01]');
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

  const cardBody = `${challengeLabel('ORDENEN')}
    <div class="prompt-area py-sm">${dutchPromptSentence(challenge.prompt)}</div>
    <div id="order-list" class="flex flex-col gap-sm w-full">${buildListHtml(shuffled)}</div>
    ${primaryButton('order-submit', 'Controleer')}
    <div id="order-feedback" class="hidden"></div>`;

  const footer = kbdFooter([
    { key: '', icon: 'drag_indicator', label: 'Drag to reorder' },
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
