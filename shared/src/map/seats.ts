import { TILE } from '../config.js';
import type { Direction, TilePos, Vec2 } from '../types.js';
import type { CollisionGrid } from './collision.js';
import { footprint, type Placement } from './furniture.js';
import { DESKS, PLACEMENTS } from './office.js';

/**
 * Seats are derived from furniture: every chair, armchair, bean bag and each
 * tile of a sofa is somewhere you can sit. Seat tiles are *blocked* for
 * walking — you don't walk onto a chair, you walk next to it and "sit",
 * which snaps you onto it. Standing up puts you back where you came from.
 */
export interface Seat {
  id: string;
  tile: TilePos;
  /** Direction the sitter faces. */
  facing: Direction;
  /** Pixel position of the sitter's feet while seated. */
  pos: Vec2;
}

const SEAT_TYPES = new Set<Placement['type']>(['chair', 'deskChair', 'armchair', 'sofa', 'beanBag']);

function buildSeats(placements: Placement[]): Seat[] {
  const seats: Seat[] = [];
  for (const p of placements) {
    if (!SEAT_TYPES.has(p.type)) continue;
    const facing: Direction = p.dir ?? 'down';
    const { w } = footprint(p);
    for (let i = 0; i < w; i++) {
      const tile = { tx: p.tx + i, ty: p.ty };
      // Facing the camera you sit a little lower on the seat, so the desk/table in front hides your legs.
      const dy = facing === 'down' ? 2 : 0;
      seats.push({
        id: w > 1 ? `${p.id}:${i}` : p.id,
        tile,
        facing,
        pos: { x: tile.tx * TILE + TILE / 2, y: tile.ty * TILE + TILE / 2 + dy },
      });
    }
  }
  return seats;
}

export const SEATS: Seat[] = buildSeats(PLACEMENTS);

const seatByTile = new Map(SEATS.map((s) => [`${s.tile.tx},${s.tile.ty}`, s]));

/** The seat on a tile — or, if the tile is part of a desk, that desk's chair. */
export function seatForTile(t: TilePos): Seat | undefined {
  const direct = seatByTile.get(`${t.tx},${t.ty}`);
  if (direct) return direct;
  const desk = DESKS.find((d) => t.tx >= d.desk.tx && t.tx < d.desk.tx + 3 && t.ty >= d.desk.ty && t.ty < d.desk.ty + 2);
  return desk ? seatByTile.get(`${desk.chair.tx},${desk.chair.ty}`) : undefined;
}

export function seatById(id: string): Seat | undefined {
  return SEATS.find((s) => s.id === id);
}

/** Walkable tiles touching a seat (8 directions) — where you stand to sit down. */
export function approachTiles(grid: CollisionGrid, seat: Seat): TilePos[] {
  const out: TilePos[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const t = { tx: seat.tile.tx + dx, ty: seat.tile.ty + dy };
      if (!grid.isBlocked(t.tx, t.ty)) out.push(t);
    }
  // orthogonal neighbours first — they look more natural
  return out.sort((a, b) => Math.abs(a.tx - seat.tile.tx) + Math.abs(a.ty - seat.tile.ty) - (Math.abs(b.tx - seat.tile.tx) + Math.abs(b.ty - seat.tile.ty)));
}

/** Is a standing character at tile `t` close enough to sit on `seat`? */
export function isNextToSeat(t: TilePos, seat: Seat): boolean {
  return Math.max(Math.abs(t.tx - seat.tile.tx), Math.abs(t.ty - seat.tile.ty)) === 1;
}
