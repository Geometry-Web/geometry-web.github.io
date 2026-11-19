// A fixed-timestep accumulator that decouples simulation from rendering.
// Rendering runs at the display refresh rate (requestAnimationFrame); physics
// runs at a constant dt, with an interpolation alpha exposed for rendering.

export class FixedStepper {
  /** Fixed physics timestep in seconds. */
  readonly dt: number;
  /** Maximum frame delta allowed (clamps browser tab suspension). */
  readonly maxDelta: number;
  /** Maximum fixed steps per rendered frame (drops backlog instead of spiraling). */
  readonly maxSteps: number;

  private accumulator = 0;
  private lastTime = -1;

  constructor(dt = 1 / 120, maxDelta = 0.25, maxSteps = 12) {
    this.dt = dt;
    this.maxDelta = maxDelta;
    this.maxSteps = maxSteps;
  }

  /**
   * Advance the clock. Returns the number of fixed steps to run this frame.
   * @param nowSeconds monotonic time in seconds.
   */
  advance(nowSeconds: number): number {
    if (this.lastTime < 0) {
      this.lastTime = nowSeconds;
      return 0;
    }
    let frame = nowSeconds - this.lastTime;
    this.lastTime = nowSeconds;
    if (frame < 0) frame = 0;
    if (frame > this.maxDelta) frame = this.maxDelta;

    this.accumulator += frame;

    let steps = 0;
    while (this.accumulator >= this.dt && steps < this.maxSteps) {
      this.accumulator -= this.dt;
      steps++;
    }
    if (steps === this.maxSteps) {
      // Too much backlog (e.g. after tab suspension): drop it rather than
      // simulating several seconds of gameplay in a burst.
      this.accumulator = 0;
    }
    return steps;
  }

  /** Interpolation factor in [0,1) for rendering between fixed steps. */
  get alpha(): number {
    return this.accumulator / this.dt;
  }

  /** Resets the clock (e.g. after a tab becomes visible again). */
  reset(nowSeconds: number): void {
    this.lastTime = nowSeconds;
    this.accumulator = 0;
  }
}
