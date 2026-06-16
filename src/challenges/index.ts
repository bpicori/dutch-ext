import { ChallengeType } from '../types.js';
import { ChallengeModule } from './types.js';
import { completeSentenceModule } from './complete-sentence.js';
import { deHetModule } from './de-het.js';
import { enToNlModule } from './en-to-nl.js';
import { nlToEnModule } from './nl-to-en.js';
import { pluralModule } from './plural.js';

const Registry: Record<ChallengeType, ChallengeModule> = {
  de_het: deHetModule,
  nl_to_en: nlToEnModule,
  en_to_nl: enToNlModule,
  complete_sentence: completeSentenceModule,
  plural: pluralModule,
};

export function getChallenge(type: ChallengeType): ChallengeModule {
  return Registry[type];
}
