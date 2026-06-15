import { Challenge, ChallengeProgress, ChallengeType, GlobalProgress } from './types.js';

export type AnswerCallback = (answer: string) => void;
export type DismissCallback = () => void;

export interface ShowContext {
  global: GlobalProgress;
  cardProgress: ChallengeProgress;
  deck: Challenge[];
}

const SPACING_MAX = 9;

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  start(): void;
  stop(): void;
};

export class Renderer {
  private onAnswer: AnswerCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private currentType: string | null = null;
  private answered = false;
  private handler: ((e: KeyboardEvent) => void) | null = null;
  private currentAudio: string | undefined = undefined;
  private currentAudioWords: string[] = [];
  private matchPairs: number[] = [];
  private matchActive = 0;
  private matchCount = 0;
  private matchShuffle: number[] = [];
  private matchLeftItems: string[] = [];
  private matchRightItems: string[] = [];
  private currentOrder: string[] = [];
  private orderSelected = 0;
  private wordPool: string[] = [];
  private wordBuilt: string[] = [];
  private recognition: InstanceType<SpeechRecognitionCtor> | null = null;
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
        <div class="ml-auto bg-surface-container px-sm py-xs rounded-full flex items-center gap-xs">
          <span class="material-symbols-outlined text-primary-container text-sm" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
          <span id="streak-days" class="font-label-sm text-label-sm text-on-surface-variant">0</span>
          <span class="font-label-sm text-label-sm text-on-surface-variant">DAYS</span>
        </div>
      </header>
      <main class="relative z-10 min-h-screen flex items-center justify-center px-container-padding">
        <div id="challenge-area" class="w-full max-w-[420px] flex flex-col items-center"></div>
      </main>
      <footer id="footer-hint" class="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center gap-lg px-container-padding py-xl bg-transparent"></footer>
    `;
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
    this.currentType = challenge.type;
    this.answered = false;
    this.currentAudio = challenge.promptAudio;
    this.currentAudioWords = challenge.audioWords || [];
    this.matchPairs = [];
    this.matchActive = 0;
    this.matchCount = 0;
    this.orderSelected = 0;
    this.wordBuilt = [];

    const layout = this.layoutCategory(challenge.type);
    if (layout === 'listen_match') {
      this.matchPairs = [-1, -1, -1, -1];
    } else if (layout === 'read_match') {
      const n = challenge.matchLeft?.length ?? 0;
      this.matchLeftItems = challenge.matchLeft ?? [];
      this.matchRightItems = challenge.matchRight ?? [];
      this.matchPairs = Array(n).fill(-1);
      this.matchShuffle = this.shuffle(this.matchRightItems.map((_, i) => i));
    } else if (layout === 'order') {
      this.currentOrder = this.shuffle(challenge.orderItems ?? []);
    } else if (challenge.type === 'word_order') {
      this.wordPool = this.shuffle(challenge.orderItems ?? []);
      this.wordBuilt = [];
    }

    const streakEl = document.getElementById('streak-days');
    if (streakEl) streakEl.textContent = String(ctx.global.streakDays);

    this.clearDom();
    this.renderChallenge(challenge);
    this.setFooterHint(challenge.type);

    if (challenge.type === 'listen' && challenge.promptAudio) {
      this.speak(challenge.promptAudio);
    }
    if (challenge.type === 'listen_mcq' && challenge.promptAudio) {
      setTimeout(() => this.speak(challenge.promptAudio!), 400);
    }
    if (challenge.type === 'number_listen' && challenge.promptAudio) {
      setTimeout(() => this.speak(challenge.promptAudio!), 300);
    }
    if (challenge.type === 'speak_repeat' && challenge.promptAudio) {
      setTimeout(() => this.speak(challenge.promptAudio!), 300);
    }

    this.bindKeys();
    this.bindClicks();

    if (this.layoutCategory(challenge.type) === 'typing') {
      setTimeout(() => {
        const input = document.querySelector('#typing-input, #write-note-input, .form-field-input') as HTMLInputElement | null;
        input?.focus();
      }, 0);
    }
    if (layout === 'listen_match' || layout === 'read_match') {
      requestAnimationFrame(() => this.updateMatchLines());
    }
  }

  showResult(challenge: Challenge, userAnswer: string, correct: boolean, onContinue?: () => void): void {
    this.unbindKeys();
    this.stopRecognition();

    const layout = this.layoutCategory(challenge.type);

    if (layout === 'listen_match' || layout === 'read_match') {
      this.showMatchResult(challenge, onContinue);
      return;
    }

    const textarea = document.getElementById('write-note-input') as HTMLTextAreaElement | null;
    const formInputs = document.querySelectorAll('.form-field-input');
    const singleInput = document.getElementById('typing-input') as HTMLInputElement | null;

    if (formInputs.length > 0) {
      this.showFormResult(challenge, userAnswer, correct, onContinue);
      return;
    }

    if (textarea) {
      this.showTextareaResult(challenge, userAnswer, correct, onContinue);
      return;
    }

    if (singleInput) {
      this.showTypingResult(challenge, userAnswer, correct, singleInput, onContinue);
      return;
    }

    if (layout === 'order') {
      this.showOrderResult(challenge, userAnswer, correct, onContinue);
      return;
    }

    if (layout === 'speak') {
      this.showSpeakResult(challenge, userAnswer, correct, onContinue);
      return;
    }

    const buttons = document.querySelectorAll('.choice-btn') as NodeListOf<HTMLElement>;
    const card = document.getElementById('challenge');
    buttons.forEach(btn => {
      const answer = btn.dataset.answer;
      btn.style.pointerEvents = 'none';
      if (answer === challenge.correctAnswer) {
        btn.classList.add('!bg-secondary-container', '!border-secondary-container', '!text-on-secondary-container');
      } else if (answer === userAnswer && answer !== challenge.correctAnswer) {
        btn.classList.add('!bg-on-tertiary/10', '!border-on-tertiary-container', '!text-on-surface', 'animate-shake');
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
    if (onContinue) this.injectContinueButton(onContinue);
  }

  private showMatchResult(challenge: Challenge, onContinue?: () => void): void {
    const isListen = challenge.type === 'listen_match';
    const allCorrect = this.matchPairs.every((c, i) => c === i);
    const card = document.getElementById(isListen ? 'match-card' : 'challenge');
    if (card) {
      card.classList.add(allCorrect ? 'success-glow' : 'error-glow');
      if (!allCorrect) card.classList.add('animate-shake');
    }

    const leftSel = isListen ? '#match-speakers .speaker-btn' : '#read-match-left .match-left-btn';
    const rightSel = isListen ? '#match-choices .choice-btn' : '#read-match-right .choice-btn';
    document.querySelectorAll(leftSel).forEach((btn, i) => {
      btn.classList.add(this.matchPairs[i] === i ? '!border-secondary-container' : '!border-on-tertiary-container');
    });
    document.querySelectorAll(rightSel).forEach(btn => {
      const idx = parseInt((btn as HTMLElement).dataset.choice || '-1');
      const speakerIdx = this.matchPairs.indexOf(idx);
      if (speakerIdx >= 0) {
        const ok = speakerIdx === idx;
        btn.classList.add(
          ok ? '!bg-secondary-container !border-secondary-container !text-on-secondary-container'
            : '!bg-on-tertiary/10 !border-on-tertiary-container !text-on-surface',
        );
        if (!ok) btn.classList.add('animate-shake');
      }
    });

    const svg = document.getElementById('match-lines');
    if (svg) svg.innerHTML = '';
    if (allCorrect) this.playSuccess();
    else this.playError();
    if (onContinue) this.injectContinueButton(onContinue);
  }

  private showFormResult(challenge: Challenge, userAnswer: string, correct: boolean, onContinue?: () => void): void {
    const card = document.getElementById('challenge');
    document.querySelectorAll('.form-field-input').forEach(el => { (el as HTMLInputElement).readOnly = true; });
    if (correct) {
      card?.classList.add('success-glow');
      this.playSuccess();
    } else {
      card?.classList.add('error-glow', 'animate-shake');
      const fb = document.getElementById('typing-feedback');
      if (fb) {
        fb.innerHTML = `<span class="font-label-sm text-label-sm text-on-tertiary-container font-bold uppercase">Expected</span>
          <p class="font-body-md text-body-md text-on-surface mt-1">${challenge.correctAnswer.split('|').join(', ')}</p>`;
        fb.classList.remove('hidden');
      }
      this.playError();
    }
    if (onContinue) this.injectContinueButton(onContinue);
  }

  private showTextareaResult(challenge: Challenge, userAnswer: string, correct: boolean, onContinue?: () => void): void {
    const input = document.getElementById('write-note-input') as HTMLTextAreaElement;
    input.readOnly = true;
    const card = document.getElementById('challenge');
    if (correct) {
      input.classList.add('!border-secondary-container');
      card?.classList.add('success-glow');
      this.playSuccess();
    } else {
      input.classList.add('!border-on-tertiary-container', 'animate-shake');
      card?.classList.add('error-glow', 'animate-shake');
      const fb = document.getElementById('typing-feedback');
      if (fb) {
        fb.innerHTML = `
          <span class="font-label-sm text-label-sm text-on-tertiary-container font-bold uppercase">Model answer</span>
          <p class="font-body-md text-body-md text-on-surface mt-1">${challenge.correctAnswer}</p>`;
        fb.classList.remove('hidden');
      }
      this.playError();
    }
    if (onContinue) this.injectContinueButton(onContinue);
  }

  private showTypingResult(
    challenge: Challenge,
    userAnswer: string,
    correct: boolean,
    input: HTMLInputElement,
    onContinue?: () => void,
  ): void {
    input.readOnly = true;
    const card = document.getElementById('challenge');
    if (correct) {
      input.classList.add('!border-secondary-container', '!text-secondary-fixed');
      card?.classList.add('success-glow');
      this.playSuccess();
    } else {
      input.classList.add('!border-on-tertiary-container', '!text-on-tertiary', 'animate-shake');
      card?.classList.add('error-glow', 'animate-shake');
      document.getElementById('typing-error-icon')?.classList.remove('hidden');
      const fb = document.getElementById('typing-feedback');
      if (fb) {
        fb.innerHTML = `
          <span class="font-label-sm text-label-sm text-on-tertiary-container font-bold uppercase">Correction</span>
          <p class="font-body-md text-body-md text-on-surface mt-1">${this.highlightDiff(userAnswer, challenge.correctAnswer)}</p>`;
        fb.classList.remove('hidden');
      }
      this.playError();
    }
    if (onContinue) this.injectContinueButton(onContinue);
  }

  private showOrderResult(challenge: Challenge, userAnswer: string, correct: boolean, onContinue?: () => void): void {
    const card = document.getElementById('challenge');
    document.querySelectorAll('.order-item').forEach(el => { (el as HTMLButtonElement).disabled = true; });
    if (correct) {
      card?.classList.add('success-glow');
      this.playSuccess();
    } else {
      card?.classList.add('error-glow', 'animate-shake');
      const fb = document.getElementById('order-feedback');
      if (fb) {
        fb.innerHTML = `<p class="text-sm text-on-surface-variant">Correct order: <span class="text-secondary">${challenge.correctAnswer.split('|').join(' \u2192 ')}</span></p>`;
        fb.classList.remove('hidden');
      }
      this.playError();
    }
    if (onContinue) this.injectContinueButton(onContinue);
  }

  private showSpeakResult(challenge: Challenge, userAnswer: string, correct: boolean, onContinue?: () => void): void {
    const card = document.getElementById('challenge');
    const transcript = document.getElementById('speak-transcript');
    if (transcript) transcript.textContent = userAnswer || '(no speech detected)';
    if (correct) {
      card?.classList.add('success-glow');
      this.playSuccess();
    } else {
      card?.classList.add('error-glow', 'animate-shake');
      const fb = document.getElementById('typing-feedback');
      if (fb) {
        fb.innerHTML = `<span class="font-label-sm text-label-sm text-on-tertiary-container font-bold uppercase">Expected</span>
          <p class="font-body-md text-body-md text-on-surface mt-1">${challenge.correctAnswer}</p>`;
        fb.classList.remove('hidden');
      }
      this.playError();
    }
    if (onContinue) this.injectContinueButton(onContinue);
  }

  private injectContinueButton(onContinue: () => void): void {
    const card = document.getElementById('challenge') || document.getElementById('match-card');
    if (!card) {
      this.waitForContinue(onContinue);
      return;
    }
    document.getElementById('continue-btn')?.remove();
    const btn = document.createElement('button');
    btn.id = 'continue-btn';
    btn.className = 'mt-md w-full bg-primary-container hover:opacity-90 active:scale-[0.98] transition-all duration-200 text-on-primary-container py-md rounded-full font-headline-md text-headline-md flex justify-center items-center gap-xs inner-glow';
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

  clearDom(): void {
    document.getElementById('challenge-wrapper')?.remove();
  }

  dismiss(): void {
    this.unbindKeys();
    this.stopRecognition();
    const el = document.getElementById('challenge-wrapper');
    if (!el) return;
    el.classList.add('animate-slide-out');
    el.addEventListener('animationend', () => {
      el.remove();
      (document.activeElement as HTMLElement)?.blur?.();
    });
  }

  private progressPercent(streaks: number): number {
    return Math.min(100, (streaks / SPACING_MAX) * 100);
  }

  private renderProgressBar(streaks: number, variant: 'primary' | 'secondary' = 'primary'): string {
    const pct = this.progressPercent(streaks);
    const fillClass = variant === 'secondary' ? 'bg-secondary-container' : 'bg-primary-container';
    const glow = variant === 'secondary'
      ? 'shadow-[0_0_10px_rgba(37,164,117,0.5)]'
      : 'shadow-[0_0_8px_rgba(252,211,77,0.3)]';
    return `<div class="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
      <div class="h-full ${fillClass} transition-all duration-500 ${glow}" style="width: ${pct}%"></div></div>`;
  }

  private findEnglishGloss(prompt: string, deck: Challenge[]): string | null {
    const match = deck.find(c => c.type === 'nl_to_en' && c.prompt === prompt);
    return match?.correctAnswer ?? null;
  }

  private highlightDiff(user: string, correct: string): string {
    const userWords = user.trim().split(/\s+/);
    const correctWords = correct.trim().split(/\s+/);
    return correctWords.map((word, i) => {
      const u = userWords[i]?.toLowerCase().replace(/[.,!?]/g, '');
      const c = word.toLowerCase().replace(/[.,!?]/g, '');
      if (u === c) return word;
      return `<span class="text-secondary font-bold underline decoration-secondary/30 decoration-2 underline-offset-4">${word}</span>`;
    }).join(' ');
  }

  private kbdChip(label: string): string {
    return `<span class="bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded border border-outline-variant">${label}</span>`;
  }

  private footerDivider(): string {
    return `<div class="w-px h-3 bg-outline-variant"></div>`;
  }

  private setFooterHint(type: string): void {
    const footer = document.getElementById('footer-hint');
    if (!footer) return;
    const layout = this.layoutCategory(type as ChallengeType);

    if (type === 'de_het') {
      footer.innerHTML = `
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${this.kbdChip('\u2190')}<span>DE</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${this.kbdChip('\u2192')}<span>HET</span></div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">${this.kbdChip('Space')}<span>Skip</span></div>`;
    } else if (layout === 'typing' || layout === 'speak') {
      footer.innerHTML = `
        <div class="flex items-center gap-xs">${this.kbdChip('Enter')}<span class="font-label-sm text-label-sm text-on-surface-variant opacity-60">Submit</span></div>
        <div class="flex items-center gap-xs">${this.kbdChip('Space')}<span class="font-label-sm text-label-sm text-on-surface-variant opacity-60">Skip</span></div>`;
    } else if (layout === 'order') {
      footer.innerHTML = `
        <div class="flex items-center gap-xs">${this.kbdChip('\u2191\u2193')}<span class="font-label-sm text-label-sm text-on-surface-variant">Move</span></div>
        ${this.footerDivider()}
        <div class="flex items-center gap-xs">${this.kbdChip('Enter')}<span class="font-label-sm text-label-sm text-on-surface-variant">Submit</span></div>
        ${this.footerDivider()}
        <div class="flex items-center gap-xs">${this.kbdChip('Space')}<span class="font-label-sm text-label-sm text-on-surface-variant">Skip</span></div>`;
    } else if (layout === 'listen_match' || layout === 'read_match') {
      const nums = layout === 'listen_match' ? '1-4' : '1-3';
      footer.innerHTML = `
        <div class="flex items-center gap-xs text-on-surface font-label-sm text-label-sm">${this.kbdChip(nums)}<span>Select</span></div>
        ${this.footerDivider()}
        <div class="flex items-center gap-xs text-on-surface-variant opacity-60 font-label-sm text-label-sm">${this.kbdChip('Space')}<span>Skip</span></div>
        ${this.footerDivider()}
        <div class="flex items-center gap-xs text-on-surface-variant opacity-60 font-label-sm text-label-sm">${this.kbdChip('Enter')}<span>Next</span></div>`;
    } else {
      footer.innerHTML = `
        <div class="flex items-center gap-md">
          <div class="flex items-center gap-xs">${this.kbdChip('1-3')}<span class="font-label-sm text-label-sm text-on-surface-variant">Choose</span></div>
          ${this.footerDivider()}
          <div class="flex items-center gap-xs">${this.kbdChip('Space')}<span class="font-label-sm text-label-sm text-on-surface-variant">Skip</span></div>
          ${this.footerDivider()}
          <div class="flex items-center gap-xs">${this.kbdChip('Enter')}<span class="font-label-sm text-label-sm text-on-surface-variant">Next</span></div>
        </div>`;
    }
  }

  private renderChallenge(challenge: Challenge): void {
    const area = document.getElementById('challenge-area');
    if (!area || !this.ctx) return;

    const layout = this.layoutCategory(challenge.type);
    const streaks = this.ctx.cardProgress.consecutiveStreaks;
    const label = this.typeLabel(challenge.type);

    if (layout === 'listen_match') {
      area.innerHTML = this.renderListenMatchWrapper(challenge, label, streaks);
      return;
    }
    if (layout === 'read_match') {
      area.innerHTML = this.renderReadMatchWrapper(challenge, label);
      return;
    }
    if (layout === 'order') {
      area.innerHTML = this.renderOrderWrapper(challenge, label);
      return;
    }
    if (challenge.type === 'word_order') {
      area.innerHTML = this.renderWordOrderWrapper(challenge, label);
      return;
    }
    if (layout === 'speak') {
      area.innerHTML = this.renderSpeakWrapper(challenge, label);
      return;
    }

    const content = layout === 'de_het'
      ? this.renderDeHet(challenge)
      : layout === 'typing'
        ? this.renderTyping(challenge, label)
        : this.renderMultipleChoice(challenge, label);

    const skipLink = layout === 'de_het'
      ? `<button id="skip-link" type="button" class="mt-lg font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-widest py-xs">Ik weet het niet zeker</button>`
      : '';

    const cardPadding = layout === 'de_het' ? 'p-lg' : 'py-xl px-lg';
    const badgeInCard = layout !== 'de_het' && layout !== 'typing';

    area.innerHTML = `
      <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
        <div id="challenge" class="glass-card w-full rounded-lg ${cardPadding} flex flex-col items-center gap-lg relative overflow-hidden">
          ${badgeInCard ? this.renderBadge(label) : ''}
          ${content}
          ${badgeInCard ? this.renderCardProgressBar(streaks) : ''}
        </div>
        ${skipLink}
      </div>`;
  }

  private renderBadge(label: string): string {
    return `<div class="px-sm py-xs bg-surface-container-high rounded-full border border-outline-variant">
      <span class="text-label-sm font-label-sm text-on-surface-variant tracking-widest uppercase">${label}</span></div>`;
  }

  private renderCardProgressBar(streaks: number): string {
    return `<div class="absolute bottom-0 left-0 w-full h-1 bg-surface-container-highest">
      <div class="h-full bg-primary-container shadow-[0_0_10px_rgba(252,211,77,0.5)] transition-all duration-500" style="width: ${this.progressPercent(streaks)}%"></div></div>`;
  }

  private renderDeHet(challenge: Challenge): string {
    const gloss = this.ctx ? this.findEnglishGloss(challenge.prompt, this.ctx.deck) : null;
    const streaks = this.ctx?.cardProgress.consecutiveStreaks ?? 0;
    return `
      <div class="w-full flex justify-between items-center">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">DE / HET</span></div>
        <div class="flex items-center gap-xs text-on-surface"><span class="text-lg">\uD83D\uDD25</span>
          <span class="font-headline-md text-headline-md">${streaks}</span></div>
      </div>
      <div class="py-xl flex flex-col items-center">
        <h1 class="font-display-word text-display-word text-primary lowercase">${challenge.prompt}</h1>
        ${gloss ? `<p class="font-label-sm text-label-sm text-on-surface-variant opacity-60 mt-xs">${gloss}</p>` : ''}
      </div>
      <div class="w-full grid grid-cols-2 gap-md">
        <button data-answer="de" type="button" class="choice-btn btn-active group relative flex flex-col items-center justify-center py-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant rounded-lg transition-all">
          <span class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">DE</span></button>
        <button data-answer="het" type="button" class="choice-btn btn-active group relative flex flex-col items-center justify-center py-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant rounded-lg transition-all">
          <span class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">HET</span></button>
      </div>
      ${this.renderProgressBar(streaks)}`;
  }

  private renderMultipleChoice(challenge: Challenge, label: string): string {
    const choicesHtml = challenge.choices.map((choice, i) => `
      <button data-answer="${choice.replace(/"/g, '&quot;')}" data-index="${i}" type="button"
        class="choice-btn group flex items-center justify-between w-full p-md bg-surface-container rounded-DEFAULT border border-outline-variant hover:border-primary-container hover:bg-surface-container-high transition-all">
        <span class="font-body-lg text-body-lg text-on-surface">${choice}</span>
        <span class="text-label-sm text-on-surface-variant opacity-40 group-hover:opacity-100 transition-opacity">${i + 1}</span>
      </button>`).join('');

    const subtitle = this.mcqSubtitle(challenge.type);
    const hasContext = challenge.context && (challenge.type === 'read_mcq' || challenge.type === 'knm');
    const contextHtml = hasContext
      ? `<div class="w-full max-h-32 overflow-y-auto text-left p-md bg-surface-container-low rounded-DEFAULT border border-outline-variant mb-md">
          <p class="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap">${challenge.context}</p></div>`
      : '';

    let promptHtml: string;
    if (challenge.type === 'listen' || challenge.type === 'listen_mcq') {
      promptHtml = `<div class="text-center py-md w-full">
        <button type="button" id="replay-audio" class="mb-sm material-symbols-outlined text-primary-container text-3xl hover:opacity-80 transition-opacity">volume_up</button>
        <h1 class="font-display-sentence text-display-sentence text-primary">${challenge.prompt}</h1>
        <p class="text-on-surface-variant font-label-sm mt-xs opacity-60">${subtitle}</p></div>`;
    } else if (hasContext) {
      promptHtml = `<div class="w-full">${contextHtml}
        <h1 class="font-body-lg text-body-lg text-on-surface text-center">${challenge.prompt}</h1>
        <p class="text-on-surface-variant font-label-sm mt-xs opacity-60 text-center">${subtitle}</p></div>`;
    } else {
      promptHtml = `<div class="text-center py-md">
        <h1 class="font-display-word text-display-word text-primary">${challenge.prompt}</h1>
        <p class="text-on-surface-variant font-label-sm mt-xs opacity-60">${subtitle}</p></div>`;
    }

    return `${promptHtml}<div class="w-full flex flex-col gap-sm">${choicesHtml}</div>`;
  }

  private renderTyping(challenge: Challenge, label: string): string {
    if (challenge.type === 'form_fill' && challenge.formFields?.length) {
      const fields = challenge.formFields.map((f, i) => `
        <div class="flex flex-col gap-xs w-full">
          <label class="font-label-sm text-label-sm text-on-surface-variant">${f.label}</label>
          <input class="form-field-input w-full bg-surface-container-low border-b-2 border-outline-variant text-on-surface font-body-lg py-sm px-0 focus:outline-none focus:border-primary-container" data-field="${i}" type="text" autocomplete="off" spellcheck="false">
        </div>`).join('');
      return `${this.renderBadge(label)}
        <p class="font-body-md text-body-md text-on-surface w-full">${challenge.prompt}</p>
        <div class="flex flex-col gap-md w-full">${fields}</div>
        <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT w-full"></div>`;
    }

    if (challenge.type === 'write_note' && challenge.bulletPrompts?.length) {
      const bullets = challenge.bulletPrompts.map(b => `<li class="font-body-md text-body-md text-on-surface-variant">${b}</li>`).join('');
      return `${this.renderBadge(label)}
        <p class="font-body-md text-body-md text-on-surface w-full">${challenge.prompt}</p>
        <ul class="list-disc list-inside w-full text-left">${bullets}</ul>
        <textarea id="write-note-input" rows="4" class="w-full bg-surface-container-low border-2 border-outline-variant text-on-surface font-body-md p-md rounded-DEFAULT focus:outline-none focus:border-primary-container resize-none" placeholder="Schrijf je bericht..."></textarea>
        <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT w-full"></div>`;
    }

    if (challenge.type === 'image_describe' && challenge.imageUrl) {
      const src = chrome.runtime.getURL(challenge.imageUrl);
      return `${this.renderBadge(label)}
        <img src="${src}" alt="" class="w-full max-h-40 object-contain rounded-DEFAULT bg-surface-container-low">
        <p class="font-body-md text-body-md text-on-surface w-full text-center">${challenge.prompt}</p>
        <input id="typing-input" type="text" autocomplete="off" spellcheck="false"
          class="w-full bg-surface-container-low border-b-2 border-outline-variant text-on-surface font-body-lg py-sm focus:outline-none focus:border-primary-container"
          placeholder="Beschrijf wat je ziet...">
        <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT w-full"></div>`;
    }

    const placeholders: Record<string, string> = {
      complete_sentence: 'Type the missing word...',
      plural: 'Type the plural...',
      number_listen: 'Type what you hear...',
    };
    const subtitles: Record<string, string> = {
      complete_sentence: 'Fill in the blank',
      plural: `Plural of: ${challenge.prompt}`,
      number_listen: 'Listen and type the number',
    };

    return `${this.renderBadge(label)}
      <p class="font-label-sm text-label-sm text-on-surface-variant opacity-60 uppercase w-full">${subtitles[challenge.type] ?? 'Type your answer'}</p>
      ${challenge.type === 'complete_sentence' ? `<h1 class="font-display-sentence text-display-sentence text-on-surface w-full">${challenge.prompt}</h1>` : ''}
      ${challenge.type === 'plural' ? `<h1 class="font-display-word text-display-word text-primary w-full text-center">${challenge.prompt}</h1>` : ''}
      ${challenge.type === 'number_listen' ? `<button type="button" id="replay-audio" class="material-symbols-outlined text-primary-container text-3xl hover:opacity-80">volume_up</button>` : ''}
      <input id="typing-input" type="text" autocomplete="off" spellcheck="false"
        class="w-full bg-surface-container-low border-b-2 border-outline-variant text-on-surface font-body-lg py-sm focus:outline-none focus:border-primary-container"
        placeholder="${placeholders[challenge.type] ?? 'Type...'}">
      <div id="typing-error-icon" class="hidden"><span class="material-symbols-outlined text-on-tertiary-container">error</span></div>
      <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT w-full"></div>`;
  }

  private renderListenMatchWrapper(challenge: Challenge, label: string, streaks: number): string {
    return `<div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center gap-lg">
      <span class="bg-secondary-container/20 text-secondary-fixed border border-secondary-container/30 px-sm py-xs rounded-full font-label-sm text-label-sm tracking-widest uppercase">${label}</span>
      <div id="match-card" class="glass-card w-full p-container-padding rounded-lg flex flex-col gap-lg overflow-visible relative">
        <svg id="match-lines" class="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg"></svg>
        ${this.renderListenMatchGrid(challenge)}
        <div id="match-feedback" class="hidden mt-4 space-y-1 text-center relative z-10"></div>
      </div></div>`;
  }

  private renderListenMatchGrid(challenge: Challenge): string {
    const audioWords = challenge.audioWords || [];
    const choices = challenge.choices;
    this.matchShuffle = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

    const speakersHtml = audioWords.map((word, i) => {
      const matched = this.matchPairs[i] !== -1;
      const active = i === this.matchActive && !matched;
      let cls = 'bg-surface-container border border-outline-variant opacity-60';
      if (matched) cls = 'bg-secondary-container/10 border border-secondary-container/40';
      else if (active) cls = 'bg-surface-container-high border border-primary-container/30';
      return `<button data-speaker="${i}" type="button" class="speaker-btn flex items-center gap-sm p-sm rounded-lg ${cls} w-full" ${matched ? 'disabled' : ''}>
        <span class="material-symbols-outlined">volume_up</span><span class="font-label-sm">${word}</span></button>`;
    }).join('');

    const choicesHtml = choices.map((choice, idx) => {
      const displayIdx = this.matchShuffle[idx];
      const taken = this.matchPairs.includes(displayIdx);
      const isMatched = this.matchPairs.indexOf(displayIdx) >= 0;
      let cls = taken ? 'bg-secondary-container text-on-secondary-container border-secondary-container pointer-events-none' : 'bg-surface-container border border-outline-variant';
      return `<button data-choice="${displayIdx}" type="button" class="choice-btn w-full text-center p-sm rounded-lg border ${cls}">
        <span class="font-body-md">${choice}</span></button>`;
    }).join('');

    return `<div class="grid grid-cols-2 gap-xl relative z-10">
      <div id="match-speakers" class="flex flex-col gap-md">${speakersHtml}</div>
      <div id="match-choices" class="flex flex-col gap-md">${choicesHtml}</div></div>`;
  }

  private renderReadMatchWrapper(challenge: Challenge, label: string): string {
    const n = this.matchLeftItems.length;
    const leftHtml = this.matchLeftItems.map((item, i) => {
      const matched = this.matchPairs[i] !== -1;
      const active = i === this.matchActive && !matched;
      let cls = 'bg-surface-container border border-outline-variant opacity-60';
      if (matched) cls = 'bg-secondary-container/10 border border-secondary-container/40';
      else if (active) cls = 'bg-surface-container-high border border-primary-container/30';
      return `<button data-speaker="${i}" type="button" class="match-left-btn w-full text-left p-sm rounded-lg border ${cls} font-body-md" ${matched ? 'disabled' : ''}>${item}</button>`;
    }).join('');

    const rightHtml = this.matchShuffle.map((origIdx, displayIdx) => {
      const text = this.matchRightItems[origIdx];
      const taken = this.matchPairs.includes(origIdx);
      const cls = taken ? 'bg-secondary-container text-on-secondary-container pointer-events-none' : 'bg-surface-container border border-outline-variant';
      return `<button data-choice="${origIdx}" type="button" class="choice-btn w-full text-center p-sm rounded-lg border ${cls}">
        <span class="font-body-md">${text}</span></button>`;
    }).join('');

    return `<div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg relative">
        ${this.renderBadge(label)}
        <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
        ${challenge.context ? `<div class="max-h-24 overflow-y-auto p-sm bg-surface-container-low rounded text-sm text-on-surface-variant">${challenge.context}</div>` : ''}
        <svg id="match-lines" class="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg"></svg>
        <div class="grid grid-cols-2 gap-md relative z-10">
          <div id="read-match-left" class="flex flex-col gap-sm">${leftHtml}</div>
          <div id="read-match-right" class="flex flex-col gap-sm">${rightHtml}</div>
        </div>
      </div></div>`;
  }

  private renderOrderWrapper(challenge: Challenge, label: string): string {
    const itemsHtml = this.currentOrder.map((item, i) => {
      const sel = i === this.orderSelected;
      return `<button type="button" data-order-idx="${i}" class="order-item w-full text-left p-md rounded-lg border font-body-md ${sel ? 'border-primary-container bg-surface-container-high' : 'border-outline-variant bg-surface-container'}">${i + 1}. ${item}</button>`;
    }).join('');
    return `<div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg">
        ${this.renderBadge(label)}
        <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
        <div id="order-list" class="flex flex-col gap-sm w-full">${itemsHtml}</div>
        <div id="order-feedback" class="hidden"></div>
      </div></div>`;
  }

  private renderWordOrderWrapper(challenge: Challenge, label: string): string {
    const poolHtml = this.wordPool.map((w, i) =>
      `<button type="button" data-word-idx="${i}" class="word-pool-btn px-md py-sm rounded-full border border-outline-variant bg-surface-container font-body-md">${w}</button>`).join('');
    const builtHtml = this.wordBuilt.length
      ? this.wordBuilt.map((w, i) => `<span class="px-sm py-xs bg-primary-container/20 rounded font-body-md">${w}</span>`).join(' ')
      : '<span class="text-on-surface-variant opacity-40 font-label-sm">Click words to build the sentence</span>';
    return `<div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg">
        ${this.renderBadge(label)}
        <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
        <div id="word-built" class="min-h-[3rem] p-md border border-dashed border-outline-variant rounded-DEFAULT flex flex-wrap gap-xs items-center">${builtHtml}</div>
        <div id="word-pool" class="flex flex-wrap gap-sm justify-center">${poolHtml}</div>
        <button type="button" id="word-clear" class="text-label-sm text-on-surface-variant hover:text-on-surface">Clear</button>
      </div></div>`;
  }

  private renderSpeakWrapper(challenge: Challenge, label: string): string {
    return `<div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg items-center">
        ${this.renderBadge(label)}
        <p class="font-body-md text-on-surface text-center">${challenge.prompt}</p>
        <button type="button" id="replay-audio" class="material-symbols-outlined text-primary-container text-3xl">volume_up</button>
        <button type="button" id="speak-record" class="w-full py-md rounded-full bg-primary-container text-on-primary-container font-headline-md flex items-center justify-center gap-sm">
          <span class="material-symbols-outlined">mic</span> Hold to speak</button>
        <p id="speak-transcript" class="font-body-md text-on-surface-variant text-center min-h-[1.5rem]"></p>
        <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT w-full"></div>
      </div></div>`;
  }

  private updateMatchLines(): void {
    const svg = document.getElementById('match-lines');
    const card = document.getElementById('match-card') || document.getElementById('challenge');
    if (!svg || !card) return;
    const cardRect = card.getBoundingClientRect();
    svg.setAttribute('width', String(card.clientWidth));
    svg.setAttribute('height', String(card.clientHeight));
    svg.innerHTML = '';
    this.matchPairs.forEach((choiceIdx, speakerIdx) => {
      if (choiceIdx === -1) return;
      const speakerBtn = document.querySelector(`[data-speaker="${speakerIdx}"]`);
      const choiceBtn = document.querySelector(`[data-choice="${choiceIdx}"]`);
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

  private refreshListenMatch(): void {
    const speakersContainer = document.getElementById('match-speakers');
    const choicesContainer = document.getElementById('match-choices');
    if (!speakersContainer || !choicesContainer) return;
    speakersContainer.querySelectorAll('.speaker-btn').forEach((btn, i) => {
      const matched = this.matchPairs[i] !== -1;
      const active = i === this.matchActive && !matched;
      btn.className = 'speaker-btn flex items-center gap-sm p-sm rounded-lg w-full border';
      if (matched) btn.classList.add('bg-secondary-container/10', 'border-secondary-container/40');
      else if (active) btn.classList.add('bg-surface-container-high', 'border-primary-container/30');
      else btn.classList.add('bg-surface-container', 'border-outline-variant', 'opacity-60');
      (btn as HTMLButtonElement).disabled = matched;
    });
    requestAnimationFrame(() => this.updateMatchLines());
  }

  private refreshOrderList(): void {
    const list = document.getElementById('order-list');
    if (!list) return;
    list.innerHTML = this.currentOrder.map((item, i) => {
      const sel = i === this.orderSelected;
      return `<button type="button" data-order-idx="${i}" class="order-item w-full text-left p-md rounded-lg border font-body-md ${sel ? 'border-primary-container bg-surface-container-high' : 'border-outline-variant bg-surface-container'}">${i + 1}. ${item}</button>`;
    }).join('');
    list.querySelectorAll('.order-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        this.orderSelected = parseInt((btn as HTMLElement).dataset.orderIdx || '0');
        this.refreshOrderList();
      });
    });
  }

  private refreshWordOrder(): void {
    const built = document.getElementById('word-built');
    const pool = document.getElementById('word-pool');
    if (!built || !pool) return;
    built.innerHTML = this.wordBuilt.length
      ? this.wordBuilt.map(w => `<span class="px-sm py-xs bg-primary-container/20 rounded font-body-md">${w}</span>`).join(' ')
      : '<span class="text-on-surface-variant opacity-40 font-label-sm">Click words to build the sentence</span>';
    pool.innerHTML = this.wordPool.map((w, i) =>
      `<button type="button" data-word-idx="${i}" class="word-pool-btn px-md py-sm rounded-full border border-outline-variant bg-surface-container font-body-md">${w}</button>`).join('');
    pool.querySelectorAll('.word-pool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        const idx = parseInt((btn as HTMLElement).dataset.wordIdx || '0');
        const word = this.wordPool.splice(idx, 1)[0];
        if (word) {
          this.wordBuilt.push(word);
          this.refreshWordOrder();
        }
      });
    });
  }

  private submitOrder(): void {
    if (this.answered) return;
    this.answered = true;
    if (this.onAnswer) this.onAnswer(this.currentOrder.join('|'));
  }

  private submitWordOrder(): void {
    if (this.answered || this.wordBuilt.length === 0) return;
    this.answered = true;
    if (this.onAnswer) this.onAnswer(this.wordBuilt.join(' '));
  }

  private submitForm(): void {
    if (this.answered) return;
    const inputs = document.querySelectorAll('.form-field-input') as NodeListOf<HTMLInputElement>;
    const values = Array.from(inputs).map(i => i.value.trim());
    if (values.some(v => !v)) return;
    this.answered = true;
    if (this.onAnswer) this.onAnswer(values.join('|'));
  }

  private submitTyping(): void {
    if (this.answered) return;
    const textarea = document.getElementById('write-note-input') as HTMLTextAreaElement | null;
    const input = document.getElementById('typing-input') as HTMLInputElement | null;
    const val = textarea?.value.trim() || input?.value.trim();
    if (!val) return;
    this.answered = true;
    if (this.onAnswer) this.onAnswer(val);
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
    const layout = this.layoutCategory(this.currentType as ChallengeType);

    if ((layout === 'typing' || layout === 'speak') && e.key === 'Enter') {
      e.preventDefault();
      if (document.querySelector('.form-field-input')) this.submitForm();
      else this.submitTyping();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      this.unbindKeys();
      this.onDismiss?.();
      return;
    }

    if (layout === 'order' && !this.answered) {
      if (e.key === 'ArrowUp' && this.orderSelected > 0) {
        e.preventDefault();
        const tmp = this.currentOrder[this.orderSelected];
        this.currentOrder[this.orderSelected] = this.currentOrder[this.orderSelected - 1];
        this.currentOrder[this.orderSelected - 1] = tmp;
        this.orderSelected--;
        this.refreshOrderList();
      } else if (e.key === 'ArrowDown' && this.orderSelected < this.currentOrder.length - 1) {
        e.preventDefault();
        const tmp = this.currentOrder[this.orderSelected];
        this.currentOrder[this.orderSelected] = this.currentOrder[this.orderSelected + 1];
        this.currentOrder[this.orderSelected + 1] = tmp;
        this.orderSelected++;
        this.refreshOrderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.submitOrder();
      }
      return;
    }

    if (this.currentType === 'word_order' && e.key === 'Enter' && !this.answered) {
      e.preventDefault();
      this.submitWordOrder();
      return;
    }

    if (layout !== 'typing' && layout !== 'order' && layout !== 'speak' && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      this.unbindKeys();
      this.onDismiss?.();
      return;
    }

    if (layout === 'typing' || layout === 'order') return;
    if (this.answered) return;

    if (this.currentType === 'de_het') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.answered = true; this.onAnswer?.('de'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.answered = true; this.onAnswer?.('het'); }
      return;
    }

    if (layout === 'listen_match') {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        e.preventDefault();
        this.matchActive = num - 1;
        if (this.currentAudioWords[num - 1]) this.speak(this.currentAudioWords[num - 1]);
        this.refreshListenMatch();
      }
      return;
    }

    if (layout === 'read_match') {
      const num = parseInt(e.key);
      const max = this.matchLeftItems.length;
      if (num >= 1 && num <= max) {
        e.preventDefault();
        this.matchActive = num - 1;
      }
      return;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 3) {
      e.preventDefault();
      const btn = document.querySelectorAll('.choice-btn')[num - 1] as HTMLElement | undefined;
      if (btn?.dataset.answer) {
        this.answered = true;
        this.onAnswer?.(btn.dataset.answer);
      }
    }
  }

  private bindClicks(): void {
    document.getElementById('skip-link')?.addEventListener('click', () => {
      this.unbindKeys();
      this.onDismiss?.();
    });

    document.getElementById('replay-audio')?.addEventListener('click', () => {
      if (this.currentAudio) this.speak(this.currentAudio);
    });

    document.getElementById('word-clear')?.addEventListener('click', () => {
      if (this.answered) return;
      this.wordPool.push(...this.wordBuilt);
      this.wordBuilt = [];
      this.refreshWordOrder();
    });

    const layout = this.layoutCategory(this.currentType as ChallengeType);

    if (layout === 'listen_match') {
      this.bindListenMatchClicks();
      return;
    }
    if (layout === 'read_match') {
      this.bindReadMatchClicks();
      return;
    }
    if (layout === 'order') {
      this.refreshOrderList();
      return;
    }
    if (this.currentType === 'word_order') {
      this.refreshWordOrder();
      return;
    }
    if (layout === 'speak') {
      this.bindSpeakClicks();
      return;
    }

    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        this.answered = true;
        const answer = (btn as HTMLElement).dataset.answer;
        if (answer != null) this.onAnswer?.(answer);
      });
    });
  }

  private bindListenMatchClicks(): void {
    const words = this.currentAudioWords;
    document.querySelectorAll('.speaker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        const idx = parseInt((btn as HTMLElement).dataset.speaker || '0');
        this.matchActive = idx;
        if (words[idx]) this.speak(words[idx]);
        this.refreshListenMatch();
      });
    });
    this.bindMatchChoiceClicks(4);
  }

  private bindReadMatchClicks(): void {
    document.querySelectorAll('.match-left-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        this.matchActive = parseInt((btn as HTMLElement).dataset.speaker || '0');
      });
    });
    this.bindMatchChoiceClicks(this.matchLeftItems.length);
  }

  private bindMatchChoiceClicks(total: number): void {
    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.answered) return;
        const choiceIdx = parseInt((btn as HTMLElement).dataset.choice || '-1');
        if (choiceIdx < 0 || this.matchPairs.includes(choiceIdx)) return;
        this.matchPairs[this.matchActive] = choiceIdx;
        this.matchCount++;
        if (this.matchCount >= total) {
          this.answered = true;
          const allCorrect = this.matchPairs.every((c, i) => c === i);
          this.onAnswer?.(allCorrect ? 'ok' : 'fail');
        } else {
          const next = this.matchPairs.findIndex(p => p === -1);
          if (next >= 0) this.matchActive = next;
          if (this.currentType === 'listen_match') this.refreshListenMatch();
          else requestAnimationFrame(() => this.updateMatchLines());
        }
      });
    });
  }

  private bindSpeakClicks(): void {
    const btn = document.getElementById('speak-record');
    if (!btn) return;

    const startRecord = () => {
      const SpeechRecognition = (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition
        || (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        document.getElementById('speak-transcript')!.textContent = 'Speech recognition not supported';
        return;
      }
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'nl-NL';
      this.recognition.interimResults = false;
      this.recognition.onresult = (ev) => {
        const text = ev.results[0]?.[0]?.transcript ?? '';
        document.getElementById('speak-transcript')!.textContent = text;
        if (!this.answered && text.trim()) {
          this.answered = true;
          this.onAnswer?.(text.trim());
        }
      };
      this.recognition.start();
    };

    const stopRecord = () => this.stopRecognition();

    btn.addEventListener('mousedown', startRecord);
    btn.addEventListener('mouseup', stopRecord);
    btn.addEventListener('mouseleave', stopRecord);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecord(); });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecord(); });
  }

  private stopRecognition(): void {
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* already stopped */ }
      this.recognition = null;
    }
  }

  private speak(text: string, lang = 'nl-NL'): void {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.75;
    window.speechSynthesis.speak(utterance);
  }

  private playSuccess(): void {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => this.tone(ctx, freq, now + i * 0.09, 0.12, 0.08));
  }

  private playError(): void {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

  private layoutCategory(type: ChallengeType): 'de_het' | 'mcq' | 'typing' | 'listen_match' | 'read_match' | 'order' | 'speak' {
    if (type === 'de_het') return 'de_het';
    if (type === 'listen_match') return 'listen_match';
    if (type === 'read_match') return 'read_match';
    if (type === 'read_order' || type === 'word_order') return 'order';
    if (type === 'speak_repeat') return 'speak';
    if (type === 'form_fill' || type === 'write_note' || type === 'complete_sentence'
      || type === 'plural' || type === 'number_listen' || type === 'image_describe') return 'typing';
    return 'mcq';
  }

  private typeLabel(type: ChallengeType): string {
    const labels: Record<ChallengeType, string> = {
      de_het: 'DE / HET',
      nl_to_en: 'Nederlands \u2192 Engels',
      en_to_nl: 'Engels \u2192 Nederlands',
      listen: 'Luisteren',
      listen_match: 'Luisteren en Matchen',
      nl_to_en_sentence: 'Nederlands \u2192 Engels',
      en_to_nl_sentence: 'Engels \u2192 Nederlands',
      read_mcq: 'Lezen',
      knm: 'KNM',
      dialogue_reply: 'Gesprek',
      fill_blank: 'Invuloefening',
      verb_form: 'Werkwoord',
      preposition: 'Voorzetsel',
      number_detail: 'Detail',
      listen_mcq: 'Luisteren',
      form_fill: 'Formulier',
      write_note: 'Schrijven',
      complete_sentence: 'Zin afmaken',
      plural: 'Meervoud',
      number_listen: 'Luisteren',
      read_order: 'Ordenen',
      read_match: 'Matchen',
      word_order: 'Woordvolgorde',
      speak_repeat: 'Spreken',
      image_describe: 'Beschrijven',
    };
    return labels[type] ?? type;
  }

  private mcqSubtitle(type: ChallengeType): string {
    switch (type) {
      case 'listen': return 'Listen and pick the correct spelling';
      case 'listen_mcq': return 'Listen to the clip and choose';
      case 'read_mcq': return 'Read the text and answer';
      case 'knm': return 'What is the right action in the Netherlands?';
      case 'dialogue_reply': return 'Pick the best reply';
      case 'fill_blank': return 'Choose the missing word';
      case 'verb_form': return 'Choose the correct verb form';
      case 'preposition': return 'Choose the correct preposition';
      case 'number_detail': return 'Choose the correct answer';
      case 'nl_to_en_sentence':
      case 'en_to_nl_sentence': return 'Choose the correct translation';
      default: return 'Choose the correct translation';
    }
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
