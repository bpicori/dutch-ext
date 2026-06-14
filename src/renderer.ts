import { Challenge } from './types.js';

export type AnswerCallback = (answer: string) => void;
export type DismissCallback = () => void;

export class Renderer {
  private onAnswer: AnswerCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private currentType: string | null = null;
  private answered = false;
  private handler: ((e: KeyboardEvent) => void) | null = null;

  renderShell(): void {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center p-4">
        <div id="challenge-area" class="flex items-center justify-center w-full">
        </div>
      </div>
    `;
  }

  show(challenge: Challenge, onAnswer: AnswerCallback, onDismiss: DismissCallback): void {
    this.onAnswer = onAnswer;
    this.onDismiss = onDismiss;
    this.currentType = challenge.type;
    this.answered = false;

    this.clearDom();
    this.renderChallenge(challenge);

    if (challenge.type === 'listen' && challenge.promptAudio) {
      this.speak(challenge.promptAudio);
    }

    this.bindKeys();
    this.bindClicks();
  }

  showResult(challenge: Challenge, userAnswer: string): void {
    this.unbindKeys();

    const buttons = document.querySelectorAll('.choice-btn') as NodeListOf<HTMLElement>;
    const correctAnswer = challenge.correctAnswer;

    buttons.forEach(btn => {
      const answer = btn.dataset.answer;
      btn.style.pointerEvents = 'none';

      if (answer === correctAnswer) {
        btn.classList.add('!bg-green-700', '!border-green-500', '!text-white');
      } else if (answer === userAnswer && answer !== correctAnswer) {
        btn.classList.add('!bg-red-700', '!border-red-500', '!text-white', 'animate-shake');
      } else {
        btn.classList.add('opacity-30');
      }
    });

    if (userAnswer === correctAnswer) {
      this.playSuccess();
    } else {
      this.playError();
    }
  }

  clearDom(): void {
    const el = document.getElementById('challenge');
    if (el) el.remove();
  }

  dismiss(): void {
    this.unbindKeys();
    const el = document.getElementById('challenge');
    if (!el) return;

    el.classList.add('animate-slide-out');
    el.addEventListener('animationend', () => {
      el.remove();
      if (document.activeElement && (document.activeElement as HTMLElement).blur) {
        (document.activeElement as HTMLElement).blur();
      }
    });
  }

  // --- rendering ---

  private renderChallenge(challenge: Challenge): void {
    const area = document.getElementById('challenge-area');
    if (!area) return;

    area.innerHTML = challenge.type === 'de_het'
      ? this.renderDeHet(challenge)
      : this.renderMultipleChoice(challenge);
  }

  private renderDeHet(challenge: Challenge): string {
    return `
      <div id="challenge" class="text-center animate-fade-in">
        <p class="text-5xl font-bold mb-10 text-gray-100">${challenge.prompt}</p>
        <div class="flex gap-5 justify-center">
          <button data-answer="de" class="choice-btn w-36 h-20
            bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 rounded-xl
            text-2xl font-bold transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500">
            DE
          </button>
          <button data-answer="het" class="choice-btn w-36 h-20
            bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 rounded-xl
            text-2xl font-bold transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500">
            HET
          </button>
        </div>
      </div>
    `;
  }

  private renderMultipleChoice(challenge: Challenge): string {
    const labels = ['1', '2', '3'];
    const choicesHtml = challenge.choices.map((choice, i) => `
      <button data-answer="${choice.replace(/"/g, '&quot;')}" data-index="${i}"
        class="choice-btn w-72 min-h-[3.5rem] px-5 py-3
          bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 rounded-xl
          text-lg transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500
          flex items-center gap-4 text-left">
        <span class="text-gray-600 text-sm w-5 shrink-0">${labels[i]}</span>
        <span class="text-gray-200">${choice}</span>
      </button>
    `).join('');

    const promptHtml = challenge.type === 'listen'
      ? '<div class="mb-4 text-gray-500 text-base">\uD83D\uDD0A Listen and pick the correct spelling</div>'
      : `<p class="text-4xl font-bold mb-10 text-gray-100">${challenge.prompt}</p>`;

    return `
      <div id="challenge" class="text-center animate-fade-in">
        ${promptHtml}
        <div class="flex flex-col gap-3 items-center">
          ${choicesHtml}
        </div>
      </div>
    `;
  }

  // --- keyboard ---

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
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      this.unbindKeys();
      if (this.onDismiss) this.onDismiss();
      return;
    }

    if (this.answered) return;

    if (this.currentType === 'de_het') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.answered = true;
        if (this.onAnswer) this.onAnswer('de');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.answered = true;
        if (this.onAnswer) this.onAnswer('het');
      }
      return;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 3) {
      e.preventDefault();
      const buttons = document.querySelectorAll('.choice-btn');
      const btn = buttons[num - 1] as HTMLElement | undefined;
      if (btn?.dataset.answer) {
        this.answered = true;
        if (this.onAnswer) this.onAnswer(btn.dataset.answer);
      }
    }
  }

  // --- clicks ---

  private bindClicks(): void {
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        this.answered = true;
        const answer = (btn as HTMLElement).dataset.answer;
        if (answer != null && this.onAnswer) this.onAnswer(answer);
      });
    });
  }

  // --- audio ---

  private speak(text: string, lang = 'nl-NL'): void {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.75;
    window.speechSynthesis.speak(utterance);
  }

  private playSuccess(): void {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      this.tone(ctx, freq, now + i * 0.09, 0.12, 0.08);
    });
  }

  private playError(): void {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    this.tone(ctx, 200, now, 0.15, 0.08);
    this.tone(ctx, 150, now + 0.12, 0.15, 0.06);
  }

  private tone(ctx: AudioContext, freq: number, startTime: number, duration: number, vol: number): void {
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
