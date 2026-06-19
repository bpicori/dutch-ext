import { Challenge, ChallengeProgress } from './types.js';

const PROGRESS_KEY = 'progress' as const;

function migrateProgress(raw: Record<string, unknown>): Record<string, ChallengeProgress> {
  const result: Record<string, ChallengeProgress> = {};

  for (const [id, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    const p = entry as Record<string, unknown>;
    result[id] = {
      correct: Number(p.correct) || 0,
      attempts: Number(p.attempts) || 0,
      intervalIndex: Number(p.intervalIndex ?? p.consecutiveStreaks) || 0,
      dontShowUntil: Number(p.dontShowUntil) || 0,
    };
  }

  return result;
}

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

    const data = await chrome.storage.local.get([PROGRESS_KEY]);
    const stored = data[PROGRESS_KEY];
    this.progress =
      stored && typeof stored === 'object'
        ? migrateProgress(stored as Record<string, unknown>)
        : {};
  }

  getDeck(): Challenge[] {
    return this.deck;
  }

  getProgress(): Record<string, ChallengeProgress> {
    return this.progress;
  }

  async saveProgress(id: string, progress: ChallengeProgress): Promise<void> {
    this.progress = { ...this.progress, [id]: progress };
    await chrome.storage.local.set({ [PROGRESS_KEY]: this.progress });
  }
}