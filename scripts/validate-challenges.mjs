import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateChallengeArray, ValidationError } from './challenge-validation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHALLENGES_DIR = join(ROOT, 'src/challenges');
const MANIFEST_PATH = join(CHALLENGES_DIR, 'manifest.json');

function fail(message) {
  console.error(`validate-challenges: ${message}`);
  process.exit(1);
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

  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (err) {
    fail(`${relativePath}: invalid JSON (${err.message})`);
  }
}

const manifest = parseManifest();
const seenIds = new Map();
let total = 0;

try {
  for (const file of manifest) {
    const challenges = loadDeckFile(file);
    total += validateChallengeArray(challenges, file, seenIds);
  }
} catch (err) {
  if (err instanceof ValidationError) {
    fail(err.message);
  }
  throw err;
}

console.log(`validate-challenges: OK — ${total} challenges in ${manifest.length} file(s)`);