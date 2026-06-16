import { Challenge, ChallengeProgress } from './types.js';

export type AnswerCallback = (answer: string) => void;
export type DismissCallback = () => void;

export interface ShowContext {
  cardProgress: ChallengeProgress;
}

const SPACING_MAX = 9;

export class Renderer {
  private onAnswer: AnswerCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private currentChallenge: Challenge | null = null;
  private answered = false;
  private handler: ((e: KeyboardEvent) => void) | null = null;
  private ctx: ShowContext | null = null;

  renderShell(): void {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="glow-overlay"></div>
      <header class="fixed top-0 left-0 w-full z-50 flex items-center px-container-padding py-md bg-transparent">
        <div class="flex items-center gap-xs text-display-sentence font-display-sentence text-on-surface">
          <span class="material-symbols-outlined text-primary-container" style="font-variation-settings: 'FILL' 1;">local_florist</span>
          <span class="font-bold tracking-tight">WachtNederlands</span>
        </div>
      </header>
      <main class="relative z-10 min-h-screen flex items-center justify-center px-container-padding">
        <div id="challenge-area" class="w-full max-w-[420px] flex flex-col items-center"></div>
      </main>
      <footer id="footer-hint" class="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center gap-lg px-container-padding py-xl bg-transparent"></footer>
    `;
  }

  clearDom(): void {
    document.getElementById('challenge-wrapper')?.remove();
  }

  dismiss(): void {
    this.unbindKeys();
    const el = document.getElementById('challenge-wrapper');
    if (!el) return;
    el.classList.add('animate-slide-out');
    el.addEventListener('animationend', () => {
      el.remove();
      (document.activeElement as HTMLElement)?.blur?.();
    });
  }

  show(
    challenge: Challenge,
    ctx: ShowContext,
    onAnswer: AnswerCallback,
    onDismiss: DismissCallback,
  ): void {
    this.onAnswer = onAnswer;
    this.onDismiss = onDismiss;
    this.ctx = ctx;
    this.currentChallenge = challenge;
    this.answered = false;

    this.clearDom();

    const area = document.getElementById('challenge-area');
    if (!area) return;
    area.innerHTML = this.renderDeHet(challenge);

    this.setFooter();
    this.bindKeys();
    this.bindDeHet();
  }

  showResult(
    challenge: Challenge,
    userAnswer: string,
    correct: boolean,
    onContinue?: () => void,
  ): void {
    this.unbindKeys();
    this.resultChoice(challenge, userAnswer, correct);
    if (onContinue) this.injectContinueButton(onContinue);
  }

  private renderDeHet(c: Challenge): string {
    const streaks = this.ctx?.cardProgress.consecutiveStreaks ?? 0;
    return `
      <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
        <div id="challenge" class="glass-card w-full rounded-DEFAULT p-lg flex flex-col items-center gap-lg relative overflow-hidden">
          <div class="w-full flex justify-between items-center">
            <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant">
              <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">DE / HET</span>
            </div>
            <div class="flex items-center gap-xs text-on-surface">
              <span class="text-lg">\uD83D\uDD25</span>
              <span class="font-headline-md text-headline-md">${streaks}</span>
            </div>
          </div>
          <div class="py-xl flex flex-col items-center">
            <h1 class="font-display-word text-display-word text-primary lowercase">${c.prompt}</h1>
          </div>
          <div class="w-full grid grid-cols-2 gap-md">
            <button data-answer="de" type="button" class="choice-btn btn-active group relative flex flex-col items-center justify-center py-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant rounded-lg transition-all">
              <span class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">DE</span>
            </button>
            <button data-answer="het" type="button" class="choice-btn btn-active group relative flex flex-col items-center justify-center py-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant rounded-lg transition-all">
              <span class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">HET</span>
            </button>
          </div>
          ${this.renderProgressBar(streaks)}
        </div>
        <button id="skip-link" type="button" class="mt-lg font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-widest py-xs">Ik weet het niet zeker</button>
      </div>`;
  }

  private keyDeHet(e: KeyboardEvent): boolean {
    if (this.answered) return false;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.answered = true;
      this.onAnswer?.('de');
      return true;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.answered = true;
      this.onAnswer?.('het');
      return true;
    }
    return false;
  }

  private bindDeHet(): void {
    document.getElementById('skip-link')?.addEventListener('click', () => {
      this.unbindKeys();
      this.onDismiss?.();
    });
    this.bindChoiceButtons();
  }

  private setFooter(): void {
    const footer = document.getElementById('footer-hint');
    if (!footer) return;
    footer.innerHTML = `
      <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${this.kbdChip('\u2190')}<span>DE</span></div>
      <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${this.kbdChip('\u2192')}<span>HET</span></div>
      <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${this.kbdChip('Space')}<span>Skip</span></div>`;
  }

  private bindKeys(): void {
    this.handler = (e: KeyboardEvent) => this.handleKey(e);
    document.addEventListener('keydown', this.handler);
  }

  private unbindKeys(): void {
    if (this.handler) {
      document.removeEventListener('keydown', this.handler);
      this.handler = null;
    }
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.unbindKeys();
      this.onDismiss?.();
      return;
    }

    if (this.keyDeHet(e)) return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.unbindKeys();
      this.onDismiss?.();
    }
  }

  private bindChoiceButtons(): void {
    document.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        const answer = (btn as HTMLElement).dataset.answer;
        if (!answer) return;
        this.answered = true;
        this.onAnswer?.(answer);
      });
    });
  }

  private resultChoice(c: Challenge, userAnswer: string, correct: boolean): void {
    const buttons = document.querySelectorAll('.choice-btn') as NodeListOf<HTMLElement>;
    const card = document.getElementById('challenge');
    buttons.forEach((btn) => {
      const answer = btn.dataset.answer;
      btn.style.pointerEvents = 'none';
      if (answer === c.correctAnswer) {
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
      this.playSuccess();
    } else {
      card?.classList.add('error-glow');
      this.playError();
    }
  }

  private injectContinueButton(onContinue: () => void): void {
    const card = document.getElementById('challenge');
    if (!card) {
      this.waitForContinue(onContinue);
      return;
    }
    document.getElementById('continue-btn')?.remove();
    const btn = document.createElement('button');
    btn.id = 'continue-btn';
    btn.className =
      'mt-md w-full bg-primary-container hover:opacity-90 active:scale-[0.98] transition-all duration-200 text-on-primary-container py-md rounded-full font-headline-md text-headline-md flex justify-center items-center gap-xs inner-glow';
    btn.innerHTML = 'Continue <span class="material-symbols-outlined">arrow_forward</span>';
    card.appendChild(btn);
    this.waitForContinue(onContinue, btn);
  }

  private waitForContinue(cb: () => void, btn?: HTMLElement): void {
    const handler = () => {
      document.removeEventListener('keydown', onKey);
      btn?.removeEventListener('click', onClick);
      cb();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    };
    const onClick = (e: Event) => {
      e.stopPropagation();
      handler();
    };
    document.addEventListener('keydown', onKey);
    btn?.addEventListener('click', onClick);
  }

  private progressPercent(streaks: number): number {
    return Math.min(100, (streaks / SPACING_MAX) * 100);
  }

  private renderProgressBar(streaks: number): string {
    const pct = this.progressPercent(streaks);
    return `<div class="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
      <div class="h-full bg-primary-container transition-all duration-500 shadow-[0_0_8px_rgba(252,211,77,0.3)]" style="width: ${pct}%"></div>
    </div>`;
  }

  private kbdChip(label: string): string {
    return `<span class="bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded border border-outline-variant">${label}</span>`;
  }

  private playSuccess(): void {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => this.tone(ctx, freq, now + i * 0.09, 0.12, 0.08));
  }

  private playError(): void {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
    const now = ctx.currentTime;
    this.tone(ctx, 200, now, 0.15, 0.08);
    this.tone(ctx, 150, now + 0.12, 0.15, 0.06);
  }

  private tone(
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
}
