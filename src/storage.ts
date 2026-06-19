import { Challenge, ChallengeLevel, ChallengeProgress } from './types.js';

const PROGRESS_KEY = 'progress' as const;

const LEVELS = new Set<ChallengeLevel>(['a1', 'a2', 'b1']);

function metadataFromPath(filePath: string): { level?: ChallengeLevel; topic?: string } {
  const levelMatch = filePath.match(/^data\/([^/]+)\//);
  const topicMatch = filePath.match(/\/([^/]+)\.json$/);
  const levelSlug = levelMatch?.[1];
  const level = levelSlug && LEVELS.has(levelSlug as ChallengeLevel)
    ? (levelSlug as ChallengeLevel)
    : undefined;
  const topic = topicMatch?.[1];
  return { level, topic };
}

function enrichChallenge(challenge: Challenge, filePath: string): Challenge {
  const { level, topic } = metadataFromPath(filePath);
  return {
    ...challenge,
    level: challenge.level ?? level,
    topic: challenge.topic ?? topic,
  };
}

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
      manifest.map(async (f) => {
        const challenges: Challenge[] = await fetch(chrome.runtime.getURL(`challenges/${f}`)).then(
          (r) => r.json(),
        );
        return challenges.map((ch) => enrichChallenge(ch, f));
      }),
    );
    this.deck = parts.flat();

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