export type ChallengeType = 'de_het' | 'nl_to_en';

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  correctAnswer: string;
  choices?: string[];
}

export interface ChallengeProgress {
  correct: number;
  attempts: number;
  consecutiveStreaks: number;
  dontShowUntil: number;
}
