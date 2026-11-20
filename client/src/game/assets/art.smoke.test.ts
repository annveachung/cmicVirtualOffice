import { beforeAll, describe, expect, it } from 'vitest';
import { PLACEMENTS, HAIR_STYLES, SKIN_TONES, OUTFITS, HAIR_COLORS } from '@little-office/shared';

/**
 * Smoke test for ALL generated art: runs every painter against a fake canvas,
 * for both themes, so a runtime error (e.g. an undefined colour) fails here
 * instead of freezing the game on "Opening the office…".
 */
function fakeCanvas(w = 1, h = 1) {
  const ctx = {
    imageSmoothingEnabled: false,
    globalAlpha: 1,
    set fillStyle(v: unknown) {
      if (typeof v !== 'string' && typeof v !== 'object') throw new Error(`bad fillStyle: ${String(v)}`);
      if (typeof v === 'string' && !/^(#|rgba?\()/.test(v)) throw new Error(`bad fillStyle: ${v}`);
    },
    fillRect() {},
    drawImage() {},
    createImageData: (cw: number, ch: number) => ({ data: new Uint8ClampedArray(cw * ch * 4) }),
    putImageData() {},
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  return { width: w, height: h, getContext: () => ctx, toDataURL: () => 'data:' };
}

beforeAll(() => {
  (globalThis as unknown as { document: unknown }).document = { createElement: () => fakeCanvas() };
});

describe('generated art', () => {
  it('paints every furniture placement in both themes', async () => {
    const { paintFurniture } = await import('./furnitureArt');
    const { PALETTES } = await import('./palette');
    for (const theme of ['light', 'dark'] as const)
      for (const p of PLACEMENTS) expect(() => paintFurniture(p, PALETTES[theme]), `${p.id} (${theme})`).not.toThrow();
  });

  it('paints the background, sunbeams and glows', async () => {
    const { paintBackground, paintSunbeams, paintGlow } = await import('./backgroundArt');
    const { PALETTES } = await import('./palette');
    for (const theme of ['light', 'dark'] as const) expect(() => paintBackground(PALETTES[theme])).not.toThrow();
    expect(() => paintSunbeams('#ffffff')).not.toThrow();
    expect(() => paintGlow(10, '#ffcc88')).not.toThrow();
  });

  it('builds a sprite sheet for every hair style and colour option', async () => {
    const { buildCharacterSheet } = await import('./characterArt');
    for (let h = 0; h < HAIR_STYLES.length; h++)
      expect(() => buildCharacterSheet({ skin: h % SKIN_TONES.length, hairStyle: h, hairColor: h % HAIR_COLORS.length, outfit: h % OUTFITS.length })).not.toThrow();
  });
});
