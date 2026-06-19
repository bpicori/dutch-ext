---
name: pdf-extract
description: Extracts Dutch A1 textbook chapters from scanned PDFs into markdown per chapter. Use when extracting PDFs from tmp/, transcribing Het Fundament or Kom-maar-binnen, or building content/extracted/.
---

# PDF extract (TabTaal)

## Quick start

```
Extract het-fundament from tmp/Het-Fundament-c2025QR.pdf
```

See [docs/challenge-ingestion.md](../../docs/challenge-ingestion.md) for sources and paths.

## Workflow

1. Confirm PDF exists in `tmp/` (see ingestion doc for slug → path).
2. Create `content/sources.json` if missing — chapter index with `id`, `title`, `pages`, `status`.
3. Scan TOC / first pages — list chapters with page ranges.
4. For each chapter (or one requested chapter):
   - Transcribe via PyMuPDF (selectable text) or vision (scanned pages).
   - Write `content/extracted/{slug}/chpt-NN/text.md`
   - Optionally write `content/extracted/{slug}/chpt-NN/pages.json`
5. Update `sources.json` chapter `status: "extracted"`.
6. Report chapter count and any pages needing manual boundary help.

Write a one-off Python script if batching helps; do not commit it. `content/` is gitignored.

## Do not

- Commit PDFs or extracted text
- Invent content not in the PDF
- Skip updating `sources.json` chapter index
