export type ChallengeType =
  | 'de_het' | 'nl_to_en' | 'en_to_nl' | 'listen' | 'listen_match'
  | 'nl_to_en_sentence' | 'en_to_nl_sentence'
  | 'read_mcq' | 'knm' | 'dialogue_reply' | 'fill_blank' | 'verb_form'
  | 'preposition' | 'number_detail' | 'listen_mcq'
  | 'form_fill' | 'write_note' | 'complete_sentence' | 'plural' | 'number_listen'
  | 'read_order' | 'read_match' | 'word_order' | 'speak_repeat' | 'image_describe';

export interface FormField {
  label: string;
  answer: string;
}

export interface Challenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  context?: string;
  promptAudio?: string;
  audioWords?: string[];
  choices: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  orderItems?: string[];
  matchLeft?: string[];
  matchRight?: string[];
  imageUrl?: string;
  formFields?: FormField[];
  bulletPrompts?: string[];
  xpReward: number;
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
