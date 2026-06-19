---
name: challenge-reviewer
description: Reviews TabTaal challenge drafts, curates to 10-20 approved cards, and flags revisions. Use when reviewing draft.json, approving challenges, or running the challenge quality gate before merge.
---

# Challenge reviewer (TabTaal)

## Quick start

```
Review challenges for het-fundament chpt-01
```

Read `content/staging/{slug}/chpt-NN.draft.json`.
See [docs/challenge-ingestion.md](../../docs/challenge-ingestion.md) and [docs/challenge-data.md](../../docs/challenge-data.md).

## Workflow

1. Load draft from `content/staging/{slug}/chpt-NN.draft.json`.
2. Load production deck from `src/challenges/data/a1/` — check ID collisions.
3. Apply review checklist (schema, types, pedagogy, distractors, Dutch).
4. Curate to **10–20 best cards** (all if draft &lt; 10).
5. Write `chpt-NN.review.json` with kept/dropped IDs and verdict.
6. If approved: write `chpt-NN.approved.json`.
7. If revise: set `status: "revise"` in review.json (max 2 loops total).

## Outputs

| File | Content |
| ---- | ------- |
| `*.review.json` | Verdict, issues, kept/dropped |
| `*.approved.json` | 10–20 card JSON array |

## Selection priority

1. Core vocabulary + `de_het`
2. Situational (`read_mcq` / `knm` / `dialogue_reply`)
3. Grammar (`fill_blank` / `verb_form` / `preposition`)
4. Interactive (`word_order` / `read_order`)
5. Best remaining unique cards

## After approval

Tell the user to spot-check in Chrome (⌘D), then copy approved cards to `src/challenges/data/a1/` and update `manifest.json`. Run `npm run validate:challenges && ./build.sh` before committing production files only.