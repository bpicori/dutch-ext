# TabTaal (agent context)

TabTaal is a Manifest V3 Chrome extension that overrides the new tab page with one micro-challenge at a time. All state is in `chrome.storage.local`. No accounts, no servers. TypeScript + Tailwind, zero runtime deps.

## Commands

```bash
npm install
./build.sh          # tsc + tailwind + validate + copy to dist/
npm run validate:challenges
npm run lint        # prettier --check .
npm run format      # prettier --write . (use to fix formatting)
```

- `dist/` and the `tailwindcss` binary are gitignored.
- After build: reload the unpacked extension manually in `chrome://extensions`.
- `npx tsc` uses `tsconfig.json` (strict, ES2020 modules, outDir=dist).

## Architecture

```
main.ts
  └── StorageService.init() → load manifest + JSON deck, hydrate progress/streak/ignored
      └── new Orchestrator(storage).start()
            └── mount app shell + debug + stats
            └── run loop:
                  pick → module.present() → grade → saveProgress + logReview
                  → showResult + continue hint → wait (Enter/click or Esc)
```

Core files:

| File                                         | Responsibility                                                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`                                | Bootstrap only                                                                                                               |
| `src/orchestrator.ts`                        | Game loop, grading, continue/dismiss, debug/stats wiring                                                                     |
| `src/storage.ts`                             | Deck load + all chrome.storage keys (`progress`, `reviewLog`, `reviewDaily`, `streak`, `ignored`). Migrations live here.     |
| `src/sm2.ts`                                 | `pickNext`, `advance`, `SPACING_MINUTES`, `DEFAULT_PROGRESS`                                                                 |
| `src/types.ts`                               | `Challenge`, `ChallengeProgress`, `ReviewEntry`, `StreakState`, `ChallengeLevel` + re-exports `ChallengeType`                |
| `src/challenges/index.ts`                    | Single source of truth: `Registry`, `ChallengeType`, `CHALLENGE_TYPES`, `getChallenge()`                                     |
| `src/challenges/types.ts`                    | `ChallengeModule` + `UserResponse` (answer\|skip\|dismiss\|ignore)                                                           |
| `src/challenges/shared.ts`                   | Audio (speak + WebAudio tones), `normalizeAnswer`/`matchesAnswer`, `bindMcqPresent`, `bindChallengeSession`, result appliers |
| `src/challenges/mcq.ts`                      | `createMcqModule(config)` factory for 11 MCQ types                                                                           |
| `src/challenges/de-het.ts`                   | Special 2-button module                                                                                                      |
| `src/challenges/read-*.ts` / `word-order.ts` | Drag, match, token builders using small controllers                                                                          |
| `src/debug.ts`                               | ⌘D panel (sessionStorage), forced type pick, ignore manager                                                                  |
| `src/stats.ts`                               | Stats button + overlay, `computeStats`, heavy rendering                                                                      |
| `src/ui/primitives.ts`                       | All HTML builders (`challengeLayout`, `dutchPrompt*`, `choiceButton`, `kbdFooter`, etc.)                                     |

## Challenge contract

Every module implements:

```ts
interface ChallengeModule {
  present(container: HTMLElement, challenge: Challenge): Promise<UserResponse>;
  showResult(container: HTMLElement, challenge: Challenge, answer: string, correct: boolean): void;
  isCorrect(challenge: Challenge, answer: string): boolean;
}
```

- MCQ types → `createMcqModule({ badge, subtitle, promptMode, ... })`
- Interactive types → build DOM then `bindChallengeSession(resolve, { onKey?, skipOnEnter? })`
- Always render via `challengeLayout(...)` (or equivalent) so skip + ignore links exist.
- `UserResponse.kind === 'skip'` or Escape during present → treated as wrong.
- After `showResult`, mountContinueHint; next round on Enter/click-outside or Esc to dismiss.

## Challenge data

- `src/challenges/data/{level}/{topic}.json` (levels: a1|a2|b1)
- `src/challenges/deck.json` is the authoritative list (array of relative paths).
- `build.sh` calls `node scripts/validate-challenges.mjs` which enforces required fields, type-specific shapes, and unique IDs.
- Card ID format: `{level}.{topic}.{slug}` (e.g. `a1.vocab-basics.fiets.de_het`). **Never rename published IDs** — progress and logs are keyed by ID.
- `StorageService` enriches every card with `level` and `topic` derived from path if missing.
- Optional fields used by modules: `choices`, `context`, `promptAudio`, `acceptableAnswers`, `orderItems`, `matchLeft`/`matchRight`, `tags`.

## SM-2 + scheduling

- Intervals (minutes): `[1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200]`
- Correct → `intervalIndex = min(current+1, last)`, `dontShowUntil = now + interval`
- Wrong → `intervalIndex=0`, `dontShowUntil = now + 5min`
- `pickNext` prefers any due card (random), else the one with oldest `dontShowUntil`.
- `orchestrator` calls `logReview` on every graded answer (feeds stats + streak).

## Storage keys (all under chrome.storage.local)

- `progress`, `reviewLog`, `reviewDaily`, `streak`, `ignored`
- Migrations for legacy `consecutiveStreaks` etc. are inside `storage.ts`.

## Keyboard model (global)

- During challenge: `Escape` = dismiss (focus omnibox), `Space`/`Enter` usually skip, `1-3` pick choice for MCQ, arrows for de/het.
- After result: `Enter` or click outside = next, `Escape` = dismiss.
- Stats overlay: `Escape` or click backdrop/close = close.
- Debug: `⌘D` / `Ctrl-D` toggles.

Skip and ignore during present both short-circuit to "wrong" or next without grading.

## Design system

Three layers:

1. Tokens — `tailwind.config.js` (canvas, card, ink, muted, accent, success, error, border + legacy M3 aliases)
2. Components — `src/input.css` (`.flashcard`, `.challenge-card`, `.choice-btn*`, glows, animations, `.stats-*`)
3. Primitives — `src/ui/primitives.ts` — always prefer these over raw classes when building challenge HTML.

Typography:

- Dutch prompts: `dutchPromptWord()` (Lora, large) or `dutchPromptSentence()`
- UI labels: `challengeLabel()`, `type-body-*`, `type-label-sm`, `type-headline-md`
- Never put raw `type-*` classes inside challenge modules; go through primitives.

Motion: `--duration-fast/normal` + `prefers-reduced-motion` disables shake/slide/word anims.

## Code style & conventions

- Strict TypeScript. No `any` unless unavoidable.
- ES modules everywhere: import `from './foo.js'` even in `.ts`.
- Small pure helpers in `shared.ts`. Stateful interactive bits live in tiny controllers (word pool, order list, match).
- HTML via template literals + `container.innerHTML = ...`; wire listeners after.
- Challenge modules are either a factory result or a plain object with the three methods.
- Use `normalizeAnswer` / `matchesAnswer` for grading text.
- Result styling and sound effects go through the shared `apply*Result` + `applyCardGlow` functions.
- Debug state is session-only; everything else persists via storage service.
- Add a new type: register in `challenges/index.ts`, add validator case, implement module (prefer factory when it's just MCQ config).
- When adding UI primitives, export them and document the intended use.

## Gotchas

- Do not mutate the deck in place; `getDeck()` returns the live array.
- `pickNext` + debug can return the same card repeatedly in a session; that's intentional.
- Validation runs on every build. Bad data = failed build.
- The extension has no auto-reload. After `build.sh` you must reload the extension card.
- Stats overlay is appended to `body`; make sure no z-index or focus leaks.
- Ignored cards are filtered for normal picking and for stats, but still in the raw deck.
- All user-facing Dutch labels live in the orchestrator and challenge modules (keep consistent tone).

## Adding features

- New challenge type → start in `challenges/`, register, update validator, use primitives.
- New storage concern → add to `StorageService`, add migration if needed, expose getter.
- UI change → prefer primitives + tokens; keep the calm new-tab + flashcard aesthetic.
- Anything that touches grading or scheduling → touch tests via manual verification in the extension (no unit test suite yet).

Keep changes minimal, consistent with existing patterns, and ensure `npm run build` succeeds cleanly.

## Final checks (run at the end)

- Always run `npm run lint` after making code changes. Fix any formatting issues (use `npm run format` if needed) before considering the task complete.
