// Web Audio engine: generated sound effects and a looping synth music bed.
// No external audio assets — everything is synthesized, so loading never
// blocks and there are no licensing concerns.

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  musicVolume = 0.45;
  sfxVolume = 0.7;

  private stepIndex = -1;

  // A minor arpeggio (energetic, GD-ish).
  private melody = [220, 262, 330, 392, 494, 392, 330, 262];
  private bass = [110, 110, 131, 131, 147, 147, 98, 98];

  /** Must be called from a user gesture to satisfy autoplay policies. */
  unlock(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private init(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.ctx.destination);
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
    dest?: AudioNode,
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest ?? this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  playJump(): void {
    this.tone(480, 0.12, 'square', 0.18, 720);
  }

  playOrb(): void {
    this.tone(660, 0.14, 'sine', 0.22, 990);
  }

  playPad(): void {
    this.tone(520, 0.22, 'sawtooth', 0.18, 1040);
  }

  playPortal(): void {
    this.tone(300, 0.25, 'sine', 0.2, 1200);
  }

  playCoin(): void {
    this.tone(880, 0.1, 'square', 0.2);
    setTimeout(() => this.tone(1320, 0.14, 'square', 0.2), 60);
  }

  playDeath(): void {
    if (!this.ctx) return;
    this.tone(400, 0.4, 'sawtooth', 0.25, 80);
    this.tone(200, 0.5, 'square', 0.15, 40);
  }

  playComplete(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'square', 0.2), i * 110));
  }

  playClick(): void {
    this.tone(700, 0.05, 'square', 0.12);
  }

  // The simulation clock owns the beat. A restored checkpoint resumes its phrase.
  syncMusic(seconds: number): void {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
    const beat = Math.floor(seconds / 0.16);
    if (beat === this.stepIndex) return;
    this.stepIndex = beat;
    const i = beat % this.melody.length;
    this.scheduleNote(this.melody[i], this.ctx.currentTime, 0.14, 'square', 0.08);
    this.scheduleNote(this.bass[i], this.ctx.currentTime, 0.16, 'triangle', 0.12);
  }

  private scheduleNote(freq: number, time: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  stopMusic(): void {
    this.stepIndex = -1;
    if (this.musicGain && this.ctx) {
      this.musicGain.disconnect();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.ctx.destination);
    }
  }
}
