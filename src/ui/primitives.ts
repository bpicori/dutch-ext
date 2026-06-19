export function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}

export function challengeShell(inner: string, extraAttrs = ''): string {
  return `<div id="challenge-wrapper" class="challenge-shell"${extraAttrs}>${inner}</div>`;
}

export function challengeCard(body: string): string {
  return `<div id="challenge" class="challenge-card">${body}</div>`;
}

export function challengeLabel(label: string): string {
  return `<p class="challenge-label">${label}</p>`;
}

/** @deprecated Use challengeLabel */
export const badgePill = challengeLabel;

export function dutchPromptWord(text: string, extraClass = ''): string {
  return `<h1 class="type-prompt-word${extraClass ? ` ${extraClass}` : ''}">${text}</h1>`;
}

export function dutchPromptSentence(text: string): string {
  return `<h1 class="type-prompt-sentence">${text}</h1>`;
}

export function promptSubtitle(text: string): string {
  return `<p class="prompt-subtitle">${text}</p>`;
}

export function promptArea(inner: string): string {
  return `<div class="prompt-area">${inner}</div>`;
}

export function choiceButton(answer: string, label: string, index: number): string {
  return `<button data-answer="${escapeAttr(answer)}" data-index="${index}" type="button" class="choice-btn group">
    <span class="type-body-lg text-ink">${label}</span>
    <span class="text-label-sm text-muted opacity-50 group-hover:opacity-90 transition-opacity">${index + 1}</span>
  </button>`;
}

export function skipLink(): string {
  return `<button id="skip-link" type="button" class="skip-link">Ik weet het niet zeker</button>`;
}

export function kbdChip(label: string): string {
  return `<span class="kbd-chip">${label}</span>`;
}

export function kbdFooter(hints: { key: string; label?: string; icon?: string }[]): string {
  const items = hints
    .map((h) => {
      const keyPart = h.icon
        ? `<span class="material-symbols-outlined text-muted" style="font-size: 16px">${h.icon}</span>`
        : kbdChip(h.key);
      const labelPart = h.label ? `<span>${h.label}</span>` : '';
      return `<div class="kbd-footer__hint">${keyPart}${labelPart}</div>`;
    })
    .join('');
  return `<div class="kbd-footer">${items}</div>`;
}

export function primaryButton(id: string, label: string, hidden = false): string {
  const hiddenClass = hidden ? ' hidden' : '';
  return `<button type="button" id="${id}" class="btn-primary${hiddenClass}">${label}</button>`;
}

export function contextBlock(text: string): string {
  return `<div class="context-block"><p class="context-block__text">${text}</p></div>`;
}

export function challengeLayout(cardBody: string, footer = ''): string {
  return challengeShell(`${challengeCard(cardBody)}${skipLink()}${footer}`);
}