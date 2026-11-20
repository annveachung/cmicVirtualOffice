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
 * "Max Reps": a fast, high-energy workout beat for the gym. G major, 160 BPM,
 * nonstop driving eighth-note lead, pumping bass, four-on-the-floor kick, and a
 * climb to the top note at the end of every loop. An ORIGINAL composition.
 */
const gG = ch(43, [67, 71, 74]);
const gEm = ch(40, [64, 67, 71]);
const gC = ch(48, [64, 67, 72]);
const gD = ch(38, [62, 66, 69]);

export const GYM_SONG: Song = {
  bpm: 160,
  lead: [
    [79, 79, 83, 79, 86, null, 83, 79], // G  — the hook
    [76, 79, 83, null, 81, 79, 76, null], // Em
    [76, 76, 79, 76, 84, null, 79, 76], // C
    [78, 81, 78, null, 74, 76, 78, null], // D
    [79, null, 86, 83, 79, 83, 86, null], // G  — higher energy
    [88, null, 86, 83, 79, null, 83, null], // Em
    [84, 83, 81, 79, 76, null, 79, 81], // C  — run down…
    [83, 81, 78, 81, 83, 86, 90, null], // D  — …and climb to the top, loop!
  ],
  chords: [[gG, gG], [gEm, gEm], [gC, gC], [gD, gD], [gG, gG], [gEm, gEm], [gC, gC], [gD, gD]],
  arp: [0, 2, 1, 2, 0, 2, 1, 2],
  bass: 'pump',
  drums: 'fourOnFloor',
  leadVolume: 0.045,
};
