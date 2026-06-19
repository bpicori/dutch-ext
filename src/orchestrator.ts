import { StorageService } from './storage.js';
import { getChallenge } from './challenges/index.js';
import { kbdChip } from './challenges/shared.js';
import { DebugMode } from './debug.js';
import { Challenge } from './types.js';
import { advance, DEFAULT_PROGRESS, pickNext } from './sm2.js';

type ContinueAction = 'continue' | 'dismiss';

function waitForContinue(challengeArea: HTMLElement): Promise<ContinueAction> {
  return new Promise((resolve) => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        resolve('dismiss');
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        resolve('continue');
      }
    };

    const onClick = (e: MouseEvent) => {
      if (challengeArea.contains(e.target as Node)) return;
      cleanup();
      resolve('continue');
    };

    const cleanup = () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
  });
}

export class Orchestrator {
  private debug: DebugMode;

  constructor(private storage: StorageService) {
    this.debug = new DebugMode(() => this.storage.getDeck());
  }

  start(): void {
    this.renderShell();
    this.debug.mount();
    void this.run();
  }

  private pickChallengeForRound(): Challenge | null {
    const deck = this.storage.getDeck();
    const debugChallenge = this.debug.pickChallenge(deck);
    if (debugChallenge) return debugChallenge;
    if (this.debug.wantsTypeButEmpty()) return null;
    return pickNext(deck, this.storage.getProgress());
  }

  private showDebugEmpty(area: HTMLElement): void {
    area.innerHTML = `
      <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
        <div class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg items-center text-center">
          <span class="material-symbols-outlined text-on-surface-variant opacity-60" style="font-size: 40px">search_off</span>
          <p class="font-body-md text-on-surface">No challenges found for the selected debug type.</p>
          <p class="font-label-sm text-label-sm text-on-surface-variant">Pick another type in the debug panel.</p>
        </div>
      </div>`;
  }

  private async run(): Promise<void> {
    while (true) {
      const challenge = this.pickChallengeForRound();
      const area = document.getElementById('challenge-area');
      if (!area) return;

      if (!challenge) {
        this.showDebugEmpty(area);
        if ((await waitForContinue(area)) === 'dismiss') {
          this.dismiss();
          return;
        }
        continue;
      }

      const impl = getChallenge(challenge.type);
      const progress = this.storage.getProgress();
      const response = await impl.present(area, challenge);

      if (response.kind === 'dismiss') {
        this.dismiss();
        return;
      }

      const prev = progress[challenge.id] ?? DEFAULT_PROGRESS;
      const answer = response.kind === 'answer' ? response.value : '';
      const correct = response.kind === 'answer' && impl.isCorrect(challenge, response.value);
      this.storage.updateProgress(challenge.id, advance(prev, correct));
      await this.storage.persist();

      impl.showResult(area, challenge, answer, correct);
      this.showContinueHint(area);

      if ((await waitForContinue(area)) === 'dismiss') {
        this.dismiss();
        return;
      }
    }
  }

  private showContinueHint(area: HTMLElement): void {
    const hint = document.createElement('div');
    hint.id = 'continue-hint';
    hint.className =
      'mt-xl flex justify-center items-center gap-sm font-label-sm text-label-sm text-on-surface-variant opacity-60';
    hint.innerHTML = `${kbdChip('Enter')}<span>or click outside</span><span>Next challenge</span>`;
    area.appendChild(hint);
  }

  private renderShell(): void {
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
    `;
  }

  private dismiss(): void {
    const el = document.getElementById('challenge-wrapper');
    if (!el) return;
    el.classList.add('animate-slide-out');
    el.addEventListener('animationend', () => {
      el.remove();
      (document.activeElement as HTMLElement)?.blur?.();
    });
  }
}