import { describe, expect, it } from 'vitest';
import { CAT_BEHAVIOURS } from './behaviours';

describe('the critter behaviour menu', () => {
  it('has every trick, each with a unique id and a positive weight', () => {
    const ids = CAT_BEHAVIOURS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['wander', 'nap', 'perch', 'gym', 'disco', 'chase-roomby']));
    for (const b of CAT_BEHAVIOURS) expect(b.weight, b.id).toBeGreaterThan(0);
  });
});

describe('who lives in the office', () => {
  it('has Mochi plus three raccoons, each with a known species and a unique name', async () => {
    const { CRITTERS, SPECIES } = await import('./species');
    expect(CRITTERS.filter((c) => c.kind === 'cat')).toHaveLength(1);
    expect(CRITTERS.filter((c) => c.kind === 'raccoon')).toHaveLength(3);
    expect(new Set(CRITTERS.map((c) => c.name)).size).toBe(CRITTERS.length);
    for (const c of CRITTERS) expect(SPECIES[c.kind].lines.pet.length, c.name).toBeGreaterThan(0);
  });
});
