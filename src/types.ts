export type ChallengeType = 'de_het' | 'nl_to_en' | 'en_to_nl' | 'complete_sentence' | 'plural';

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  correctAnswer: string;
  choices?: string[];
  acceptableAnswers?: string[];
}

export interface ChallengeProgress {
  correct: number;
  attempts: number;
  consecutiveStreaks: number;
  dontShowUntil: number;
}
