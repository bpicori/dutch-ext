import { challengeLabel, challengeLayout, dutchPromptWord, kbdFooter } from '../ui/primitives.js';
import { applyChoiceResult, bindChallengeSession, normalizeAnswer } from './shared.js';
function buildHtml(challenge) {
  const cardBody = `${challengeLabel('DE / HET')}
    <div class="prompt-area">
      ${dutchPromptWord(challenge.prompt, 'lowercase')}
    </div>
    <div class="w-full grid grid-cols-2 gap-md">
      <button data-answer="de" type="button" class="choice-btn choice-btn--grid btn-active group">
        <span class="type-headline-md text-ink group-hover:text-accent transition-colors">DE</span>
      </button>
      <button data-answer="het" type="button" class="choice-btn choice-btn--grid btn-active group">
        <span class="type-headline-md text-ink group-hover:text-accent transition-colors">HET</span>
      </button>
    </div>`;
  const footer = kbdFooter([
    { key: '\u2190', label: 'DE' },
    { key: '\u2192', label: 'HET' },
    { key: 'Space', label: 'Skip' },
  ]);
  return challengeLayout(cardBody, footer);
}
function present(container, challenge) {
  container.innerHTML = buildHtml(challenge);
  return new Promise((resolve) => {
    const { done } = bindChallengeSession(resolve, {
      skipOnEnter: true,
      onKey(e) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          done({ kind: 'answer', value: 'de' });
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          done({ kind: 'answer', value: 'het' });
        }
      },
    });
    const onChoice = (e) => {
      const answer = e.currentTarget.dataset.answer;
      if (answer) done({ kind: 'answer', value: answer });
    };
    container.querySelector('#skip-link')?.addEventListener('click', () => done({ kind: 'skip' }));
    container
      .querySelectorAll('.choice-btn')
      .forEach((btn) => btn.addEventListener('click', onChoice));
  });
}
function showResult(container, challenge, userAnswer, correct) {
  applyChoiceResult(container, challenge.correctAnswer, userAnswer, correct);
}
function isCorrect(challenge, answer) {
  return normalizeAnswer(answer) === normalizeAnswer(challenge.correctAnswer);
}
export const deHetModule = {
  present,
  showResult,
  isCorrect,
};
