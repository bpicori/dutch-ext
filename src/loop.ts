import { StorageService } from './storage.js';
import { Renderer } from './renderer.js';

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

    this.renderer.show(challenge,
      (answer) => {
        this.storage.evaluate(challenge, answer);
        this.storage.persist();
        this.renderer.showResult(challenge, answer);
        setTimeout(() => this.run(), 1000);
      },
      () => {
        this.renderer.dismiss();
      },
    );
  }
}
