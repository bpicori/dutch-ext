export type ChallengeType =
  | 'de_het'
  | 'nl_to_en'
  | 'en_to_nl'
  | 'nl_to_en_sentence'
  | 'en_to_nl_sentence'
  | 'read_mcq'
  | 'knm'
  | 'dialogue_reply'
  | 'fill_blank'
  | 'verb_form'
  | 'preposition'
  | 'number_detail'
  | 'read_order'
  | 'read_match'
  | 'word_order';

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  correctAnswer: string;
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
  consecutiveStreaks: number;
  dontShowUntil: number;
}
