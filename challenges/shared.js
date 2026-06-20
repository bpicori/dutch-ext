let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext ||
            window.webkitAudioContext)();
    }
    return audioCtx;
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
export { escapeAttr, ignoreLink, kbdChip, kbdFooter, skipLink } from '../ui/primitives.js';
export function speak(text, lang = 'nl-NL') {
    if (!window.speechSynthesis)
        return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.75;
    window.speechSynthesis.speak(utterance);
}
export function normalizeAnswer(s) {
    return s
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:'"]/g, '')
        .replace(/\s+/g, ' ');
}
export function matchesAnswer(correctAnswer, answer, acceptableAnswers = []) {
    const normalized = normalizeAnswer(answer);
    return [correctAnswer, ...acceptableAnswers].some((candidate) => normalizeAnswer(candidate) === normalized);
}
export function highlightDiff(userAnswer, correctAnswer) {
    const userWords = userAnswer.trim().split(/\s+/);
    const correctWords = correctAnswer.trim().split(/\s+/);
    return correctWords
        .map((word, i) => {
        const u = userWords[i]?.toLowerCase().replace(/[.,!?]/g, '');
        const c = word.toLowerCase().replace(/[.,!?]/g, '');
        if (u === c)
            return word;
        return `<span class="text-success font-semibold underline decoration-success/30 decoration-2 underline-offset-4">${word}</span>`;
    })
        .join(' ');
}
export function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
export function playSuccess() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => tone(ctx, freq, now + i * 0.09, 0.12, 0.08));
}
export function playError() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    tone(ctx, 200, now, 0.15, 0.08);
    tone(ctx, 150, now + 0.12, 0.15, 0.06);
}
function applyCardGlow(card, correct, shake = false) {
    if (!card)
        return;
    if (correct) {
        card.classList.add('success-glow');
        playSuccess();
        return;
    }
    card.classList.add('error-glow');
    if (shake)
        card.classList.add('animate-shake');
    playError();
}
export function applyOrderResult(container, correctAnswer, correct) {
    const card = container.querySelector('#challenge');
    container.querySelectorAll('.order-item').forEach((el) => {
        const item = el;
        item.draggable = false;
        item.style.pointerEvents = 'none';
        item.classList.remove('cursor-grab');
    });
    const submitBtn = container.querySelector('#order-submit');
    if (submitBtn)
        submitBtn.disabled = true;
    applyCardGlow(card, correct, true);
    if (correct)
        return;
    const feedback = container.querySelector('#order-feedback');
    if (feedback) {
        feedback.innerHTML = `<p class="text-sm text-muted">Correct order: <span class="text-success font-editorial">${correctAnswer.split('|').join(' \u2192 ')}</span></p>`;
        feedback.classList.remove('hidden');
    }
}
export function applyWordOrderResult(container, correct) {
    const card = container.querySelector('#challenge');
    container.querySelectorAll('.word-pool-btn, #word-clear, #word-submit').forEach((el) => {
        el.style.pointerEvents = 'none';
        el.disabled = true;
    });
    applyCardGlow(card, correct, true);
}
export function applyMatchResult(container, matchPairs) {
    const allCorrect = matchPairs.every((c, i) => c === i);
    const card = container.querySelector('#challenge');
    applyCardGlow(card, allCorrect, true);
    const leftSel = '#read-match-left .match-left-btn';
    const rightSel = '#read-match-right .choice-btn';
    container.querySelectorAll(leftSel).forEach((btn, i) => {
        const el = btn;
        el.classList.add(matchPairs[i] === i ? 'border-success' : 'border-error');
    });
    container.querySelectorAll(rightSel).forEach((btn) => {
        const el = btn;
        const idx = parseInt(el.dataset.choice || '-1', 10);
        const speakerIdx = matchPairs.indexOf(idx);
        if (speakerIdx < 0)
            return;
        const ok = speakerIdx === idx;
        el.className = `choice-btn w-full text-center p-sm rounded-lg border ${ok ? 'choice-btn--correct' : 'choice-btn--wrong'}`;
    });
    container.querySelector('#match-lines').innerHTML = '';
}
export function bindChallengeSession(resolve, options = {}) {
    let answered = false;
    let ignoreCleanup = null;
    const cleanup = () => {
        document.removeEventListener('keydown', onKey);
        ignoreCleanup?.();
    };
    const done = (response) => {
        if (answered)
            return;
        answered = true;
        cleanup();
        resolve(response);
    };
    const onKey = (e) => {
        if (answered)
            return;
        if (e.key === 'Escape') {
            e.preventDefault();
            done({ kind: 'dismiss' });
            return;
        }
        if (e.key === ' ') {
            e.preventDefault();
            done({ kind: 'skip' });
            return;
        }
        if (e.key === 'Enter' && options.skipOnEnter) {
            e.preventDefault();
            done({ kind: 'skip' });
            return;
        }
        options.onKey?.(e);
    };
    document.addEventListener('keydown', onKey);
    // Bind ignore link (always rendered via challengeLayout for most types)
    const ignoreEl = document.querySelector('#ignore-link');
    if (ignoreEl) {
        const onIgnore = () => done({ kind: 'ignore' });
        ignoreEl.addEventListener('click', onIgnore);
        ignoreCleanup = () => ignoreEl.removeEventListener('click', onIgnore);
    }
    return { done, isAnswered: () => answered };
}
export function updateMatchLines(container, matchPairs) {
    const svg = container.querySelector('#match-lines');
    const card = container.querySelector('#challenge');
    if (!svg || !card)
        return;
    const cardRect = card.getBoundingClientRect();
    svg.setAttribute('width', String(card.clientWidth));
    svg.setAttribute('height', String(card.clientHeight));
    svg.innerHTML = '';
    matchPairs.forEach((choiceIdx, speakerIdx) => {
        if (choiceIdx === -1)
            return;
        const speakerBtn = container.querySelector(`[data-speaker="${speakerIdx}"]`);
        const choiceBtn = container.querySelector(`[data-choice="${choiceIdx}"]`);
        if (!speakerBtn || !choiceBtn)
            return;
        const sRect = speakerBtn.getBoundingClientRect();
        const cRect = choiceBtn.getBoundingClientRect();
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(sRect.right - cardRect.left));
        line.setAttribute('y1', String(sRect.top + sRect.height / 2 - cardRect.top));
        line.setAttribute('x2', String(cRect.left - cardRect.left));
        line.setAttribute('y2', String(cRect.top + cRect.height / 2 - cardRect.top));
        line.setAttribute('class', 'match-line');
        svg.appendChild(line);
    });
}
export function bindMcqPresent(container) {
    return new Promise((resolve) => {
        let answered = false;
        const cleanup = () => {
            document.removeEventListener('keydown', onKey);
            skipLink?.removeEventListener('click', onSkip);
            ignoreLink?.removeEventListener('click', onIgnore);
            buttons.forEach((btn) => btn.removeEventListener('click', onChoice));
            replayBtn?.removeEventListener('click', onReplay);
        };
        const done = (response) => {
            if (answered)
                return;
            answered = true;
            cleanup();
            resolve(response);
        };
        const onSkip = () => done({ kind: 'skip' });
        const onIgnore = () => done({ kind: 'ignore' });
        const onChoice = (e) => {
            const answer = e.currentTarget.dataset.answer;
            if (answer)
                done({ kind: 'answer', value: answer });
        };
        const onReplay = () => {
            const audio = container.dataset.promptAudio;
            if (audio)
                speak(audio);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                done({ kind: 'dismiss' });
                return;
            }
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                done({ kind: 'skip' });
                return;
            }
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= 3) {
                e.preventDefault();
                const btn = buttons[num - 1];
                const answer = btn?.dataset.answer;
                if (answer)
                    done({ kind: 'answer', value: answer });
            }
        };
        const skipLink = container.querySelector('#skip-link');
        const ignoreLink = container.querySelector('#ignore-link');
        const buttons = container.querySelectorAll('.choice-btn');
        const replayBtn = container.querySelector('#replay-audio');
        skipLink?.addEventListener('click', onSkip);
        ignoreLink?.addEventListener('click', onIgnore);
        buttons.forEach((btn) => btn.addEventListener('click', onChoice));
        replayBtn?.addEventListener('click', onReplay);
        document.addEventListener('keydown', onKey);
    });
}
export function applyChoiceResult(container, correctAnswer, userAnswer, correct) {
    const card = container.querySelector('#challenge');
    const buttons = container.querySelectorAll('.choice-btn');
    buttons.forEach((btn) => {
        const answer = btn.dataset.answer;
        const grid = btn.classList.contains('choice-btn--grid') ? ' choice-btn--grid' : '';
        if (answer === correctAnswer) {
            btn.className = `choice-btn choice-btn--correct${grid}`;
        }
        else if (answer === userAnswer) {
            btn.className = `choice-btn choice-btn--wrong${grid}`;
        }
        else {
            btn.className = `choice-btn choice-btn--muted${grid}`;
        }
    });
    applyCardGlow(card, correct);
}
