import { StorageService } from './storage.js';
import { Orchestrator } from './orchestrator.js';

const storage = new StorageService();
const orchestrator = new Orchestrator(storage);

storage.init().then(() => orchestrator.start());
