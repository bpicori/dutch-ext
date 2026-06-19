import { kbdChip } from './ui/primitives.js';

export function renderAppShell(): string {
  return `
    <div class="glow-overlay"></div>
    <header class="fixed top-0 left-0 w-full z-50 flex items-center px-container-padding py-md">
      <div class="flex items-center gap-xs type-label-sm text-muted normal-case tracking-normal">
        <span class="material-symbols-outlined text-accent-dim" style="font-variation-settings: 'FILL' 1; font-size: 18px">local_florist</span>
        <span class="font-medium text-ink/80">TabTaal</span>
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
      <div class="flashcard p-lg flex flex-col gap-lg items-center text-center">
        <span class="material-symbols-outlined text-muted opacity-50" style="font-size: 36px">search_off</span>
        <p class="type-body-md text-ink">No challenges found for the selected debug type.</p>
        <p class="type-label-sm text-muted normal-case tracking-normal">Pick another type in the debug panel.</p>
      </div>
    </div>`;
}

export function mountContinueHint(area: HTMLElement): void {
  const hint = document.createElement('div');
  hint.id = 'continue-hint';
  hint.className =
    'mt-xl flex justify-center items-center gap-sm type-label-sm text-muted normal-case tracking-normal opacity-60';
  hint.innerHTML = `${kbdChip('Enter')}<span>or click outside</span><span>Next challenge</span>`;
  area.appendChild(hint);
}