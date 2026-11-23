import {
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
   * If `avoid` (the player) is right in the way, it waits instead of walking through.
   */
  update(dtMs: number, avoid?: Vec2): Direction | null {
    const wp = this.waypoints[0];
    if (!wp) return null;
    const step = (this.speed * Math.min(dtMs, 50)) / 1000;
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const d = Math.hypot(dx, dy);
    if (avoid && d > 0) {
      const nx = this.x + (dx / d) * Math.min(step, d);
      const ny = this.y + (dy / d) * Math.min(step, d);
      const before = Math.hypot(this.x - avoid.x, this.y - avoid.y);
      const after = Math.hypot(nx - avoid.x, ny - avoid.y);
      if (after < 12 && after < before) {
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

