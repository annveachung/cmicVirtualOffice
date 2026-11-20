import { FEET_HITBOX } from '../config.js';
import type { TilePos, Vec2 } from '../types.js';
import { canStandAt, tileCenter, type CollisionGrid } from './collision.js';

/**
 * A* pathfinding on the tile grid.
 *
 * - 8-directional movement; diagonal steps cost √2.
 * - No corner cutting: a diagonal step is only allowed if both adjacent
 *   orthogonal tiles are free (otherwise you'd clip through a desk corner).
 * - Heuristic is "octile distance", the exact cost on an empty 8-way grid,
 *   which keeps A* both correct and fast.
 */
const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

const SQRT2 = Math.SQRT2;
const octile = (ax: number, ay: number, bx: number, by: number) => {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
};

/** Tiny binary min-heap keyed on f-score — avoids an O(n) scan per step. */
class MinHeap {
  private items: number[] = [];
  constructor(private readonly score: Float64Array) {}
  get size() { return this.items.length; }
  push(i: number) {
    const a = this.items;
    a.push(i);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (this.score[a[p]] <= this.score[a[c]]) break;
      [a[p], a[c]] = [a[c], a[p]];
      c = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      for (;;) {
        const l = p * 2 + 1, r = l + 1;
        let m = p;
        if (l < a.length && this.score[a[l]] < this.score[a[m]]) m = l;
        if (r < a.length && this.score[a[r]] < this.score[a[m]]) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m], a[p]];
        p = m;
      }
    }
    return top;
  }
}

export function findPath(grid: CollisionGrid, start: TilePos, goal: TilePos): TilePos[] | null {
  if (grid.isBlocked(goal.tx, goal.ty)) return null;
  const { w, h } = grid;
  const idx = (x: number, y: number) => y * w + x;
  const n = w * h;
  const g = new Float64Array(n).fill(Infinity);
  const f = new Float64Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open = new MinHeap(f);

  const s = idx(start.tx, start.ty);
  const goalIdx = idx(goal.tx, goal.ty);
  g[s] = 0;
  f[s] = octile(start.tx, start.ty, goal.tx, goal.ty);
  open.push(s);

  while (open.size > 0) {
    const cur = open.pop();
    if (cur === goalIdx) break;
    if (closed[cur]) continue; // stale heap entry
    closed[cur] = 1;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (grid.isBlocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (grid.isBlocked(cx + dx, cy) || grid.isBlocked(cx, cy + dy))) continue;
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const cost = g[cur] + (dx !== 0 && dy !== 0 ? SQRT2 : 1);
      if (cost < g[ni]) {
        g[ni] = cost;
        f[ni] = cost + octile(nx, ny, goal.tx, goal.ty);
        came[ni] = cur;
        open.push(ni); // duplicates are fine; stale ones are skipped above
      }
    }
  }

  if (s !== goalIdx && came[goalIdx] === -1) return null;
  const path: TilePos[] = [];
  for (let c = goalIdx; c !== -1; c = came[c]) path.push({ tx: c % w, ty: Math.floor(c / w) });
  return path.reverse();
}

/**
 * If the user clicks on a wall or a desk, walk to the closest free tile
 * instead (breadth-first search outward from the click).
 */
export function nearestWalkable(grid: CollisionGrid, target: TilePos, maxRadius = 6): TilePos | null {
  if (!grid.isBlocked(target.tx, target.ty)) return target;
  const seen = new Set<number>();
  const queue: TilePos[] = [target];
  seen.add(target.ty * grid.w + target.tx);
  while (queue.length) {
    const t = queue.shift()!;
    if (Math.abs(t.tx - target.tx) > maxRadius || Math.abs(t.ty - target.ty) > maxRadius) continue;
    if (!grid.isBlocked(t.tx, t.ty)) return t;
    for (const [dx, dy] of DIRS.slice(0, 4)) {
      const nt = { tx: t.tx + dx, ty: t.ty + dy };
      const k = nt.ty * grid.w + nt.tx;
      if (!grid.inBounds(nt.tx, nt.ty) || seen.has(k)) continue;
      seen.add(k);
      queue.push(nt);
    }
  }
  return null;
}

/** Can a character walk in a straight line from a to b without hitting anything? */
export function hasLineOfSight(grid: CollisionGrid, a: Vec2, b: Vec2): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.ceil(dist / (Math.min(FEET_HITBOX.w, FEET_HITBOX.h) / 2));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!canStandAt(grid, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

/**
 * Turn a tile path into pixel waypoints and drop the ones we can skip
 * ("string pulling"), so characters walk in smooth straight lines instead of
 * zig-zagging from tile centre to tile centre.
 */
export function smoothPath(grid: CollisionGrid, from: Vec2, tiles: TilePos[]): Vec2[] {
  const pts = tiles.map(tileCenter);
  if (pts.length === 0) return [];
  const out: Vec2[] = [];
  let anchor = from;
  let i = 0;
  while (i < pts.length) {
    let far = i;
    for (let j = pts.length - 1; j > i; j--) {
      if (hasLineOfSight(grid, anchor, pts[j])) { far = j; break; }
    }
    out.push(pts[far]);
    anchor = pts[far];
    i = far + 1;
  }
  return out;
}

