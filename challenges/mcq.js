import { challengeLabel, challengeLayout, choiceButton, contextBlock, dutchPromptSentence, dutchPromptWord, kbdFooter, promptArea, promptSubtitle, } from '../ui/primitives.js';
import { applyChoiceResult, bindMcqPresent, matchesAnswer, shuffle, speak } from './shared.js';
const MCQ_KBD_FOOTER = kbdFooter([
    { key: '1', label: 'Choose' },
    { key: '2' },
    { key: '3' },
    { key: 'Space', label: 'Skip' },
]);
function buildPrompt(challenge, config) {
    const { subtitle, promptMode } = config;
    if (promptMode === 'audio') {
        return promptArea(`
      <button type="button" id="replay-audio" class="mb-sm material-symbols-outlined text-accent text-3xl hover:opacity-80 transition-opacity">volume_up</button>
      ${dutchPromptSentence(challenge.prompt)}
      ${promptSubtitle(subtitle)}`);
    }
    if (promptMode === 'context' && challenge.context) {
        return `<div class="w-full">
      ${contextBlock(challenge.context)}
      <div class="prompt-area mt-md">${dutchPromptSentence(challenge.prompt)}${promptSubtitle(subtitle)}</div></div>`;
    }
    const extraClass = config.promptClass ?? '';
    return promptArea(`${dutchPromptWord(challenge.prompt, extraClass)}${promptSubtitle(subtitle)}`);
}
function buildHtml(challenge, choices, config) {
    const choicesHtml = choices.map((choice, i) => choiceButton(choice, choice, i)).join('');
    const cardBody = `${challengeLabel(config.badge)}${buildPrompt(challenge, config)}
    <div class="w-full flex flex-col gap-sm">${choicesHtml}</div>`;
    return challengeLayout(cardBody, MCQ_KBD_FOOTER);
}
export function createMcqModule(config) {
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
                const play = () => speak(challenge.promptAudio);
                if (config.audioDelayMs)
                    setTimeout(play, config.audioDelayMs);
                else
                    play();
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
