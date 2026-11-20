/**
 * ORIGINAL chiptune songs written for this project (not taken from any game).
 * Notes are MIDI numbers (60 = middle C); `null` = rest / hold.
 * Each bar has 8 eighth-note slots.
 */
export type Chord = { bass: number; triad: [number, number, number] };

export interface Song {
  bpm: number;
  /** Melody, one array of 8 eighths per bar. */
  lead: (number | null)[][];
  /** Chord per half-bar: [first half, second half]. */
  chords: [Chord, Chord][];
  /** Arpeggio pattern over the 8 eighths (indexes into the triad). */
  arp: number[];
  /** 'walk' = cozy root + octave hop; 'pump' = driving octave eighths for dancing. */
  bass: 'walk' | 'pump';
  /** Synth drum kit: none, 'backbeat' (kick 1 & 3, snare 2 & 4) or 'fourOnFloor' (kick every beat). */
  drums: false | 'backbeat' | 'fourOnFloor';
  leadVolume: number;
  /** Lead instrument: 'square' = classic chiptune, 'triangle' = soft, electric-piano-like. */
  leadWave?: 'square' | 'triangle';
}

const ch = (bass: number, triad: [number, number, number]): Chord => ({ bass, triad });

/** "CMiCity Theme": cozy, relaxed office loop. F major, 92 BPM. */
const F = ch(41, [65, 69, 72]);
const Dm = ch(38, [62, 65, 69]);
const Bb = ch(46, [58, 62, 65]);
const C = ch(48, [60, 64, 67]);
const Am = ch(45, [57, 60, 64]);

export const OFFICE_SONG: Song = {
  bpm: 92,
  lead: [
    [69, null, 72, null, 69, 67, 65, null], // F
    [74, null, 72, 69, null, 67, 69, null], // Dm
    [65, 67, 69, 70, null, 69, 67, null], // Bb
    [64, null, 67, null, 72, null, null, null], // C
    [69, 72, 77, null, 76, 74, 72, null], // F
    [72, null, 69, null, 64, null, 69, null], // Am
    [74, 72, 70, 69, 67, null, 69, 70], // Bb → C
    [69, null, null, null, 65, null, null, null], // F
  ],
  chords: [[F, F], [Dm, Dm], [Bb, Bb], [C, C], [F, F], [Am, Am], [Bb, C], [F, F]],
  arp: [0, 1, 2, 1, 0, 1, 2, 1],
  bass: 'walk',
  drums: false,
  leadVolume: 0.05,
};

/** "Potato Party": happy, bouncy dance track for The Potato Club. C major, 128 BPM. */
const cC = ch(36, [60, 64, 67]);
const cF = ch(41, [65, 69, 72]);
const cG = ch(43, [67, 71, 74]);
const cAm = ch(45, [69, 72, 76]);

export const CLUB_SONG: Song = {
  bpm: 128,
  lead: [
    [72, 72, 76, null, 79, null, 76, 72], // C   — the hook
    [77, null, 76, 74, 72, null, 69, null], // F
    [71, 74, 79, null, 77, 76, 74, null], // G
    [76, null, 72, null, 67, 69, 71, null], // C
    [69, 72, 76, null, 76, 74, 72, 69], // Am
    [77, null, 81, null, 79, 77, 76, null], // F
    [79, 79, 77, 76, 74, null, 71, 74], // G   — run-up
    [72, null, 79, null, 84, null, null, null], // C — big finish, then loop
  ],
  chords: [[cC, cC], [cF, cF], [cG, cG], [cC, cC], [cAm, cAm], [cF, cF], [cG, cG], [cC, cC]],
  arp: [0, 2, 1, 2, 0, 2, 1, 2],
  bass: 'pump',
  drums: 'backbeat',
  leadVolume: 0.055,
};

/**
 * "Fresh Start": a light, breezy, jazzy fitness-lobby tune for the gym —
 * relaxed 116 BPM, soft electric-piano-style lead, smooth seventh chords
 * (the triads below are the upper notes of maj7/m7/7 chords over the bass).
 * An ORIGINAL composition in that easy-going workout-game style.
 */
const gCmaj7 = ch(48, [64, 67, 71]);
const gAm7 = ch(45, [64, 67, 72]);
const gDm7 = ch(50, [65, 69, 72]);
const gG7 = ch(43, [65, 71, 74]);
const gFmaj7 = ch(41, [64, 69, 72]);
const gEm7 = ch(40, [67, 71, 74]);

export const GYM_SONG: Song = {
  bpm: 116,
  lead: [
    [76, null, null, 79, null, 76, 74, null], // Cmaj7
    [72, null, 76, null, 79, null, null, 81], // Am7
    [null, 77, null, 76, 74, null, 72, null], // Dm7 — laid-back, starts off the beat
    [71, null, 74, null, 77, 76, 74, null], // G7
    [76, null, null, 79, null, 83, 81, null], // Cmaj7
    [79, null, 76, null, 77, null, 81, null], // Fmaj7
    [79, null, 76, 74, 72, null, 76, null], // Em7 → Am7
    [74, null, 72, null, 71, null, null, null], // Dm7 → G7, back to the top
  ],
  chords: [
    [gCmaj7, gCmaj7], [gAm7, gAm7], [gDm7, gDm7], [gG7, gG7],
    [gCmaj7, gCmaj7], [gFmaj7, gFmaj7], [gEm7, gAm7], [gDm7, gG7],
  ],
  arp: [0, 2, 1, 2, 0, 2, 1, 2],
  bass: 'walk',
  drums: 'backbeat',
  leadVolume: 0.09,
  leadWave: 'triangle',
};
