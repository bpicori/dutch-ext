export const CHALLENGE_TYPES = new Set([
  'de_het',
  'nl_to_en',
  'en_to_nl',
  'nl_to_en_sentence',
  'en_to_nl_sentence',
  'read_mcq',
  'knm',
  'dialogue_reply',
  'fill_blank',
  'verb_form',
  'preposition',
  'number_detail',
  'read_order',
  'read_match',
  'word_order',
]);

const MCQ_TYPES = new Set([
  'nl_to_en',
  'en_to_nl',
  'nl_to_en_sentence',
  'en_to_nl_sentence',
  'read_mcq',
  'knm',
  'dialogue_reply',
  'fill_blank',
  'verb_form',
  'preposition',
  'number_detail',
]);

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function requireString(obj, field, label) {
  if (typeof obj[field] !== 'string' || obj[field].trim() === '') {
    throw new ValidationError(`${label}: missing or empty "${field}"`);
  }
}

function requireStringArray(obj, field, label, min = 1) {
  if (!Array.isArray(obj[field]) || obj[field].length < min) {
    throw new ValidationError(`${label}: "${field}" must be an array with at least ${min} item(s)`);
  }
  for (const item of obj[field]) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new ValidationError(`${label}: "${field}" must contain only non-empty strings`);
    }
  }
}

export function validateChallenge(challenge, source) {
  const label = `${source} (id: ${challenge?.id ?? 'unknown'})`;

  if (!challenge || typeof challenge !== 'object') {
    throw new ValidationError(`${source}: expected challenge object`);
  }

  requireString(challenge, 'id', label);
  requireString(challenge, 'type', label);
  requireString(challenge, 'prompt', label);
  requireString(challenge, 'correctAnswer', label);

  if (!CHALLENGE_TYPES.has(challenge.type)) {
    throw new ValidationError(`${label}: unknown type "${challenge.type}"`);
  }

  if (challenge.type === 'de_het') {
    requireStringArray(challenge, 'choices', label, 2);
  }

  if (MCQ_TYPES.has(challenge.type)) {
    requireStringArray(challenge, 'choices', label, 3);
  }

  if (challenge.type === 'read_order' || challenge.type === 'word_order') {
    requireStringArray(challenge, 'orderItems', label, 2);
  }

  if (challenge.type === 'read_match') {
    requireStringArray(challenge, 'matchLeft', label, 1);
    requireStringArray(challenge, 'matchRight', label, 1);
    if (challenge.matchLeft.length !== challenge.matchRight.length) {
      throw new ValidationError(`${label}: matchLeft and matchRight must have the same length`);
    }
  }

  if (challenge.tags !== undefined) {
    requireStringArray(challenge, 'tags', label, 0);
  }
}

export function validateChallengeArray(challenges, source, seenIds = new Map()) {
  if (!Array.isArray(challenges)) {
    throw new ValidationError(`${source}: expected a JSON array of challenges`);
  }

  for (const challenge of challenges) {
    validateChallenge(challenge, source);
    if (seenIds.has(challenge.id)) {
      throw new ValidationError(
        `duplicate id "${challenge.id}" in ${source} (first seen in ${seenIds.get(challenge.id)})`,
      );
    }
    seenIds.set(challenge.id, source);
  }

  return challenges.length;
}