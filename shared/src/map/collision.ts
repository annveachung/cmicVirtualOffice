import { FEET_HITBOX, TILE } from '../config.js';
import type { TilePos, Vec2 } from '../types.js';
import { FURNITURE, footprint, type Placement } from './furniture.js';
import { MAP_H, MAP_W, PLACEMENTS, TILES, isSolidTile } from './office.js';

/**
 * A grid of booleans (1 = blocked) the size of the map.
 * Built once from walls + blocking furniture. Uint8Array is compact and fast.
 */
export class CollisionGrid {
  readonly w: number;
  readonly h: number;
  private readonly cells: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = new Uint8Array(w * h);
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h;
  }

  isBlocked(tx: number, ty: number): boolean {
    return !this.inBounds(tx, ty) || this.cells[ty * this.w + tx] === 1;
  }

  setBlocked(tx: number, ty: number, blocked = true): void {
    if (this.inBounds(tx, ty)) this.cells[ty * this.w + tx] = blocked ? 1 : 0;
  }
}

export function buildCollisionGrid(placements: Placement[] = PLACEMENTS): CollisionGrid {
  const grid = new CollisionGrid(MAP_W, MAP_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (isSolidTile(TILES[y][x])) grid.setBlocked(x, y);
  for (const p of placements) {
    if (!FURNITURE[p.type].blocks) continue;
    const { w, h } = footprint(p);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grid.setBlocked(p.tx + x, p.ty + y);
  }
  return grid;
}

// ---------------------------------------------------------------------------
// Pixel <-> tile helpers
// ---------------------------------------------------------------------------

export const toTile = (p: Vec2): TilePos => ({ tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) });
export const tileCenter = (t: TilePos): Vec2 => ({ x: t.tx * TILE + TILE / 2, y: t.ty * TILE + TILE / 2 });

/**
 * Can a character's feet hitbox stand at pixel position (x, y)?
 * We test the four corners of the box against the tile grid. Because the box
 * is smaller than a tile, four corners are enough to catch every overlap.
 */
export function canStandAt(grid: CollisionGrid, x: number, y: number): boolean {
  const hw = FEET_HITBOX.w / 2;
  const hh = FEET_HITBOX.h / 2;
  const left = Math.floor((x - hw) / TILE);
  const right = Math.floor((x + hw - 0.001) / TILE);
  const top = Math.floor((y - hh) / TILE);
  const bottom = Math.floor((y + hh - 0.001) / TILE);
  return (
    !grid.isBlocked(left, top) &&
    !grid.isBlocked(right, top) &&
    !grid.isBlocked(left, bottom) &&
    !grid.isBlocked(right, bottom)
  );
}

/**
 * Move by (dx, dy) while respecting walls. Each axis is resolved separately,
 * which gives natural "sliding" along walls when you walk into them diagonally.
 */
export function moveWithCollision(grid: CollisionGrid, pos: Vec2, dx: number, dy: number): Vec2 {
  let { x, y } = pos;
  if (dx !== 0 && canStandAt(grid, x + dx, y)) x += dx;
  if (dy !== 0 && canStandAt(grid, x, y + dy)) y += dy;
  return { x, y };
}
