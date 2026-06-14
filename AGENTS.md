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
StorageService ──(Challenge)──▶ GameLoop ──(Challenge)──▶ Renderer
      ▲                                                       │
      │                                                 (callbacks)
      └────────────────(evaluate + persist)◀─────────────────┘
```

| File | Class | Role |
|------|-------|------|
| `src/types.ts` | (interfaces only) | Shared types — erased at compile time |
| `src/storage.ts` | `StorageService` | Challenge deck, SM-2 spaced repetition, `chrome.storage.local` |
| `src/renderer.ts` | `Renderer` | DOM shell, 4 challenge layouts, keyboard, audio, click handling |
| `src/loop.ts` | `GameLoop` | Orchestrator — wires Storage ↔ Renderer, runs the loop |
| `src/main.ts` | entry point | Instantiates all three, calls `loop.start()` |

The Renderer communicates through callbacks (`onAnswer`, `onDismiss`). It owns no data logic. The Storage owns no DOM. The GameLoop owns the pipe.

## Challenge data

`src/challenges/tier1.json` and `src/challenges/tier2.json`. Loaded at runtime via `fetch(chrome.runtime.getURL('challenges/tierN.json'))` in `StorageService.init()`.

Each challenge is a standalone flashcard with its own SM-2 progress. Tier 2 unlocks when every tier-1 challenge has been attempted at least once.

## Challenge types

| Type | Prompt | Choices | Keyboard |
|------|--------|---------|----------|
| `de_het` | Large Dutch noun | Two buttons: DE / HET | ← = de, → = het |
| `nl_to_en` | Dutch word | Three English definitions | 1, 2, 3 |
| `en_to_nl` | English word | Three Dutch translations | 1, 2, 3 |
| `listen` | TTS audio (auto-play) | Three Dutch spelling variants | 1, 2, 3 |

All types: Space / Enter / Esc = dismiss challenge (focus omnibox).

## SM-2 spacing

Spacing intervals (minutes): `[1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200]`.

Correct → `consecutiveStreaks++` → `dontShowUntil = now + spacing[streaks]`.
Wrong → `consecutiveStreaks = 0` → `dontShowUntil = now + 5 min`.

Logic lives in `StorageService.evaluate()` and `StorageService.getNextChallenge()`.

## Tailwind

Standalone CLI tailwindcss v3.4.17. Config: `tailwind.config.js` scans `./src/**/*.{html,ts}`. Custom animations (fadeIn, slideOut, shake) defined in `src/input.css`.

UI uses warm stone + amber palette (`stone-950`, `stone-900`, `amber-300`, etc.). Feedback colors: `emerald` (correct), `rose` (wrong).
