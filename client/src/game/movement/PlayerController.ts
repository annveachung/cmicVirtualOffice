import Phaser from 'phaser';
import {
  WALK_SPEED,
  approachTiles,
  findPath,
  isNextToSeat,
  moveWithCollision,
  nearestWalkable,
  smoothPath,
  tileCenter,
  toTile,
  type CollisionGrid,
  type Direction,
  type Seat,
  type TilePos,
  type Vec2,
} from '@little-office/shared';
import type { CharacterPose } from '../characters/Character';

export interface MotionResult {
  x: number;
  y: number;
  dir: Direction;
  pose: CharacterPose;
}

/**
 * Turns input into movement for the local player — a tiny state machine:
 *
 *   standing ──click floor──▶ walking ──arrive──▶ standing
 *   standing ──click seat───▶ walking ──arrive──▶ SEATED
 *   standing ──E next to a seat───────────────▶ SEATED
 *   SEATED   ──any move key / click / E───────▶ standing (back where you came from)
 *
 * Keyboard always wins over a click path. All collision rules come from
 * @little-office/shared so the server can re-run the same checks later.
 */
export class PlayerController {
  private readonly keys: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private waypoints: Vec2[] = [];
  private dir: Direction = 'up';
  private stuckTime = 0;
  /** Where we're heading to sit, once the path is walked. */
  private pendingSeat: { seat: Seat; standTile: TilePos } | null = null;
  /** Currently seated (and where to stand up to). */
  private seated: { seat: Seat; standTile: TilePos } | null = null;
  /** After standing up, the next frame snaps the character back onto the floor here. */
  private teleport: Vec2 | null = null;
  /** Called when a click-path finishes or is cancelled (to hide the target marker). */
  onPathEnd: () => void = () => {};

  constructor(
    scene: Phaser.Scene,
    private readonly grid: CollisionGrid,
  ) {
    // enableCapture = false: don't swallow key presses, so React text inputs keep working.
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) as PlayerController['keys'];
  }

  get seat(): Seat | null {
    return this.seated?.seat ?? null;
  }

  /** Plan a route to a clicked floor position. Returns the destination, or null if unreachable. */
  goTo(pos: Vec2, target: Vec2): Vec2 | null {
    const from = this.standUp(pos);
    this.pendingSeat = null;
    const goal = nearestWalkable(this.grid, toTile(target));
    if (!goal) return null;
    return this.planPath(from, goal);
  }

  /** Walk to the best free spot next to a seat, then sit. Returns the walk destination. */
  goSit(pos: Vec2, seat: Seat): Vec2 | null {
    if (this.seated?.seat.id === seat.id) return null;
    const from = this.standUp(pos);
    const here = toTile(from);
    if (isNextToSeat(here, seat)) {
      this.sit(seat, here);
      return null;
    }
    // try each tile next to the seat; take the one with the shortest walk
    let best: { tile: TilePos; len: number } | null = null;
    for (const t of approachTiles(this.grid, seat)) {
      const path = findPath(this.grid, here, t);
      if (path && (!best || path.length < best.len)) best = { tile: t, len: path.length };
    }
    if (!best) return null;
    const dest = this.planPath(from, best.tile);
    this.pendingSeat = { seat, standTile: best.tile };
    if (!dest) this.sit(seat, best.tile); // already standing on the approach tile
    return dest;
  }

  /** "E": sit on an adjacent seat, or stand up if seated. */
  interact(pos: Vec2, nearby: Seat | null): void {
    if (this.seated) this.standUp(pos);
    else if (nearby) this.goSit(pos, nearby);
  }

  update(pos: Vec2, dtMs: number): MotionResult {
    // Clamp dt so a background-tab hiccup can't teleport you through a wall.
    const dt = Math.min(dtMs, 50) / 1000;
    const step = WALK_SPEED * dt;
    if (this.teleport) {
      pos = this.teleport;
      this.teleport = null;
    }

    let ix = 0;
    let iy = 0;
    if (!isTyping()) {
      if (this.keys.A.isDown || this.keys.LEFT.isDown) ix -= 1;
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) ix += 1;
      if (this.keys.W.isDown || this.keys.UP.isDown) iy -= 1;
      if (this.keys.S.isDown || this.keys.DOWN.isDown) iy += 1;
    }

    if (this.seated) {
      if (ix === 0 && iy === 0) return { ...this.seated.seat.pos, dir: this.seated.seat.facing, pose: 'sit' };
      pos = this.standUp(pos); // any movement key stands you up
      this.teleport = null;
    }

    let dx = 0;
    let dy = 0;
    if (ix !== 0 || iy !== 0) {
      this.cancelPath();
      const len = Math.hypot(ix, iy); // normalise so diagonals aren't 41% faster
      dx = (ix / len) * step;
      dy = (iy / len) * step;
    } else if (this.waypoints.length) {
      const wp = this.waypoints[0];
      const ddx = wp.x - pos.x;
      const ddy = wp.y - pos.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist <= step) {
        dx = ddx;
        dy = ddy;
        this.waypoints.shift();
      } else {
        dx = (ddx / dist) * step;
        dy = (ddy / dist) * step;
      }
    }

    const next = moveWithCollision(this.grid, pos, dx, dy);
    const moved = Math.abs(next.x - pos.x) + Math.abs(next.y - pos.y) > 0.001;
    if (dx !== 0 || dy !== 0) this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';

    // Arrived at the end of a click path?
    if (this.waypoints.length === 0 && (dx !== 0 || dy !== 0) && ix === 0 && iy === 0) {
      this.onPathEnd();
      if (this.pendingSeat) {
        const { seat, standTile } = this.pendingSeat;
        this.sit(seat, standTile);
        return { ...seat.pos, dir: seat.facing, pose: 'sit' };
      }
    }

    // If a click-path is blocked (shouldn't happen, but be safe), give up after a moment.
    if (this.waypoints.length && !moved) {
      this.stuckTime += dt;
      if (this.stuckTime > 0.4) this.cancelPath();
    } else this.stuckTime = 0;

    return { x: next.x, y: next.y, dir: this.dir, pose: moved ? 'walk' : 'idle' };
  }

  // ---------------------------------------------------------------- helpers --

  private sit(seat: Seat, standTile: TilePos) {
    this.waypoints = [];
    this.pendingSeat = null;
    this.seated = { seat, standTile };
    this.teleport = null;
    this.dir = seat.facing;
  }

  /** Leave the seat (if seated) and return the standing position. */
  private standUp(pos: Vec2): Vec2 {
    if (!this.seated) return pos;
    const stand = tileCenter(this.seated.standTile);
    this.seated = null;
    this.teleport = stand;
    return stand;
  }

  private planPath(from: Vec2, goal: TilePos): Vec2 | null {
    const tiles = findPath(this.grid, toTile(from), goal);
    this.waypoints = tiles ? smoothPath(this.grid, from, tiles.slice(1)) : [];
    this.stuckTime = 0;
    return this.waypoints.length ? this.waypoints[this.waypoints.length - 1] : null;
  }

  private cancelPath(): void {
    this.pendingSeat = null;
    if (this.waypoints.length) {
      this.waypoints = [];
      this.onPathEnd();
    }
  }
}

function isTyping(): boolean {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
}
