import { CLUB_SONG, GYM_SONG, OFFICE_SONG, type Song } from './song';

export type Track = 'office' | 'club' | 'gym';
const TRACKS: Record<Track, Song> = { office: OFFICE_SONG, club: CLUB_SONG, gym: GYM_SONG };

/**
 * All sound is SYNTHESISED with the Web Audio API — no audio files, no licensing.
 *
 *  - sfx: a short square-wave "blip" for clicks
 *  - music: the original chiptunes in song.ts (cozy office loop, a party track
 *    for The Potato Club, a workout beat for the gym), played by a look-ahead scheduler
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
  private song: Song = OFFICE_SONG;
  private noise: AudioBuffer | null = null;

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

  /** Switch songs (e.g. entering / leaving The Potato Club). Restarts from the top with a quick fade. */
  setTrack(track: Track) {
    const next = TRACKS[track];
    if (next === this.song) return;
    this.song = next;
    this.step = 0;
    if (this.timer !== null) {
      this.stopScheduler();
      if (this.prefs.music && this.musicWanted) this.startScheduler();
    }
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

  /** Two knocks on a wooden door: a low thump with a woody "tok" on top, twice. */
  knock() {
    if (!this.prefs.sfx) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const at of [0, 0.19]) {
      const t = t0 + at;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g).connect(this.sfxBus);
      osc.start(t);
      osc.stop(t + 0.14);
      const tok = ctx.createOscillator();
      const tg = ctx.createGain();
      tok.type = 'square';
      tok.frequency.setValueAtTime(620, t);
      tg.gain.setValueAtTime(0.0001, t);
      tg.gain.exponentialRampToValueAtTime(0.06, t + 0.002);
      tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      tok.connect(tg).connect(this.sfxBus);
      tok.start(t);
      tok.stop(t + 0.04);
    }
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
      // Refreshing/closing the page cuts the audio mid-wave, which crackles.
      // Fade everything out very quickly as the page goes away.
      const fadeOut = () => {
        const t = ctx.currentTime;
        for (const bus of [this.sfxBus, this.musicBus]) {
          bus.gain.cancelScheduledValues(t);
          bus.gain.setValueAtTime(bus.gain.value, t);
          bus.gain.linearRampToValueAtTime(0, t + 0.03);
        }
        window.setTimeout(() => void ctx.suspend(), 40);
      };
      window.addEventListener('pagehide', fadeOut);
      window.addEventListener('beforeunload', fadeOut);
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
    const song = this.song;
    const eighth = 60 / song.bpm / 2;
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      this.playStep(song, this.step, this.nextNoteTime, eighth);
      this.nextNoteTime += eighth;
      this.step = (this.step + 1) % (song.lead.length * 8);
    }
  }

  private playStep(song: Song, step: number, t: number, eighth: number) {
    const bar = Math.floor(step / 8);
    const slot = step % 8;
    const chord = song.chords[bar][slot < 4 ? 0 : 1];

    // lead: hold each note until the next note (rests extend it)
    const note = song.lead[bar][slot];
    if (note !== null) {
      let len = 1;
      while (slot + len < 8 && song.lead[bar][slot + len] === null) len++;
      this.tone(song.leadWave ?? 'square', midiToHz(note), t, eighth * len * 0.9, song.leadVolume);
    }
    // soft arpeggio
    this.tone('square', midiToHz(chord.triad[song.arp[slot]]), t, eighth * 0.6, 0.018);
    // bass
    if (song.bass === 'walk') {
      if (slot % 4 === 0) this.tone('triangle', midiToHz(chord.bass), t, eighth * 1.8, 0.16);
      if (slot % 4 === 2) this.tone('triangle', midiToHz(chord.bass + 12), t, eighth * 0.8, 0.09);
    } else {
      // 'pump': driving eighths, octave up on the off-beats — makes you want to dance
      this.tone('triangle', midiToHz(chord.bass + (slot % 2 ? 12 : 0)), t, eighth * 0.7, 0.15);
    }
    // drums: snare on 2 & 4, hi-hat on every off-beat; kick on 1 & 3 (backbeat) or every beat (four-on-the-floor)
    if (song.drums) {
      const kickSlots = song.drums === 'fourOnFloor' ? [0, 2, 4, 6] : [0, 4];
      if (kickSlots.includes(slot)) this.kick(t);
      if (slot === 2 || slot === 6) this.noiseHit(t, 0.14, 1800, 0.09); // snare
      if (slot % 2 === 1) this.noiseHit(t, 0.04, 7000, 0.035); // hi-hat
    }
  }

  /** Kick drum: a sine wave that drops quickly in pitch. */
  private kick(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g).connect(this.musicBus);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  /** Snare / hi-hat: a burst of white noise through a high-pass filter. */
  private noiseHit(t: number, dur: number, cutoff: number, vol: number) {
    const ctx = this.ctx!;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(g).connect(this.musicBus);
    src.start(t);
    src.stop(t + dur + 0.02);
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
