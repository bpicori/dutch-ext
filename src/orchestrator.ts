import { StorageService } from './storage.js';
import { getChallenge } from './challenges/index.js';
import { advance, DEFAULT_PROGRESS, pickNext } from './sm2.js';

const RESULT_DELAY_MS = 1200;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Orchestrator {
  constructor(private storage: StorageService) {}

  start(): void {
    this.renderShell();
    void this.run();
  }

  private async run(): Promise<void> {
    while (true) {
      const progress = this.storage.getProgress();
      const challenge = pickNext(this.storage.getDeck(), progress);
      if (!challenge) return;

      const impl = getChallenge(challenge.type);
      const area = document.getElementById('challenge-area');
      if (!area) return;

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
      await delay(RESULT_DELAY_MS);
    }
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
