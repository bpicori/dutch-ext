import { StorageService } from './storage.js';
import { Orchestrator } from './orchestrator.js';
async function main() {
  const storage = new StorageService();
  await storage.init();
  new Orchestrator(storage).start();
}
void main().catch(console.error);
