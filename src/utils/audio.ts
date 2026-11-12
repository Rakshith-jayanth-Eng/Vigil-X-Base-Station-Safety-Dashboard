/**
 * Industrial Alarm Audio Synthesizer for Vigil-X
 * Uses Web Audio API without needing external sound assets.
 */

class SafetyAlarmManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentAlarmInterval: number | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAlarm();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Play single short warning blip (650Hz)
   */
  public playWarningBeep(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(650, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio context may be restricted before user gesture
    }
  }

  /**
   * Start alternating industrial critical alarm (880Hz / 440Hz klaxon)
   */
  public startCriticalAlarm(): void {
    if (this.isMuted) return;
    if (this.currentAlarmInterval !== null) return; // already playing

    const triggerBurst = () => {
      const ctx = this.getAudioContext();
      if (!ctx || this.isMuted) return;

      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(440, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.setValueAtTime(0.12, now + 0.28);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.36);
      } catch {
        // Ignored
      }
    };

    triggerBurst();
    this.currentAlarmInterval = window.setInterval(triggerBurst, 1200);
  }

  public stopAlarm(): void {
    if (this.currentAlarmInterval !== null) {
      clearInterval(this.currentAlarmInterval);
      this.currentAlarmInterval = null;
    }
  }

  /**
   * Play gentle confirmation chime on acknowledgement
   */
  public playAcknowledgeChime(): void {
    this.stopAlarm();
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Ignored
    }
  }
}

export const alarmManager = new SafetyAlarmManager();
