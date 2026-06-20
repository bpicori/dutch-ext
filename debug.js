import { CHALLENGE_TYPES } from './challenges/index.js';
const STORAGE_ENABLED = 'debug-enabled';
const STORAGE_TYPE = 'debug-type';
function formatTypeLabel(type) {
    return type.replace(/_/g, ' ');
}
export class DebugMode {
    constructor(getDeck) {
        this.getDeck = getDeck;
        this.enabled = sessionStorage.getItem(STORAGE_ENABLED) === '1';
        this.selectedType = sessionStorage.getItem(STORAGE_TYPE) || null;
        this.onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                this.toggle();
            }
        };
    }
    mount() {
        document.addEventListener('keydown', this.onKey);
        if (this.enabled)
            this.renderPanel();
    }
    unmount() {
        document.removeEventListener('keydown', this.onKey);
        this.removePanel();
    }
    pickChallenge(deck) {
        if (!this.enabled || !this.selectedType)
            return null;
        const matching = deck.filter((c) => c.type === this.selectedType);
        if (matching.length === 0)
            return null;
        return matching[Math.floor(Math.random() * matching.length)];
    }
    wantsTypeButEmpty() {
        if (!this.enabled || !this.selectedType)
            return false;
        return this.getDeck().filter((c) => c.type === this.selectedType).length === 0;
    }
    toggle() {
        this.enabled = !this.enabled;
        sessionStorage.setItem(STORAGE_ENABLED, this.enabled ? '1' : '0');
        if (this.enabled) {
            this.renderPanel();
        }
        else {
            this.selectedType = null;
            sessionStorage.removeItem(STORAGE_TYPE);
            this.removePanel();
        }
    }
    persistType(type) {
        this.selectedType = type;
        if (type)
            sessionStorage.setItem(STORAGE_TYPE, type);
        else
            sessionStorage.removeItem(STORAGE_TYPE);
        this.updateCount();
    }
    countForType(type) {
        if (!type)
            return 0;
        return this.getDeck().filter((c) => c.type === type).length;
    }
    updateCount() {
        const countEl = document.getElementById('debug-count');
        if (!countEl)
            return;
        const count = this.countForType(this.selectedType);
        if (!this.selectedType) {
            countEl.textContent = 'Pick a challenge type';
            return;
        }
        countEl.textContent =
            count === 0
                ? `No challenges for "${formatTypeLabel(this.selectedType)}"`
                : `${count} challenge${count === 1 ? '' : 's'} · random pick`;
    }
    renderPanel() {
        this.removePanel();
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.className = 'fixed top-md right-container-padding z-[100] w-56';
        panel.innerHTML = `
      <div class="flashcard p-md flex flex-col gap-sm border border-border">
        <div class="flex items-center justify-between">
          <span class="type-label-sm text-accent font-semibold normal-case tracking-wide">Debug</span>
          <button type="button" id="debug-close" class="text-muted hover:text-ink transition-colors material-symbols-outlined" style="font-size: 18px" aria-label="Close debug mode">close</button>
        </div>
        <label class="type-label-sm text-muted normal-case tracking-normal" for="debug-type-select">Challenge type</label>
        <select id="debug-type-select" class="w-full p-sm rounded-lg border border-border bg-card text-ink type-body-md text-sm focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent">
          <option value="">— select —</option>
          ${CHALLENGE_TYPES.map((type) => `<option value="${type}" ${type === this.selectedType ? 'selected' : ''}>${formatTypeLabel(type)} (${this.countForType(type)})</option>`).join('')}
        </select>
        <p id="debug-count" class="type-label-sm text-muted normal-case tracking-normal"></p>
        <p class="type-label-sm text-muted normal-case tracking-normal opacity-60">⌘D to toggle</p>
      </div>`;
        document.body.appendChild(panel);
        panel.querySelector('#debug-close')?.addEventListener('click', () => this.toggle());
        panel.querySelector('#debug-type-select')?.addEventListener('change', (e) => {
            const value = e.target.value;
            this.persistType(value ? value : null);
        });
        this.updateCount();
    }
    removePanel() {
        document.getElementById('debug-panel')?.remove();
    }
}
