export function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}

export function challengeShell(inner: string, extraAttrs = ''): string {
  return `<div id="challenge-wrapper" class="challenge-shell"${extraAttrs}>${inner}</div>`;
}

export function challengeCard(body: string): string {
  return `<div id="challenge" class="challenge-card">${body}</div>`;
}

export function badgePill(label: string): string {
  return `<div class="badge-pill"><span class="badge-pill__text">${label}</span></div>`;
}

export function choiceButton(answer: string, label: string, index: number): string {
  return `<button data-answer="${escapeAttr(answer)}" data-index="${index}" type="button" class="choice-btn group">
    <span class="type-body-lg text-on-surface">${label}</span>
    <span class="text-label-sm text-on-surface-variant opacity-40 group-hover:opacity-100 transition-opacity">${index + 1}</span>
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
        ? `<span class="material-symbols-outlined" style="font-size: 16px">${h.icon}</span>`
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
  return `<div class="context-block"><p class="type-body-md text-on-surface-variant whitespace-pre-wrap">${text}</p></div>`;
}

export function challengeLayout(cardBody: string, footer = ''): string {
  return challengeShell(`${challengeCard(cardBody)}${skipLink()}${footer}`);
}