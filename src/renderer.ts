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
      <div class="min-h-screen flex flex-col items-center justify-center p-6
        bg-stone-950"
        style="background-image: radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.06) 0%, transparent 60%);">

        <header class="mb-8 flex items-center gap-2 text-stone-500 text-sm tracking-wide">
          <span class="text-base">\uD83C\uDF37</span>
          WachtNederlands
        </header>

        <div id="challenge-area" class="flex items-center justify-center w-full">
        </div>

        <footer id="footer-hint" class="mt-8 text-stone-700 text-xs">
        </footer>
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
    this.setFooterHint(challenge.type);

    if (challenge.type === 'listen' && challenge.promptAudio) {
      this.speak(challenge.promptAudio);
    }

    this.bindKeys();
    this.bindClicks();

    if (challenge.type.endsWith('_sentence')) {
      setTimeout(() => {
        const input = document.getElementById('typing-input') as HTMLInputElement | null;
        input?.focus();
      }, 0);
    }
  }

  showResult(challenge: Challenge, userAnswer: string): void {
    this.unbindKeys();

    const input = document.getElementById('typing-input') as HTMLInputElement | null;
    if (input) {
      input.readOnly = true;
      const submit = document.getElementById('typing-submit');
      if (submit) (submit as HTMLElement).style.display = 'none';

      const correct = userAnswer.trim().toLowerCase() === challenge.correctAnswer.trim().toLowerCase();
      if (correct) {
        input.classList.add('!border-emerald-600', '!text-emerald-100');
        this.playSuccess();
      } else {
        input.classList.add('!border-rose-500', '!text-rose-100', 'animate-shake');
        const fb = document.getElementById('typing-feedback');
        if (fb) {
          const span = fb.querySelector('span:last-child');
          if (span) span.textContent = challenge.correctAnswer;
          fb.classList.remove('hidden');
        }
        this.playError();
      }
      return;
    }

    const buttons = document.querySelectorAll('.choice-btn') as NodeListOf<HTMLElement>;
    const correctAnswer = challenge.correctAnswer;

    buttons.forEach(btn => {
      const answer = btn.dataset.answer;
      btn.style.pointerEvents = 'none';

      if (answer === correctAnswer) {
        btn.classList.add('!bg-emerald-900/80', '!border-emerald-600', '!text-emerald-100');
      } else if (answer === userAnswer && answer !== correctAnswer) {
        btn.classList.add('!bg-rose-900/80', '!border-rose-500', '!text-rose-100', 'animate-shake');
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

  private setFooterHint(type: string): void {
    const footer = document.getElementById('footer-hint');
    if (!footer) return;

    if (type === 'de_het') {
      footer.textContent = '\u2190 de \u00A0\u00A0|\u00A0\u00A0 het \u2192 \u00A0\u00A0\u00B7\u00A0\u00A0 Space to skip';
    } else if (type.endsWith('_sentence')) {
      footer.textContent = 'Type your answer \u00A0\u00B7\u00A0 Enter to submit \u00A0\u00B7\u00A0 Esc to skip';
    } else {
      footer.textContent = '1 \u00A0 2 \u00A0 3 \u00A0\u00A0\u00B7\u00A0\u00A0 Space to skip';
    }
  }

  // --- rendering ---

  private renderChallenge(challenge: Challenge): void {
    const area = document.getElementById('challenge-area');
    if (!area) return;

    const typeLabel = this.typeLabel(challenge.type);
    const isTyping = challenge.type.endsWith('_sentence');
    const content = challenge.type === 'de_het'
      ? this.renderDeHet(challenge)
      : isTyping
        ? this.renderTyping(challenge)
        : this.renderMultipleChoice(challenge);

    area.innerHTML = `
      <div id="challenge" class="animate-fade-in w-full max-w-lg
        bg-stone-900/80 rounded-3xl border border-stone-800
        shadow-[0_0_80px_rgba(245,158,11,0.04)]
        p-8 md:p-10">
        <div class="flex justify-center mb-8">
          <span class="inline-block bg-amber-950/60 text-amber-300/80 text-xs
            tracking-wider uppercase px-4 py-1.5 rounded-full border border-amber-900/40">
            ${typeLabel}
          </span>
        </div>
        ${content}
      </div>
    `;
  }

  private typeLabel(type: string): string {
    switch (type) {
      case 'de_het': return 'de / het';
      case 'nl_to_en': return 'Nederlands \u2192 Engels';
      case 'en_to_nl': return 'Engels \u2192 Nederlands';
      case 'listen': return 'Luisteren';
      case 'nl_to_en_sentence': return 'Zin: NL \u2192 EN';
      case 'en_to_nl_sentence': return 'Zin: EN \u2192 NL';
      default: return '';
    }
  }

  private renderDeHet(challenge: Challenge): string {
    return `
      <p class="text-5xl font-medium text-stone-100 text-center mb-10 tracking-tight">
        ${challenge.prompt}
      </p>
      <div class="flex gap-4 justify-center">
        <button data-answer="de"
          class="choice-btn w-40 h-20 bg-stone-800 hover:bg-stone-700
            border border-stone-700 hover:border-amber-800
            rounded-2xl text-2xl font-medium text-stone-200
            transition-all duration-200 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]
            focus:outline-none focus:ring-2 focus:ring-amber-700/50">
          DE
        </button>
        <button data-answer="het"
          class="choice-btn w-40 h-20 bg-stone-800 hover:bg-stone-700
            border border-stone-700 hover:border-amber-800
            rounded-2xl text-2xl font-medium text-stone-200
            transition-all duration-200 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]
            focus:outline-none focus:ring-2 focus:ring-amber-700/50">
          HET
        </button>
      </div>
    `;
  }

  private renderMultipleChoice(challenge: Challenge): string {
    const labels = ['1', '2', '3'];
    const choicesHtml = challenge.choices.map((choice, i) => `
      <button data-answer="${choice.replace(/"/g, '&quot;')}" data-index="${i}"
        class="choice-btn w-full max-w-sm min-h-[3.5rem] px-5 py-3.5
          bg-stone-800 hover:bg-stone-700
          border border-stone-700 hover:border-amber-800
          rounded-2xl text-lg text-stone-200
          transition-all duration-200 hover:shadow-[0_0_30px_rgba(245,158,11,0.06)]
          focus:outline-none focus:ring-2 focus:ring-amber-700/50
          flex items-center gap-4 text-left">
        <span class="text-amber-700 text-sm w-5 shrink-0 font-medium">${labels[i]}</span>
        <span>${choice}</span>
      </button>
    `).join('');

    const isSentence = challenge.type.endsWith('_sentence');
    const promptFontSize = isSentence ? 'text-2xl' : 'text-4xl';

    const promptHtml = challenge.type === 'listen'
      ? '<div class="mb-6 text-stone-400 text-base text-center">\uD83D\uDD0A Listen and pick the correct spelling</div>'
      : `<p class="${promptFontSize} font-medium text-stone-100 text-center mb-8 tracking-tight">${challenge.prompt}</p>`;

    return `
      ${promptHtml}
      <div class="flex flex-col gap-2.5 items-center">
        ${choicesHtml}
      </div>
    `;
  }

  private renderTyping(challenge: Challenge): string {
    return `
      <p class="text-2xl font-medium text-stone-100 text-center mb-8 tracking-tight">
        ${challenge.prompt}
      </p>
      <div class="flex gap-2 max-w-sm mx-auto">
        <input id="typing-input" type="text" autocomplete="off" spellcheck="false"
          class="w-full bg-stone-800 border-2 border-stone-700 rounded-2xl px-5 py-3.5
            text-lg text-stone-200 placeholder-stone-500
            focus:outline-none focus:border-amber-700/60 focus:ring-0
            transition-colors duration-200"
          placeholder="Type your translation...">
        <button id="typing-submit"
          class="shrink-0 w-14 h-[3.75rem] bg-stone-800 hover:bg-stone-700
            border border-stone-700 hover:border-amber-800
            rounded-2xl text-amber-400 text-xl
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-amber-700/50">
          \u21B5
        </button>
      </div>
      <div id="typing-feedback" class="hidden mt-4 text-sm text-center">
        <span class="text-stone-500">Correct: </span>
        <span class="text-emerald-400 font-medium"></span>
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
    const isTyping = !!this.currentType?.endsWith('_sentence');

    if (isTyping && e.key === 'Enter') {
      e.preventDefault();
      const input = document.getElementById('typing-input') as HTMLInputElement | null;
      const answer = input?.value.trim();
      if (answer && !this.answered) {
        this.answered = true;
        if (this.onAnswer) this.onAnswer(answer);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.unbindKeys();
      if (this.onDismiss) this.onDismiss();
      return;
    }

    if (!isTyping && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      this.unbindKeys();
      if (this.onDismiss) this.onDismiss();
      return;
    }

    if (isTyping) return;

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
    const isTyping = !!this.currentType?.endsWith('_sentence');

    if (isTyping) {
      const submit = document.getElementById('typing-submit');
      if (submit) {
        submit.addEventListener('click', () => {
          if (this.answered) return;
          const input = document.getElementById('typing-input') as HTMLInputElement | null;
          const answer = input?.value.trim();
          if (answer) {
            this.answered = true;
            if (this.onAnswer) this.onAnswer(answer);
          }
        });
      }
      return;
    }

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
