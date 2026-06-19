---
name: challenge-author
description: Authors maximum-coverage TabTaal challenge JSON drafts from extracted chapter text. Use when creating draft.json from content/extracted/, authoring challenges from a chapter, or revising after reviewer feedback.
---

# Challenge author (TabTaal)

## Quick start

```
Author challenges for het-fundament chpt-01
```

Read chapter text from `content/extracted/{slug}/chpt-NN/text.md`.
See [docs/challenge-ingestion.md](../../docs/challenge-ingestion.md) and [docs/challenge-data.md](../../docs/challenge-data.md).

## Workflow

1. Load or create `content/sources.json` for `level`, `topicPrefix`.
2. Read `content/extracted/{slug}/chpt-NN/text.md`.
3. Read gold examples from `src/challenges/data/a1/*.json`.
4. Generate **all valid challenges** — do not limit count.
5. Write `content/staging/{slug}/chpt-NN.draft.json` (JSON array only).
6. Validate cards against challenge-data schema (write a one-off validator if needed).
7. Update `sources.json` chapter `status: "drafted"`.

## Revision mode

If `content/staging/{slug}/chpt-NN.review.json` has `"status": "revise"`:

- Read `issues` array
- Fix draft
- Overwrite `draft.json`
- Only if `revision` &lt; 2; otherwise escalate to human

## ID format

`a1.{topicPrefix}-chpt{NN}.{slug}.{type}`

## Do not

- Write `approved.json` (reviewer's job)
- Use challenge types not in `src/challenges/index.ts`
- Copy long textbook passages verbatim into `context`
- Commit `content/` or ingestion scripts
