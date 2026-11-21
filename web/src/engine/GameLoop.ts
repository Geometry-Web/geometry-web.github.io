// The main game loop: requestAnimationFrame + fixed-step accumulator.
// Simulation runs at a fixed dt; rendering runs at the display refresh rate.

import { FixedStepper } from '../physics/FixedStepper';

export interface GameLoopCallbacks {
  /** Called once per fixed physics step with the fixed dt. */
  onUpdate(dt: number): void;
  /** Called once per rendered frame with the interpolation factor [0,1). */
  onRender(alpha: number): void;
}

export class GameLoop {
  private raf = 0;
  private running = false;
  private stepper = new FixedStepper(1 / 120, 0.25, 12);

  constructor(private cb: GameLoopCallbacks) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.stepper.reset(now());
    const loop = (t: number) => {
      if (!this.running) return;
      const sec = t / 1000;
      const steps = this.stepper.advance(sec);
      for (let i = 0; i < steps; i++) this.cb.onUpdate(this.stepper.dt);
      this.cb.onRender(this.stepper.alpha);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  /** Call when the tab becomes hidden/visible to avoid a physics burst. */
  onVisibilityChange(visible: boolean): void {
    if (visible) this.stepper.reset(now());
  }
}

function now(): number {
  return performance.now() / 1000;
}
