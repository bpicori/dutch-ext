import { Challenge, ChallengeProgress } from './types.js';

export class StorageService {
  private deck: Challenge[] = [];
  private progress: Record<string, ChallengeProgress> = {};

  async init(): Promise<void> {
    const manifest: string[] = await fetch(chrome.runtime.getURL('challenges/manifest.json')).then(
      (r) => r.json(),
    );
    const parts = await Promise.all(
      manifest.map((f) => fetch(chrome.runtime.getURL(`challenges/${f}`)).then((r) => r.json())),
    );
    this.deck = parts.flat() as Challenge[];

    const data = await chrome.storage.local.get(['progress']);
    this.progress = data.progress || {};
  }

  getDeck(): Challenge[] {
    return this.deck;
  }

  getProgress(): Record<string, ChallengeProgress> {
    return this.progress;
  }

  updateProgress(id: string, cp: ChallengeProgress): void {
    this.progress = { ...this.progress, [id]: cp };
  }

  async persist(): Promise<void> {
    await chrome.storage.local.set({ progress: this.progress });
  }
}
