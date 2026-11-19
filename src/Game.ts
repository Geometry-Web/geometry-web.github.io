// The Game application: wires the engine, physics runtime, renderer and UI
// together and manages the high-level screens (menu, play, editor, settings).

import { type Renderer, rgba, type Color } from './engine/Renderer';
import { Camera } from './engine/Camera';
import { InputManager, type InputFrame, type InputAction } from './engine/InputManager';
import { GameLoop } from './engine/GameLoop';
import { AudioEngine } from './audio/AudioEngine';
import { Storage } from './storage/Storage';
import { PerformanceMonitor } from './debug/PerformanceMonitor';
import { LevelRuntime } from './gameplay/LevelRuntime';
import { type LevelData, type LevelObject, validateLevel } from './levels/Level';
import { builtinLevels } from './levels/builtinLevels';
import { GameMode, ObjId, BLOCK } from './gameplay/GameModes';
import { h, button, clear } from './ui/dom';
import { Editor } from './editor/Editor';
import { ApiClient } from './online/ApiClient';
import { OnlineScreen } from './ui/OnlineScreen';

const C = {
  bg: rgba(0.05, 0.05, 0.14),
  grid: rgba(0.5, 0.65, 1.0, 0.05),
  ground: rgba(0.12, 0.14, 0.28),
  groundLine: rgba(0.5, 0.8, 1.0, 0.9),
  block: rgba(0.92, 0.95, 1.0),
  blockEdge: rgba(0.35, 0.6, 1.0),
  spike: rgba(0.95, 0.97, 1.0),
  yellow: rgba(1.0, 0.82, 0.2),
  pink: rgba(1.0, 0.42, 0.72),
  blue: rgba(0.4, 0.7, 1.0),
  green: rgba(0.45, 1.0, 0.55),
  coin: rgba(1.0, 0.85, 0.25),
};

function modeColor(mode: GameMode): Color {
  switch (mode) {
    case GameMode.Cube: return rgba(0.35, 0.9, 1.0);
    case GameMode.Ship: return rgba(1.0, 0.35, 0.85);
    case GameMode.Ball: return rgba(1.0, 0.6, 0.2);
    case GameMode.UFO: return rgba(0.4, 1.0, 0.55);
    case GameMode.Wave: return rgba(0.7, 0.45, 1.0);
    case GameMode.Robot: return rgba(1.0, 0.42, 0.42);
    case GameMode.Spider: return rgba(0.4, 0.9, 0.9);
    case GameMode.Swing: return rgba(1.0, 0.85, 0.3);
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: Color;
}

type Screen = 'menu' | 'playing' | 'paused' | 'editor' | 'levelselect' | 'settings' | 'online';

export class Game {
  private camera = new Camera();
  private loop: GameLoop;
  private screen: Screen = 'menu';
  private runtime: LevelRuntime | null = null;
  private level: LevelData | null = null;
  private editor: Editor | null = null;
  private api = new ApiClient();
  private onlineScreen: OnlineScreen | null = null;
  private uiRoot: HTMLElement;
  private screens = new Map<Screen, HTMLElement>();
  private hudEl: HTMLElement;
  private progressFill: HTMLElement;
  private pctEl: HTMLElement;
  private attemptsEl: HTMLElement;
  private deathOverlay: HTMLElement;
  private completeOverlay: HTMLElement;
  private noticeEl: HTMLElement;

  private particles: Particle[] = [];
  private trail: { x: number; y: number; life: number }[] = [];
  private deathTimer = 0;
  private currentInput: InputFrame = { pressed: false, held: false };
  private practiceMode = false;

  constructor(
    private renderer: Renderer,
    private input: InputManager,
    private audio: AudioEngine,
    private storage: Storage,
    private monitor: PerformanceMonitor,
    private canvas: HTMLCanvasElement,
  ) {
    this.loop = new GameLoop({
      onUpdate: (dt) => {
        const t0 = performance.now();
        this.step(dt, this.currentInput);
        this.monitor.physicsMs = performance.now() - t0;
      },
      onRender: (alpha) => {
        this.monitor.beginFrame();
        const t0 = performance.now();
        this.render(alpha);
        this.monitor.renderMs = performance.now() - t0;
        this.monitor.endFrame();
        this.currentInput = this.input.poll();
        this.handleActions();
      },
    });

    this.uiRoot = h('div', { class: 'ui-layer' });
    document.body.appendChild(this.uiRoot);

    const hud = h('div', { class: 'hud' });
    this.progressFill = h('div', { class: 'progress-fill' });
    this.pctEl = h('div', { class: 'pct' }, '0%');
    this.attemptsEl = h('div', { class: 'attempts' }, '');
    hud.append(
      h('div', { class: 'progress-track' }, this.progressFill),
      this.pctEl,
      this.attemptsEl,
      button('⏸', () => this.togglePause(), 'small'),
    );
    this.hudEl = hud;
    this.uiRoot.appendChild(hud);

    this.deathOverlay = h('div', { class: 'screen overlay', style: 'display:none; background:transparent' },
      h('div', { class: 'dead-text' }, 'CRASH!'),
      h('div', { style: 'color:#8aa0b8; letter-spacing:2px' }, 'tap to retry'),
    );
    this.completeOverlay = h('div', { class: 'screen overlay', style: 'display:none; background:transparent' },
      h('div', { class: 'complete-text' }, 'LEVEL COMPLETE!'),
      h('div', { style: 'color:#8aa0b8; letter-spacing:2px' }, ''),
    );
    this.noticeEl = h('div', { class: 'notice', style: 'display:none' });
    this.uiRoot.append(this.deathOverlay, this.completeOverlay, this.noticeEl);

    this.buildScreens();
    this.setScreen('menu');
  }

  start(): void {
    this.input.attach();
    this.loop.start();
    document.addEventListener('visibilitychange', () => {
      this.loop.onVisibilityChange(!document.hidden);
    });
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.audio.unlock();
    this.audio.startMusic();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.renderer.resize(w, h, dpr);
    // Fit a 960x540 logical view into the window, preserving aspect via zoom.
    const scale = Math.min(w / 960, h / 540);
    this.camera.viewW = w;
    this.camera.viewH = h;
    this.camera.zoom = scale;
  }

  private setScreen(s: Screen): void {
    this.screen = s;
    for (const [name, el] of this.screens) el.classList.toggle('hidden', name !== s);
    this.hudEl.style.display = s === 'playing' || s === 'paused' ? '' : 'none';
  }

  private noticeTimer = 0;

  private buildScreens(): void {
    const menu = h('div', { class: 'screen' },
      h('div', { class: 'logo' }, 'GEOMETRY DASH'),
      h('div', { class: 'subtitle' }, 'Recreation'),
      h('div', { class: 'menu-col' },
        button('▶  PLAY', () => void this.openLevelSelect()),
        button('🛠  LEVEL EDITOR', () => this.startEditor()),
        button('⚙  SETTINGS', () => this.setScreen('settings')),
        button('🌐  ONLINE LEVELS', () => this.openOnline()),
      ),
    );
    this.screens.set('menu', menu);

    const ls = h('div', { class: 'screen' },
      h('div', { class: 'logo', style: 'font-size:40px' }, 'SELECT LEVEL'),
      h('div', { class: 'menu-col', id: 'level-list' }),
      button('← BACK', () => this.setScreen('menu'), 'danger'),
    );
    this.screens.set('levelselect', ls);

    this.screens.set('settings', this.buildSettings());

    const paused = h('div', { class: 'screen' },
      h('div', { class: 'logo', style: 'font-size:44px' }, 'PAUSED'),
      h('div', { class: 'menu-col' },
        button('RESUME', () => this.resume()),
        button('RESTART', () => this.restart()),
        button('PRACTICE MODE', () => this.togglePractice()),
        button('EXIT TO MENU', () => this.exitToMenu(), 'danger'),
      ),
      this.buildVolumePanel(),
    );
    this.screens.set('paused', paused);

    const editorScreen = h('div', { class: 'screen', style: 'background:transparent; justify-content:flex-end' });
    this.screens.set('editor', editorScreen);

    for (const el of this.screens.values()) this.uiRoot.appendChild(el);
  }

  private buildSettings(): HTMLElement {
    const music = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(this.audio.musicVolume) });
    const sfx = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(this.audio.sfxVolume) });
    music.addEventListener('input', () => this.audio.setMusicVolume(parseFloat(music.value)));
    sfx.addEventListener('input', () => this.audio.setSfxVolume(parseFloat(sfx.value)));

    return h('div', { class: 'screen' },
      h('div', { class: 'logo', style: 'font-size:40px' }, 'SETTINGS'),
      h('div', { class: 'panel' },
        h('div', { class: 'row' }, h('label', {}, 'Music volume'), music),
        h('div', { class: 'row' }, h('label', {}, 'SFX volume'), sfx),
        button('FULLSCREEN', () => this.toggleFullscreen()),
        button('← BACK', () => this.setScreen('menu'), 'danger'),
      ),
    );
  }

  private buildVolumePanel(): HTMLElement {
    const music = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(this.audio.musicVolume) });
    const sfx = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(this.audio.sfxVolume) });
    music.addEventListener('input', () => this.audio.setMusicVolume(parseFloat(music.value)));
    sfx.addEventListener('input', () => this.audio.setSfxVolume(parseFloat(sfx.value)));
    return h('div', { class: 'panel' },
      h('div', { class: 'row' }, h('label', {}, 'Music'), music),
      h('div', { class: 'row' }, h('label', {}, 'SFX'), sfx),
    );
  }

  private async openLevelSelect(): Promise<void> {
    this.setScreen('levelselect');
    const list = this.uiRoot.querySelector('#level-list') as HTMLElement;
    if (!list) return;
    clear(list);
    const levels: LevelData[] = [...builtinLevels()];
    try {
      const local = await this.storage.listLevels();
      for (const l of local) levels.push(l);
    } catch {
      // IndexedDB unavailable — built-ins still work.
    }
    for (const l of levels) {
      list.appendChild(button(`${l.name}  ·  ${l.objects.length} objects`, () => this.playLevel(l)));
    }
  }

  private playLevel(level: LevelData): void {
    this.level = level;
    this.runtime = new LevelRuntime(level);
    this.runtime.practiceMode = this.practiceMode;
    this.particles = [];
    this.trail = [];
    this.deathOverlay.style.display = 'none';
    this.completeOverlay.style.display = 'none';
    this.camera.snapTo(this.runtime.player.x, this.runtime.player.y);
    this.setScreen('playing');
    this.audio.unlock();
  }

  private togglePause(): void {
    if (this.screen === 'playing') this.pause();
    else if (this.screen === 'paused') this.resume();
  }

  private pause(): void {
    this.setScreen('paused');
  }

  private resume(): void {
    this.setScreen('playing');
    this.audio.unlock();
  }

  private restart(): void {
    if (this.runtime) this.runtime.reset();
    this.particles = [];
    this.trail = [];
    this.deathOverlay.style.display = 'none';
    this.completeOverlay.style.display = 'none';
    this.setScreen('playing');
  }

  private togglePractice(): void {
    this.practiceMode = !this.practiceMode;
    if (this.runtime) this.runtime.practiceMode = this.practiceMode;
    this.showNotice(this.practiceMode ? 'Practice mode ON  (Z = checkpoint)' : 'Practice mode OFF');
  }

  private exitToMenu(): void {
    this.setScreen('menu');
    this.deathOverlay.style.display = 'none';
    this.completeOverlay.style.display = 'none';
    this.runtime = null;
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }

  private showNotice(msg: string): void {
    this.noticeEl.textContent = msg;
    this.noticeEl.style.display = '';
    this.noticeTimer = 2.5;
  }

  private handleActions(): void {
    let a: InputAction | null;
    while ((a = this.input.nextAction()) !== null) {
      switch (a) {
        case 'pause': this.togglePause(); break;
        case 'restart': if (this.screen === 'playing' || this.screen === 'paused') this.restart(); break;
        case 'practice': this.togglePractice(); break;
        case 'delete': this.editor?.deleteSelected(); break;
      }
    }
  }

  private step(dt: number, input: InputFrame): void {
    if (this.noticeTimer > 0) {
      this.noticeTimer -= dt;
      if (this.noticeTimer <= 0) this.noticeEl.style.display = 'none';
    }

    if (this.screen === 'menu' || this.screen === 'levelselect' || this.screen === 'settings') {
      this.camera.cx += 60 * dt; // animated menu background
      return;
    }
    if (this.screen !== 'playing' || !this.runtime) return;

    const rt = this.runtime;
    if (rt.dead) {
      this.deathTimer -= dt;
      this.updateParticles(dt);
      if (this.deathTimer <= 0) {
        if (this.practiceMode && rt.checkpointCount > 0) {
          rt.respawnAtCheckpoint();
        } else {
          rt.reset();
        }
        this.deathOverlay.style.display = 'none';
      }
      return;
    }
    if (rt.completed) {
      this.updateParticles(dt);
      return;
    }

    const events = rt.step(dt, input);
    this.camera.update(rt.player.x, rt.player.y, dt);
    if (events.died) this.onDeath();
    else if (events.completed) this.onComplete();
    if (events.orbHit) this.audio.playOrb();
    if (events.padHit) this.audio.playPad();
    if (events.portalHit) this.audio.playPortal();
    if (events.coinCollected) this.audio.playCoin();
    this.pushTrail(rt.player.x, rt.player.y);
    this.updateParticles(dt);
  }

  private onDeath(): void {
    const rt = this.runtime!;
    this.audio.playDeath();
    this.spawnParticles(rt.player.x, rt.player.y, modeColor(rt.player.mode), 30);
    this.deathTimer = 0.7;
    this.deathOverlay.style.display = '';
  }

  private onComplete(): void {
    const rt = this.runtime!;
    this.audio.playComplete();
    const info = this.completeOverlay.lastElementChild as HTMLElement | null;
    if (info) info.textContent = `${rt.attempts} attempts · ${rt.coinsCollected}/${rt.totalCoins} coins`;
    this.completeOverlay.style.display = '';
    const stats = this.storage.getSetting('stats', { completions: 0, attempts: 0, coins: 0 });
    stats.completions++;
    stats.attempts += rt.attempts;
    stats.coins += rt.coinsCollected;
    this.storage.setSetting('stats', stats);
  }

  private pushTrail(x: number, y: number): void {
    this.trail.push({ x, y, life: 0.25 });
    if (this.trail.length > 24) this.trail.shift();
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.vy -= 1800 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    for (const t of this.trail) t.life -= dt;
    this.particles = this.particles.filter((p) => p.life > 0);
    this.trail = this.trail.filter((t) => t.life > 0);
  }

  private spawnParticles(x: number, y: number, color: Color, count: number): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 3 + Math.random() * 6,
        color,
      });
    }
  }

  private updateHUD(): void {
    if (this.screen !== 'playing' && this.screen !== 'paused') return;
    if (!this.runtime) return;
    const p = this.runtime.progress;
    this.progressFill.style.width = (p * 100).toFixed(1) + '%';
    this.pctEl.textContent = Math.floor(p * 100) + '%';
    this.attemptsEl.textContent = `attempt ${this.runtime.attempts}`;
  }

  private startEditor(): void {
    if (!this.editor) {
      this.editor = new Editor(this.canvas, this.renderer, this.camera, this.storage, (level) => {
        this.editor?.deactivate();
        this.playLevel(level);
      }, () => {
        this.editor?.deactivate();
        this.setScreen('menu');
      });
      const screen = this.screens.get('editor');
      if (screen) screen.appendChild(this.editor.buildBar());
    }
    this.editor.activate();
    this.setScreen('editor');
  }

  private openOnline(): void {
    if (!this.onlineScreen) {
      this.onlineScreen = new OnlineScreen(
        this.api,
        (level) => {
          const problems = validateLevel(level);
          if (problems.length > 0) {
            this.showNotice('Invalid level received from server');
            return;
          }
          this.playLevel(level);
        },
        () => this.setScreen('menu'),
        () => this.publishableLevel(),
      );
      this.screens.set('online', this.onlineScreen.element);
      this.uiRoot.appendChild(this.onlineScreen.element);
    }
    this.onlineScreen.refresh();
    this.setScreen('online');
  }

  private publishableLevel(): LevelData {
    return this.level ?? builtinLevels()[0];
  }

  private lastVisibleCount = 0;

  private render(_alpha: number): void {
    const r = this.renderer;
    r.begin(this.camera, C.bg);
    this.drawBackground();
    if ((this.screen === 'playing' || this.screen === 'paused') && this.runtime && this.level) {
      this.drawObjects();
      this.drawTrail();
      this.drawPlayer();
      this.drawParticles();
      this.monitor.levelObjects = this.level.objects.length;
      this.monitor.visibleObjects = this.lastVisibleCount;
    } else if (this.screen === 'editor' && this.editor) {
      this.editor.render();
    }
    r.end();
    this.updateHUD();
  }

  private drawBackground(): void {
    const r = this.renderer;
    const cam = this.camera;
    const gridStep = 150;
    const left = cam.left - 200;
    const right = cam.right + 200;
    for (let x = Math.floor(left / gridStep) * gridStep; x <= right; x += gridStep) {
      r.fillRect(x, cam.cy, 2, cam.viewH * 2.5, C.grid);
    }
    const top = cam.cy + cam.viewH;
    const bottom = cam.cy - cam.viewH;
    for (let y = 0; y <= top; y += gridStep) r.fillRect(cam.cx, y, cam.viewW * 2.5, 1, C.grid);
    for (let y = -gridStep; y >= bottom; y -= gridStep) r.fillRect(cam.cx, y, cam.viewW * 2.5, 1, C.grid);
    const groundBottom = cam.cy - cam.viewH / 2 - 200;
    r.fillRect(cam.cx, (0 + groundBottom) / 2, cam.viewW * 3, 0 - groundBottom, C.ground);
    r.fillRect(cam.cx, 0, cam.viewW * 3, 4, C.groundLine);
  }

  private drawObjects(): void {
    const cam = this.camera;
    const left = cam.left - 60;
    const right = cam.right + 60;
    const top = cam.cy + cam.viewH / 2 + 60;
    const bottom = cam.cy - cam.viewH / 2 - 60;
    let visible = 0;
    for (const o of this.level!.objects) {
      if (o.x < left || o.x > right || o.y < bottom || o.y > top) continue;
      visible++;
      this.drawObject(o);
    }
    this.lastVisibleCount = visible;
  }

  private drawObject(o: LevelObject): void {
    const r = this.renderer;
    switch (o.id) {
      case ObjId.Block: {
        const s = (o.scale ?? 1) * BLOCK;
        r.fillRect(o.x, o.y, s, s, C.block, o.rotation ?? 0);
        r.strokeRect(o.x, o.y, s, s, C.blockEdge, 2);
        break;
      }
      case ObjId.Spike:
        r.fillTriangle(o.x, o.y, 30, 30, C.spike, o.rotation ?? 0);
        break;
      case ObjId.YellowOrb: r.fillCircle(o.x, o.y, 12, C.yellow); r.fillCircle(o.x, o.y, 5, rgba(1, 1, 1, 0.9)); break;
      case ObjId.PinkOrb: r.fillCircle(o.x, o.y, 12, C.pink); r.fillCircle(o.x, o.y, 5, rgba(1, 1, 1, 0.9)); break;
      case ObjId.BlueOrb: r.fillCircle(o.x, o.y, 12, C.blue); r.fillCircle(o.x, o.y, 5, rgba(1, 1, 1, 0.9)); break;
      case ObjId.YellowPad: r.fillRect(o.x, o.y, 30, 10, C.yellow); break;
      case ObjId.PinkPad: r.fillRect(o.x, o.y, 30, 10, C.pink); break;
      case ObjId.BluePad: r.fillRect(o.x, o.y, 30, 10, C.blue); break;
      case ObjId.CubePortal: this.drawPortal(o, C.green); break;
      case ObjId.ShipPortal: this.drawPortal(o, rgba(1, 0.35, 0.85)); break;
      case ObjId.BallPortal: this.drawPortal(o, rgba(1, 0.6, 0.2)); break;
      case ObjId.UfoPortal: this.drawPortal(o, C.green); break;
      case ObjId.WavePortal: this.drawPortal(o, rgba(0.7, 0.45, 1)); break;
      case ObjId.RobotPortal: this.drawPortal(o, rgba(1, 0.42, 0.42)); break;
      case ObjId.SpiderPortal: this.drawPortal(o, rgba(0.4, 0.9, 0.9)); break;
      case ObjId.SwingPortal: this.drawPortal(o, rgba(1, 0.85, 0.3)); break;
      case ObjId.GravityUp: this.drawPortal(o, C.blue); break;
      case ObjId.GravityDown: this.drawPortal(o, C.blue); break;
      case ObjId.SpeedSlow: this.drawPortal(o, rgba(0.5, 0.5, 0.9)); break;
      case ObjId.SpeedNormal: this.drawPortal(o, rgba(0.5, 0.9, 0.5)); break;
      case ObjId.SpeedFast: this.drawPortal(o, rgba(1, 0.7, 0.3)); break;
      case ObjId.SpeedFaster: this.drawPortal(o, rgba(1, 0.4, 0.3)); break;
      case ObjId.SpeedFastest: this.drawPortal(o, rgba(1, 0.2, 0.3)); break;
      case ObjId.Coin: r.fillCircle(o.x, o.y, 10, C.coin); r.strokeRect(o.x, o.y, 16, 16, rgba(1, 1, 1, 0.6), 1); break;
      case ObjId.StartPos: r.strokeRect(o.x, o.y, 30, 30, rgba(0.5, 1, 0.5, 0.6), 2); break;
      case ObjId.Finish: r.fillRect(o.x, o.y, 4, 800, rgba(1, 1, 1, 0.85)); break;
      case ObjId.Checkpoint: r.strokeRect(o.x, o.y, 40, 40, rgba(0.5, 1, 0.5, 0.6), 2); break;
    }
  }

  private drawPortal(o: LevelObject, color: Color): void {
    const r = this.renderer;
    r.fillRect(o.x, o.y, 30, 90, rgba(color.r, color.g, color.b, 0.22));
    r.strokeRect(o.x, o.y, 30, 90, color, 3);
    r.fillCircle(o.x, o.y, 8, color);
  }

  private drawTrail(): void {
    const r = this.renderer;
    for (const t of this.trail) {
      const k = t.life / 0.25;
      r.fillCircle(t.x, t.y, 8 * k, rgba(0.4, 0.9, 1, k * 0.35));
    }
  }

  private drawPlayer(): void {
    const rt = this.runtime;
    if (!rt || rt.dead) return;
    const p = rt.player;
    const r = this.renderer;
    const color = modeColor(p.mode);
    const x = p.x;
    const y = p.y;
    const s = p.size;
    switch (p.mode) {
      case GameMode.Cube:
        r.fillRect(x, y, s, s, color, p.rotation);
        r.strokeRect(x, y, s, s, rgba(1, 1, 1, 0.85), 2);
        break;
      case GameMode.Ship:
        r.fillRect(x, y, s, s * 0.6, color, p.rotation);
        r.fillTriangle(x + s * 0.4, y, s * 0.7, s * 0.6, rgba(1, 1, 1, 0.85), p.rotation);
        break;
      case GameMode.Ball:
        r.fillCircle(x, y, s / 2, color);
        r.strokeRect(x, y, s, s, rgba(1, 1, 1, 0.5), 2);
        break;
      case GameMode.UFO:
        r.fillRect(x, y, s, s * 0.55, color);
        r.fillCircle(x, y - s * 0.2, s * 0.38, rgba(0.9, 0.95, 1, 0.95));
        break;
      case GameMode.Wave:
        r.fillTriangle(x, y, s, s, color, p.rotation);
        break;
      case GameMode.Robot:
        r.fillRect(x, y, s, s, color, p.rotation);
        r.fillRect(x, y + s * 0.3, s * 0.7, s * 0.18, rgba(0, 0, 0, 0.5));
        break;
      case GameMode.Spider:
        r.fillCircle(x, y, s / 2, color);
        break;
      case GameMode.Swing:
        r.fillRect(x, y, s, s * 0.7, color, p.rotation);
        break;
    }
  }

  private drawParticles(): void {
    const r = this.renderer;
    for (const p of this.particles) {
      const a = p.life / p.maxLife;
      r.fillRect(p.x, p.y, p.size, p.size, rgba(p.color.r, p.color.g, p.color.b, a));
    }
    this.monitor.particleCount = this.particles.length;
  }
}
