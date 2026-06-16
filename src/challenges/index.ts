import { ChallengeType } from '../types.js';
import { ChallengeModule } from './types.js';
import { completeSentenceModule } from './complete-sentence.js';
import { deHetModule } from './de-het.js';
import { enToNlModule } from './en-to-nl.js';
import { imageDescribeModule } from './image-describe.js';
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
import { pluralModule } from './plural.js';
import { readMatchModule } from './read-match.js';
import { readOrderModule } from './read-order.js';
import { wordOrderModule } from './word-order.js';
import { writeNoteModule } from './write-note.js';

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
  write_note: writeNoteModule,
  complete_sentence: completeSentenceModule,
  plural: pluralModule,
  read_order: readOrderModule,
  read_match: readMatchModule,
  word_order: wordOrderModule,
  image_describe: imageDescribeModule,
};

export function getChallenge(type: ChallengeType): ChallengeModule {
  return Registry[type];
}
