import { Challenge } from '../types.js';

export type UserResponse =
  | { kind: 'answer'; value: string }
  | { kind: 'skip' }
  | { kind: 'dismiss' }
  | { kind: 'ignore' };

export interface ChallengeModule {
  present(container: HTMLElement, challenge: Challenge): Promise<UserResponse>;
  showResult(container: HTMLElement, challenge: Challenge, answer: string, correct: boolean): void;
  isCorrect(challenge: Challenge, answer: string): boolean;
}
