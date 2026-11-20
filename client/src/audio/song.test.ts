import { describe, expect, it } from 'vitest';
import { CLUB_SONG, GYM_SONG, OFFICE_SONG } from './song';

describe.each([
  ['office', OFFICE_SONG],
  ['club', CLUB_SONG],
  ['gym', GYM_SONG],
])('%s song', (_name, song) => {
  it('has 8 eighth-notes per bar and a chord pair for every bar', () => {
    for (const bar of song.lead) expect(bar).toHaveLength(8);
    expect(song.chords).toHaveLength(song.lead.length);
    expect(song.arp).toHaveLength(8);
  });

  it('keeps notes in a pleasant, playable range', () => {
    for (const n of song.lead.flat()) if (n !== null) expect(n).toBeGreaterThanOrEqual(55), expect(n).toBeLessThanOrEqual(90);
    for (const [a, b] of song.chords) for (const c of [a, b]) expect(c.triad.every((t) => t >= 50 && t <= 80)).toBe(true);
  });
});

it('party and gym tracks are livelier than the office tune and have drums', () => {
  expect(CLUB_SONG.bpm).toBeGreaterThan(OFFICE_SONG.bpm);
  expect(GYM_SONG.bpm).toBeGreaterThan(OFFICE_SONG.bpm);
  expect(CLUB_SONG.drums).toBeTruthy();
  expect(GYM_SONG.drums).toBeTruthy();
});
