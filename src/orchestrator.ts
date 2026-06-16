import { Challenge } from './types.js';
import { StorageService } from './storage.js';
import { getChallenge } from './challenges/index.js';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Orchestrator {
  start(storage: StorageService): void {
    this.renderShell();
    void this.run(storage);
  }

  private async run(storage: StorageService): Promise<void> {
    const challenge = this.getNextChallenge(storage.getDeck());
    if (!challenge) return;

    const impl = getChallenge(challenge.type);
    const area = document.getElementById('challenge-area');
    if (!area) return;

    const response = await impl.present(area, challenge);

    if (response.kind === 'dismiss') {
      this.dismiss();
      return;
    }

    const correct = this.evaluate(challenge, response.value);

    impl.showResult(area, challenge, response.value, correct);
    await delay(1200);

    await this.run(storage);
  }

  getNextChallenge(deck: Challenge[]): Challenge | null {
    if (deck.length === 0) return null;
    return deck[Math.floor(Math.random() * deck.length)];
  }

  evaluate(challenge: Challenge, answer: string): boolean {
    return getChallenge(challenge.type).isCorrect(challenge, answer);
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
