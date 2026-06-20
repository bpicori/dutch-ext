import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateChallengeArray, ValidationError } from './challenge-validation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHALLENGES_DIR = join(ROOT, 'src/challenges');
const DECK_PATH = join(CHALLENGES_DIR, 'deck.json');

function fail(message) {
  console.error(`validate-challenges: ${message}`);
  process.exit(1);
}

function parseDeck() {
  if (!existsSync(DECK_PATH)) {
    fail(`deck not found at ${DECK_PATH}`);
  }

  let deck;
  try {
    deck = JSON.parse(readFileSync(DECK_PATH, 'utf8'));
  } catch (err) {
    fail(`invalid deck JSON: ${err.message}`);
  }

  if (!Array.isArray(deck) || deck.length === 0) {
    fail('deck must be a non-empty array of file paths');
  }

  for (const entry of deck) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      fail('deck entries must be non-empty strings');
    }
  }

  return deck;
}

function loadDeckFile(relativePath) {
  const absolutePath = join(CHALLENGES_DIR, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`deck entry not found: ${relativePath}`);
  }

  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (err) {
    fail(`${relativePath}: invalid JSON (${err.message})`);
  }
}

const deck = parseDeck();
const seenIds = new Map();
let total = 0;

try {
  for (const file of deck) {
    const challenges = loadDeckFile(file);
    total += validateChallengeArray(challenges, file, seenIds);
  }
} catch (err) {
  if (err instanceof ValidationError) {
    fail(err.message);
  }
  throw err;
}

console.log(`validate-challenges: OK — ${total} challenges in ${deck.length} file(s)`);
