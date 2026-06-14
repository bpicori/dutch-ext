const KEY_GLOBAL = 'global';
const KEY_PROGRESS = 'progress';

export async function loadGlobal() {
  const data = await chrome.storage.local.get(KEY_GLOBAL);
  return data[KEY_GLOBAL] || { xpTotal: 0, streakDays: 0, lastCompletedTimestamp: 0 };
}

export async function saveGlobal(global) {
  await chrome.storage.local.set({ [KEY_GLOBAL]: global });
}

export async function loadProgress() {
  const data = await chrome.storage.local.get(KEY_PROGRESS);
  return data[KEY_PROGRESS] || {};
}

export async function saveProgress(progress) {
  await chrome.storage.local.set({ [KEY_PROGRESS]: progress });
}
