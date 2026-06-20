import { StorageService } from './storage.js';
import { getChallenge } from './challenges/index.js';
import { ChallengeModule, UserResponse } from './challenges/types.js';
import { DebugMode } from './debug.js';
import { StatsMode } from './stats.js';
import { mountAppShell, mountContinueHint, renderDebugEmptyState } from './shell.js';
import { Challenge, ChallengeProgress } from './types.js';
import { advance, DEFAULT_PROGRESS, pickNext } from './sm2.js';

type ContinueAction = 'continue' | 'dismiss';
type RoundOutcome = 'next' | 'exit';

function waitForContinue(challengeArea: HTMLElement): Promise<ContinueAction> {
  return new Promise((resolve) => {
    const cleanup = () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        resolve('dismiss');
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        resolve('continue');
      }
    };

    const onClick = (e: MouseEvent) => {
      if (challengeArea.contains(e.target as Node)) return;
      cleanup();
      resolve('continue');
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
  });
}

function gradeResponse(
  module: ChallengeModule,
  challenge: Challenge,
  response: UserResponse,
  priorProgress: ChallengeProgress,
): { answer: string; correct: boolean; nextProgress: ChallengeProgress } {
  if (response.kind !== 'answer') {
    return { answer: '', correct: false, nextProgress: advance(priorProgress, false) };
  }

  const correct = module.isCorrect(challenge, response.value);
  return {
    answer: response.value,
    correct,
    nextProgress: advance(priorProgress, correct),
  };
}

export class Orchestrator {
  private debug: DebugMode;
  private stats: StatsMode;

  constructor(private storage: StorageService) {
    this.debug = new DebugMode(
      () => this.storage.getDeck(),
      () => this.storage.getIgnored(),
      (id) => this.storage.ignore(id),
      (id) => this.storage.unignore(id),
    );
    this.stats = new StatsMode();
  }

  start(): void {
    mountAppShell();
    this.debug.mount();
    this.stats.mount(this.storage);
    void this.run();
  }

  private async run(): Promise<void> {
    const area = this.requireChallengeArea();
    while (true) {
      const outcome = await this.playRound(area);
      if (outcome === 'exit') return;
    }
  }

  private async playRound(area: HTMLElement): Promise<RoundOutcome> {
    const challenge = this.pickChallengeForRound();
    if (!challenge) return this.playEmptyDebugRound(area);
    return this.playChallengeRound(area, challenge);
  }

  private async playEmptyDebugRound(area: HTMLElement): Promise<RoundOutcome> {
    area.innerHTML = renderDebugEmptyState();
    return (await this.waitAndMaybeExit(area)) ? 'exit' : 'next';
  }

  private async playChallengeRound(area: HTMLElement, challenge: Challenge): Promise<RoundOutcome> {
    const module = getChallenge(challenge.type);
    const response = await module.present(area, challenge);

    if (response.kind === 'dismiss') {
      this.dismiss();
      return 'exit';
    }

    if (response.kind === 'ignore') {
      await this.storage.ignore(challenge.id);
      return 'next';
    }

    const priorProgress = this.storage.getProgress()[challenge.id] ?? DEFAULT_PROGRESS;
    const { answer, correct, nextProgress } = gradeResponse(
      module,
      challenge,
      response,
      priorProgress,
    );
    await this.storage.saveProgress(challenge.id, nextProgress);
    await this.storage.logReview(challenge.id, correct, nextProgress.intervalIndex);

    module.showResult(area, challenge, answer, correct);
    mountContinueHint(area);

    return (await this.waitAndMaybeExit(area)) ? 'exit' : 'next';
  }

  private async waitAndMaybeExit(area: HTMLElement): Promise<boolean> {
    if ((await waitForContinue(area)) === 'dismiss') {
      this.dismiss();
      return true;
    }
    return false;
  }

  private pickChallengeForRound(): Challenge | null {
    const deck = this.storage.getDeck();
    const ignored = this.storage.getIgnored();
    const debugChallenge = this.debug.pickChallenge(deck);
    if (debugChallenge && !this.storage.isIgnored(debugChallenge.id)) return debugChallenge;
    if (this.debug.wantsTypeButEmpty()) return null;
    return pickNext(deck, this.storage.getProgress(), ignored);
  }

  private requireChallengeArea(): HTMLElement {
    const area = document.getElementById('challenge-area');
    if (!area) throw new Error('challenge-area missing');
    return area;
  }

  private dismiss(): void {
    const el = document.getElementById('challenge-wrapper');
    if (!el) return;
    el.classList.add('animate-slide-out');
    el.addEventListener(
      'animationend',
      () => {
        el.remove();
        (document.activeElement as HTMLElement)?.blur?.();
      },
      { once: true },
    );
  }
}
