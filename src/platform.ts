type ChromeApi = {
  storage: { local: chrome.storage.LocalStorageArea };
  runtime: { getURL: (path: string) => string };
};

function chromeApi(): ChromeApi | undefined {
  const c = (globalThis as { chrome?: ChromeApi }).chrome;
  if (!c?.storage?.local || typeof c.runtime?.getURL !== 'function') return undefined;
  return c;
}

export function isExtension(): boolean {
  return chromeApi() !== undefined;
}

export function assetUrl(path: string): string {
  const api = chromeApi();
  if (api) return api.runtime.getURL(path);
  const base = document.querySelector('base')?.href ?? '/';
  return new URL(path, base).toString();
}

export async function storageGet(keys: string[]): Promise<Record<string, unknown>> {
  const api = chromeApi();
  if (api) return api.storage.local.get(keys) as Promise<Record<string, unknown>>;

  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      result[key] = JSON.parse(raw) as unknown;
    } catch {
      continue;
    }
  }
  return result;
}

export async function storageSet(items: Record<string, unknown>): Promise<void> {
  const api = chromeApi();
  if (api) {
    await api.storage.local.set(items);
    return;
  }

  for (const [key, value] of Object.entries(items)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
