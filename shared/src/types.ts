export type Theme = 'light' | 'dark';

export type Direction = 'down' | 'up' | 'left' | 'right';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TilePos {
  tx: number;
  ty: number;
}

/**
 * A character's look. Each field is an index into a palette/style list
 * (see appearance.ts). Kept tiny so it can be stored as a short string.
 */
export interface Appearance {
  skin: number;
  hairStyle: number;
  hairColor: number;
  outfit: number;
}
