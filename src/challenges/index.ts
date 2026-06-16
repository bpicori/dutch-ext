import { ChallengeType } from '../types.js';
import { ChallengeModule } from './types.js';
import { deHetModule } from './de-het.js';

const Registry: Record<ChallengeType, ChallengeModule> = {
  de_het: deHetModule,
};

export function getChallenge(type: ChallengeType): ChallengeModule {
  return Registry[type];
}
