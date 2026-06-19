# Challenge data

TabTaal loads all challenge cards from bundled JSON into a **single spaced-repetition pool**. Files are organized by **level + topic** on disk; runtime merges them into one flat deck.

## Layout

```
src/challenges/
  manifest.json              # curated list of data files (load order)
  data/
    a1/
      vocab-basics.json
      reading-practical.json
      society-dialogue.json
      grammar.json
      sentences.json
    a2/                        # placeholder for future A2 content
  schema/
    challenge.schema.json      # optional JSON Schema reference
```

`build.sh` copies `data/` and `manifest.json` into `dist/challenges/` after validation.

## Manifest

[`src/challenges/manifest.json`](../src/challenges/manifest.json) is the source of truth. Add a new file path when you add a topic:

```json
[
  "data/a1/vocab-basics.json",
  "data/a1/reading-practical.json"
]
```

Curated (not auto-globbed) so WIP files stay out of the build and PRs show exactly what ships.

## File format

Each topic file is a **JSON array** of challenge objects:

```json
[
  {
    "id": "a1.vocab-basics.fiets.de_het",
    "type": "de_het",
    "prompt": "fiets",
    "choices": ["de", "het"],
    "correctAnswer": "de"
  }
]
```

### Naming rules

| Rule | Example |
| ---- | ------- |
| Level folder | `a1`, `a2`, `b1` |
| Topic file | kebab-case: `vocab-basics.json`, `knm-health.json` |
| Target size | ~20–80 cards per file; split when topics diverge |
| Mixed types | OK — e.g. `read_mcq` + `fill_blank` in one shopping unit |

## ID scheme

Globally unique, stable, human-readable:

```
{level}.{topic}.{slug}
```

Examples:

- `a1.vocab-basics.fiets.de_het`
- `a1.reading-practical.winkel-hours.read_mcq`
- `a1.sentences.morning-routine.read_order`

**Never change an ID after release** — `chrome.storage.local` progress is keyed by `id`.

When multiple cards share a lemma, suffix with the challenge type: `.de_het`, `.nl_to_en`, etc.

## Optional metadata

Authors can omit these; the app fills `level` and `topic` from the file path at load time.

| Field | Source | Example |
| ----- | ------ | ------- |
| `level` | `data/{level}/` folder | `"a1"` |
| `topic` | filename stem | `"vocab-basics"` |
| `tags` | author-defined | `["shopping", "time"]` |

## Required fields by type

All types: `id`, `type`, `prompt`, `correctAnswer`.

| Type(s) | Extra required fields |
| ------- | --------------------- |
| `de_het` | `choices` (2) |
| MCQ types (`nl_to_en`, `en_to_nl`, `read_mcq`, `knm`, `dialogue_reply`, `fill_blank`, `verb_form`, `preposition`, `number_detail`) | `choices` (3) |
| `read_order`, `word_order` | `orderItems` (2+) |
| `read_match` | `matchLeft`, `matchRight` (equal length) |

### Optional fields (any type)

`context`, `promptAudio`, `acceptableAnswers`, `audioWords`, `tags`

## Validation

```bash
npm run validate:challenges
```

Runs automatically in `./build.sh`. Checks:

- Manifest paths exist
- Valid JSON arrays
- No duplicate `id` values across the full deck
- Required fields per `type`
- Known `type` values (must match [`src/challenges/index.ts`](../src/challenges/index.ts))

## Adding a new topic

1. Create `src/challenges/data/{level}/{topic}.json`
2. Add the path to `src/challenges/manifest.json`
3. Run `npm run validate:challenges`
4. Run `./build.sh` and reload the extension

## PR checklist

- [ ] New IDs are unique and follow `{level}.{topic}.{slug}`
- [ ] `npm run validate:challenges` passes
- [ ] No accidental edits to existing IDs (breaks user progress)