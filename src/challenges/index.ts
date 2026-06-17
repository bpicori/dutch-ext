import { ChallengeType } from '../types.js';
import { ChallengeModule } from './types.js';
import { deHetModule } from './de-het.js';
import { enToNlModule } from './en-to-nl.js';
import {
  dialogueReplyModule,
  enToNlSentenceModule,
  fillBlankModule,
  knmModule,
  nlToEnSentenceModule,
  numberDetailModule,
  prepositionModule,
  readMcqModule,
  verbFormModule,
} from './mcq.js';
import { nlToEnModule } from './nl-to-en.js';
import { readMatchModule } from './read-match.js';
import { readOrderModule } from './read-order.js';
import { wordOrderModule } from './word-order.js';

const Registry: Record<ChallengeType, ChallengeModule> = {
  de_het: deHetModule,
  nl_to_en: nlToEnModule,
  en_to_nl: enToNlModule,
  nl_to_en_sentence: nlToEnSentenceModule,
  en_to_nl_sentence: enToNlSentenceModule,
  read_mcq: readMcqModule,
  knm: knmModule,
  dialogue_reply: dialogueReplyModule,
  fill_blank: fillBlankModule,
  verb_form: verbFormModule,
  preposition: prepositionModule,
  number_detail: numberDetailModule,
  read_order: readOrderModule,
  read_match: readMatchModule,
  word_order: wordOrderModule,
};

export function getChallenge(type: ChallengeType): ChallengeModule {
  return Registry[type];
}
