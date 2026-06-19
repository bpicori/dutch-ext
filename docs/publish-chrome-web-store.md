# Publishing TabTaal to the Chrome Web Store

Step-by-step guide for shipping TabTaal from this repo to the [Chrome Web Store](https://chrome.google.com/webstore).

## Prerequisites

- A Google account you check regularly (store notifications go here)
- `./build.sh` succeeds locally
- Extension tested via **Load unpacked** → `dist/`
- Icons at `icons/icon16.png`, `icon48.png`, `icon128.png`
- A **privacy policy URL** (required even though data stays local — see below)

Official references:

- [Register](https://developer.chrome.com/docs/webstore/register)
- [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)
- [Publish](https://developer.chrome.com/docs/webstore/publish)
- [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Listing best practices](https://developer.chrome.com/docs/webstore/best_listing)

---

## 1. Register a developer account

1. Open the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Sign in with your Google account.
3. Accept the developer agreement and policies.
4. Pay the **one-time registration fee** (currently **$5**).

Use a dedicated email if possible — you cannot change the account email later without creating a new account and transferring items.

---

## 2. Build and zip the extension

Chrome expects a ZIP where **`manifest.json` is at the root** of the archive (the contents of `dist/`, not the `dist/` folder itself).

```bash
npm install   # if needed
./build.sh
cd dist && zip -r ../tabtaal.zip . && cd ..
```

### Pre-upload checklist

| Item | TabTaal |
| ---- | ------- |
| `manifest.json` name | `TabTaal` |
| `version` | Bump on every resubmit (e.g. `0.1.0` → `0.1.1`) |
| `description` | ≤ 132 characters |
| Icons | 16 / 48 / 128 px in `dist/icons/` |
| New tab override | Works when loaded unpacked |
| Challenge types | Spot-check via ⌘D debug panel |

If upload fails with **"Cannot parse the manifest"**, check for JSON comments, trailing commas, or invalid fields.

---

## 3. Upload the package

1. Dashboard → **Add new item**
2. **Choose file** → `tabtaal.zip` → **Upload**
3. Fix any errors, re-zip, and re-upload if needed

Maximum package size: **2 GB** (TabTaal is tiny).

---

## 4. Store listing

Fill out the **Store Listing** tab in the developer dashboard.

### Title

**TabTaal**

### Summary (≤ 132 characters)

> Learn Dutch one new tab at a time. Short flashcard challenges with spaced repetition — no account needed.

### Description

Expand on [DESCRIPTION.md](../DESCRIPTION.md). Cover:

- Replaces the new tab with one Dutch micro-challenge
- Challenge types (de/het, MCQ, word order, read match, etc.)
- Spaced repetition (SM-2)
- Keyboard shortcuts
- Progress stored locally — no account, no server

### Category

**Education** (or **Productivity**)

### Screenshots (required)

- At least **1**, up to **5**
- Size: **1280×800** or **640×400**
- Show the real UI: a challenge, a result state, maybe varied challenge types
- Full bleed, square corners, no fake “Editor’s Choice” badges

### Promo images (optional)

| Asset | Size |
| ----- | ---- |
| Small promo tile | 440×280 |
| Marquee | 1400×560 |

### URLs

- **Homepage** — project site or GitHub repo
- **Support** — issues URL or contact email

---

## 5. Privacy tab

Required for review. TabTaal currently declares:

```json
"permissions": ["storage"]
```

### Single purpose

> TabTaal replaces the new tab page with a single Dutch practice flashcard so users can learn in short moments before browsing.

### Permission justification — `storage`

> Saves learning progress locally (per-card spaced repetition intervals). Data stays on the device in `chrome.storage.local`; nothing is sent to a server.

### Remote code

**No** — TabTaal does not execute remotely hosted code (MV3 compliant).

### Data collection

Declare only what applies. For TabTaal:

- Learning progress (cards seen, review schedules) — stored locally
- Certify: not sold, not used for unrelated purposes, not transferred except as needed to operate the extension

### Privacy policy

Host a short policy at a stable URL and paste it in the dashboard. Example text:

> **TabTaal Privacy Policy**
>
> TabTaal stores your learning progress (which cards you have completed and when they are due again) locally in your browser using Chrome’s `storage` API. We do not collect, transmit, or sell personal data. No account is required.
>
> TabTaal loads fonts from Google Fonts (`fonts.googleapis.com`) to render the UI. Your extension does not send user data to us.
>
> Contact: [your email]

GitHub Pages, a project site, or a public gist with a stable raw URL all work.

---

## 6. Distribution

- **Pricing:** Free
- **Visibility:** Public (or **Unlisted** for a soft launch)
- **Regions:** All countries, or a subset to start

If you later sell the extension or offer in-app purchases, EU/UK **trader verification** may apply. See [Trader verification FAQ](https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq).

---

## 7. Submit for review

1. Complete **Store listing**, **Privacy**, and **Distribution**
2. Click **Submit for review**
3. Optionally uncheck auto-publish to **defer** until you publish manually after approval

Review often takes **1–3 business days**. New-tab overrides can take longer because reviewers check single-purpose compliance.

After approval, you have up to **30 days** to publish a staged submission before it reverts to draft.

Docs: [Review process](https://developer.chrome.com/docs/webstore/review-process)

---

## 8. TabTaal-specific review notes

### New tab override

The listing **must** state clearly that TabTaal **replaces the Chrome new tab**. Do not describe it as a sidebar tool or background utility.

### `web_accessible_resources`

The manifest currently exposes challenge JSON and images with `"matches": ["<all_urls>"]`. Reviewers may ask why. If those assets are only used on the new tab page, consider narrowing or removing this before submit.

### External requests

`newtab.html` loads **Inter** and **Lora** from Google Fonts and **Material Symbols** from Google’s CDN. Mention font loading in the privacy policy; no user PII is sent by TabTaal itself.

---

## 9. After publication

### Updates

1. Bump `version` in `manifest.json`
2. `./build.sh`
3. Re-zip `dist/` → upload new package
4. Submit for review again

You cannot edit uploaded manifest metadata in the dashboard — typos require a new version + zip.

### Reload during development

The Web Store build does not auto-reload. For local work: `chrome://extensions` → **Reload** on the unpacked `dist/` folder.

---

## Quick checklist

- [ ] Developer account registered ($5 fee paid)
- [ ] `./build.sh` → `tabtaal.zip`
- [ ] Tested unpacked from `dist/`
- [ ] Store listing (title, summary, description, screenshots)
- [ ] Privacy policy URL live
- [ ] Single purpose + `storage` justification filled in
- [ ] Listing states new tab replacement
- [ ] Submitted for review

---

## Useful links

| Resource | URL |
| -------- | --- |
| Developer Dashboard | https://chrome.google.com/webstore/devconsole |
| Program policies | https://developer.chrome.com/docs/webstore/program-policies |
| Update an existing item | https://developer.chrome.com/docs/webstore/update |
| Cancel a review | https://developer.chrome.com/docs/webstore/cancel-review |