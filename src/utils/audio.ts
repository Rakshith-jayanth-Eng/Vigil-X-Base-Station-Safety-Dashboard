/**
 * Industrial Alarm Audio Synthesizer for Vigil-X
 * Uses Web Audio API without needing external sound assets.
 * Implements 60-second operator snooze with automatic re-arm.
 */

class SafetyAlarmManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private currentAlarmInterval: number | null = null;
  private snoozedUntil: number = 0;
  private isUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  public unlockAudio(): void {
    if (this.isUnlocked && this.ctx && this.ctx.state === 'running') return;
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else if (ctx && ctx.state === 'running') {
        this.isUnlocked = true;
      }
    } catch {
      // Browser autoplay policy
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
   * 60-Second Operator Alarm Snooze with Auto-Rearm
   */
  public snoozeAlarm(durationSeconds = 60): void {
    this.snoozedUntil = Date.now() + durationSeconds * 1000;
    this.stopAlarm();
  }

  public isSnoozed(): boolean {
    return Date.now() < this.snoozedUntil;
  }

  public getSnoozeRemainingSeconds(): number {
    const diff = Math.max(0, this.snoozedUntil - Date.now());
    return Math.ceil(diff / 1000);
  }

  public cancelSnooze(): void {
    this.snoozedUntil = 0;
  }

  /**
   * Play single short warning blip (650Hz)
   */
  public playWarningBeep(): void {
    if (this.isMuted || this.isSnoozed()) return;
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
   * Play communication offline warning blip (300Hz low cadence)
   */
  public playOfflineAlert(): void {
    if (this.isMuted || this.isSnoozed()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(260, now + 0.12);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Ignored
    }
  }

  /**
   * Start alternating industrial critical alarm (880Hz / 440Hz klaxon)
   */
  public startCriticalAlarm(): void {
    if (this.isMuted) return;
    if (this.isSnoozed()) return; // Snoozed by operator
    if (this.currentAlarmInterval !== null) return; // already playing

    const triggerBurst = () => {
      if (this.isMuted || this.isSnoozed()) {
        this.stopAlarm();
        return;
      }
      const ctx = this.getAudioContext();
      if (!ctx) return;

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
