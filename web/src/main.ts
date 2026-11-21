// Application entry point: build the engine, then run the game.

import './style.css';
import { createRenderer } from './engine/createRenderer';
import { InputManager } from './engine/InputManager';
import { AudioEngine } from './audio/AudioEngine';
import { Storage } from './storage/Storage';
import { PerformanceMonitor } from './debug/PerformanceMonitor';
import { Game } from './Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = createRenderer(canvas);
const input = new InputManager();
const audio = new AudioEngine();
const storage = new Storage();
const monitor = new PerformanceMonitor();

const game = new Game(renderer, input, audio, storage, monitor, canvas);

// Unlock audio on the first user gesture.
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

game.start();

const loading = document.getElementById('loading');
if (loading) loading.remove();
