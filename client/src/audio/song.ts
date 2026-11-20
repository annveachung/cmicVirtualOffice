/**
 * "CMiCity Theme" — an ORIGINAL cozy chiptune loop
 * written for this project (not taken from any game). 8 bars in F major at a
 * relaxed 92 BPM, I–vi–IV–V style progression.
 *
 * Notes are MIDI numbers (60 = middle C). `null` = rest / hold.
 * Each bar has 8 eighth-note slots.
 */
export const BPM = 92;

export const LEAD: (number | null)[][] = [
  [69, null, 72, null, 69, 67, 65, null], // F
  [74, null, 72, 69, null, 67, 69, null], // Dm
  [65, 67, 69, 70, null, 69, 67, null], // Bb
  [64, null, 67, null, 72, null, null, null], // C
  [69, 72, 77, null, 76, 74, 72, null], // F
  [72, null, 69, null, 64, null, 69, null], // Am
  [74, 72, 70, 69, 67, null, 69, 70], // Bb → C
  [69, null, null, null, 65, null, null, null], // F
];

/** Chord per half-bar: [root for the bass, triad for the arpeggio]. */
type Chord = { bass: number; triad: [number, number, number] };
const F: Chord = { bass: 41, triad: [65, 69, 72] };
const Dm: Chord = { bass: 38, triad: [62, 65, 69] };
const Bb: Chord = { bass: 46, triad: [58, 62, 65] };
const C: Chord = { bass: 48, triad: [60, 64, 67] };
const Am: Chord = { bass: 45, triad: [57, 60, 64] };

export const CHORDS: [Chord, Chord][] = [
  [F, F],
  [Dm, Dm],
  [Bb, Bb],
  [C, C],
  [F, F],
  [Am, Am],
  [Bb, C],
  [F, F],
];

/** Arpeggio pattern over the 8 eighths of a bar (indexes into the triad). */
export const ARP = [0, 1, 2, 1, 0, 1, 2, 1];
