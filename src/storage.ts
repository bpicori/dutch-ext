import { Challenge, ChallengeProgress, GlobalProgress, EvaluateResult } from './types.js';

const SPACING_MINUTES = [1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200];

export class StorageService {
  private deck: Challenge[] = [];
  private progress: Record<string, ChallengeProgress> = {};
  private global: GlobalProgress = { xpTotal: 0, streakDays: 0, lastCompletedTimestamp: 0 };

  async init(): Promise<void> {
    const [tier1, tier2] = await Promise.all([
      fetch(chrome.runtime.getURL('challenges/tier1.json')).then(r => r.json()),
      fetch(chrome.runtime.getURL('challenges/tier2.json')).then(r => r.json()),
    ]);
    this.deck = [...tier1, ...tier2] as Challenge[];

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
    const unlockedTiers = this.getUnlockedTiers();

    const eligible = this.deck.filter(ch => {
      if (!unlockedTiers.includes(ch.tier)) return false;
      const p = this.progress[ch.id];
      if (!p) return true;
      return p.dontShowUntil <= now;
    });

    if (eligible.length === 0) {
      const allUnlocked = this.deck.filter(ch => unlockedTiers.includes(ch.tier));
      allUnlocked.sort((a, b) => {
        const da = this.progress[a.id]?.dontShowUntil ?? 0;
        const db = this.progress[b.id]?.dontShowUntil ?? 0;
        return da - db;
      });
      return allUnlocked[0] ?? null;
    }

    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  evaluate(challenge: Challenge, answer: string): EvaluateResult {
    const correct = answer.trim().toLowerCase() === challenge.correctAnswer.trim().toLowerCase();
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

  private getUnlockedTiers(): number[] {
    const unlocked = [1];
    const tierMap = this.groupByTier();
    const maxTier = Math.max(...this.deck.map(ch => ch.tier));

    for (let tier = 2; tier <= maxTier; tier++) {
      const prev = tierMap[tier - 1] || [];
      const allAttempted = prev.every(ch => {
        const p = this.progress[ch.id];
        return p && p.attempts > 0;
      });
      if (allAttempted) unlocked.push(tier);
    }

    return unlocked;
  }

  private groupByTier(): Record<number, Challenge[]> {
    const map: Record<number, Challenge[]> = {};
    for (const ch of this.deck) {
      if (!map[ch.tier]) map[ch.tier] = [];
      map[ch.tier].push(ch);
    }
    return map;
  }
}
