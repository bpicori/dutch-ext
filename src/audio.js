export function speak(text, lang = 'nl-NL') {
  if (!window.speechSynthesis) return Promise.resolve();

  window.speechSynthesis.cancel();

  return new Promise(resolve => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.75;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

export function playSuccess() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const t = now + i * 0.09;
    tone(ctx, freq, t, 0.12, 0.08);
  });
}

export function playError() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;
  tone(ctx, 200, now, 0.15, 0.08);
  tone(ctx, 150, now + 0.12, 0.15, 0.06);
}

function tone(ctx, freq, startTime, duration, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}
