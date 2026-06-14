let onAnswer = null;
let onDismiss = null;
let currentType = null;
let answered = false;

export function bindKeys(type, answerCb, dismissCb) {
  currentType = type;
  onAnswer = answerCb;
  onDismiss = dismissCb;
  answered = false;
  document.addEventListener('keydown', handler);
}

export function unbindKeys() {
  document.removeEventListener('keydown', handler);
  currentType = null;
  onAnswer = null;
  onDismiss = null;
}

function handler(e) {
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
    e.preventDefault();
    const cb = onDismiss;
    unbindKeys();
    if (cb) cb();
    return;
  }

  if (answered) return;

  if (currentType === 'de_het') {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      answered = true;
      if (onAnswer) onAnswer('de');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      answered = true;
      if (onAnswer) onAnswer('het');
    }
    return;
  }

  const num = parseInt(e.key);
  if (num >= 1 && num <= 3) {
    e.preventDefault();
    const buttons = document.querySelectorAll('.choice-btn');
    const btn = buttons[num - 1];
    if (btn) {
      answered = true;
      if (onAnswer) onAnswer(btn.dataset.answer);
    }
  }
}
