import { StorageService } from './storage.js';
import { Renderer } from './renderer.js';
import { GameLoop } from './loop.js';

const storage = new StorageService();
const renderer = new Renderer();
const loop = new GameLoop(storage, renderer);
loop.start();
