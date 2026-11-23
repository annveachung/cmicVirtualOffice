import { TILE } from '../config.js';
import type { TilePos, Vec2 } from '../types.js';
import type { CollisionGrid } from './collision.js';
import { footprint } from './furniture.js';
import { PLACEMENTS, TILES, zoneAt } from './office.js';
import { SPOTS, approachTiles, type Spot } from './spots.js';

/**
 * Where the office's NPCs live and roam. Kept in shared map data so that, once
 * multiplayer exists, the server can run the NPCs and everyone sees the same cat.
 */

/** Robot vacuum: a loop around the open-plan hall (it pathfinds between these). */
export const VACUUM_ROUTE: TilePos[] = [
  { tx: 9, ty: 12 },
  { tx: 27, ty: 12 },
  { tx: 40, ty: 13 },
  { tx: 41, ty: 19 },
  { tx: 34, ty: 23 },
  { tx: 20, ty: 25 },
  { tx: 9, ty: 25 },
  { tx: 16, ty: 18 },
];

/** Receptionist: stands just left of the entrance mat, facing the room. */
export const RECEPTIONIST_TILE: TilePos = { tx: 22, ty: 29 };

/** Cosy spots where the cat likes to nap (rugs and sunny corners). */
export const CAT_NAP_TILES: TilePos[] = [
  { tx: 12, ty: 6 },
  { tx: 4, ty: 7 },
  { tx: 30, ty: 26 },
  { tx: 13, ty: 3 },
  { tx: 20, ty: 12 },
];

/** Gym equipment Mochi can "use": the treadmills (she runs) and yoga mats (she stretches). */
export const CAT_GYM_SPOTS: Spot[] = SPOTS.filter((s) => s.action === 'run' || s.action === 'stretch');

/** The disco's dance floor tiles (where Mochi dances). */
export const DANCE_FLOOR_TILES: TilePos[] = PLACEMENTS.filter((p) => p.type === 'danceFloor').flatMap((p) => {
  const { w, h } = footprint(p);
  return Array.from({ length: w * h }, (_, i) => ({ tx: p.tx + (i % w), ty: p.ty + Math.floor(i / w) }));
});

/** Somewhere Mochi can hop up onto: an office chair, a sofa cushion or a pantry table. */
export interface CatPerch {
  id: string;
  /** Pixel position of her feet while perched. */
  pos: Vec2;
  /** Draw-order y: just in front of whatever she's on (but behind what's in front of it). */
  depthY: number;
  /** The seat she's taking (nobody can sit there meanwhile). Chairs and sofa cushions only. */
  seatId?: string;
  /** Floor tiles she can hop up from (and back down to). */
  from: TilePos[];
}

const PERCH_SEATS = new Set(['deskChair', 'sofa']);
const PERCH_TABLES = new Set(['diningTable', 'roundTable', 'boothTable', 'meetingTable']);

/** Every perch, with the floor tiles next to it (needs the collision grid). */
export function catPerches(grid: CollisionGrid): CatPerch[] {
  const perches: CatPerch[] = [];
  // office chairs + every sofa cushion (sofa seats are "<sofa id>:<n>")
  for (const s of SPOTS) {
    const type = PLACEMENTS.find((p) => p.id === s.id.split(':')[0])?.type;
    if (!type || !PERCH_SEATS.has(type)) continue;
    perches.push({ id: s.id, pos: s.pos, depthY: (s.tile.ty + 1) * TILE + 1, seatId: s.id, from: approachTiles(grid, s) });
  }
  // pantry + meeting tables: she sits on the tabletop (long tables have room for two spots)
  for (const p of PLACEMENTS) {
    if (!PERCH_TABLES.has(p.type)) continue;
    const { w, h } = footprint(p);
    const around: TilePos[] = [];
    for (let x = p.tx - 1; x <= p.tx + w; x++)
      for (let y = p.ty - 1; y <= p.ty + h; y++) {
        const edge = x === p.tx - 1 || x === p.tx + w || y === p.ty - 1 || y === p.ty + h;
        const corner = (x === p.tx - 1 || x === p.tx + w) && (y === p.ty - 1 || y === p.ty + h);
        if (edge && !corner && !grid.isBlocked(x, y)) around.push({ tx: x, ty: y });
      }
    const xs = w >= 4 ? [p.tx * TILE + w * TILE * 0.3, p.tx * TILE + w * TILE * 0.7] : [p.tx * TILE + (w * TILE) / 2];
    xs.forEach((x, i) =>
      perches.push({
        id: `${p.id}:top${i}`,
        pos: { x, y: p.ty * TILE + h * TILE * 0.6 },
        depthY: (p.ty + h) * TILE + 1,
        from: around,
      }),
    );
  }
  return perches;
}

/** Every walkable tile in an area (used as random wander targets). */
export function walkableTiles(grid: CollisionGrid, test: (t: TilePos) => boolean): TilePos[] {
  const out: TilePos[] = [];
  for (let ty = 0; ty < TILES.length; ty++)
    for (let tx = 0; tx < TILES[0].length; tx++) {
      const t = { tx, ty };
      if (!grid.isBlocked(tx, ty) && test(t)) out.push(t);
    }
  return out;
}

/** The cat roams the lounge and the open-plan hall (not the washrooms, gym or club). */
export const catRoams = (t: TilePos): boolean => {
  const k = TILES[t.ty][t.tx];
  const inLounge = t.tx >= 1 && t.tx <= 16 && t.ty >= 3 && t.ty <= 9;
  return (inLounge || k === 'c') && zoneAt(t.tx, t.ty) === null;
};

/** The coach stays in the gym. */
export const coachRoams = (t: TilePos): boolean => zoneAt(t.tx, t.ty) === 'gym';
