import { ChallengeType } from '../types.js';
import { ChallengeModule } from './types.js';
import { deHetModule } from './de-het.js';
import { nlToEnModule } from './nl-to-en.js';

const Registry: Record<ChallengeType, ChallengeModule> = {
  de_het: deHetModule,
  nl_to_en: nlToEnModule,
};

export function getChallenge(type: ChallengeType): ChallengeModule {
  return Registry[type];
}
