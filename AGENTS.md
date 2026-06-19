TabTaal helps learners build Dutch through micro-challenges that appear on every new tab.

## Build

```bash
npm install && ./build.sh
```

`build.sh` runs `npx tsc`, then the Tailwind CLI (auto-downloaded on first run for macOS ARM64), then copies static files into `dist/`.

`dist/` and `tailwindcss` (the binary) are gitignored. Never commit them.

## Load in Chrome

1. Go to `chrome://extensions`, enable Developer mode
2. Load unpacked → pick the `dist/` directory
3. Open a new tab — the extension overrides it

No auto-reload on build. Manually click the reload icon on the extension card.

## Publish to Chrome Web Store

See [docs/publish-chrome-web-store.md](./docs/publish-chrome-web-store.md) for registration, zip packaging, listing copy, privacy fields, and submission.

## Architecture

```
main.ts (bootstrap)
  ├── StorageService   deck load + chrome.storage.local progress
  ├── Orchestrator     session loop: pick → present → grade → persist
  │     ├── sm2.ts           pickNext, advance (spacing algorithm)
  │     ├── shell.ts         app shell, debug empty state, continue hint
  │     ├── debug.ts         ⌘D debug panel (filter by challenge type)
  │     └── challenges/      per-type modules + shared UI helpers
  └── challenges/index.ts    registry (single source of truth for ChallengeType)
```

| File | Role |
| ---- | ---- |
| `src/main.ts` | Async bootstrap — `init()` then `Orchestrator.start()` |
| `src/orchestrator.ts` | Session loop: `playRound` → present, grade, save, continue/dismiss |
| `src/sm2.ts` | Spaced repetition: `pickNext`, `advance`, `DEFAULT_PROGRESS` |
| `src/storage.ts` | Load deck from manifest JSON; `saveProgress()` writes to `chrome.storage.local` |
| `src/shell.ts` | App shell HTML, debug empty state, continue hint |
| `src/types.ts` | Domain types: `Challenge`, `ChallengeProgress`; re-exports `ChallengeType` |
| `src/challenges/index.ts` | Registry + `getChallenge()`; defines `ChallengeType` |
| `src/challenges/types.ts` | Runtime types: `ChallengeModule`, `UserResponse` |
| `src/challenges/shared.ts` | Audio, grading helpers, `bindMcqPresent`, `bindChallengeSession`, result styling |
| `src/challenges/mcq.ts` | `createMcqModule` factory (11 MCQ-based types) |
| `src/challenges/de-het.ts` | Binary de/het choice |
| `src/challenges/read-order.ts` | Drag-to-reorder list |
| `src/challenges/read-match.ts` | Match two columns |
| `src/challenges/word-order.ts` | Click words to build a sentence |
| `src/debug.ts` | Debug panel — ⌘D toggles, pick a type to force random card from that type |

Each challenge module implements `ChallengeModule`: `present()` → `UserResponse`, `showResult()`, `isCorrect()`. MCQ types use `createMcqModule`; interactive types use `bindChallengeSession` for keyboard handling.

## Challenge data

Challenge JSON lives under `src/challenges/data/{level}/` (e.g. `a1/vocab-basics.json`). A curated [`src/challenges/manifest.json`](src/challenges/manifest.json) lists which files to load. `build.sh` validates then copies into `dist/challenges/`.

`StorageService.init()` fetches the manifest, loads each file, enriches cards with `level`/`topic` from the path, and flattens into one deck. See [docs/challenge-data.md](docs/challenge-data.md) for ID scheme, authoring rules, and validation. To generate challenges from textbook PDFs in `tmp/`, see [docs/challenge-ingestion.md](docs/challenge-ingestion.md) — agents use Cursor skills and write ephemeral scripts at runtime; `content/` and ingestion scripts are gitignored.

Each challenge is a standalone flashcard with its own SM-2 progress. `pickNext()` in `sm2.ts` picks a due card (never seen, or `dontShowUntil <= now`); if none are due, it shows the card waiting longest.

Card IDs: `{level}.{topic}.{slug}` (e.g. `a1.vocab-basics.fiets.de_het`). Never rename published IDs — progress is keyed by `id`.

Optional challenge fields: `context`, `promptAudio`, `acceptableAnswers`, `orderItems`, `matchLeft`, `matchRight`, `audioWords`, `tags`.

## Challenge types

### Implemented (15)

| Type | Module | Layout | Keyboard |
| ---- | ------ | ------ | -------- |
| `de_het` | `de-het.ts` | DE / HET buttons | ← de, → het, Space skip |
| `nl_to_en` | `mcq.ts` | 3-choice MCQ | 1, 2, 3, Space/Enter skip |
| `en_to_nl` | `mcq.ts` | 3-choice MCQ | 1, 2, 3, Space/Enter skip |
| `nl_to_en_sentence` | `mcq.ts` | 3-choice MCQ | 1, 2, 3, Space/Enter skip |
| `en_to_nl_sentence` | `mcq.ts` | 3-choice MCQ | 1, 2, 3, Space/Enter skip |
| `read_mcq` | `mcq.ts` | Scrollable text + MCQ | 1, 2, 3, Space/Enter skip |
| `knm` | `mcq.ts` | Scenario + MCQ | 1, 2, 3, Space/Enter skip |
| `dialogue_reply` | `mcq.ts` | Dialogue + MCQ | 1, 2, 3, Space/Enter skip |
| `fill_blank` | `mcq.ts` | Sentence + MCQ | 1, 2, 3, Space/Enter skip |
| `verb_form` | `mcq.ts` | Sentence + MCQ | 1, 2, 3, Space/Enter skip |
| `preposition` | `mcq.ts` | Sentence + MCQ | 1, 2, 3, Space/Enter skip |
| `number_detail` | `mcq.ts` | Context + MCQ | 1, 2, 3, Space/Enter skip |
| `read_order` | `read-order.ts` | Drag-to-reorder list | Drag reorder, Enter submit, Space skip |
| `read_match` | `read-match.ts` | Match two columns | 1–N select row, click match, Space/Enter skip |
| `word_order` | `word-order.ts` | Build sentence from tokens | Click words, Enter submit, Space skip |

All types: **Escape** dismisses (focus omnibox). After answering: **Enter** or click outside → next challenge; **Escape** dismisses.

Skip counts as wrong (`correct: false`).

### Planned (not yet implemented)

`listen`, `listen_match`, `listen_mcq`, `form_fill`, `write_note`, `complete_sentence`, `plural`, `number_listen`, `speak_repeat`, `image_describe`

## SM-2 spacing

Spacing intervals (minutes): `[1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200]`.

Correct → `intervalIndex++` → `dontShowUntil = now + spacing[intervalIndex]`.
Wrong → `intervalIndex = 0` → `dontShowUntil = now + 5 min`.

Logic lives in `sm2.ts` (`pickNext`, `advance`). Orchestrator calls `gradeResponse()` then `storage.saveProgress()`.

Legacy storage key `consecutiveStreaks` is migrated to `intervalIndex` on load.

## Design system (calm new-tab, dark-only)

Three layers: **tokens** → **CSS components** → **TS primitives**.

Aesthetic: **calm new-tab atmosphere** (soft radial gradients on `canvas`) + **flashcard-native** interaction (`.flashcard` / `.challenge-card`, flat borders, subtle shadow) + **editorial Dutch prompts** (Lora serif via `.type-prompt-word` / `.type-prompt-sentence`; Inter for UI).

| Layer | File | Role |
| ----- | ---- | ---- |
| Tokens | `tailwind.config.js` | Semantic palette (`canvas`, `card`, `ink`, `muted`, `accent`, `success`, `error`, `border`), spacing, `max-w-challenge` (400px), Lora + Inter |
| Components | `src/input.css` `@layer components` | `.flashcard`, `.challenge-card`, `.challenge-label`, `.choice-btn`, `.btn-primary`, `.skip-link`, `.kbd-footer`, `.type-prompt-*`, `.type-body-*` |
| Primitives | `src/ui/primitives.ts` | HTML builders: `challengeLayout`, `challengeLabel`, `dutchPromptWord`, `dutchPromptSentence`, `choiceButton`, `kbdFooter`, `primaryButton`, etc. |

### Token roles

| Role | Tokens |
| ---- | ------ |
| Canvas | `canvas`, `background` |
| Card | `card`, `card-hover` |
| Text | `ink`, `muted` |
| Accent | `accent`, `accent-dim` |
| Success / error | `success`, `success-dim`, `error`, `error-dim` |
| Border | `border`, `border-strong` |

Legacy M3 class names (`on-surface`, `primary-container`, etc.) remain as aliases for gradual migration.

### Typography

- **UI** (Inter): `.type-body-md`, `.type-body-lg`, `.type-headline-md`, `.type-label-sm`
- **Dutch prompts** (Lora): `.type-prompt-word` (single words, de/het), `.type-prompt-sentence` (phrases, MCQ stems)
- Use `dutchPromptWord()` / `dutchPromptSentence()` from primitives — never raw display classes in challenge modules

### Component classes

- `.choice-btn--correct` / `--wrong` / `--muted` — result states
- `.state-success` / `.state-error` — card feedback glow (aliases `success-glow` / `error-glow`)
- `.glass-card` — alias for `.flashcard` (legacy)

### Adding a new challenge type

Use primitives from `src/ui/primitives.ts`; add type-specific layout only when the pattern genuinely differs (e.g. de-het grid buttons use `.choice-btn--grid`).

### Motion and accessibility

- Motion tokens: `--duration-fast`, `--duration-normal` in `:root`
- `prefers-reduced-motion: reduce` disables shake, slide, and word animations
- Interactive elements use `focus-visible:ring-2 ring-accent`

## Tailwind

Standalone CLI tailwindcss v3.4.17. Config: `tailwind.config.js` scans `./src/**/*.{html,ts}`. Custom animations and `.flashcard` utilities in `src/input.css`.