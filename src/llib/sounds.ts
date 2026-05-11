class SoundEngine {
  ctx: AudioContext | null = null;
  enabled: boolean = true;

  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn("AudioContext not supported");
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createOsc(freq: number, type: OscillatorType, startTime: number, duration: number, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  shoot() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.createOsc(600, 'sine', t, 0.1, 0.1);
    this.createOsc(900, 'triangle', t, 0.05, 0.05);
  }

  match(combo: number = 1) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const baseFreq = Math.min(2000, 600 + (combo - 1) * 200);
    this.createOsc(baseFreq, 'sine', t, 0.1, 0.1);
    this.createOsc(baseFreq * 1.5, 'sine', t + 0.05, 0.2, 0.1);
  }

  bomb() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.createOsc(150, 'square', t, 0.2, 0.2);
    this.createOsc(100, 'sawtooth', t + 0.1, 0.3, 0.2);
    this.createOsc(50, 'square', t + 0.2, 0.4, 0.2);
  }

  win() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.createOsc(523.25, 'sine', t, 0.15, 0.1); // C5
    this.createOsc(659.25, 'sine', t + 0.15, 0.15, 0.1); // E5
    this.createOsc(783.99, 'sine', t + 0.3, 0.15, 0.1); // G5
    this.createOsc(1046.50, 'sine', t + 0.45, 0.5, 0.1); // C6
  }

  lose() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.createOsc(300, 'sawtooth', t, 0.3, 0.1);
    this.createOsc(250, 'sawtooth', t + 0.25, 0.3, 0.1);
    this.createOsc(200, 'sawtooth', t + 0.5, 0.6, 0.1);
  }
}

export const sounds = new SoundEngine();
