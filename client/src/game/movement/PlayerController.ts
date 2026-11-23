import Phaser from 'phaser';
import {
  WALK_SPEED,
  approachTiles,
  findPath,
  INSTANT_ACTIONS,
  canReachSpot,
  frontTiles,
  isInFrontOf,
  moveWithCollision,
  nearestWalkable,
  smoothPath,
  tileCenter,
  toTile,
  type CollisionGrid,
  type Direction,
  type Spot,
  type TilePos,
  type Vec2,
} from '@little-office/shared';
import type { CharacterPose } from '../characters/Character';

export interface MotionResult {
  x: number;
  y: number;
  dir: Direction;
  pose: CharacterPose;
  /** True when the player is steering with the keyboard this frame. */
  keyboard?: boolean;
}

/**
 * Turns input into movement for the local player — a tiny state machine:
 *
 *   standing ──click floor──▶ walking ──arrive──▶ standing
 *   standing ──click spot───▶ walking ──arrive──▶ USING (sit, run, lift, punch…)
 *   standing ──E next to a spot───────────────▶ USING
 *   USING    ──any move key / click / E───────▶ standing (back where you came from)
 *
 * Keyboard always wins over a click path. All collision rules come from
 * @little-office/shared so the server can re-run the same checks later.
 */
export class PlayerController {
  private readonly keys: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private waypoints: Vec2[] = [];
  private dir: Direction = 'up';
  private stuckTime = 0;
  /** The spot we're walking to, to use once the path is walked. */
  private pending: { spot: Spot; standTile: TilePos } | null = null;
  /** The spot currently in use (and where to step back to afterwards). */
  private using: { spot: Spot; standTile: TilePos } | null = null;
  /** After standing up, the next frame snaps the character back onto the floor here. */
  private teleport: Vec2 | null = null;
  /** Called when a click-path finishes or is cancelled (to hide the target marker). */
  onPathEnd: () => void = () => {};
  /** Positions of things you can't walk through that move (NPCs). */
  blockers: () => Vec2[] = () => [];
  /** Is this seat already taken by someone else (e.g. Mochi napping on it)? */
  isTaken: (spot: Spot) => boolean = () => false;
  /** Called when you try to use a taken seat. */
  onTaken: (spot: Spot) => void = () => {};
  /** Called for one-off actions (costume, snack, poke the mascot) — they don't put you in a pose. */
  onInstant: (spot: Spot) => void = () => {};

  constructor(
    scene: Phaser.Scene,
    private readonly grid: CollisionGrid,
  ) {
    // enableCapture = false: don't swallow key presses, so React text inputs keep working.
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) as PlayerController['keys'];
  }

  get activeSpot(): Spot | null {
    return this.using?.spot ?? null;
  }

  /** The spot you're using or walking over to use (so nobody else takes it). */
  get claimedSpot(): Spot | null {
    return this.using?.spot ?? this.pending?.spot ?? null;
  }

  /** Plan a route to a clicked floor position. Returns the destination, or null if unreachable. */
  goTo(pos: Vec2, target: Vec2): Vec2 | null {
    const from = this.standUp(pos);
    this.pending = null;
    const goal = nearestWalkable(this.grid, toTile(target));
    if (!goal) return null;
    return this.planPath(from, goal);
  }

  /** Walk to the best tile next to (or on) a spot, then use it. Returns the walk destination. */
  goUse(pos: Vec2, spot: Spot): Vec2 | null {
    if (this.using?.spot.id === spot.id) return null;
    if (this.isTaken(spot)) {
      this.onTaken(spot);
      return null;
    }
    const from = this.standUp(pos);
    const here = toTile(from);
    // One-off things (food, machines, the mat…): a click only walks you over; you take
    // the item with E (or a second click once you're standing in front of it).
    const instant = INSTANT_ACTIONS.has(spot.action);
    if (instant ? isInFrontOf(this.grid, here, spot) : canReachSpot(here, spot)) {
      this.use(spot, here);
      return null;
    }
    // try each tile next to the spot; take the one with the shortest walk
    let best: { tile: TilePos; len: number } | null = null;
    // for one-off things, stop where the hint shows (in front); otherwise any tile next to it
    for (const t of instant ? frontTiles(this.grid, spot) : approachTiles(this.grid, spot)) {
      const path = findPath(this.grid, here, t);
      if (path && (!best || path.length < best.len)) best = { tile: t, len: path.length };
    }
    if (!best) return null;
    const dest = this.planPath(from, best.tile);
    if (instant) return dest; // walk over and stop; the "E · …" hint appears there
    this.pending = { spot, standTile: best.tile };
    if (!dest) this.use(spot, best.tile); // already standing on the approach tile
    return dest;
  }

  /** True while an arrow / WASD key is held (and you're not typing in a text box). */
  get steering(): boolean {
    if (isTyping()) return false;
    return Object.values(this.keys).some((k) => k.isDown);
  }

  /** Drop any click path or activity on the spot (e.g. when hopping onto Roomby). */
  halt(pos: Vec2): void {
    this.standUp(pos);
    this.teleport = null;
    this.cancelPath();
  }

  /** "E": use a nearby spot, or stop if already using one. */
  interact(pos: Vec2, nearby: Spot | null): void {
    if (this.using) this.standUp(pos);
    else if (nearby) this.goUse(pos, nearby);
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

    if (this.using) {
      const { spot } = this.using;
      if (ix === 0 && iy === 0) return { ...spot.pos, dir: spot.facing, pose: spot.action as CharacterPose };
      pos = this.standUp(pos); // any movement key stops the activity
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

    let next = moveWithCollision(this.grid, pos, dx, dy);
    next = this.avoidBlockers(pos, next);
    const moved = Math.abs(next.x - pos.x) + Math.abs(next.y - pos.y) > 0.001;
    if (dx !== 0 || dy !== 0) this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';

    // Arrived at the end of a click path?
    if (this.waypoints.length === 0 && (dx !== 0 || dy !== 0) && ix === 0 && iy === 0) {
      this.onPathEnd();
      if (this.pending) {
        const { spot, standTile } = this.pending;
        this.use(spot, standTile);
        if (this.using) return { ...spot.pos, dir: spot.facing, pose: spot.action as CharacterPose };
      }
    }

    // If a click-path is blocked (shouldn't happen, but be safe), give up after a moment.
    if (this.waypoints.length && !moved) {
      this.stuckTime += dt;
      if (this.stuckTime > 0.4) this.cancelPath();
    } else this.stuckTime = 0;

    return { x: next.x, y: next.y, dir: this.dir, pose: moved ? 'walk' : 'idle', keyboard: ix !== 0 || iy !== 0 };
  }

  // ---------------------------------------------------------------- helpers --

  /**
   * NPCs are solid: a move that would bring you within BLOCK_RADIUS of one (and
   * closer than you were) is cancelled, axis by axis — so you slide around them,
   * and you can always step away.
   */
  private avoidBlockers(pos: Vec2, next: Vec2): Vec2 {
    const blockers = this.blockers();
    if (!blockers.length) return next;
    const intrudes = (p: Vec2) =>
      blockers.some((b) => {
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        return d < BLOCK_RADIUS && d < Math.hypot(pos.x - b.x, pos.y - b.y);
      });
    let { x, y } = next;
    if (intrudes({ x, y: pos.y })) x = pos.x;
    if (intrudes({ x, y })) y = pos.y;
    return { x, y };
  }

  private use(spot: Spot, standTile: TilePos) {
    this.waypoints = [];
    this.pending = null;
    if (this.isTaken(spot)) {
      this.onTaken(spot); // someone got there first
      return;
    }
    if (INSTANT_ACTIONS.has(spot.action)) {
      // one-off: face it, do the thing, stay standing where you are
      this.dir = spot.facing;
      this.onInstant(spot);
      return;
    }
    this.using = { spot, standTile };
    this.teleport = null;
    this.dir = spot.facing;
  }

  /** Stop using a spot (if any) and return the standing position. */
  private standUp(pos: Vec2): Vec2 {
    if (!this.using) return pos;
    const stand = tileCenter(this.using.standTile);
    this.using = null;
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
    this.pending = null;
    if (this.waypoints.length) {
      this.waypoints = [];
      this.onPathEnd();
    }
  }
}

/** How close (px) you can get to an NPC before bumping into them. */
const BLOCK_RADIUS = 10;

function isTyping(): boolean {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
}
