import { TILE } from '../config.js';
import type { Direction, TilePos, Vec2 } from '../types.js';
import type { CollisionGrid } from './collision.js';
import { footprint, type Placement } from './furniture.js';
import { DESKS, PLACEMENTS } from './office.js';

/**
 * ACTIVITY SPOTS — everything you can *use*: sit on a chair, run on a
 * treadmill, stretch on a yoga mat, punch the bag, play ping-pong...
 *
 * They're all the same idea: a position + facing + animation. You walk to a
 * free tile next to it (or onto it, if it's floor like a yoga mat), press E
 * or click, and your character snaps into place and starts the animation.
 * Moving again ends it and puts you back where you stood.
 *
 * Spots are derived from furniture data, so adding a treadmill to the map
 * automatically makes it usable.
 */
export type SpotAction = 'sit' | 'run' | 'pedal' | 'lift' | 'benchPress' | 'stretch' | 'punch' | 'play' | 'wash' | 'pee' | 'present' | 'sing' | 'dance' | 'costume' | 'vend' | 'mascot' | 'ballpit';

/** Actions that happen once (a toggle, a snack, a poke) instead of putting you in a pose. */
export const INSTANT_ACTIONS: ReadonlySet<SpotAction> = new Set(['costume', 'vend', 'mascot']);

export interface Spot {
  id: string;
  action: SpotAction;
  /** Word shown in the "E · ___" hint. */
  verb: string;
  /** The tile the character occupies while using it. */
  tile: TilePos;
  facing: Direction;
  /** Pixel position of the character's feet while using it. */
  pos: Vec2;
  /** Tiles that select this spot when clicked (e.g. any tile of the treadmill). */
  clickTiles: TilePos[];
  /** True when the spot is ordinary walkable floor (yoga mat, in front of the rack). */
  onFloor: boolean;
}

const VERB: Record<SpotAction, string> = {
  sit: 'sit',
  run: 'run',
  pedal: 'ride',
  lift: 'lift',
  benchPress: 'lift',
  stretch: 'stretch',
  punch: 'punch',
  play: 'play',
  wash: 'wash hands',
  pee: 'pee',
  present: 'present',
  sing: 'sing',
  dance: 'dance',
  costume: 'potato suit',
  vend: 'get a snack',
  mascot: 'poke Mr. Potato',
  ballpit: 'bounce',
};

function footprintTiles(p: Placement): TilePos[] {
  const { w, h } = footprint(p);
  const out: TilePos[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push({ tx: p.tx + x, ty: p.ty + y });
  return out;
}

function spot(
  id: string,
  action: SpotAction,
  tile: TilePos,
  facing: Direction,
  opts: { dy?: number; clickTiles?: TilePos[]; onFloor?: boolean } = {},
): Spot {
  return {
    id,
    action,
    verb: VERB[action],
    tile,
    facing,
    pos: { x: tile.tx * TILE + TILE / 2, y: tile.ty * TILE + TILE / 2 + (opts.dy ?? 0) },
    clickTiles: opts.clickTiles ?? [tile],
    onFloor: opts.onFloor ?? false,
  };
}

/** How each furniture type turns into spots. */
function spotsFor(p: Placement): Spot[] {
  const t = (dx: number, dy: number): TilePos => ({ tx: p.tx + dx, ty: p.ty + dy });
  switch (p.type) {
    case 'chair':
    case 'deskChair':
    case 'armchair':
    case 'beanBag': {
      const facing = p.dir ?? 'down';
      // Facing the camera you sit a little lower, so the desk/table in front hides your legs.
      return [spot(p.id, 'sit', t(0, 0), facing, { dy: facing === 'down' ? 2 : 0 })];
    }
    case 'boothBench': // two seats per bench, facing the table
      return footprintTiles(p).map((c, i) => spot(`${p.id}:${i}`, 'sit', c, p.dir ?? 'right'));
    case 'sofa': // every cushion is its own seat
      return Array.from({ length: footprint(p).w }, (_, i) => spot(`${p.id}:${i}`, 'sit', t(i, 0), 'down', { dy: 2 }));
    case 'treadmill':
      return [spot(p.id, 'run', t(0, 1), 'up', { dy: -2, clickTiles: footprintTiles(p) })];
    case 'exerciseBike':
      return [spot(p.id, 'pedal', t(0, 0), 'down', { dy: -8 })];
    case 'weightBench':
      return [spot(p.id, 'benchPress', t(0, 1), 'down', { dy: -2, clickTiles: footprintTiles(p) })];
    case 'weightRack': // stand in front of the rack and curl dumbbells
      return [spot(p.id, 'lift', t(1, 1), 'up', { clickTiles: [...footprintTiles(p), t(1, 1)], onFloor: true })];
    case 'yogaMat':
      return [spot(p.id, 'stretch', t(0, 1), 'down', { dy: -6, clickTiles: footprintTiles(p), onFloor: true })];
    case 'punchingBag':
      return [spot(p.id, 'punch', t(-1, 0), 'right', { clickTiles: [t(0, 0), t(-1, 0)], onFloor: true })];
    case 'pingPong': { // one player at each end
      const { w } = footprint(p);
      const half = Math.floor(w / 2);
      const left = footprintTiles(p).filter((c) => c.tx < p.tx + half);
      const right = footprintTiles(p).filter((c) => c.tx >= p.tx + half);
      return [
        spot(`${p.id}:west`, 'punch', t(-1, 0), 'right', { clickTiles: [...left, t(-1, 0)], onFloor: true }),
        spot(`${p.id}:east`, 'punch', t(w, 1), 'left', { clickTiles: [...right, t(w, 1)], onFloor: true }),
      ];
    }
    case 'toilet': // sit facing out of the cubicle — you can see who's "busy" 🚽
      return [spot(p.id, 'sit', t(0, 0), 'down', { dy: 2 })];
    case 'podium': // stand behind the lectern, facing the audience
      return [spot(p.id, 'present', t(0, -1), 'down', { dy: 3, clickTiles: [t(0, 0), t(0, -1)], onFloor: true })];
    case 'micStand': // step up to the karaoke mic, facing the room
      return [spot(p.id, 'sing', t(0, 0), 'down', { dy: 2, onFloor: true })];
    case 'danceFloor': // every tile of the dance floor is a place to dance
      return footprintTiles(p).map((c, i) => spot(`${p.id}:${i}`, 'dance', c, 'down', { onFloor: true }));
    case 'potatoVending':
      return [spot(p.id, 'vend', t(0, 1), 'up', { clickTiles: [t(0, 0), t(0, 1)], onFloor: true })];
    case 'costumeRack':
      return [spot(p.id, 'costume', t(0, 1), 'up', { clickTiles: [t(0, 0), t(0, 1)], onFloor: true })];
    case 'potatoMascot':
      return [spot(p.id, 'mascot', t(0, 0), 'down')];
    case 'stage': { // centre stage, in front of the screen
      if (p.variant === 1) return []; // the karaoke stage uses the mic instead
      const { w, h } = footprint(p);
      const centre = t(Math.floor(w / 2) - 1, h - 1);
      return [spot(`${p.id}:centre`, 'present', centre, 'down', { onFloor: true })];
    }
    case 'urinal': // stand right up to it, facing the wall; the urinal hides your legs
      return [spot(p.id, 'pee', t(0, -1), 'down', { dy: 6, clickTiles: [t(0, 0), t(0, -1)], onFloor: true })];
    case 'vanity': // one basin every two tiles; stand in front of it
      return Array.from({ length: Math.ceil(footprint(p).w / 2) }, (_, i) =>
        spot(`${p.id}:${i}`, 'wash', t(i * 2, 1), 'up', { clickTiles: [t(i * 2, 0), t(i * 2, 1)], onFloor: true }),
      );
    case 'arcade': // against a side wall (dir = way the screen faces) or the back wall
      if (p.dir === 'left') return [spot(p.id, 'play', t(-1, 0), 'right', { clickTiles: [t(0, 0), t(-1, 0)], onFloor: true })];
      if (p.dir === 'right') return [spot(p.id, 'play', t(1, 0), 'left', { clickTiles: [t(0, 0), t(1, 0)], onFloor: true })];
      return [spot(p.id, 'play', t(0, 1), 'up', { clickTiles: [t(0, 0), t(0, 1)], onFloor: true })];
    case 'ballPit': // every tile of the pit is a place to bounce
      return footprintTiles(p).map((c, i) => spot(`${p.id}:${i}`, 'ballpit', c, 'down', { dy: 2, onFloor: true }));
    default:
      return [];
  }
}

export const SPOTS: Spot[] = PLACEMENTS.flatMap(spotsFor);

const key = (t: TilePos) => `${t.tx},${t.ty}`;
const byClickTile = new Map<string, Spot>();
for (const s of SPOTS) for (const c of s.clickTiles) if (!byClickTile.has(key(c))) byClickTile.set(key(c), s);

/** The spot a click on this tile means — including clicking a desk to use its chair. */
export function spotForTile(t: TilePos): Spot | undefined {
  const direct = byClickTile.get(key(t));
  if (direct) return direct;
  const d = DESKS.find((d) => t.tx >= d.desk.tx && t.tx < d.desk.tx + 3 && t.ty >= d.desk.ty && t.ty < d.desk.ty + 2);
  return d ? SPOTS.find((s) => s.tile.tx === d.chair.tx && s.tile.ty === d.chair.ty) : undefined;
}

export function spotById(id: string): Spot | undefined {
  return SPOTS.find((s) => s.id === id);
}

/** Tiles you can stand on to start using a spot (the spot itself if it's floor, else its neighbours). */
export function approachTiles(grid: CollisionGrid, s: Spot): TilePos[] {
  const out: TilePos[] = [];
  if (s.onFloor && !grid.isBlocked(s.tile.tx, s.tile.ty)) out.push(s.tile);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const t = { tx: s.tile.tx + dx, ty: s.tile.ty + dy };
      if (!grid.isBlocked(t.tx, t.ty)) out.push(t);
    }
  const d = (t: TilePos) => Math.abs(t.tx - s.tile.tx) + Math.abs(t.ty - s.tile.ty);
  return out.sort((a, b) => d(a) - d(b)); // on-spot first, then orthogonal neighbours
}

/** Is someone standing on tile `t` close enough to use `s`? */
export function canReachSpot(t: TilePos, s: Spot): boolean {
  return Math.max(Math.abs(t.tx - s.tile.tx), Math.abs(t.ty - s.tile.ty)) <= 1;
}

const STEP: Record<Direction, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/**
 * Tiles from which a spot counts as "in front of you" — used for the "E · sit"
 * hint and the E key, so standing BEHIND a sofa (e.g. to look out of the window)
 * doesn't nag you to sit down.
 *
 * - Floor spots (dance floor, yoga mat, in front of a machine): stand on the spot itself.
 * - Otherwise the tile it faces; if that's blocked (a chair tucked under a desk),
 *   the tiles beside it; failing that, the tile behind it (a toilet against the wall).
 */
export function frontTiles(grid: CollisionGrid, s: Spot): TilePos[] {
  if (s.onFloor) return [s.tile];
  const [dx, dy] = STEP[s.facing];
  const at = (x: number, y: number) => ({ tx: s.tile.tx + x, ty: s.tile.ty + y });
  const free = (t: TilePos) => !grid.isBlocked(t.tx, t.ty);
  const front = at(dx, dy);
  if (free(front)) return [front];
  const sides = [at(dy, dx), at(-dy, -dx)].filter(free);
  if (sides.length) return sides;
  return [at(-dx, -dy)].filter(free);
}

export function isInFrontOf(grid: CollisionGrid, t: TilePos, s: Spot): boolean {
  return frontTiles(grid, s).some((f) => f.tx === t.tx && f.ty === t.ty);
}
