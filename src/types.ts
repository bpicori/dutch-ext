export type ChallengeType = 'de_het' | 'nl_to_en' | 'en_to_nl' | 'listen' | 'listen_match' | 'nl_to_en_sentence' | 'en_to_nl_sentence';

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  promptAudio?: string;
  audioWords?: string[];
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
