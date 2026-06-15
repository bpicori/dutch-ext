import { Challenge, ChallengeProgress, GlobalProgress } from './types.js';

export class StorageService {
  private deck: Challenge[] = [];
  private progress: Record<string, ChallengeProgress> = {};
  private global: GlobalProgress = { xpTotal: 0, streakDays: 0, lastCompletedTimestamp: 0 };

  async init(): Promise<void> {
    const files = [
      'examples/example-1.json',
      'examples/example-2.json',
      'examples/example-3.json',
      'examples/example-4.json',
      'examples/example-5.json',
    ];
    const parts = await Promise.all(
      files.map(f => fetch(chrome.runtime.getURL(`challenges/${f}`)).then(r => r.json())),
    );
    this.deck = parts.flat() as Challenge[];

    const data = await chrome.storage.local.get(['global', 'progress']);
    this.global = data.global || { xpTotal: 0, streakDays: 0, lastCompletedTimestamp: 0 };
    this.progress = data.progress || {};
  }

  getGlobal(): GlobalProgress {
    return this.global;
  }

  getProgress(): Record<string, ChallengeProgress> {
    return this.progress;
  }

  getDeck(): Challenge[] {
    return this.deck;
  }

  updateProgress(id: string, cp: ChallengeProgress): void {
    this.progress = { ...this.progress, [id]: cp };
  }

  updateGlobal(g: GlobalProgress): void {
    this.global = g;
  }

  async persist(): Promise<void> {
    await chrome.storage.local.set({
      global: this.global,
      progress: this.progress,
    });
  }
}
