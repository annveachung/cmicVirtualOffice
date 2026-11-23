import type { TilePos } from '../types.js';
import type { CollisionGrid } from './collision.js';
import { PLACEMENTS, TILES, zoneAt } from './office.js';
import { SPOTS, type Spot } from './spots.js';

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

/** The office (gaming) chairs at the desks — Mochi likes to borrow them for a nap. */
export const CAT_CHAIR_SPOTS: Spot[] = SPOTS.filter((s) => PLACEMENTS.find((p) => p.id === s.id)?.type === 'deskChair');

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
