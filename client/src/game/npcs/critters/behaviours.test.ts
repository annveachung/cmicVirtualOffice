import { describe, expect, it } from 'vitest';
import { CAT_BEHAVIOURS } from './behaviours';

describe("Mochi's behaviour menu", () => {
  it('has every trick, each with a unique id and a positive weight', () => {
    const ids = CAT_BEHAVIOURS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['wander', 'nap', 'perch', 'gym', 'disco', 'chase-roomby']));
    for (const b of CAT_BEHAVIOURS) expect(b.weight, b.id).toBeGreaterThan(0);
  });
});
