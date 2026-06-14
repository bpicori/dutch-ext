export function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4">
      <div id="challenge-area" class="flex items-center justify-center w-full">
      </div>
    </div>
  `;
}

function renderDeHet(challenge) {
  return `
    <div id="challenge" class="text-center animate-fade-in">
      <p class="text-5xl font-bold mb-10 text-gray-100">${challenge.prompt}</p>
      <div class="flex gap-5 justify-center">
        <button data-answer="de" class="choice-btn w-36 h-20
          bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 rounded-xl
          text-2xl font-bold transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500">
          DE
        </button>
        <button data-answer="het" class="choice-btn w-36 h-20
          bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 rounded-xl
          text-2xl font-bold transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500">
          HET
        </button>
      </div>
    </div>
  `;
}

function renderMultipleChoice(challenge) {
  const labels = ['1', '2', '3'];
  const choicesHtml = challenge.choices.map((choice, i) => `
    <button data-answer="${choice.replace(/"/g, '&quot;')}" data-index="${i}"
      class="choice-btn w-72 min-h-[3.5rem] px-5 py-3
        bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 rounded-xl
        text-lg transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500
        flex items-center gap-4 text-left">
      <span class="text-gray-600 text-sm w-5 shrink-0">${labels[i]}</span>
      <span class="text-gray-200">${choice}</span>
    </button>
  `).join('');

  const promptHtml = challenge.type === 'listen'
    ? '<div class="mb-4 text-gray-500 text-base">\uD83D\uDD0A Listen and pick the correct spelling</div>'
    : `<p class="text-4xl font-bold mb-10 text-gray-100">${challenge.prompt}</p>`;

  return `
    <div id="challenge" class="text-center animate-fade-in">
      ${promptHtml}
      <div class="flex flex-col gap-3 items-center">
        ${choicesHtml}
      </div>
    </div>
  `;
}

export function renderChallenge(challenge) {
  const area = document.getElementById('challenge-area');
  if (!area) return;

  if (challenge.type === 'de_het') {
    area.innerHTML = renderDeHet(challenge);
  } else {
    area.innerHTML = renderMultipleChoice(challenge);
  }
}

export function showResult(challenge, userAnswer) {
  const buttons = document.querySelectorAll('.choice-btn');
  const correctAnswer = challenge.correctAnswer;

  buttons.forEach(btn => {
    const answer = btn.dataset.answer;
    btn.disabled = true;

    if (answer === correctAnswer) {
      btn.classList.add('!bg-green-700', '!border-green-500', '!text-white');
    } else if (answer === userAnswer && answer !== correctAnswer) {
      btn.classList.add('!bg-red-700', '!border-red-500', '!text-white', 'animate-shake');
    } else {
      btn.classList.add('opacity-30');
    }
  });
}

export function clearChallenge() {
  const el = document.getElementById('challenge');
  if (el) el.remove();
}

export function dismissChallenge() {
  const el = document.getElementById('challenge');
  if (!el) return;

  el.classList.add('animate-slide-out');
  el.addEventListener('animationend', () => {
    el.remove();
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  });
}
