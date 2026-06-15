import { StorageService } from './storage.js';
import { Renderer } from './renderer.js';
import { ChallengeProgress } from './types.js';

const DEFAULT_PROGRESS: ChallengeProgress = {
  correct: 0,
  attempts: 0,
  consecutiveStreaks: 0,
  dontShowUntil: 0,
};

export class GameLoop {
  constructor(
    private storage: StorageService,
    private renderer: Renderer,
  ) {}

  async start(): Promise<void> {
    await this.storage.init();
    this.renderer.renderShell();
    this.run();
  }

  private run(): void {
    const challenge = this.storage.getNextChallenge();
    if (!challenge) return;

    const progress = this.storage.getProgress();
    this.renderer.show(
      challenge,
      {
        global: this.storage.getGlobal(),
        cardProgress: progress[challenge.id] ?? DEFAULT_PROGRESS,
        deck: this.storage.getDeck(),
      },
      (answer) => {
        const result = this.storage.evaluate(challenge, answer);
        this.storage.persist();
        this.renderer.showResult(challenge, answer, result.correct, () => this.run());
      },
      () => {
        this.renderer.dismiss();
      },
    );
  }
}
