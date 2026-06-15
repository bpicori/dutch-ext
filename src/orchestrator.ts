import { Challenge, ChallengeProgress, GlobalProgress, EvaluateResult } from './types.js';

const SPACING_MINUTES = [1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200];

export const DEFAULT_PROGRESS: ChallengeProgress = {
  correct: 0,
  attempts: 0,
  consecutiveStreaks: 0,
  dontShowUntil: 0,
};

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

export class Orchestrator {
  getNextChallenge(deck: Challenge[], progress: Record<string, ChallengeProgress>): Challenge | null {
    const now = Date.now();
    const eligible = deck.filter(ch => {
      const p = progress[ch.id];
      if (!p) return true;
      return p.dontShowUntil <= now;
    });

    if (eligible.length > 0) {
      return eligible[Math.floor(Math.random() * eligible.length)];
    }

    const sorted = [...deck].sort((a, b) => {
      const da = progress[a.id]?.dontShowUntil ?? 0;
      const db = progress[b.id]?.dontShowUntil ?? 0;
      return da - db;
    });
    return sorted[0] ?? null;
  }

  evaluate(challenge: Challenge, answer: string, prev: ChallengeProgress, global: GlobalProgress): EvaluateResult {
    const correct = this.isAnswerCorrect(challenge, answer);

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

    const newGlobal = { ...global };

    if (correct) {
      newGlobal.xpTotal += challenge.xpReward;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      const lastDate = new Date(global.lastCompletedTimestamp || 0);
      lastDate.setHours(0, 0, 0, 0);
      const lastDateStart = lastDate.getTime();

      if (lastDateStart === 0) {
        newGlobal.streakDays = 1;
      } else if (todayStart - lastDateStart === 86400000) {
        newGlobal.streakDays = (global.streakDays || 0) + 1;
      } else if (todayStart > lastDateStart) {
        newGlobal.streakDays = 1;
      }

      newGlobal.lastCompletedTimestamp = Date.now();
    }

    return { correct, progress: next, global: newGlobal };
  }

  isAnswerCorrect(challenge: Challenge, answer: string): boolean {
    const normalized = normalizeAnswer(answer);
    const candidates = [challenge.correctAnswer, ...(challenge.acceptableAnswers ?? [])];
    return candidates.some(c => normalizeAnswer(c) === normalized);
  }
}
