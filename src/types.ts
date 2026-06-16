export type ChallengeType = 'de_het';

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  correctAnswer: string;
}
