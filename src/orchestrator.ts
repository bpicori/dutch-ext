import { Challenge, ChallengeProgress, EvaluateResult } from './types.js';
import { StorageService } from './storage.js';
import { getChallenge } from './challenges/index.js';

const SPACING_MINUTES = [1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200];

export const DEFAULT_PROGRESS: ChallengeProgress = {
  correct: 0,
  attempts: 0,
  consecutiveStreaks: 0,
  dontShowUntil: 0,
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Orchestrator {
  start(storage: StorageService): void {
    this.renderShell();
    void this.run(storage);
  }

  private async run(storage: StorageService): Promise<void> {
    const progress = storage.getProgress();
    const challenge = this.getNextChallenge(storage.getDeck(), progress);
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
    const result = this.evaluate(challenge, response.value, prev);
    storage.updateProgress(challenge.id, result.progress);
    await storage.persist();

    impl.showResult(area, challenge, response.value, result.correct);
    await delay(1200);

    await this.run(storage);
  }

  getNextChallenge(
    deck: Challenge[],
    progress: Record<string, ChallengeProgress>,
  ): Challenge | null {
    // get the challenges that are never seen or dontShowUntil < now
    const eligible = deck.filter((ch) => {
      const p = progress[ch.id];
      if (!p) return true;
      return p.dontShowUntil <= Date.now();
    });

    if (eligible.length > 0) {
      return eligible[Math.floor(Math.random() * eligible.length)];
    }

    // if no eligible cards, just get the oldest one
    const sorted = [...deck].sort((a, b) => {
      const da = progress[a.id]?.dontShowUntil ?? 0;
      const db = progress[b.id]?.dontShowUntil ?? 0;
      return da - db;
    });
    return sorted[0] ?? null;
  }

  evaluate(challenge: Challenge, answer: string, prev: ChallengeProgress): EvaluateResult {
    const correct = getChallenge(challenge.type).isCorrect(challenge, answer);

    if (correct) {
      const newStreaks = Math.min(prev.consecutiveStreaks + 1, SPACING_MINUTES.length - 1);
      return {
        correct,
        progress: {
          correct: prev.correct + 1,
          attempts: prev.attempts + 1,
          consecutiveStreaks: newStreaks,
          dontShowUntil: Date.now() + SPACING_MINUTES[newStreaks] * 60 * 1000,
        },
      };
    }

    return {
      correct,
      progress: {
        correct: prev.correct,
        attempts: prev.attempts + 1,
        consecutiveStreaks: 0,
        dontShowUntil: Date.now() + 5 * 60 * 1000,
      },
    };
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
