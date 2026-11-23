import { beforeAll, describe, expect, it } from 'vitest';
import { FURNITURE, PLACEMENTS, HAIR_STYLES, SKIN_TONES, OUTFITS, HAIR_COLORS } from '@little-office/shared';

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

  it('has real art for every furniture type on the map (no placeholder boxes)', async () => {
    const { hasPainter } = await import('./furnitureArt');
    // ceiling items (the disco ball) are drawn and animated by the renderer itself
    const types = PLACEMENTS.filter((p) => FURNITURE[p.type].layer !== 'ceiling').map((p) => p.type);
    const missing = [...new Set(types)].filter((t) => !hasPainter(t));
    expect(missing).toEqual([]);
  });

  it('draws Mochi the cat from well-formed 16x12 templates', async () => {
    const { CAT_TEMPLATES_FOR_TEST } = await import('./npcArt');
    for (const [name, rows] of Object.entries(CAT_TEMPLATES_FOR_TEST)) {
      expect(rows, name).toHaveLength(12);
      for (const r of rows) expect(r.length, `${name}: ${r}`).toBe(16);
    }
  });

  it('paints the background, sunbeams and glows', async () => {
    const { paintBackground, paintSunbeams, paintGlow } = await import('./backgroundArt');
    const { PALETTES } = await import('./palette');
    for (const theme of ['light', 'dark'] as const) expect(() => paintBackground(PALETTES[theme])).not.toThrow();
    expect(() => paintSunbeams('#ffffff')).not.toThrow();
    expect(() => paintGlow(10, '#ffcc88')).not.toThrow();
  });

  it('builds the muscular build sheet (Coach Rio)', async () => {
    const { buildCharacterSheet } = await import('./characterArt');
    expect(() => buildCharacterSheet({ skin: 3, hairStyle: 3, hairColor: 4, outfit: 1 }, 'buff')).not.toThrow();
  });

  it('builds a sprite sheet for every hair style and colour option', async () => {
    const { buildCharacterSheet } = await import('./characterArt');
    for (let h = 0; h < HAIR_STYLES.length; h++)
      expect(() => buildCharacterSheet({ skin: h % SKIN_TONES.length, hairStyle: h, hairColor: h % HAIR_COLORS.length, outfit: h % OUTFITS.length })).not.toThrow();
  });
});
