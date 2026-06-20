export function assetUrl(path: string): string {
  return chrome.runtime.getURL(path);
}

export async function storageGet(keys: string[]): Promise<Record<string, unknown>> {
  return chrome.storage.local.get(keys) as Promise<Record<string, unknown>>;
}

export async function storageSet(items: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set(items);
}
