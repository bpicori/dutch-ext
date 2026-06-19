import { CHALLENGE_TYPES } from './challenges/index.js';
import { Challenge, ChallengeType } from './types.js';

const STORAGE_ENABLED = 'debug-enabled';
const STORAGE_TYPE = 'debug-type';

function formatTypeLabel(type: ChallengeType): string {
  return type.replace(/_/g, ' ');
}

export class DebugMode {
  enabled = sessionStorage.getItem(STORAGE_ENABLED) === '1';
  selectedType: ChallengeType | null = (sessionStorage.getItem(STORAGE_TYPE) as ChallengeType) || null;

  constructor(private getDeck: () => Challenge[]) {}

  mount(): void {
    document.addEventListener('keydown', this.onKey);
    if (this.enabled) this.renderPanel();
  }

  unmount(): void {
    document.removeEventListener('keydown', this.onKey);
    this.removePanel();
  }

  pickChallenge(deck: Challenge[]): Challenge | null {
    if (!this.enabled || !this.selectedType) return null;
    const matching = deck.filter((c) => c.type === this.selectedType);
    if (matching.length === 0) return null;
    return matching[Math.floor(Math.random() * matching.length)];
  }

  wantsTypeButEmpty(): boolean {
    if (!this.enabled || !this.selectedType) return false;
    return this.getDeck().filter((c) => c.type === this.selectedType).length === 0;
  }

  private onKey = (e: KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      this.toggle();
    }
  };

  private toggle(): void {
    this.enabled = !this.enabled;
    sessionStorage.setItem(STORAGE_ENABLED, this.enabled ? '1' : '0');
    if (this.enabled) {
      this.renderPanel();
    } else {
      this.selectedType = null;
      sessionStorage.removeItem(STORAGE_TYPE);
      this.removePanel();
    }
  }

  private persistType(type: ChallengeType | null): void {
    this.selectedType = type;
    if (type) sessionStorage.setItem(STORAGE_TYPE, type);
    else sessionStorage.removeItem(STORAGE_TYPE);
    this.updateCount();
  }

  private countForType(type: ChallengeType | null): number {
    if (!type) return 0;
    return this.getDeck().filter((c) => c.type === type).length;
  }

  private updateCount(): void {
    const countEl = document.getElementById('debug-count');
    if (!countEl) return;
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

  private renderPanel(): void {
    this.removePanel();

    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.className = 'fixed top-md right-container-padding z-[100] w-56';
    panel.innerHTML = `
      <div class="glass-card p-md rounded-lg flex flex-col gap-sm border border-primary-container/30">
        <div class="flex items-center justify-between">
          <span class="type-label-sm text-primary-container font-bold uppercase tracking-widest">Debug</span>
          <button type="button" id="debug-close" class="text-on-surface-variant hover:text-on-surface transition-colors material-symbols-outlined" style="font-size: 18px" aria-label="Close debug mode">close</button>
        </div>
        <label class="type-label-sm text-on-surface-variant" for="debug-type-select">Challenge type</label>
        <select id="debug-type-select" class="w-full p-sm rounded-DEFAULT border border-outline-variant bg-surface-container text-on-surface type-body-md text-sm focus:outline-none focus:border-primary-container focus-visible:ring-2 focus-visible:ring-primary-container">
          <option value="">— select —</option>
          ${CHALLENGE_TYPES.map(
            (type) =>
              `<option value="${type}" ${type === this.selectedType ? 'selected' : ''}>${formatTypeLabel(type)} (${this.countForType(type)})</option>`,
          ).join('')}
        </select>
        <p id="debug-count" class="type-label-sm text-on-surface-variant"></p>
        <p class="type-label-sm text-on-surface-variant opacity-60">⌘D to toggle</p>
      </div>`;

    document.body.appendChild(panel);

    panel.querySelector('#debug-close')?.addEventListener('click', () => this.toggle());
    panel.querySelector('#debug-type-select')?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.persistType(value ? (value as ChallengeType) : null);
    });

    this.updateCount();
  }

  private removePanel(): void {
    document.getElementById('debug-panel')?.remove();
  }
}