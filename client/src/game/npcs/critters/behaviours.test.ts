import { describe, expect, it } from 'vitest';
import { CRITTER_BEHAVIOURS } from './behaviours';

describe('the critter behaviour menu', () => {
  it('has every trick, each with a unique id and a positive weight', () => {
    const ids = CRITTER_BEHAVIOURS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['wander', 'nap', 'perch', 'gym', 'disco', 'chase-roomby', 'rummage', 'wash-snack']));
    // raccoon habits are raccoon-only
    for (const id of ['rummage', 'wash-snack']) expect(CRITTER_BEHAVIOURS.find((b) => b.id === id)?.only).toEqual(['raccoon']);
    for (const b of CRITTER_BEHAVIOURS) expect(b.weight, b.id).toBeGreaterThan(0);
  });
});

describe('who lives in the office', () => {
  it('has Mochi plus two raccoons, each with a known species and a unique name', async () => {
    const { CRITTERS, SPECIES } = await import('./species');
    expect(CRITTERS.filter((c) => c.kind === 'cat')).toHaveLength(1);
    expect(CRITTERS.filter((c) => c.kind === 'raccoon')).toHaveLength(2);
    expect(new Set(CRITTERS.map((c) => c.name)).size).toBe(CRITTERS.length);
    for (const c of CRITTERS) expect(SPECIES[c.kind].lines.pet.length, c.name).toBeGreaterThan(0);
  });
});
