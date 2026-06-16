import { Challenge } from '../types.js';
import { ChallengeModule, UserResponse } from './types.js';
import {
  SKIP_LINK_HTML,
  TYPING_FOOTER_HTML,
  applyTextareaResult,
  bindTypingPresent,
  matchesAnswer,
} from './shared.js';

function present(container: HTMLElement, challenge: Challenge): Promise<UserResponse> {
  const bullets = (challenge.bulletPrompts ?? [])
    .map((b) => `<li class="font-body-md text-body-md text-on-surface-variant">${b}</li>`)
    .join('');

  container.innerHTML = `
    <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full rounded-DEFAULT py-xl px-lg flex flex-col items-center gap-lg relative overflow-hidden">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">SCHRIJVEN</span>
        </div>
        <p class="font-body-md text-body-md text-on-surface w-full">${challenge.prompt}</p>
        <ul class="list-disc list-inside w-full text-left">${bullets}</ul>
        <textarea id="write-note-input" rows="4" class="w-full bg-surface-container-low border-2 border-outline-variant text-on-surface font-body-md p-md rounded-DEFAULT focus:outline-none focus:border-primary-container resize-none" placeholder="Schrijf je bericht..."></textarea>
        <div id="typing-feedback" class="hidden bg-on-tertiary/10 border border-on-tertiary-container/20 p-md rounded-DEFAULT w-full"></div>
      </div>
      ${SKIP_LINK_HTML}
      ${TYPING_FOOTER_HTML}
    </div>`;

  return bindTypingPresent(container, '#write-note-input');
}

function showResult(
  container: HTMLElement,
  challenge: Challenge,
  _userAnswer: string,
  correct: boolean,
): void {
  applyTextareaResult(container, challenge.correctAnswer, correct);
}

function isCorrect(challenge: Challenge, answer: string): boolean {
  return matchesAnswer(challenge.correctAnswer, answer, challenge.acceptableAnswers);
}

export const writeNoteModule: ChallengeModule = { present, showResult, isCorrect };
