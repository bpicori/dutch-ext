export const SPACING_MINUTES = [1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200];
export const DEFAULT_PROGRESS = {
    correct: 0,
    attempts: 0,
    intervalIndex: 0,
    dontShowUntil: 0,
};
export function pickNext(deck, progress, ignored = [], now = Date.now()) {
    const ignoredSet = ignored instanceof Set ? ignored : new Set(ignored);
    const active = deck.filter((ch) => !ignoredSet.has(ch.id));
    if (active.length === 0)
        return null;
    const eligible = active.filter((ch) => {
        const p = progress[ch.id];
        if (!p)
            return true;
        return p.dontShowUntil <= now;
    });
    if (eligible.length > 0) {
        return eligible[Math.floor(Math.random() * eligible.length)];
    }
    let best = active[0];
    let bestDue = progress[best.id]?.dontShowUntil ?? 0;
    for (let i = 1; i < active.length; i++) {
        const due = progress[active[i].id]?.dontShowUntil ?? 0;
        if (due < bestDue) {
            best = active[i];
            bestDue = due;
        }
    }
    return best;
}
export function advance(prev, correct, now = Date.now()) {
    if (correct) {
        const nextIndex = Math.min(prev.intervalIndex + 1, SPACING_MINUTES.length - 1);
        return {
            correct: prev.correct + 1,
            attempts: prev.attempts + 1,
            intervalIndex: nextIndex,
            dontShowUntil: now + SPACING_MINUTES[nextIndex] * 60 * 1000,
        };
    }
    return {
        correct: prev.correct,
        attempts: prev.attempts + 1,
        intervalIndex: 0,
        dontShowUntil: now + 5 * 60 * 1000,
    };
}
