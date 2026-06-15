# WachtNederlands

**Learn Dutch one new tab at a time.**

WachtNederlands is a Chrome extension that turns your browser’s new tab page into a short Dutch practice session. Instead of a blank page, you get a single micro-challenge — answer it, dismiss it, and get on with your day. The goal is to help learners prepare for the Dutch inburgering exam through small, repeated exposures rather than long study blocks.

## How it works

1. **Open a new tab** — the extension replaces Chrome’s default new tab.
2. **See one challenge** — vocabulary, grammar, listening, reading, writing, or society knowledge.
3. **Answer with keyboard or click** — instant feedback, then dismiss to focus the address bar.
4. **Come back later** — spaced repetition schedules when each card appears again.

Progress (XP, daily streak, per-card mastery) is stored locally in the browser. No account, no server.

## Challenge types

### Vocabulary & grammar (tier 1–2)

| Type | What you practice |
|------|-------------------|
| **de / het** | Dutch article for a noun |
| **Dutch → English** | Word or sentence meaning |
| **English → Dutch** | Word or sentence translation |
| **Listen** | Recognize spoken Dutch spelling (TTS) |
| **Listen & match** | Match four spoken Dutch words to English |

### Exam-style (tier 3–5)

| Type | What you practice |
|------|-------------------|
| **Read (MCQ)** | Short Dutch text + comprehension question |
| **KNM** | Dutch society scenarios — what to do first |
| **Dialogue reply** | Pick the best conversational response |
| **Listen (MCQ)** | Question first, then hear a short clip |
| **Number / detail** | Prices, times, facts from context |
| **Fill blank** | Choose missing word (connectors, articles) |
| **Verb form** | Choose correct conjugation |
| **Preposition** | Choose `in` / `op` / `naar` etc. |
| **Plural** | Type the plural of a noun |
| **Complete sentence** | Type a missing word |
| **Form fill** | Fill in form fields (name, phone, …) |
| **Write note** | Type a short briefje from bullet prompts |
| **Number listen** | Hear a number → type it |
| **Read order** | Put sentences/events in correct order |
| **Read match** | Match questions to answers from a text |
| **Word order** | Arrange shuffled words into a Dutch sentence |
| **Speak repeat** | Hear a phrase → speak it (mic) |
| **Image describe** | Describe a picture in Dutch |

Challenges are grouped into **tiers** (1–5). Each tier unlocks when every card in the previous tier has been attempted at least once.

## Learning model

Each flashcard tracks its own history. Answer correctly and that card stays away longer (from minutes up to weeks). Answer wrong and it returns in about five minutes. The extension picks the next card from those that are “due,” so practice naturally follows what you still need to review.

A daily streak counts consecutive days with at least one completed challenge.

## Tech at a glance

- Chrome Extension (Manifest V3) with a custom **new tab** override
- TypeScript, compiled to plain JS; Tailwind CSS for UI
- Challenge content in JSON (`tier1`–`tier5`); progress in `chrome.storage.local`
- Core modules: storage (data + scheduling + grading), renderer (UI), game loop (orchestration)

For build steps, architecture detail, and contributor notes, see [AGENTS.md](./AGENTS.md).
