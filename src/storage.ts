import { Challenge } from './types.js';

export class StorageService {
  private deck: Challenge[] = [];

  async init(): Promise<void> {
    const manifest: string[] = await fetch(chrome.runtime.getURL('challenges/manifest.json')).then(
      (r) => r.json(),
    );
    const parts = await Promise.all(
      manifest.map((f) => fetch(chrome.runtime.getURL(`challenges/${f}`)).then((r) => r.json())),
    );
    this.deck = parts.flat() as Challenge[];
  }

  getDeck(): Challenge[] {
    return this.deck;
  }
}
