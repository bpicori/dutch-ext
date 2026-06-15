import { StorageService } from './storage.js';
import { Renderer } from './renderer.js';
import { Orchestrator, DEFAULT_PROGRESS } from './orchestrator.js';

const storage = new StorageService();
const renderer = new Renderer();
const orchestrator = new Orchestrator();

storage.init().then(() => {
  renderer.renderShell();
  run();
});

function run(): void {
  const challenge = orchestrator.getNextChallenge(storage.getDeck(), storage.getProgress());
  if (!challenge) return;

  const progress = storage.getProgress();
  renderer.show(
    challenge,
    {
      global: storage.getGlobal(),
      cardProgress: progress[challenge.id] ?? DEFAULT_PROGRESS,
      deck: storage.getDeck(),
    },
    (answer) => {
      const prev = progress[challenge.id] ?? DEFAULT_PROGRESS;
      const result = orchestrator.evaluate(challenge, answer, prev, storage.getGlobal());
      storage.updateProgress(challenge.id, result.progress);
      storage.updateGlobal(result.global);
      storage.persist();
      renderer.showResult(challenge, answer, result.correct, () => run());
    },
    () => {
      renderer.dismiss();
    },
  );
}
