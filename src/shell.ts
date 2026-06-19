import { kbdChip } from './ui/primitives.js';

export function renderAppShell(): string {
  return `
    <div class="glow-overlay"></div>
    <header class="fixed top-0 left-0 w-full z-50 flex items-center px-container-padding py-md bg-transparent">
      <div class="flex items-center gap-xs type-display-sentence text-on-surface">
        <span class="material-symbols-outlined text-primary-container" style="font-variation-settings: 'FILL' 1;">local_florist</span>
        <span class="font-bold tracking-tight">WachtNederlands</span>
      </div>
    </header>
    <main class="relative z-10 min-h-screen flex items-center justify-center px-container-padding">
      <div id="challenge-area" class="w-full max-w-challenge flex flex-col items-center"></div>
    </main>
  `;
}

export function mountAppShell(): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = renderAppShell();
}

export function renderDebugEmptyState(): string {
  return `
    <div id="challenge-wrapper" class="challenge-shell">
      <div class="glass-card w-full p-lg rounded-lg flex flex-col gap-lg items-center text-center">
        <span class="material-symbols-outlined text-on-surface-variant opacity-60" style="font-size: 40px">search_off</span>
        <p class="type-body-md text-on-surface">No challenges found for the selected debug type.</p>
        <p class="type-label-sm text-on-surface-variant">Pick another type in the debug panel.</p>
      </div>
    </div>`;
}

export function mountContinueHint(area: HTMLElement): void {
  const hint = document.createElement('div');
  hint.id = 'continue-hint';
  hint.className =
    'mt-xl flex justify-center items-center gap-sm type-label-sm text-on-surface-variant opacity-60';
  hint.innerHTML = `${kbdChip('Enter')}<span>or click outside</span><span>Next challenge</span>`;
  area.appendChild(hint);
}