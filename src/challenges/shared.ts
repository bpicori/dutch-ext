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
      return `<span class="text-secondary font-bold underline decoration-secondary/30 decoration-2 underline-offset-4">${word}</span>`;
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

export function kbdChip(label: string): string {
  return `<span class="bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded border border-outline-variant">${label}</span>`;
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

export function applyTypingResult(
  container: HTMLElement,
  userAnswer: string,
  correctAnswer: string,
  correct: boolean,
): void {
  const card = container.querySelector('#challenge');
  const input = container.querySelector('#typing-input') as HTMLInputElement | null;
  if (!input) return;

  input.readOnly = true;
  if (correct) {
    input.classList.add('!border-secondary-container', '!text-secondary-fixed');
    card?.classList.add('success-glow');
    playSuccess();
    return;
  }

  input.classList.add('!border-on-tertiary-container', '!text-on-tertiary', 'animate-shake');
  card?.classList.add('error-glow', 'animate-shake');
  container.querySelector('#typing-error-icon')?.classList.remove('hidden');

  const feedback = container.querySelector('#typing-feedback');
  if (feedback) {
    feedback.innerHTML = `
      <span class="font-label-sm text-label-sm text-on-tertiary-container font-bold uppercase">Correction</span>
      <p class="font-body-md text-body-md text-on-surface mt-1">${highlightDiff(userAnswer, correctAnswer)}</p>`;
    feedback.classList.remove('hidden');
  }
  playError();
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
    btn.style.pointerEvents = 'none';
    if (answer === correctAnswer) {
      btn.classList.add(
        '!bg-secondary-container',
        '!border-secondary-container',
        '!text-on-secondary-container',
      );
    } else if (answer === userAnswer) {
      btn.classList.add(
        '!bg-on-tertiary/10',
        '!border-on-tertiary-container',
        '!text-on-surface',
        'animate-shake',
      );
    } else {
      btn.classList.add('opacity-40');
    }
  });

  if (correct) {
    card?.classList.add('success-glow');
    playSuccess();
  } else {
    card?.classList.add('error-glow');
    playError();
  }
}
