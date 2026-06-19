import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHALLENGES_DIR = join(ROOT, 'src/challenges');
const MANIFEST_PATH = join(CHALLENGES_DIR, 'manifest.json');

const CHALLENGE_TYPES = new Set([
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

function fail(message) {
  console.error(`validate-challenges: ${message}`);
  process.exit(1);
}

function requireString(obj, field, label) {
  if (typeof obj[field] !== 'string' || obj[field].trim() === '') {
    fail(`${label}: missing or empty "${field}"`);
  }
}

function requireStringArray(obj, field, label, min = 1) {
  if (!Array.isArray(obj[field]) || obj[field].length < min) {
    fail(`${label}: "${field}" must be an array with at least ${min} item(s)`);
  }
  for (const item of obj[field]) {
    if (typeof item !== 'string' || item.trim() === '') {
      fail(`${label}: "${field}" must contain only non-empty strings`);
    }
  }
}

function validateChallenge(challenge, source) {
  const label = `${source} (id: ${challenge?.id ?? 'unknown'})`;

  if (!challenge || typeof challenge !== 'object') {
    fail(`${source}: expected challenge object`);
  }

  requireString(challenge, 'id', label);
  requireString(challenge, 'type', label);
  requireString(challenge, 'prompt', label);
  requireString(challenge, 'correctAnswer', label);

  if (!CHALLENGE_TYPES.has(challenge.type)) {
    fail(`${label}: unknown type "${challenge.type}"`);
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
      fail(`${label}: matchLeft and matchRight must have the same length`);
    }
  }

  if (challenge.tags !== undefined) {
    requireStringArray(challenge, 'tags', label, 0);
  }
}

function parseManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    fail(`manifest not found at ${MANIFEST_PATH}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (err) {
    fail(`invalid manifest JSON: ${err.message}`);
  }

  if (!Array.isArray(manifest) || manifest.length === 0) {
    fail('manifest must be a non-empty array of file paths');
  }

  for (const entry of manifest) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      fail('manifest entries must be non-empty strings');
    }
  }

  return manifest;
}

function loadDeckFile(relativePath) {
  const absolutePath = join(CHALLENGES_DIR, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`manifest entry not found: ${relativePath}`);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (err) {
    fail(`${relativePath}: invalid JSON (${err.message})`);
  }

  if (!Array.isArray(data)) {
    fail(`${relativePath}: expected a JSON array of challenges`);
  }

  return data;
}

const manifest = parseManifest();
const seenIds = new Map();
let total = 0;

for (const file of manifest) {
  const challenges = loadDeckFile(file);
  for (const challenge of challenges) {
    validateChallenge(challenge, file);
    if (seenIds.has(challenge.id)) {
      fail(`duplicate id "${challenge.id}" in ${file} (first seen in ${seenIds.get(challenge.id)})`);
    }
    seenIds.set(challenge.id, file);
    total++;
  }
}

console.log(`validate-challenges: OK — ${total} challenges in ${manifest.length} file(s)`);