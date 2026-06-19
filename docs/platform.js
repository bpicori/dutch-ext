function chromeApi() {
  const c = globalThis.chrome;
  if (!c?.storage?.local || typeof c.runtime?.getURL !== 'function') return undefined;
  return c;
}
export function isExtension() {
  return chromeApi() !== undefined;
}
export function assetUrl(path) {
  const api = chromeApi();
  if (api) return api.runtime.getURL(path);
  const base = document.querySelector('base')?.href ?? '/';
  return new URL(path, base).toString();
}
export async function storageGet(keys) {
  const api = chromeApi();
  if (api) return api.storage.local.get(keys);
  const result = {};
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      result[key] = JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return result;
}
export async function storageSet(items) {
  const api = chromeApi();
  if (api) {
    await api.storage.local.set(items);
    return;
  }
  for (const [key, value] of Object.entries(items)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
