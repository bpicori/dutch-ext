import {
  Challenge,
  ChallengeLevel,
  ChallengeProgress,
  DailyReviewStat,
  ReviewEntry,
  StreakState,
} from './types.js';
import { addDays, toLocalDate } from './stats.js';

const PROGRESS_KEY = 'progress' as const;
const REVIEW_DAILY_KEY = 'reviewDaily' as const;
const REVIEW_LOG_KEY = 'reviewLog' as const;
const STREAK_KEY = 'streak' as const;
const IGNORED_KEY = 'ignored' as const;

const MAX_LOG_ENTRIES = 10_000;
const LOG_RETENTION_MS = 365 * 86_400_000;

const LEVELS = new Set<ChallengeLevel>(['a1', 'a2', 'b1']);

const DEFAULT_STREAK: StreakState = { current: 0, lastDate: null };

function metadataFromPath(filePath: string): { level?: ChallengeLevel; topic?: string } {
  const levelMatch = filePath.match(/^data\/([^/]+)\//);
  const topicMatch = filePath.match(/\/([^/]+)\.json$/);
  const levelSlug = levelMatch?.[1];
  const level =
    levelSlug && LEVELS.has(levelSlug as ChallengeLevel)
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

function migrateReviewDaily(raw: unknown): Record<string, DailyReviewStat> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, DailyReviewStat> = {};
  for (const [date, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    result[date] = {
      reviews: Number(e.reviews) || 0,
      correct: Number(e.correct) || 0,
    };
  }
  return result;
}

function migrateReviewLog(raw: unknown): ReviewEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: ReviewEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.cardId !== 'string') continue;
    result.push({
      cardId: e.cardId,
      ts: Number(e.ts) || 0,
      correct: Boolean(e.correct),
      intervalIndex: Number(e.intervalIndex) || 0,
    });
  }
  return result;
}

function migrateStreak(raw: unknown): StreakState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_STREAK };
  const s = raw as Record<string, unknown>;
  return {
    current: Number(s.current) || 0,
    lastDate: typeof s.lastDate === 'string' ? s.lastDate : null,
  };
}

function pruneReviewLog(log: ReviewEntry[], now: number): ReviewEntry[] {
  const cutoff = now - LOG_RETENTION_MS;
  const pruned = log.filter((e) => e.ts >= cutoff);
  if (pruned.length <= MAX_LOG_ENTRIES) return pruned;
  return pruned.slice(pruned.length - MAX_LOG_ENTRIES);
}

function updateStreak(streak: StreakState, today: string): StreakState {
  if (streak.lastDate === today) return streak;

  const yesterday = addDays(today, -1);
  const current = streak.lastDate === yesterday ? streak.current + 1 : 1;
  return { current, lastDate: today };
}

export class StorageService {
  private deck: Challenge[] = [];
  private progress: Record<string, ChallengeProgress> = {};
  private reviewDaily: Record<string, DailyReviewStat> = {};
  private reviewLog: ReviewEntry[] = [];
  private streak: StreakState = { ...DEFAULT_STREAK };
  private ignored: Set<string> = new Set();

  async init(): Promise<void> {
    const manifest: string[] = await fetch(chrome.runtime.getURL('challenges/deck.json')).then(
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

    const data = (await chrome.storage.local.get([
      PROGRESS_KEY,
      REVIEW_DAILY_KEY,
      REVIEW_LOG_KEY,
      STREAK_KEY,
      IGNORED_KEY,
    ])) as Record<string, unknown>;

    const stored = data[PROGRESS_KEY];
    this.progress =
      stored && typeof stored === 'object'
        ? migrateProgress(stored as Record<string, unknown>)
        : {};

    this.reviewDaily = migrateReviewDaily(data[REVIEW_DAILY_KEY]);
    this.reviewLog = pruneReviewLog(migrateReviewLog(data[REVIEW_LOG_KEY]), Date.now());
    this.streak = migrateStreak(data[STREAK_KEY]);

    const rawIgnored = data[IGNORED_KEY];
    this.ignored = new Set(Array.isArray(rawIgnored) ? (rawIgnored as string[]) : []);
  }

  getDeck(): Challenge[] {
    return this.deck;
  }

  getProgress(): Record<string, ChallengeProgress> {
    return this.progress;
  }

  getReviewDaily(): Record<string, DailyReviewStat> {
    return this.reviewDaily;
  }

  getReviewLog(): ReviewEntry[] {
    return this.reviewLog;
  }

  getStreak(): StreakState {
    return this.streak;
  }

  getIgnored(): string[] {
    return Array.from(this.ignored);
  }

  async ignore(id: string): Promise<void> {
    if (this.ignored.has(id)) return;
    this.ignored.add(id);
    await chrome.storage.local.set({ [IGNORED_KEY]: Array.from(this.ignored) });
  }

  async unignore(id: string): Promise<void> {
    if (!this.ignored.has(id)) return;
    this.ignored.delete(id);
    await chrome.storage.local.set({ [IGNORED_KEY]: Array.from(this.ignored) });
  }

  isIgnored(id: string): boolean {
    return this.ignored.has(id);
  }

  async saveProgress(id: string, progress: ChallengeProgress): Promise<void> {
    this.progress = { ...this.progress, [id]: progress };
    await chrome.storage.local.set({ [PROGRESS_KEY]: this.progress });
  }

  async logReview(
    cardId: string,
    correct: boolean,
    intervalIndex: number,
    now = Date.now(),
  ): Promise<void> {
    const today = toLocalDate(now);

    const entry: ReviewEntry = { cardId, ts: now, correct, intervalIndex };
    this.reviewLog = pruneReviewLog([...this.reviewLog, entry], now);

    const daily = this.reviewDaily[today] ?? { reviews: 0, correct: 0 };
    this.reviewDaily = {
      ...this.reviewDaily,
      [today]: {
        reviews: daily.reviews + 1,
        correct: daily.correct + (correct ? 1 : 0),
      },
    };

    this.streak = updateStreak(this.streak, today);

    await chrome.storage.local.set({
      [REVIEW_LOG_KEY]: this.reviewLog,
      [REVIEW_DAILY_KEY]: this.reviewDaily,
      [STREAK_KEY]: this.streak,
    });
  }
}
