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

/** "Rep It Out": energetic, motivational workout beat for the gym. A minor, 140 BPM, four-on-the-floor. */
const gAm = ch(45, [69, 72, 76]);
const gF = ch(41, [65, 69, 72]);
const gC = ch(48, [64, 67, 72]);
const gG = ch(43, [67, 71, 74]);

export const GYM_SONG: Song = {
  bpm: 140,
  lead: [
    [76, null, 76, 79, 81, null, 79, 76], // Am — "let's go"
    [77, null, 76, 74, 72, null, 74, null], // F
    [72, 72, 76, null, 79, 76, 72, null], // C
    [74, null, 71, null, 67, 71, 74, null], // G
    [81, null, 81, 79, 76, null, 79, 81], // Am — up an octave of energy
    [84, null, 81, null, 77, 79, 81, null], // F
    [79, 79, 76, 72, 76, null, 79, null], // C
    [74, 76, 77, 79, 83, null, null, null], // G — climb, then one more rep
  ],
  chords: [[gAm, gAm], [gF, gF], [gC, gC], [gG, gG], [gAm, gAm], [gF, gF], [gC, gC], [gG, gG]],
  arp: [0, 1, 2, 1, 0, 1, 2, 1],
  bass: 'pump',
  drums: 'fourOnFloor',
  leadVolume: 0.05,
};
