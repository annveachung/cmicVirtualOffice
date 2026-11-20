import type { Appearance } from './types.js';

/** Option lists for the character creator. Colours are hex strings. */
export const SKIN_TONES = ['#f6d7bf', '#eac09a', '#d39a6a', '#a8704a', '#7a4e33'] as const;

export const HAIR_STYLES = ['short', 'long', 'bun', 'spiky', 'bob'] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const HAIR_COLORS = ['#3b2a22', '#6b4430', '#b07a45', '#e0c27a', '#2c2c38', '#b5654f', '#8a8fa3'] as const;

/** Outfit = [top, pants] pair, muted/dusty to fit the cozy palette. */
export const OUTFITS = [
  { name: 'Sage', top: '#8fae8b', pants: '#4d5a6b' },
  { name: 'Rose', top: '#d39a9a', pants: '#5b4a5e' },
  { name: 'Sky', top: '#8eaecb', pants: '#4a4f5c' },
  { name: 'Mustard', top: '#d8b36a', pants: '#5c4a3a' },
  { name: 'Lilac', top: '#ad9cc7', pants: '#45475a' },
  { name: 'Cream', top: '#ece0c8', pants: '#6b5b4b' },
  { name: 'Charcoal', top: '#5f6670', pants: '#3a3f47' },
] as const;

export const DEFAULT_APPEARANCE: Appearance = { skin: 1, hairStyle: 0, hairColor: 1, outfit: 0 };

const clampIndex = (n: number, len: number) => (Number.isInteger(n) && n >= 0 && n < len ? n : 0);

/** Normalise untrusted input into a valid Appearance. */
export function sanitizeAppearance(a: Partial<Appearance> | undefined | null): Appearance {
  return {
    skin: clampIndex(Number(a?.skin), SKIN_TONES.length),
    hairStyle: clampIndex(Number(a?.hairStyle), HAIR_STYLES.length),
    hairColor: clampIndex(Number(a?.hairColor), HAIR_COLORS.length),
    outfit: clampIndex(Number(a?.outfit), OUTFITS.length),
  };
}

/** Compact string form, e.g. "1-0-1-0" — used as texture keys and (later) the DB character_id. */
export function appearanceKey(a: Appearance): string {
  return `${a.skin}-${a.hairStyle}-${a.hairColor}-${a.outfit}`;
}

export function parseAppearanceKey(key: string): Appearance {
  const [skin, hairStyle, hairColor, outfit] = key.split('-').map(Number);
  return sanitizeAppearance({ skin, hairStyle, hairColor, outfit });
}
