import { Challenge, ChallengeProgress, GlobalProgress } from './types.js';

export type AnswerCallback = (answer: string) => void;
export type DismissCallback = () => void;

export interface ShowContext {
  global: GlobalProgress;
  cardProgress: ChallengeProgress;
  deck: Challenge[];
}

const SPACING_MAX = 9;

export class Renderer {
  private onAnswer: AnswerCallback | null = null;
  private onDismiss: DismissCallback | null = null;
  private currentType: string | null = null;
  private answered = false;
  private handler: ((e: KeyboardEvent) => void) | null = null;
  private currentAudio: string | undefined = undefined;
  private currentAudioWords: string[] = [];
  private matchPairs: number[] = [];
  private matchActive: number = 0;
  private matchCount: number = 0;
  private matchShuffle: number[] = [];
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
        <div id="challenge-area" class="w-full max-w-[420px] flex flex-col items-center">
        </div>
      </main>

      <footer id="footer-hint" class="fixed bottom-0 left-0 w-full z-50 flex justify-center items-center gap-lg px-container-padding py-xl bg-transparent">
      </footer>
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
    this.matchPairs = [-1, -1, -1, -1];
    this.matchActive = 0;
    this.matchCount = 0;

    const streakEl = document.getElementById('streak-days');
    if (streakEl) streakEl.textContent = String(ctx.global.streakDays);

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

    if (challenge.type === 'listen_match') {
      requestAnimationFrame(() => this.updateMatchLines());
    }
  }

  showResult(challenge: Challenge, userAnswer: string, onContinue?: () => void): void {
    this.unbindKeys();

    if (challenge.type === 'listen_match') {
      const allCorrect = this.matchPairs.every((c, i) => c === i);
      const speakersContainer = document.getElementById('match-speakers');
      const choicesContainer = document.getElementById('match-choices');
      const choices = challenge.choices;
      const card = document.getElementById('match-card');

      if (card) {
        card.classList.add(allCorrect ? 'success-glow' : 'error-glow');
        if (!allCorrect) card.classList.add('animate-shake');
      }

      if (speakersContainer && choicesContainer) {
        const speakerEls = speakersContainer.querySelectorAll('.speaker-btn');
        const choiceEls = choicesContainer.querySelectorAll('.choice-btn');

        speakerEls.forEach((btn, i) => {
          const correct = this.matchPairs[i] === i;
          btn.classList.add(correct ? '!border-secondary-container' : '!border-on-tertiary-container');
        });

        choiceEls.forEach((btn) => {
          const choiceIdx = parseInt((btn as HTMLElement).dataset.choice || '-1');
          const speakerIdx = this.matchPairs.indexOf(choiceIdx);
          if (speakerIdx >= 0) {
            const correct = speakerIdx === choiceIdx;
            btn.classList.add(
              correct
                ? '!bg-secondary-container !border-secondary-container !text-on-secondary-container'
                : '!bg-on-tertiary/10 !border-on-tertiary-container !text-on-surface',
            );
            if (!correct) btn.classList.add('animate-shake');
          }
        });

        const wrongPairs = this.matchPairs.filter((c, i) => c !== i);
        if (wrongPairs.length > 0) {
          const feedback = document.getElementById('match-feedback');
          if (feedback) {
            feedback.innerHTML = this.matchPairs.map((c, i) => {
              if (c === i) return '';
              return `<div class="text-sm text-on-surface-variant"><span class="text-on-tertiary-container">${this.currentAudioWords[i]}</span> \u2192 <span class="text-secondary">${choices[i]}</span></div>`;
            }).join('');
            feedback.classList.remove('hidden');
          }
        }
      }

      const svg = document.getElementById('match-lines');
      if (svg) svg.innerHTML = '';

      if (allCorrect) this.playSuccess();
      else this.playError();

      if (onContinue) this.injectContinueButton(onContinue);
      return;
    }

    const input = document.getElementById('typing-input') as HTMLInputElement | null;
    if (input) {
      input.readOnly = true;
      const card = document.getElementById('challenge');

      const correct = userAnswer.trim().toLowerCase() === challenge.correctAnswer.trim().toLowerCase();
      if (correct) {
        input.classList.add('!border-secondary-container', '!text-secondary-fixed');
        card?.classList.add('success-glow');
        this.playSuccess();
      } else {
        input.classList.add('!border-on-tertiary-container', '!text-on-tertiary', 'animate-shake');
        card?.classList.add('error-glow', 'animate-shake');

        const iconWrap = document.getElementById('typing-error-icon');
        if (iconWrap) iconWrap.classList.remove('hidden');

        const fb = document.getElementById('typing-feedback');
        if (fb) {
          fb.innerHTML = `
            <span class="font-label-sm text-label-sm text-on-tertiary-container font-bold uppercase">Correction</span>
            <p class="font-body-md text-body-md text-on-surface mt-1">${this.highlightDiff(userAnswer, challenge.correctAnswer)}</p>
          `;
          fb.classList.remove('hidden');
        }
        this.playError();
      }

      if (onContinue) this.injectContinueButton(onContinue);
      return;
    }

    const buttons = document.querySelectorAll('.choice-btn') as NodeListOf<HTMLElement>;
    const correctAnswer = challenge.correctAnswer;
    const card = document.getElementById('challenge');

    buttons.forEach(btn => {
      const answer = btn.dataset.answer;
      btn.style.pointerEvents = 'none';

      if (answer === correctAnswer) {
        btn.classList.add('!bg-secondary-container', '!border-secondary-container', '!text-on-secondary-container');
      } else if (answer === userAnswer && answer !== correctAnswer) {
        btn.classList.add('!bg-on-tertiary/10', '!border-on-tertiary-container', '!text-on-surface', 'animate-shake');
      } else {
        btn.classList.add('opacity-40');
      }
    });

    if (userAnswer === correctAnswer) {
      card?.classList.add('success-glow');
      this.playSuccess();
    } else {
      card?.classList.add('error-glow');
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

    const existing = document.getElementById('continue-btn');
    if (existing) existing.remove();

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
    const el = document.getElementById('challenge-wrapper');
    if (el) el.remove();
  }

  dismiss(): void {
    this.unbindKeys();
    const el = document.getElementById('challenge-wrapper');
    if (!el) return;

    el.classList.add('animate-slide-out');
    el.addEventListener('animationend', () => {
      el.remove();
      if (document.activeElement && (document.activeElement as HTMLElement).blur) {
        (document.activeElement as HTMLElement).blur();
      }
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
    return `
      <div class="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
        <div class="h-full ${fillClass} transition-all duration-500 ${glow}" style="width: ${pct}%"></div>
      </div>
    `;
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

    if (type === 'de_het') {
      footer.innerHTML = `
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">
          ${this.kbdChip('\u2190')}<span>DE</span>
        </div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">
          ${this.kbdChip('\u2192')}<span>HET</span>
        </div>
        <div class="flex items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60">
          ${this.kbdChip('Space')}<span>Skip</span>
        </div>
      `;
    } else if (type.endsWith('_sentence')) {
      footer.innerHTML = `
        <div class="flex items-center gap-xs">
          ${this.kbdChip('Enter')}<span class="font-label-sm text-label-sm text-on-surface-variant opacity-60">Continue</span>
        </div>
        <div class="flex items-center gap-xs">
          ${this.kbdChip('Space')}<span class="font-label-sm text-label-sm text-on-surface-variant opacity-60">Skip</span>
        </div>
      `;
    } else if (type === 'listen_match') {
      footer.innerHTML = `
        <div class="flex items-center gap-xs text-on-surface font-label-sm text-label-sm">
          ${this.kbdChip('1-4')}<span>Play</span>
        </div>
        ${this.footerDivider()}
        <div class="flex items-center gap-xs text-on-surface-variant opacity-60 font-label-sm text-label-sm">
          ${this.kbdChip('Space')}<span>Skip</span>
        </div>
        ${this.footerDivider()}
        <div class="flex items-center gap-xs text-on-surface-variant opacity-60 font-label-sm text-label-sm">
          ${this.kbdChip('Enter')}<span>Next</span>
        </div>
      `;
    } else {
      footer.innerHTML = `
        <div class="flex items-center gap-md">
          <div class="flex items-center gap-xs">
            ${this.kbdChip('1-3')}<span class="font-label-sm text-label-sm text-on-surface-variant">Choose</span>
          </div>
          ${this.footerDivider()}
          <div class="flex items-center gap-xs">
            ${this.kbdChip('Space')}<span class="font-label-sm text-label-sm text-on-surface-variant">Skip</span>
          </div>
          ${this.footerDivider()}
          <div class="flex items-center gap-xs">
            ${this.kbdChip('Enter')}<span class="font-label-sm text-label-sm text-on-surface-variant">Next</span>
          </div>
        </div>
      `;
    }
  }

  // --- rendering ---

  private renderChallenge(challenge: Challenge): void {
    const area = document.getElementById('challenge-area');
    if (!area || !this.ctx) return;

    const streaks = this.ctx.cardProgress.consecutiveStreaks;
    const typeLabel = this.typeLabel(challenge.type);

    if (challenge.type === 'listen_match') {
      area.innerHTML = this.renderListenMatchWrapper(challenge, typeLabel, streaks);
      return;
    }

    const isTyping = challenge.type.endsWith('_sentence');
    const content = challenge.type === 'de_het'
      ? this.renderDeHet(challenge)
      : isTyping
        ? this.renderTyping(challenge, typeLabel)
        : this.renderMultipleChoice(challenge, typeLabel);

    const skipLink = challenge.type === 'de_het'
      ? `<button id="skip-link" type="button" class="mt-lg font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-widest py-xs">Ik weet het niet zeker</button>`
      : '';

    const cardPadding = challenge.type === 'de_het' ? 'p-lg' : 'py-xl px-lg';
    const badgeInCard = challenge.type !== 'de_het' && !isTyping;

    area.innerHTML = `
      <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
        <div id="challenge" class="glass-card w-full rounded-lg ${cardPadding} flex flex-col items-center gap-lg relative overflow-hidden">
          ${badgeInCard ? this.renderBadge(typeLabel) : ''}
          ${content}
          ${challenge.type !== 'de_het' && !isTyping ? this.renderCardProgressBar(streaks) : ''}
        </div>
        ${skipLink}
      </div>
    `;
  }

  private renderBadge(label: string): string {
    return `
      <div class="px-sm py-xs bg-surface-container-high rounded-full border border-outline-variant">
        <span class="text-label-sm font-label-sm text-on-surface-variant tracking-widest uppercase">${label}</span>
      </div>
    `;
  }

  private renderCardProgressBar(streaks: number): string {
    return `
      <div class="absolute bottom-0 left-0 w-full h-1 bg-surface-container-highest">
        <div class="h-full bg-primary-container shadow-[0_0_10px_rgba(252,211,77,0.5)] transition-all duration-500" style="width: ${this.progressPercent(streaks)}%"></div>
      </div>
    `;
  }

  private typeLabel(type: string): string {
    switch (type) {
      case 'de_het': return 'DE / HET';
      case 'nl_to_en': return 'Nederlands \u2192 Engels';
      case 'en_to_nl': return 'Engels \u2192 Nederlands';
      case 'listen': return 'Luisteren';
      case 'listen_match': return 'Luisteren en Matchen';
      case 'nl_to_en_sentence': return 'Nederlands \u2192 Engels';
      case 'en_to_nl_sentence': return 'Engels \u2192 Nederlands';
      default: return '';
    }
  }

  private renderDeHet(challenge: Challenge): string {
    const gloss = this.ctx ? this.findEnglishGloss(challenge.prompt, this.ctx.deck) : null;
    const streaks = this.ctx?.cardProgress.consecutiveStreaks ?? 0;

    return `
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
        <h1 class="font-display-word text-display-word text-primary lowercase">${challenge.prompt}</h1>
        ${gloss ? `<p class="font-label-sm text-label-sm text-on-surface-variant opacity-60 mt-xs">${gloss}</p>` : ''}
      </div>
      <div class="w-full grid grid-cols-2 gap-md">
        <button data-answer="de" type="button"
          class="choice-btn btn-active group relative flex flex-col items-center justify-center py-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant rounded-lg transition-all">
          <span class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">DE</span>
          <span class="absolute bottom-xs font-label-sm text-[10px] text-on-surface-variant opacity-40">Press \u2190</span>
        </button>
        <button data-answer="het" type="button"
          class="choice-btn btn-active group relative flex flex-col items-center justify-center py-lg bg-surface-container-high hover:bg-surface-bright border border-outline-variant rounded-lg transition-all">
          <span class="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">HET</span>
          <span class="absolute bottom-xs font-label-sm text-[10px] text-on-surface-variant opacity-40">Press \u2192</span>
        </button>
      </div>
      ${this.renderProgressBar(streaks)}
    `;
  }

  private renderMultipleChoice(challenge: Challenge, typeLabel: string): string {
    const labels = ['1', '2', '3'];
    const choicesHtml = challenge.choices.map((choice, i) => `
      <button data-answer="${choice.replace(/"/g, '&quot;')}" data-index="${i}" type="button"
        class="choice-btn group flex items-center justify-between w-full p-md bg-surface-container rounded-DEFAULT border border-outline-variant hover:border-primary-container hover:bg-surface-container-high transition-all">
        <span class="font-body-lg text-body-lg text-on-surface">${choice}</span>
        <span class="text-label-sm text-on-surface-variant opacity-40 group-hover:opacity-100 transition-opacity">${labels[i]}</span>
      </button>
    `).join('');

    const subtitle = challenge.type === 'listen'
      ? 'Listen and pick the correct spelling'
      : 'Choose the correct translation';

    const promptHtml = challenge.type === 'listen'
      ? `<div class="text-center py-md">
          <button type="button" id="replay-audio" class="mb-sm material-symbols-outlined text-primary-container text-3xl hover:opacity-80 transition-opacity">volume_up</button>
          <h1 class="font-display-word text-display-word text-primary">${challenge.prompt}</h1>
          <p class="text-on-surface-variant font-label-sm mt-xs opacity-60">${subtitle}</p>
        </div>`
      : `<div class="text-center py-md">
          <h1 class="font-display-word text-display-word text-primary">${challenge.prompt}</h1>
          <p class="text-on-surface-variant font-label-sm mt-xs opacity-60">${subtitle}</p>
        </div>`;

    return `
      ${promptHtml}
      <div class="w-full flex flex-col gap-sm">
        ${choicesHtml}
      </div>
      <div class="absolute top-4 right-6 opacity-20 pointer-events-none text-xl">\uD83C\uDF37</div>
    `;
  }

  private renderTyping(challenge: Challenge, typeLabel: string): string {
    const translateLabel = challenge.type === 'nl_to_en_sentence'
      ? 'Translate this sentence'
      : 'Translate this sentence';

    return `
      <div class="w-full flex justify-between items-center">
        <span class="bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm px-sm py-1 rounded-full uppercase tracking-widest border border-white/5">
          ${typeLabel}
        </span>
        <span class="text-2xl drop-shadow-md">\uD83C\uDF37</span>
      </div>
      <div class="flex flex-col gap-xs w-full">
        <span class="font-label-sm text-label-sm text-on-surface-variant opacity-60 uppercase">${translateLabel}</span>
        <h1 class="font-display-sentence text-display-sentence text-on-surface">${challenge.prompt}</h1>
      </div>
      <div class="flex flex-col gap-md w-full">
        <div class="relative group">
          <input id="typing-input" type="text" autocomplete="off" spellcheck="false"
            class="w-full bg-surface-container-low border-b-2 border-outline-variant text-on-surface font-body-lg text-body-lg py-sm px-0 focus:outline-none focus:border-primary-container transition-all placeholder:text-on-surface-variant/30"
            placeholder="Type your translation...">
          <div id="typing-error-icon" class="hidden absolute right-0 bottom-3">
            <span class="material-symbols-outlined text-on-tertiary-container" style="font-variation-settings: 'FILL' 1;">error</span>
          </div>
        </div>
        <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT flex flex-col gap-1"></div>
      </div>
    `;
  }

  private renderListenMatchWrapper(challenge: Challenge, typeLabel: string, streaks: number): string {
    const matchPct = (this.matchCount / 4) * 100;
    return `
      <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center gap-lg">
        <div class="flex flex-col items-center gap-sm">
          <span class="bg-secondary-container/20 text-secondary-fixed border border-secondary-container/30 px-sm py-xs rounded-full font-label-sm text-label-sm tracking-widest uppercase">
            ${typeLabel}
          </span>
          <div class="flex flex-col items-center">
            <span id="match-count" class="font-headline-md text-headline-md text-on-surface">${this.matchCount} / 4 matched</span>
            <div class="w-48 h-1 bg-surface-container-highest rounded-full mt-xs overflow-hidden">
              <div id="match-progress-bar" class="h-full bg-secondary-container transition-all duration-700" style="width: ${matchPct}%"></div>
            </div>
          </div>
        </div>
        <div id="match-card" class="glass-card w-full p-container-padding rounded-lg flex flex-col gap-lg overflow-visible relative">
          <svg id="match-lines" class="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg"></svg>
          ${this.renderListenMatchGrid(challenge)}
          <div id="match-feedback" class="hidden mt-4 space-y-1 text-center relative z-10"></div>
        </div>
        <div class="flex flex-col items-center gap-xs opacity-40">
          <span class="text-3xl drop-shadow-lg">\uD83C\uDF37</span>
        </div>
      </div>
    `;
  }

  private renderListenMatchGrid(challenge: Challenge): string {
    const audioWords = challenge.audioWords || [];
    const choices = challenge.choices;

    this.matchShuffle = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

    const speakersHtml = audioWords.map((word, i) => {
      const matched = this.matchPairs[i] !== -1;
      const active = i === this.matchActive && !matched;
      let stateClass = 'bg-surface-container border border-outline-variant opacity-60';
      if (matched) stateClass = 'bg-secondary-container/10 border border-secondary-container/40';
      else if (active) stateClass = 'bg-surface-container-high border border-primary-container/30';

      return `
        <button data-speaker="${i}" type="button"
          class="speaker-btn flex items-center gap-sm p-sm rounded-lg ${stateClass} text-on-surface active:scale-[0.98] transition-all w-full"
          ${matched ? 'disabled' : ''}>
          <span class="material-symbols-outlined ${matched ? 'text-secondary' : active ? 'text-primary-container' : ''}">volume_up</span>
          <span class="font-label-sm text-label-sm ${matched || active ? '' : 'text-on-surface-variant'}">${word}</span>
        </button>
      `;
    }).join('');

    const choicesHtml = choices.map((choice, idx) => {
      const displayIdx = this.matchShuffle[idx];
      const taken = this.matchPairs.includes(displayIdx);
      const matchedBy = this.matchPairs.indexOf(displayIdx);
      const isMatched = matchedBy >= 0;

      let stateClass = 'bg-surface-container border border-outline-variant';
      if (isMatched) stateClass = 'bg-secondary-container text-on-secondary-container border border-secondary-container';

      return `
        <button data-choice="${displayIdx}" type="button"
          class="choice-btn w-full text-center p-sm rounded-lg ${stateClass} active:scale-[0.98] transition-all
          ${taken ? 'pointer-events-none' : ''}">
          <span class="font-body-md text-body-md ${isMatched ? 'font-semibold' : ''}">${choice}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="grid grid-cols-2 gap-xl relative z-10">
        <div id="match-speakers" class="flex flex-col gap-md">
          ${speakersHtml}
        </div>
        <div id="match-choices" class="flex flex-col gap-md">
          ${choicesHtml}
        </div>
      </div>
    `;
  }

  private updateMatchLines(): void {
    const svg = document.getElementById('match-lines');
    const card = document.getElementById('match-card');
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

      const x1 = sRect.right - cardRect.left;
      const y1 = sRect.top + sRect.height / 2 - cardRect.top;
      const x2 = cRect.left - cardRect.left;
      const y2 = cRect.top + cRect.height / 2 - cardRect.top;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      line.setAttribute('class', 'match-line');
      svg.appendChild(line);
    });
  }

  private refreshListenMatch(): void {
    const speakersContainer = document.getElementById('match-speakers');
    const choicesContainer = document.getElementById('match-choices');
    if (!speakersContainer || !choicesContainer) return;

    speakersContainer.querySelectorAll('.speaker-btn').forEach((btn, i) => {
      const btnEl = btn as HTMLElement;
      const matched = this.matchPairs[i] !== -1;
      const active = i === this.matchActive && !matched;

      btnEl.className = 'speaker-btn flex items-center gap-sm p-sm rounded-lg text-on-surface active:scale-[0.98] transition-all w-full';
      const icon = btnEl.querySelector('.material-symbols-outlined');
      const label = btnEl.querySelector('span:last-child');

      if (matched) {
        btnEl.classList.add('bg-secondary-container/10', 'border', 'border-secondary-container/40');
        icon?.classList.add('text-secondary');
        (btnEl as HTMLButtonElement).disabled = true;
      } else if (active) {
        btnEl.classList.add('bg-surface-container-high', 'border', 'border-primary-container/30');
        icon?.classList.add('text-primary-container');
      } else {
        btnEl.classList.add('bg-surface-container', 'border', 'border-outline-variant', 'opacity-60');
        label?.classList.add('text-on-surface-variant');
      }
    });

    choicesContainer.querySelectorAll('.choice-btn').forEach((btn) => {
      const choiceIdx = parseInt((btn as HTMLElement).dataset.choice || '-1');
      const matchedBy = this.matchPairs.indexOf(choiceIdx);
      const taken = matchedBy >= 0;

      btn.className = 'choice-btn w-full text-center p-sm rounded-lg active:scale-[0.98] transition-all';
      const span = btn.querySelector('span');
      if (taken) {
        btn.classList.add('bg-secondary-container', 'text-on-secondary-container', 'border', 'border-secondary-container', 'pointer-events-none');
        span?.classList.add('font-semibold');
      } else {
        btn.classList.add('bg-surface-container', 'border', 'border-outline-variant');
      }
    });

    const countEl = document.getElementById('match-count');
    if (countEl) countEl.textContent = `${this.matchCount} / 4 matched`;

    const barEl = document.getElementById('match-progress-bar');
    if (barEl) (barEl as HTMLElement).style.width = `${(this.matchCount / 4) * 100}%`;

    requestAnimationFrame(() => this.updateMatchLines());
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

    if (this.currentType === 'listen_match') {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        e.preventDefault();
        this.matchActive = num - 1;
        const words = this.currentAudioWords || [];
        if (words[num - 1]) this.speak(words[num - 1]);
        this.refreshListenMatch();
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
    const skipLink = document.getElementById('skip-link');
    if (skipLink) {
      skipLink.addEventListener('click', () => {
        this.unbindKeys();
        if (this.onDismiss) this.onDismiss();
      });
    }

    const replay = document.getElementById('replay-audio');
    if (replay && this.currentAudio) {
      replay.addEventListener('click', () => this.speak(this.currentAudio!));
    }

    const isTyping = !!this.currentType?.endsWith('_sentence');
    if (isTyping) return;

    if (this.currentType === 'listen_match') {
      const speakers = document.querySelectorAll('.speaker-btn');
      const words = this.currentAudioWords || [];
      speakers.forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.answered) return;
          const idx = parseInt((btn as HTMLElement).dataset.speaker || '0');
          this.matchActive = idx;
          if (words[idx]) this.speak(words[idx]);
          this.refreshListenMatch();
        });
      });

      const choices = document.querySelectorAll('.choice-btn');
      choices.forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.answered) return;
          const choiceIdx = parseInt((btn as HTMLElement).dataset.choice || '-1');
          if (choiceIdx < 0 || this.matchPairs.includes(choiceIdx)) return;

          this.matchPairs[this.matchActive] = choiceIdx;
          this.matchCount++;

          if (this.matchCount >= 4) {
            this.answered = true;
            const allCorrect = this.matchPairs.every((c, i) => c === i);
            if (this.onAnswer) this.onAnswer(allCorrect ? 'ok' : '');
          } else {
            const next = this.matchPairs.findIndex(p => p === -1);
            if (next >= 0) this.matchActive = next;
            this.refreshListenMatch();
          }
        });
      });
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
