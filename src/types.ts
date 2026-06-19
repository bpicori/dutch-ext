import type { ChallengeType } from './challenges/index.js';

export type { ChallengeType };

export type ChallengeLevel = 'a1' | 'a2' | 'b1';

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  correctAnswer: string;
  level?: ChallengeLevel;
  topic?: string;
  tags?: string[];
  choices?: string[];
  acceptableAnswers?: string[];
  context?: string;
  promptAudio?: string;
  audioWords?: string[];
  orderItems?: string[];
  matchLeft?: string[];
  matchRight?: string[];
}

export interface ChallengeProgress {
  correct: number;
  attempts: number;
  intervalIndex: number;
  dontShowUntil: number;
}