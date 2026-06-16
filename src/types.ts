export type ChallengeType = 'de_het';

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  correctAnswer: string;
}

export interface ChallengeProgress {
  correct: number;
  attempts: number;
  consecutiveStreaks: number;
  dontShowUntil: number;
}

export interface EvaluateResult {
  correct: boolean;
  progress: ChallengeProgress;
}
