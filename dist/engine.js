const SPACING = [1, 10, 60, 360, 1440, 2880, 5760, 10080, 20160, 43200];

let deck = null;

export async function loadDeck() {
  const url = chrome.runtime.getURL('challenges.json');
  const res = await fetch(url);
  deck = await res.json();
  return deck;
}

export function getDeck() {
  return deck;
}

function groupByTier() {
  const map = {};
  for (const ch of deck) {
    if (!map[ch.tier]) map[ch.tier] = [];
    map[ch.tier].push(ch);
  }
  return map;
}

function maxTier() {
  return Math.max(...deck.map(ch => ch.tier));
}

export function getUnlockedTiers(progress) {
  const unlocked = [1];
  const tierMap = groupByTier();

  for (let tier = 2; tier <= maxTier(); tier++) {
    const prev = tierMap[tier - 1] || [];
    const allAttempted = prev.every(ch => {
      const p = progress[ch.id];
      return p && p.attempts > 0;
    });
    if (allAttempted) unlocked.push(tier);
  }

  return unlocked;
}

export function selectChallenge(progress) {
  const now = Date.now();
  const unlockedTiers = getUnlockedTiers(progress);

  const eligible = deck.filter(ch => {
    if (!unlockedTiers.includes(ch.tier)) return false;
    const p = progress[ch.id];
    if (!p) return true;
    return p.dontShowUntil <= now;
  });

  if (eligible.length === 0) {
    const allUnlocked = deck.filter(ch => unlockedTiers.includes(ch.tier));
    allUnlocked.sort((a, b) => {
      const da = (progress[a.id] && progress[a.id].dontShowUntil) || 0;
      const db = (progress[b.id] && progress[b.id].dontShowUntil) || 0;
      return da - db;
    });
    return allUnlocked[0] || null;
  }

  return eligible[Math.floor(Math.random() * eligible.length)];
}

export function evaluate(challenge, userAnswer, progress, global) {
  const correct = userAnswer === challenge.correctAnswer;
  const prev = progress[challenge.id] || { correct: 0, attempts: 0, consecutiveStreaks: 0, dontShowUntil: 0 };

  let next;
  if (correct) {
    const newStreaks = Math.min(prev.consecutiveStreaks + 1, SPACING.length - 1);
    next = {
      correct: prev.correct + 1,
      attempts: prev.attempts + 1,
      consecutiveStreaks: newStreaks,
      dontShowUntil: Date.now() + SPACING[newStreaks] * 60 * 1000,
    };
  } else {
    next = {
      correct: prev.correct,
      attempts: prev.attempts + 1,
      consecutiveStreaks: 0,
      dontShowUntil: Date.now() + 5 * 60 * 1000,
    };
  }

  const nextProgress = { ...progress, [challenge.id]: next };
  const nextGlobal = { ...global };

  if (correct) {
    nextGlobal.xpTotal += challenge.xpReward;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    const lastDate = new Date(global.lastCompletedTimestamp || 0);
    lastDate.setHours(0, 0, 0, 0);
    const lastDateStart = lastDate.getTime();

    if (lastDateStart === 0) {
      nextGlobal.streakDays = 1;
    } else if (todayStart - lastDateStart === 86400000) {
      nextGlobal.streakDays = (global.streakDays || 0) + 1;
    } else if (todayStart > lastDateStart) {
      nextGlobal.streakDays = 1;
    }

    nextGlobal.lastCompletedTimestamp = Date.now();
  }

  return { correct, nextProgress, nextGlobal };
}
