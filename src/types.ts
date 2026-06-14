export type ChallengeType = 'de_het' | 'nl_to_en' | 'en_to_nl' | 'listen';

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  promptAudio?: string;
  choices: string[];
  correctAnswer: string;
  xpReward: number;
  tier: number;
}

export interface ChallengeProgress {
  correct: number;
  attempts: number;
  consecutiveStreaks: number;
  dontShowUntil: number;
}

export interface GlobalProgress {
  xpTotal: number;
  streakDays: number;
  lastCompletedTimestamp: number;
}

export interface EvaluateResult {
  correct: boolean;
  progress: ChallengeProgress;
  global: GlobalProgress;
}
