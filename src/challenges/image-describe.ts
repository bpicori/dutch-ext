import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  SKIP_LINK_HTML,
  TYPING_FOOTER_HTML,
  applyTypingResult,
  bindTypingPresent,
  matchesAnswer,
} from './shared.js';

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  const src = challenge.imageUrl ? chrome.runtime.getURL(challenge.imageUrl) : '';

  container.innerHTML = `
    <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full rounded-DEFAULT py-xl px-lg flex flex-col items-center gap-lg relative overflow-hidden">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">BESCHRIJVEN</span>
        </div>
        <img src="${src}" alt="" class="w-full max-h-40 object-contain rounded-DEFAULT bg-surface-container-low">
        <p class="font-body-md text-body-md text-on-surface w-full text-center">${challenge.prompt}</p>
        <input id="typing-input" type="text" autocomplete="off" spellcheck="false"
          class="w-full bg-surface-container-low border-b-2 border-outline-variant text-on-surface font-body-lg py-sm focus:outline-none focus:border-primary-container"
          placeholder="Beschrijf wat je ziet...">
        <div id="typing-error-icon" class="hidden"><span class="material-symbols-outlined text-on-tertiary-container">error</span></div>
        <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT w-full"></div>
      </div>
      ${SKIP_LINK_HTML}
      ${TYPING_FOOTER_HTML}
    </div>`;

  return bindTypingPresent(container, '#typing-input');
}

function showResult(
  container: HTMLElement,
  challenge: Challenge,
  userAnswer: string,
  correct: boolean,
): void {
  applyTypingResult(container, userAnswer, challenge.correctAnswer, correct);
}

function isCorrect(challenge: Challenge, answer: string): boolean {
  return matchesAnswer(challenge.correctAnswer, answer, challenge.acceptableAnswers);
}

export const imageDescribeModule: ChallengeModule = { present, showResult, isCorrect };
