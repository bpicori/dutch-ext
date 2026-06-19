import { Challenge } from '../types.js';
import { ChallengeModule } from './types.js';
import {
  badgePill,
  challengeLayout,
  choiceButton,
  contextBlock,
  kbdFooter,
} from '../ui/primitives.js';
import { applyChoiceResult, bindMcqPresent, matchesAnswer, shuffle, speak } from './shared.js';

export type McqPromptMode = 'default' | 'audio' | 'context';

export interface McqConfig {
  badge: string;
  subtitle: string;
  promptMode: McqPromptMode;
  promptClass?: string;
  audioDelayMs?: number;
}

const MCQ_KBD_FOOTER = kbdFooter([
  { key: '1', label: 'Choose' },
  { key: '2' },
  { key: '3' },
  { key: 'Space', label: 'Skip' },
]);

function buildPrompt(challenge: Challenge, config: McqConfig): string {
  const { subtitle, promptMode } = config;

  if (promptMode === 'audio') {
    return `<div class="text-center py-md w-full">
      <button type="button" id="replay-audio" class="mb-sm material-symbols-outlined text-primary-container text-3xl hover:opacity-80 transition-opacity">volume_up</button>
      <h1 class="type-display-sentence text-primary">${challenge.prompt}</h1>
      <p class="text-on-surface-variant type-label-sm mt-xs opacity-60">${subtitle}</p></div>`;
  }

  if (promptMode === 'context' && challenge.context) {
    return `<div class="w-full">
      ${contextBlock(challenge.context)}
      <h1 class="type-body-lg text-on-surface text-center mt-md">${challenge.prompt}</h1>
      <p class="text-on-surface-variant type-label-sm mt-xs opacity-60 text-center">${subtitle}</p></div>`;
  }

  const promptClass = config.promptClass ? ` ${config.promptClass}` : '';
  return `<div class="text-center py-md">
    <h1 class="type-display-word text-primary${promptClass}">${challenge.prompt}</h1>
    <p class="text-on-surface-variant type-label-sm mt-xs opacity-60">${subtitle}</p></div>`;
}

function buildHtml(challenge: Challenge, choices: string[], config: McqConfig): string {
  const choicesHtml = choices.map((choice, i) => choiceButton(choice, choice, i)).join('');
  const cardBody = `${badgePill(config.badge)}${buildPrompt(challenge, config)}
    <div class="w-full flex flex-col gap-sm">${choicesHtml}</div>`;

  return challengeLayout(cardBody, MCQ_KBD_FOOTER);
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