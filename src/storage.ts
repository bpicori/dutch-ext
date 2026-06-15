import { Challenge, ChallengeProgress, GlobalProgress, EvaluateResult } from './types.js';

const SPACING_MINUTES = [1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200];

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

function isAnswerCorrect(challenge: Challenge, answer: string): boolean {
  const normalized = normalizeAnswer(answer);
  const candidates = [challenge.correctAnswer, ...(challenge.acceptableAnswers ?? [])];
  return candidates.some(c => normalizeAnswer(c) === normalized);
}

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

  getNextChallenge(): Challenge | null {
    const now = Date.now();
    const eligible = this.deck.filter(ch => {
      const p = this.progress[ch.id];
      if (!p) return true;
      return p.dontShowUntil <= now;
    });

    if (eligible.length > 0) {
      return eligible[Math.floor(Math.random() * eligible.length)];
    }

    const sorted = [...this.deck].sort((a, b) => {
      const da = this.progress[a.id]?.dontShowUntil ?? 0;
      const db = this.progress[b.id]?.dontShowUntil ?? 0;
      return da - db;
    });
    return sorted[0] ?? null;
  }

  evaluate(challenge: Challenge, answer: string): EvaluateResult {
    const correct = isAnswerCorrect(challenge, answer);
    const prev = this.progress[challenge.id]
      ?? { correct: 0, attempts: 0, consecutiveStreaks: 0, dontShowUntil: 0 };

    let next: ChallengeProgress;

    if (correct) {
      const newStreaks = Math.min(prev.consecutiveStreaks + 1, SPACING_MINUTES.length - 1);
      next = {
        correct: prev.correct + 1,
        attempts: prev.attempts + 1,
        consecutiveStreaks: newStreaks,
        dontShowUntil: Date.now() + SPACING_MINUTES[newStreaks] * 60 * 1000,
      };
    } else {
      next = {
        correct: prev.correct,
        attempts: prev.attempts + 1,
        consecutiveStreaks: 0,
        dontShowUntil: Date.now() + 5 * 60 * 1000,
      };
    }

    this.progress = { ...this.progress, [challenge.id]: next };
    this.global = { ...this.global };

    if (correct) {
      this.global.xpTotal += challenge.xpReward;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      const lastDate = new Date(this.global.lastCompletedTimestamp || 0);
      lastDate.setHours(0, 0, 0, 0);
      const lastDateStart = lastDate.getTime();

      if (lastDateStart === 0) {
        this.global.streakDays = 1;
      } else if (todayStart - lastDateStart === 86400000) {
        this.global.streakDays = (this.global.streakDays || 0) + 1;
      } else if (todayStart > lastDateStart) {
        this.global.streakDays = 1;
      }

      this.global.lastCompletedTimestamp = Date.now();
    }

    return { correct, progress: next, global: this.global };
  }

  async persist(): Promise<void> {
    await chrome.storage.local.set({
      global: this.global,
      progress: this.progress,
    });
  }
}
