import type { UserResponse } from './types.js';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
  }
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  vol: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

export { escapeAttr, kbdChip, kbdFooter, skipLink } from '../ui/primitives.js';

export function speak(text: string, lang = 'nl-NL'): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.75;
  window.speechSynthesis.speak(utterance);
}

export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

export function matchesAnswer(
  correctAnswer: string,
  answer: string,
  acceptableAnswers: string[] = [],
): boolean {
  const normalized = normalizeAnswer(answer);
  return [correctAnswer, ...acceptableAnswers].some(
    (candidate) => normalizeAnswer(candidate) === normalized,
  );
}

export function highlightDiff(userAnswer: string, correctAnswer: string): string {
  const userWords = userAnswer.trim().split(/\s+/);
  const correctWords = correctAnswer.trim().split(/\s+/);
  return correctWords
    .map((word, i) => {
      const u = userWords[i]?.toLowerCase().replace(/[.,!?]/g, '');
      const c = word.toLowerCase().replace(/[.,!?]/g, '');
      if (u === c) return word;
      return `<span class="text-success font-semibold underline decoration-success/30 decoration-2 underline-offset-4">${word}</span>`;
    })
    .join(' ');
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function playSuccess(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => tone(ctx, freq, now + i * 0.09, 0.12, 0.08));
}

export function playError(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  tone(ctx, 200, now, 0.15, 0.08);
  tone(ctx, 150, now + 0.12, 0.15, 0.06);
}

function applyCardGlow(card: Element | null, correct: boolean, shake = false): void {
  if (!card) return;
  if (correct) {
    card.classList.add('success-glow');
    playSuccess();
    return;
  }
  card.classList.add('error-glow');
  if (shake) card.classList.add('animate-shake');
  playError();
}

export function applyOrderResult(
  container: HTMLElement,
  correctAnswer: string,
  correct: boolean,
): void {
  const card = container.querySelector('#challenge');
  container.querySelectorAll('.order-item').forEach((el) => {
    const item = el as HTMLElement;
    item.draggable = false;
    item.style.pointerEvents = 'none';
    item.classList.remove('cursor-grab');
  });
  const submitBtn = container.querySelector('#order-submit') as HTMLButtonElement | null;
  if (submitBtn) submitBtn.disabled = true;
  applyCardGlow(card, correct, true);
  if (correct) return;
  const feedback = container.querySelector('#order-feedback');
  if (feedback) {
    feedback.innerHTML = `<p class="text-sm text-muted">Correct order: <span class="text-success font-editorial">${correctAnswer.split('|').join(' \u2192 ')}</span></p>`;
    feedback.classList.remove('hidden');
  }
}

export function applyWordOrderResult(container: HTMLElement, correct: boolean): void {
  const card = container.querySelector('#challenge');
  container.querySelectorAll('.word-pool-btn, #word-clear, #word-submit').forEach((el) => {
    (el as HTMLButtonElement).style.pointerEvents = 'none';
    (el as HTMLButtonElement).disabled = true;
  });
  applyCardGlow(card, correct, true);
}

export function applyMatchResult(container: HTMLElement, matchPairs: number[]): void {
  const allCorrect = matchPairs.every((c, i) => c === i);
  const card = container.querySelector('#challenge');
  applyCardGlow(card, allCorrect, true);

  const leftSel = '#read-match-left .match-left-btn';
  const rightSel = '#read-match-right .choice-btn';

  container.querySelectorAll(leftSel).forEach((btn, i) => {
    const el = btn as HTMLElement;
    el.classList.add(matchPairs[i] === i ? 'border-success' : 'border-error');
  });

  container.querySelectorAll(rightSel).forEach((btn) => {
    const el = btn as HTMLElement;
    const idx = parseInt(el.dataset.choice || '-1', 10);
    const speakerIdx = matchPairs.indexOf(idx);
    if (speakerIdx < 0) return;
    const ok = speakerIdx === idx;
    el.className = `choice-btn w-full text-center p-sm rounded-lg border ${ok ? 'choice-btn--correct' : 'choice-btn--wrong'}`;
  });

  container.querySelector('#match-lines')!.innerHTML = '';
}

export type ChallengeSessionOptions = {
  onKey?: (e: KeyboardEvent) => void;
  skipOnEnter?: boolean;
};

export function bindChallengeSession(
  resolve: (response: UserResponse) => void,
  options: ChallengeSessionOptions = {},
): { done: (response: UserResponse) => void; isAnswered: () => boolean } {
  let answered = false;

  const cleanup = () => {
    document.removeEventListener('keydown', onKey);
  };

  const done = (response: UserResponse) => {
    if (answered) return;
    answered = true;
    cleanup();
    resolve(response);
  };

  const onKey = (e: KeyboardEvent) => {
    if (answered) return;
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
    if (e.key === 'Enter' && options.skipOnEnter) {
      e.preventDefault();
      done({ kind: 'skip' });
      return;
    }
    options.onKey?.(e);
  };

  document.addEventListener('keydown', onKey);
  return { done, isAnswered: () => answered };
}

export function updateMatchLines(container: HTMLElement, matchPairs: number[]): void {
  const svg = container.querySelector('#match-lines');
  const card = container.querySelector('#challenge');
  if (!svg || !card) return;

  const cardRect = card.getBoundingClientRect();
  svg.setAttribute('width', String(card.clientWidth));
  svg.setAttribute('height', String(card.clientHeight));
  svg.innerHTML = '';

  matchPairs.forEach((choiceIdx, speakerIdx) => {
    if (choiceIdx === -1) return;
    const speakerBtn = container.querySelector(`[data-speaker="${speakerIdx}"]`);
    const choiceBtn = container.querySelector(`[data-choice="${choiceIdx}"]`);
    if (!speakerBtn || !choiceBtn) return;

    const sRect = speakerBtn.getBoundingClientRect();
    const cRect = choiceBtn.getBoundingClientRect();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(sRect.right - cardRect.left));
    line.setAttribute('y1', String(sRect.top + sRect.height / 2 - cardRect.top));
    line.setAttribute('x2', String(cRect.left - cardRect.left));
    line.setAttribute('y2', String(cRect.top + cRect.height / 2 - cardRect.top));
    line.setAttribute('class', 'match-line');
    svg.appendChild(line);
  });
}

export function bindMcqPresent(container: HTMLElement): Promise<import('./types.js').UserResponse> {
  return new Promise((resolve) => {
    let answered = false;

    const cleanup = () => {
      document.removeEventListener('keydown', onKey);
      skipLink?.removeEventListener('click', onSkip);
      buttons.forEach((btn) => btn.removeEventListener('click', onChoice));
      replayBtn?.removeEventListener('click', onReplay);
    };

    const done = (response: import('./types.js').UserResponse) => {
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
    const onReplay = () => {
      const audio = container.dataset.promptAudio;
      if (audio) speak(audio);
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
    const replayBtn = container.querySelector('#replay-audio');

    skipLink?.addEventListener('click', onSkip);
    buttons.forEach((btn) => btn.addEventListener('click', onChoice));
    replayBtn?.addEventListener('click', onReplay);
    document.addEventListener('keydown', onKey);
  });
}

export function applyChoiceResult(
  container: HTMLElement,
  correctAnswer: string,
  userAnswer: string,
  correct: boolean,
): void {
  const card = container.querySelector('#challenge');
  const buttons = container.querySelectorAll('.choice-btn') as NodeListOf<HTMLElement>;

  buttons.forEach((btn) => {
    const answer = btn.dataset.answer;
    const grid = btn.classList.contains('choice-btn--grid') ? ' choice-btn--grid' : '';
    if (answer === correctAnswer) {
      btn.className = `choice-btn choice-btn--correct${grid}`;
    } else if (answer === userAnswer) {
      btn.className = `choice-btn choice-btn--wrong${grid}`;
    } else {
      btn.className = `choice-btn choice-btn--muted${grid}`;
    }
  });

  applyCardGlow(card, correct);
}
