import { ARP, BPM, CHORDS, LEAD } from './song';

/**
 * All sound is SYNTHESISED with the Web Audio API — no audio files, no licensing.
 *
 *  - sfx: a short square-wave "blip" for clicks
 *  - music: the original chiptune in song.ts, played by a small look-ahead scheduler
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is created
 * lazily on the first click/keypress. Preferences live in localStorage (they're
 * per-device conveniences, not account data).
 */
type Prefs = { sfx: boolean; music: boolean };
const PREFS_KEY = 'little-office:sound';

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    return { sfx: p.sfx !== false, music: p.music !== false };
  } catch {
    return { sfx: true, music: true };
  }
}

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private prefs: Prefs = loadPrefs();
  private listeners = new Set<(p: Prefs) => void>();
  // music scheduler state
  private musicWanted = false;
  private timer: number | null = null;
  private nextNoteTime = 0;
  private step = 0; // eighth-note index within the loop

  get settings(): Prefs {
    return { ...this.prefs };
  }

  subscribe(fn: (p: Prefs) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setSfx(on: boolean) {
    this.update({ sfx: on });
  }

  setMusic(on: boolean) {
    this.update({ music: on });
    if (on && this.musicWanted) this.startScheduler();
    if (!on) this.stopScheduler();
  }

  /** The office page calls this on mount; music plays only if the user hasn't turned it off. */
  startMusic() {
    this.musicWanted = true;
    if (this.prefs.music) this.startScheduler();
  }

  stopMusic() {
    this.musicWanted = false;
    this.stopScheduler();
  }

  /** Retro UI blip. */
  click() {
    if (!this.prefs.sfx) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(g).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // ------------------------------------------------------------------ internals

  private update(patch: Partial<Prefs>) {
    this.prefs = { ...this.prefs, ...patch };
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* storage blocked — preference just won't persist */
    }
    this.listeners.forEach((fn) => fn(this.settings));
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.5;
      this.sfxBus.connect(ctx.destination);
      // music goes through a low-pass filter: softens the square waves → "comfy"
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2200;
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.55;
      this.musicBus.connect(lowpass).connect(ctx.destination);
      this.ctx = ctx;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private startScheduler() {
    if (this.timer !== null) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.nextNoteTime = ctx.currentTime + 0.1;
    // Look-ahead scheduling: every 25ms, queue any notes due in the next 120ms.
    // Web Audio then plays them sample-accurately, so timing stays steady even if JS stutters.
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private stopScheduler() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.musicBus) {
      // quick fade so notes already queued don't cut off with a click
      const t = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
      this.musicBus.gain.linearRampToValueAtTime(0, t + 0.15);
      this.musicBus.gain.setValueAtTime(0.55, t + 0.6);
    }
  }

  private schedule() {
    const ctx = this.ctx!;
    const eighth = 60 / BPM / 2;
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextNoteTime, eighth);
      this.nextNoteTime += eighth;
      this.step = (this.step + 1) % (LEAD.length * 8);
    }
  }

  private playStep(step: number, t: number, eighth: number) {
    const bar = Math.floor(step / 8);
    const slot = step % 8;
    const chord = CHORDS[bar][slot < 4 ? 0 : 1];

    // lead: hold each note until the next note (rests extend it)
    const note = LEAD[bar][slot];
    if (note !== null) {
      let len = 1;
      while (slot + len < 8 && LEAD[bar][slot + len] === null) len++;
      this.tone('square', midiToHz(note), t, eighth * len * 0.9, 0.05);
    }
    // soft arpeggio
    this.tone('square', midiToHz(chord.triad[ARP[slot]]), t, eighth * 0.6, 0.018);
    // bass on beats 1 and 3, an octave hop on the off-beats
    if (slot % 4 === 0) this.tone('triangle', midiToHz(chord.bass), t, eighth * 1.8, 0.16);
    if (slot % 4 === 2) this.tone('triangle', midiToHz(chord.bass + 12), t, eighth * 0.8, 0.09);
  }

  private tone(type: OscillatorType, hz: number, t: number, dur: number, vol: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012); // gentle attack
    g.gain.setValueAtTime(vol, t + Math.max(0.015, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur); // soft release
    osc.connect(g).connect(this.musicBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}

export const sound = new SoundEngine();

/** Play the blip on every click anywhere (UI or map). Call once at startup. */
export function installClickSound() {
  window.addEventListener('pointerdown', (e) => {
    if (e.button === 0) sound.click();
  });
}
