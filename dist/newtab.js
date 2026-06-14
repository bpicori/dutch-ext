import { loadGlobal, saveGlobal, loadProgress, saveProgress } from './storage.js';
import { loadDeck, selectChallenge, evaluate } from './engine.js';
import { renderApp, renderChallenge, showResult, clearChallenge, dismissChallenge } from './ui.js';
import { bindKeys, unbindKeys } from './input.js';
import { speak, playSuccess, playError } from './audio.js';

let lock = false;
let currentProgress = {};
let currentGlobal = {};

async function init() {
  renderApp();

  currentGlobal = await loadGlobal();
  currentProgress = await loadProgress();

  await loadDeck();

  presentChallenge();
}

function presentChallenge() {
  const challenge = selectChallenge(currentProgress);
  if (!challenge) return;

  lock = false;
  clearChallenge();
  renderChallenge(challenge);

  if (challenge.type === 'listen' && challenge.promptAudio) {
    speak(challenge.promptAudio);
  }

  bindKeys(challenge.type,
    answer => handleAnswer(challenge, answer),
    handleDismiss,
  );

  const buttons = document.querySelectorAll('.choice-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (lock) return;
      const answer = btn.dataset.answer;
      if (answer != null) handleAnswer(challenge, answer);
    });
  });
}

async function handleAnswer(challenge, userAnswer) {
  if (lock) return;
  lock = true;
  unbindKeys();

  const result = evaluate(challenge, userAnswer, currentProgress, currentGlobal);

  currentProgress = result.nextProgress;
  currentGlobal = result.nextGlobal;

  await saveProgress(currentProgress);
  await saveGlobal(currentGlobal);

  showResult(challenge, userAnswer);

  if (result.correct) {
    playSuccess();
  } else {
    playError();
  }

  setTimeout(() => {
    presentChallenge();
  }, 1000);
}

function handleDismiss() {
  dismissChallenge();
}

init();
