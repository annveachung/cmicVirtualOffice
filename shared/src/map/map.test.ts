import { describe, expect, it } from 'vitest';
import { FURNITURE, footprint } from './furniture.js';
import { DESKS, MAP_H, MAP_W, PLACEMENTS, SPAWN, TILES, isSolidTile } from './office.js';
import { buildCollisionGrid, canStandAt, moveWithCollision, tileCenter } from './collision.js';
import { findPath, nearestWalkable, smoothPath } from './pathfinding.js';

const grid = buildCollisionGrid();

/** Flood-fill every walkable tile reachable from spawn. */
function reachableFromSpawn(): Set<number> {
  const seen = new Set<number>([SPAWN.ty * MAP_W + SPAWN.tx]);
  const q = [SPAWN];
  while (q.length) {
    const t = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = t.tx + dx, ny = t.ty + dy;
      const k = ny * MAP_W + nx;
      if (!grid.isBlocked(nx, ny) && !seen.has(k)) { seen.add(k); q.push({ tx: nx, ty: ny }); }
    }
  }
  return seen;
}

describe('office map data', () => {
  it('has consistent dimensions', () => {
    expect(TILES).toHaveLength(MAP_H);
    for (const row of TILES) expect(row).toHaveLength(MAP_W);
  });

  it('keeps washrooms private: no glass next to them', () => {
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++) {
        if (TILES[y][x] !== 'b') continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) expect(TILES[y + dy]?.[x + dx], `${x},${y}`).not.toBe('G');
      }
  });

  it('is enclosed by walls', () => {
    for (let x = 0; x < MAP_W; x++) { expect(TILES[0][x]).toBe('#'); expect(TILES[MAP_H - 1][x]).toBe('#'); }
    for (let y = 0; y < MAP_H; y++) { expect(TILES[y][0]).toBe('#'); expect(TILES[y][MAP_W - 1]).toBe('#'); }
  });

  it('places furniture inside the map, on the right kind of tile', () => {
    for (const p of PLACEMENTS) {
      const { w, h } = footprint(p);
      for (let y = p.ty; y < p.ty + h; y++)
        for (let x = p.tx; x < p.tx + w; x++) {
          const tile = TILES[y]?.[x];
          expect(tile, `${p.id} out of bounds`).toBeDefined();
          // wall decor needs a solid wall (not glass); everything else needs floor
          if (FURNITURE[p.type].layer === 'wall') expect(tile, `${p.id} should hang on a solid wall`).toBe('#');
          else expect(isSolidTile(tile!), `${p.id} should stand on floor`).toBe(false);
        }
    }
  });

  it('has no overlapping blocking furniture (except items placed on top of counters)', () => {
    const owner = new Map<number, string>();
    for (const p of PLACEMENTS) {
      const def = FURNITURE[p.type] as { blocks: boolean; onTop?: boolean };
      if (!def.blocks || def.onTop) continue;
      const { w, h } = footprint(p);
      for (let y = p.ty; y < p.ty + h; y++)
        for (let x = p.tx; x < p.tx + w; x++) {
          const k = y * MAP_W + x;
          expect(owner.get(k), `${p.id} overlaps ${owner.get(k)}`).toBeUndefined();
          owner.set(k, p.id);
        }
    }
  });

  it('has 16 desks with a reachable spot next to every chair', () => {
    expect(DESKS).toHaveLength(16);
    expect(new Set(DESKS.map((d) => d.id)).size).toBe(16);
    const reach = reachableFromSpawn();
    for (const d of DESKS) {
      const sides = [d.chair.tx - 1, d.chair.tx + 1].map((x) => d.chair.ty * MAP_W + x);
      expect(sides.some((k) => reach.has(k)), `desk ${d.id}`).toBe(true);
    }
  });

  it('has no unreachable pockets of floor', () => {
    const reach = reachableFromSpawn();
    const orphans: string[] = [];
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++) if (!grid.isBlocked(x, y) && !reach.has(y * MAP_W + x)) orphans.push(`${x},${y}`);
    expect(orphans).toEqual([]);
  });
});

describe('collision', () => {
  it('lets you stand at spawn but not inside a wall', () => {
    const s = tileCenter(SPAWN);
    expect(canStandAt(grid, s.x, s.y)).toBe(true);
    expect(canStandAt(grid, 8, 8)).toBe(false);
  });

  it('slides along a wall instead of stopping dead', () => {
    // stand just below the back wall, push up-right
    const start = { x: 11 * 16 + 8, y: 3 * 16 + 3 }; // clear floor right under the lounge's back wall
    const next = moveWithCollision(grid, start, 2, -2);
    expect(next.x).toBe(start.x + 2); // x movement still applied
    expect(next.y).toBe(start.y); // y blocked by wall
  });
});

describe('pathfinding', () => {
  it('finds a path from spawn into the coffee corner', () => {
    const path = findPath(grid, SPAWN, { tx: 35, ty: 4 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual(SPAWN);
    expect(path![path!.length - 1]).toEqual({ tx: 35, ty: 4 });
    for (const t of path!) expect(grid.isBlocked(t.tx, t.ty)).toBe(false);
  });

  it('never cuts diagonally around a blocked corner', () => {
    const path = findPath(grid, SPAWN, { tx: 52, ty: 26 })!;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if (a.tx !== b.tx && a.ty !== b.ty) {
        expect(grid.isBlocked(b.tx, a.ty)).toBe(false);
        expect(grid.isBlocked(a.tx, b.ty)).toBe(false);
      }
    }
  });

  it('returns null for blocked goals and redirects clicks to the nearest free tile', () => {
    expect(findPath(grid, SPAWN, { tx: 0, ty: 0 })).toBeNull();
    const desk = DESKS[0].desk;
    const near = nearestWalkable(grid, desk)!;
    expect(grid.isBlocked(near.tx, near.ty)).toBe(false);
  });

  it('smooths a path into fewer straight-line waypoints', () => {
    const tiles = findPath(grid, SPAWN, { tx: 16, ty: 29 })!;
    const smooth = smoothPath(grid, tileCenter(SPAWN), tiles);
    expect(smooth.length).toBeLessThan(tiles.length);
    expect(smooth[smooth.length - 1]).toEqual(tileCenter({ tx: 16, ty: 29 }));
  });
});

describe('activity spots', () => {
  it('every spot (seats + gym + arcade) can be reached from the entrance', async () => {
    const { SPOTS, approachTiles } = await import('./spots.js');
    expect(SPOTS.length).toBeGreaterThan(60);
    for (const s of SPOTS) {
      const ok = approachTiles(grid, s).some((t) => findPath(grid, SPAWN, t));
      expect(ok, `spot ${s.id}`).toBe(true);
    }
  });

  it('has every gym activity', async () => {
    const { SPOTS } = await import('./spots.js');
    const actions = new Set(SPOTS.map((s) => s.action));
    for (const a of ['run', 'pedal', 'lift', 'benchPress', 'stretch', 'punch', 'play']) expect(actions.has(a as never), a).toBe(true);
  });

  it('floor spots are on walkable tiles, furniture spots are not', async () => {
    const { SPOTS } = await import('./spots.js');
    for (const s of SPOTS) expect(grid.isBlocked(s.tile.tx, s.tile.ty), s.id).toBe(!s.onFloor);
  });

  it('lets you sit on every toilet, use every urinal and wash at every basin', async () => {
    const { SPOTS } = await import('./spots.js');
    expect(SPOTS.filter((s) => s.id.startsWith('toilet')).every((s) => s.action === 'sit')).toBe(true);
    expect(SPOTS.filter((s) => s.id.startsWith('toilet')).length).toBe(5);
    expect(SPOTS.filter((s) => s.action === 'wash').length).toBe(4);
    expect(SPOTS.filter((s) => s.action === 'pee').length).toBe(2);
  });

  it('has places to present from on the stage', async () => {
    const { SPOTS } = await import('./spots.js');
    expect(SPOTS.filter((s) => s.action === 'present').length).toBe(2);
  });

  it('clicking a desk or a treadmill resolves to the right spot', async () => {
    const { spotForTile } = await import('./spots.js');
    const d = DESKS[4];
    expect(spotForTile({ tx: d.desk.tx + 2, ty: d.desk.ty + 1 })?.tile).toEqual(d.chair);
    expect(spotForTile({ tx: 49, ty: 20 })?.action).toBe('run');
  });

  it('spawns on a walkable tile', () => {
    expect(grid.isBlocked(SPAWN.tx, SPAWN.ty)).toBe(false);
  });
});
