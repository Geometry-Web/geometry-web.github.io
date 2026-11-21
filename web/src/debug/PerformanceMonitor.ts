// Frame-time / performance metrics for the debug overlay.

export interface PerfSnapshot {
  fps: number;
  frameMs: number;
  avgMs: number;
  worstMs: number;
  renderMs: number;
  physicsMs: number;
  drawCalls: number;
  visibleObjects: number;
  levelObjects: number;
  particleCount: number;
  textureBytes: number;
}

export class PerformanceMonitor {
  fps = 0;
  frameMs = 0;
  avgMs = 0;
  worstMs = 0;
  renderMs = 0;
  physicsMs = 0;
  drawCalls = 0;
  visibleObjects = 0;
  levelObjects = 0;
  particleCount = 0;
  textureBytes = 0;

  private frames: number[] = [];
  private startTime = 0;

  beginFrame(): number {
    this.startTime = performance.now();
    return this.startTime;
  }

  endFrame(): void {
    const end = performance.now();
    this.frameMs = end - this.startTime;
    this.frames.push(this.frameMs);
    if (this.frames.length > 240) this.frames.shift();
    if (this.frames.length) {
      const sum = this.frames.reduce((a, b) => a + b, 0);
      this.avgMs = sum / this.frames.length;
      this.worstMs = Math.max(...this.frames);
      this.fps = 1000 / this.avgMs;
    }
  }

  snapshot(): PerfSnapshot {
    return {
      fps: this.fps,
      frameMs: this.frameMs,
      avgMs: this.avgMs,
      worstMs: this.worstMs,
      renderMs: this.renderMs,
      physicsMs: this.physicsMs,
      drawCalls: this.drawCalls,
      visibleObjects: this.visibleObjects,
      levelObjects: this.levelObjects,
      particleCount: this.particleCount,
      textureBytes: this.textureBytes,
    };
  }
}
