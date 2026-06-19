import { Challenge } from '../types.js';
import { ChallengeModule } from './types.js';
import {
  MCQ_FOOTER_HTML,
  SKIP_LINK_HTML,
  applyChoiceResult,
  bindMcqPresent,
  escapeAttr,
  matchesAnswer,
  shuffle,
  speak,
} from './shared.js';

export type McqPromptMode = 'default' | 'audio' | 'context';

export interface McqConfig {
  badge: string;
  subtitle: string;
  promptMode: McqPromptMode;
  promptClass?: string;
  audioDelayMs?: number;
}

function buildPrompt(challenge: Challenge, config: McqConfig): string {
  const { subtitle, promptMode } = config;

  if (promptMode === 'audio') {
    return `<div class="text-center py-md w-full">
      <button type="button" id="replay-audio" class="mb-sm material-symbols-outlined text-primary-container text-3xl hover:opacity-80 transition-opacity">volume_up</button>
      <h1 class="font-display-sentence text-display-sentence text-primary">${challenge.prompt}</h1>
      <p class="text-on-surface-variant font-label-sm mt-xs opacity-60">${subtitle}</p></div>`;
  }

  if (promptMode === 'context' && challenge.context) {
    return `<div class="w-full">
      <div class="w-full max-h-32 overflow-y-auto text-left p-md bg-surface-container-low rounded-DEFAULT border border-outline-variant mb-md">
        <p class="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap">${challenge.context}</p>
      </div>
      <h1 class="font-body-lg text-body-lg text-on-surface text-center">${challenge.prompt}</h1>
      <p class="text-on-surface-variant font-label-sm mt-xs opacity-60 text-center">${subtitle}</p></div>`;
  }

  const promptClass = config.promptClass ? ` ${config.promptClass}` : '';
  return `<div class="text-center py-md">
    <h1 class="font-display-word text-display-word text-primary${promptClass}">${challenge.prompt}</h1>
    <p class="text-on-surface-variant font-label-sm mt-xs opacity-60">${subtitle}</p></div>`;
}

function buildHtml(challenge: Challenge, choices: string[], config: McqConfig): string {
  const choicesHtml = choices
    .map(
      (choice, i) => `
      <button data-answer="${escapeAttr(choice)}" data-index="${i}" type="button"
        class="choice-btn group flex items-center justify-between w-full p-md bg-surface-container rounded-DEFAULT border border-outline-variant hover:border-primary-container hover:bg-surface-container-high transition-all">
        <span class="font-body-lg text-body-lg text-on-surface">${choice}</span>
        <span class="text-label-sm text-on-surface-variant opacity-40 group-hover:opacity-100 transition-opacity">${i + 1}</span>
      </button>`,
    )
    .join('');

  return `
    <div id="challenge-wrapper" class="animate-fade-in w-full flex flex-col items-center">
      <div id="challenge" class="glass-card w-full rounded-DEFAULT py-xl px-lg flex flex-col items-center gap-lg relative overflow-hidden">
        <div class="bg-surface-container-highest px-sm py-xs rounded-full border border-outline-variant">
          <span class="font-label-sm text-label-sm text-on-surface-variant tracking-[0.2em]">${config.badge}</span>
        </div>
        ${buildPrompt(challenge, config)}
        <div class="w-full flex flex-col gap-sm">${choicesHtml}</div>
      </div>
      ${SKIP_LINK_HTML}
      ${MCQ_FOOTER_HTML}
    </div>`;
}

export function createMcqModule(config: McqConfig): ChallengeModule {
  return {
    present(container, challenge) {
      const choices = challenge.choices;
      if (!choices?.length) {
        throw new Error(`MCQ challenge ${challenge.id} is missing choices`);
      }

      if (challenge.promptAudio) {
        container.dataset.promptAudio = challenge.promptAudio;
      }

      container.innerHTML = buildHtml(challenge, shuffle(choices), config);

      if (challenge.promptAudio) {
        const play = () => speak(challenge.promptAudio!);
        if (config.audioDelayMs) setTimeout(play, config.audioDelayMs);
        else play();
      }

      return bindMcqPresent(container);
    },

    showResult(container, challenge, userAnswer, correct) {
      applyChoiceResult(container, challenge.correctAnswer, userAnswer, correct);
    },

    isCorrect(challenge, answer) {
      return matchesAnswer(challenge.correctAnswer, answer, challenge.acceptableAnswers);
    },
  };
}

export const nlToEnModule = createMcqModule({
  badge: 'Nederlands \u2192 Engels',
  subtitle: 'Choose the correct translation',
  promptMode: 'default',
  promptClass: 'lowercase',
});

export const enToNlModule = createMcqModule({
  badge: 'Engels \u2192 Nederlands',
  subtitle: 'Choose the correct translation',
  promptMode: 'default',
});

export const nlToEnSentenceModule = createMcqModule({
  badge: 'Nederlands \u2192 Engels',
  subtitle: 'Choose the correct translation',
  promptMode: 'default',
});

export const enToNlSentenceModule = createMcqModule({
  badge: 'Engels \u2192 Nederlands',
  subtitle: 'Choose the correct translation',
  promptMode: 'default',
});

export const readMcqModule = createMcqModule({
  badge: 'Lezen',
  subtitle: 'Read the text and answer',
  promptMode: 'context',
});

export const knmModule = createMcqModule({
  badge: 'KNM',
  subtitle: 'What is the right action in the Netherlands?',
  promptMode: 'context',
});

export const dialogueReplyModule = createMcqModule({
  badge: 'Gesprek',
  subtitle: 'Pick the best reply',
  promptMode: 'default',
});

export const fillBlankModule = createMcqModule({
  badge: 'Invuloefening',
  subtitle: 'Choose the missing word',
  promptMode: 'default',
});

export const verbFormModule = createMcqModule({
  badge: 'Werkwoord',
  subtitle: 'Choose the correct verb form',
  promptMode: 'default',
});

export const prepositionModule = createMcqModule({
  badge: 'Voorzetsel',
  subtitle: 'Choose the correct preposition',
  promptMode: 'default',
});

export const numberDetailModule = createMcqModule({
  badge: 'Detail',
  subtitle: 'Choose the correct answer',
  promptMode: 'context',
});
