WachtNederlands helps learners build Dutch through micro-challenges that appear on every new tab.

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

## Architecture

```
main.ts (owns the loop)
  ├── StorageService  repository: load deck, read/write progress, chrome.storage.local
  ├── Orchestrator    stateless algorithms: SM-2, getNextChallenge, evaluate
  └── Renderer        UI: DOM shell, layouts, keyboard, audio, mic
```

| File                  | Role                                                        |
| --------------------- | ----------------------------------------------------------- |
| `src/types.ts`        | Shared types (interfaces only — erased at compile time)     |
| `src/orchestrator.ts` | SM-2, grading, challenge selection (stateless algorithms)   |
| `src/storage.ts`      | Repository: deck loading, `chrome.storage.local` read/write |
| `src/renderer.ts`     | DOM shell, layouts, keyboard, audio, mic                    |
| `src/main.ts`         | Entry point — creates all three, owns the loop              |

Orchestrator is stateless — it receives data from StorageService, computes results, and returns them. main.ts wires all three together, passing state between storage and orchestrator each tick.

## Challenge data

`src/challenges/examples/` (`example-1.json` through `example-5.json` for now). All files are loaded and concatenated at runtime in `StorageService.init()`.

Each challenge is a standalone flashcard with its own SM-2 progress. `Orchestrator.getNextChallenge()` picks a due card (never seen, or `dontShowUntil <= now`); if none are due, it shows the card waiting longest.

Optional challenge fields: `context`, `promptAudio`, `acceptableAnswers`, `orderItems`, `matchLeft`, `matchRight`, `formFields`, `bulletPrompts`, `imageUrl`.

## Challenge types (25)

| Type                | Layout                     | Keyboard                  |
| ------------------- | -------------------------- | ------------------------- |
| `de_het`            | DE / HET buttons           | ← de, → het               |
| `nl_to_en`          | 3-choice MCQ               | 1, 2, 3                   |
| `en_to_nl`          | 3-choice MCQ               | 1, 2, 3                   |
| `listen`            | TTS + spelling MCQ         | 1, 2, 3                   |
| `listen_match`      | 4 audio ↔ 4 text pairs     | 1–4 play, click match     |
| `nl_to_en_sentence` | 3-choice MCQ               | 1, 2, 3                   |
| `en_to_nl_sentence` | 3-choice MCQ               | 1, 2, 3                   |
| `read_mcq`          | Scrollable text + MCQ      | 1, 2, 3                   |
| `knm`               | Scenario + MCQ             | 1, 2, 3                   |
| `dialogue_reply`    | Dialogue + MCQ             | 1, 2, 3                   |
| `fill_blank`        | Sentence + MCQ             | 1, 2, 3                   |
| `verb_form`         | Sentence + MCQ             | 1, 2, 3                   |
| `preposition`       | Sentence + MCQ             | 1, 2, 3                   |
| `number_detail`     | Context + MCQ              | 1, 2, 3                   |
| `listen_mcq`        | Question + TTS + MCQ       | 1, 2, 3                   |
| `form_fill`         | Multi-field form           | Enter submit              |
| `write_note`        | Bullets + textarea         | Enter submit              |
| `complete_sentence` | Type missing word          | Enter submit              |
| `plural`            | Type plural                | Enter submit              |
| `number_listen`     | TTS + type number          | Enter submit              |
| `read_order`        | Reorder list               | ↑↓ move, Enter submit     |
| `read_match`        | Match two columns          | Click pairs               |
| `word_order`        | Build sentence from tokens | Click words, Enter submit |
| `speak_repeat`      | TTS + mic record           | Hold mic button           |
| `image_describe`    | Image + type description   | Enter submit              |

All types: Space / Esc = dismiss (focus omnibox). MCQ types also dismiss on Enter before answering.

## SM-2 spacing

Spacing intervals (minutes): `[1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200]`.

Correct → `consecutiveStreaks++` → `dontShowUntil = now + spacing[streaks]`.
Wrong → `consecutiveStreaks = 0` → `dontShowUntil = now + 5 min`.

Logic lives in `Orchestrator.evaluate()` and `Orchestrator.getNextChallenge()`.

## Tailwind

Standalone CLI tailwindcss v3.4.17. Config: `tailwind.config.js` scans `./src/**/*.{html,ts}`. Custom animations (fadeIn, slideOut, shake) and glass-card utilities defined in `src/input.css`.

UI uses M3-inspired warm-stone tokens with Inter typography. Feedback colors: `secondary-container` (correct), `on-tertiary-container` (wrong).
