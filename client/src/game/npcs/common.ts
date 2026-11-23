import {
  TILE,
  findPath,
  smoothPath,
  tileCenter,
  toTile,
  type CollisionGrid,
  type Direction,
  type Theme,
  type TilePos,
  type Vec2,
} from '@little-office/shared';
import type { CharacterPose } from '../characters/Character';

/** Pieces every NPC shares: the NPC interface, a path-following Walker and small helpers. */

export const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
export const rand = (a: number, b: number) => a + Math.random() * (b - a);

export interface NpcContext {
  playerX: number;
  playerY: number;
  playerPose: CharacterPose;
  /** Everyone this NPC mustn't walk through: you and every other NPC (filled in by NpcManager). */
  obstacles: Vec2[];
}

export interface Npc {
  readonly x: number;
  readonly y: number;
  /** Shown in the "E · ___" hint. */
  readonly verb: string;
  update(dtMs: number, ctx: NpcContext): void;
  interact(): void;
  setTheme(t: Theme): void;
  setLabelScale(s: number): void;
  destroy(): void;
}

/** Follows A* paths across the tile grid at a fixed speed (NPCs don't collide with people). */
/** How close (px) two characters / NPCs can get before one has to wait. */
const PERSONAL_SPACE = 12;

export class Walker {
  private waypoints: Vec2[] = [];
  private waited = 0;

  constructor(
    private readonly grid: CollisionGrid,
    public x: number,
    public y: number,
    public speed: number,
  ) {}

  get moving() {
    return this.waypoints.length > 0;
  }

  goTo(t: TilePos): boolean {
    const here = { x: this.x, y: this.y };
    const path = findPath(this.grid, toTile(here), t);
    if (!path) return false;
    this.waypoints = smoothPath(this.grid, here, path.slice(1));
    return this.waypoints.length > 0;
  }

  /**
   * Returns the direction travelled this frame (or null if standing still).
   * If anyone in `avoid` (you, or another NPC) is right in the way, it waits instead of
   * walking through — and gives up on the trip if they stay put.
   */
  update(dtMs: number, avoid: readonly Vec2[] = []): Direction | null {
    const wp = this.waypoints[0];
    if (!wp) return null;
    const step = (this.speed * Math.min(dtMs, 50)) / 1000;
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      const nx = this.x + (dx / d) * Math.min(step, d);
      const ny = this.y + (dy / d) * Math.min(step, d);
      // blocked = this step would bring us closer than PERSONAL_SPACE to someone (moving away is always fine)
      // …or onto a tile that's become solid since the path was planned (a door that just closed)
      const blocked = this.grid.isBlocked(Math.floor(nx / TILE), Math.floor(ny / TILE)) || avoid.some((o) => {
        const after = Math.hypot(nx - o.x, ny - o.y);
        return after < PERSONAL_SPACE && after < Math.hypot(this.x - o.x, this.y - o.y);
      });
      if (blocked) {
        // politely wait — but if you're parked in the way for a while, give up and do something else
        this.waited += dtMs;
        if (this.waited > 1500) {
          this.waypoints = [];
          this.waited = 0;
        }
        return null;
      }
    }
    this.waited = 0;
    if (d <= step) {
      this.x = wp.x;
      this.y = wp.y;
      this.waypoints.shift();
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
    }
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
  }
}

/** A free floor tile right next to a point (where you land when hopping off Roomby). */
export function freeTileNear(grid: CollisionGrid, p: Vec2): Vec2 {
  const t = toTile(p);
  const around = [[0, 1], [-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]];
  for (const [dx, dy] of around) {
    if (!grid.isBlocked(t.tx + dx, t.ty + dy)) return tileCenter({ tx: t.tx + dx, ty: t.ty + dy });
  }
  return tileCenter(t);
}

