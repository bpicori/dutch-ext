import { kbdChip } from './ui/primitives.js';
export function renderAppShell() {
    return `
    <div class="glow-overlay"></div>
    <header class="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-container-padding py-md">
      <div class="flex items-center gap-xs type-label-sm text-muted normal-case tracking-normal">
        <img src="icons/icon48.png" alt="" width="18" height="18" class="rounded-[4px]" />
        <span class="font-medium text-ink/80">TabTaal</span>
      </div>
      <button
        type="button"
        id="stats-btn"
        class="flex items-center gap-xs type-label-sm text-muted hover:text-ink normal-case tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-xs py-xs"
        aria-label="Statistics"
      >
        <span class="material-symbols-outlined" style="font-size: 18px">bar_chart</span>
        <span>Stats</span>
      </button>
    </header>
    <main class="relative z-10 min-h-screen flex items-center justify-center px-container-padding">
      <div id="challenge-area" class="w-full max-w-challenge flex flex-col items-center"></div>
    </main>
  `;
}
export function mountAppShell() {
    const app = document.getElementById('app');
    if (!app)
        return;
    app.innerHTML = renderAppShell();
}
export function renderDebugEmptyState() {
    return `
    <div id="challenge-wrapper" class="challenge-shell">
      <div class="flashcard p-lg flex flex-col gap-lg items-center text-center">
        <span class="material-symbols-outlined text-muted opacity-50" style="font-size: 36px">search_off</span>
        <p class="type-body-md text-ink">No challenges found for the selected debug type.</p>
        <p class="type-label-sm text-muted normal-case tracking-normal">Pick another type in the debug panel.</p>
      </div>
    </div>`;
}
export function mountContinueHint(area) {
    const hint = document.createElement('div');
    hint.id = 'continue-hint';
    hint.className =
        'mt-xl flex justify-center items-center gap-sm type-label-sm text-muted normal-case tracking-normal opacity-60';
    hint.innerHTML = `${kbdChip('Enter')}<span>or click outside</span><span>Next challenge</span>`;
    area.appendChild(hint);
}
