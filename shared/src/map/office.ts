import type { TilePos } from '../types.js';
import type { Placement } from './furniture.js';

/**
 * THE OFFICE MAP — pure data, no rendering.
 *
 * Both the client (to draw + predict movement) and the server (to validate
 * movement) import this file, so there is exactly one source of truth for
 * where walls and furniture are.
 *
 * Tile kinds:
 *   '#' wall      'c' carpet (open-plan hall)   'w' wooden floor
 *   'k' pantry tiles                            'g' gym rubber floor
 *
 * Kept compact (54 x 31) so the whole office fits a typical monitor at a
 * comfortable size — you can see where everyone is without zooming.
 *
 *   ┌──────────────┬────────────┬─────────────────────┐
 *   │ Presentation │   Lounge   │       Pantry        │
 *   ├─────┬────────┴────────────┴───────┬─────────────┤
 *   │ Off1│                             │   Meeting   │
 *   ├─────┤                             ├─────────────┤
 *   │ Off2│   Open-plan hall: 12 desks  │             │
 *   ├─────┤   in pairs, pods and solo   │     Gym     │
 *   │ Off3│                             │             │
 *   ├─────┤                             │             │
 *   │ Off4│                             │             │
 *   └─────┴─────────[ entrance ]────────┴─────────────┘
 */
export type TileKind = '#' | 'c' | 'w' | 'k' | 'g';

export const MAP_W = 54;
export const MAP_H = 31;

// ---------------------------------------------------------------------------
// Floor plan
// ---------------------------------------------------------------------------

/** Private offices down the left side (4 rows tall each). */
const OFFICE_ROOMS = [11, 16, 21, 26].map((y0) => ({ y0, y1: y0 + 3 }));

function buildTiles(): TileKind[][] {
  const g: TileKind[][] = Array.from({ length: MAP_H }, () => Array<TileKind>(MAP_W).fill('#'));
  const rect = (x0: number, y0: number, x1: number, y1: number, k: TileKind) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = k;
  };

  // Top row of rooms (rows 0-2 are the tall back wall), divider wall at row 10
  rect(1, 3, 16, 9, 'w'); // presentation room
  rect(18, 3, 30, 9, 'w'); // lounge
  rect(32, 3, 52, 9, 'k'); // pantry

  rect(8, 11, 41, 29, 'c'); // open-plan hall
  for (const r of OFFICE_ROOMS) rect(1, r.y0, 6, r.y1, 'w'); // private offices
  rect(43, 11, 52, 18, 'w'); // meeting room
  rect(43, 20, 52, 29, 'g'); // gym

  // Doorways
  rect(13, 10, 15, 10, 'c'); // presentation room
  rect(21, 10, 27, 10, 'c'); // lounge (wide opening)
  rect(34, 10, 37, 10, 'c'); // pantry
  for (const r of OFFICE_ROOMS) rect(7, r.y0 + 1, 7, r.y0 + 2, 'w'); // office doors
  rect(42, 14, 42, 15, 'w'); // meeting room
  rect(42, 23, 42, 25, 'g'); // gym
  return g;
}

export const TILES: TileKind[][] = buildTiles();

// ---------------------------------------------------------------------------
// Desks — 4 private offices + 12 open-plan desks in mixed groups, so people
// can pick a quiet corner or sit next to their work buddies.
//
// facing 'down': chair ABOVE the desk, you face the camera (we see the monitor's back)
// facing 'up':   chair BELOW the desk, you face away (we see the glowing screen)
// ---------------------------------------------------------------------------

export type DeskFacing = 'down' | 'up';

export interface DeskDef {
  id: number; // stable — stored in the DB later as assigned_desk_id
  label: string;
  zone: 'office' | 'open';
  facing: DeskFacing;
  desk: TilePos; // top-left of the 3x2 desk
  chair: TilePos;
}

const desk = (id: number, label: string, zone: DeskDef['zone'], facing: DeskFacing, tx: number, ty: number): DeskDef => ({
  id,
  label,
  zone,
  facing,
  desk: { tx, ty },
  chair: facing === 'down' ? { tx: tx + 1, ty: ty - 1 } : { tx: tx + 1, ty: ty + 2 },
});

export const DESKS: DeskDef[] = [
  ...OFFICE_ROOMS.map((r, i) => desk(i + 1, `Private office ${i + 1}`, 'office', 'down', 1, r.y0 + 1)),
  // Buddy pair, side by side
  desk(5, 'Buddy pair · left', 'open', 'down', 10, 14),
  desk(6, 'Buddy pair · right', 'open', 'down', 13, 14),
  // Face-to-face pair (monitors back to back)
  desk(7, 'Face-to-face · north', 'open', 'down', 19, 13),
  desk(8, 'Face-to-face · south', 'open', 'up', 19, 15),
  // Trio row near the pantry
  desk(9, 'Trio · left', 'open', 'down', 26, 14),
  desk(10, 'Trio · middle', 'open', 'down', 29, 14),
  desk(11, 'Trio · right', 'open', 'down', 32, 14),
  // Quiet solo spot by the meeting room wall
  desk(12, 'Quiet corner', 'open', 'down', 37, 20),
  // Pod of four (two facing two)
  desk(13, 'Pod of four · NW', 'open', 'down', 22, 21),
  desk(14, 'Pod of four · NE', 'open', 'down', 25, 21),
  desk(15, 'Pod of four · SW', 'open', 'up', 22, 23),
  desk(16, 'Pod of four · SE', 'open', 'up', 25, 23),
];

// ---------------------------------------------------------------------------
// Furniture
// ---------------------------------------------------------------------------

let auto = 0;
const P = (type: Placement['type'], tx: number, ty: number, extra: Partial<Placement> = {}): Placement => ({
  id: extra.id ?? `${type}-${++auto}`,
  type,
  tx,
  ty,
  ...extra,
});

const deskPlacements: Placement[] = DESKS.flatMap((d) => [
  P('deskChair', d.chair.tx, d.chair.ty, { id: `desk-${d.id}-chair`, dir: d.facing, variant: d.id }),
  P('desk', d.desk.tx, d.desk.ty, { id: `desk-${d.id}`, dir: d.facing, variant: d.id }),
]);

const officeDecor: Placement[] = OFFICE_ROOMS.flatMap((r, i) => [
  P('painting', 3, r.y0 - 1, { variant: i }),
  P('plant', 1, r.y0, { variant: i % 3 }),
  P('bookshelf', 5, r.y0, { variant: i }),
  P('armchair', 6, r.y1, { dir: 'left' }),
  P('plantSmall', 1, r.y1),
]);

/** Two rows of audience chairs with a centre aisle, all facing the stage. */
const audience: Placement[] = [6, 8].flatMap((y) => [3, 4, 5, 10, 11, 12].map((x) => P('chair', x, y, { dir: 'up' })));

export const PLACEMENTS: Placement[] = [
  // ---- Presentation room ----
  P('whiteboard', 1, 1),
  P('screen', 6, 1, { w: 4 }),
  P('window', 11, 1),
  P('clock', 14, 1),
  P('stage', 3, 3, { w: 10, h: 2 }),
  P('podium', 11, 3),
  ...audience,
  P('plant', 16, 3, { variant: 1 }),
  P('plant', 1, 9, { variant: 2 }),
  P('plantSmall', 16, 9),

  // ---- Lounge (with arcade machines) ----
  P('window', 21, 1),
  P('painting', 23, 1, { variant: 0 }),
  P('painting', 24, 1, { variant: 1 }),
  P('window', 25, 1),
  P('plant', 18, 3, { variant: 2 }),
  P('bookshelf', 19, 3, { variant: 1 }),
  P('rug', 21, 4, { w: 6, h: 5, variant: 0 }),
  P('sofa', 22, 4, { dir: 'down' }),
  P('coffeeTable', 23, 6),
  P('armchair', 20, 6, { dir: 'right' }),
  P('armchair', 27, 6, { dir: 'left' }),
  P('floorLamp', 27, 4),
  P('arcade', 28, 3, { id: 'arcade-1', variant: 0 }),
  P('arcade', 29, 3, { id: 'arcade-2', variant: 1 }),
  P('arcade', 30, 3, { id: 'arcade-3', variant: 2 }),
  P('beanBag', 28, 6, { variant: 0 }),
  P('beanBag', 30, 6, { variant: 2 }),
  P('plant', 18, 9, { variant: 1 }),
  P('plantSmall', 30, 9),

  // ---- Pantry ----
  P('upperCabinet', 33, 1),
  P('window', 38, 1),
  P('window', 48, 1),
  P('painting', 51, 1, { variant: 2 }),
  P('counter', 33, 3, { w: 9 }),
  P('microwave', 33, 3),
  P('coffeeMachine', 35, 3, { id: 'coffee-machine' }),
  P('cups', 36, 3),
  P('sink', 39, 3),
  P('bin', 42, 3),
  P('fridge', 43, 3),
  P('waterCooler', 45, 3),
  P('plant', 52, 3, { variant: 2 }),
  // the big communal table
  P('diningTable', 36, 6, { w: 6, h: 2 }),
  ...[37, 38, 39, 40].map((x) => P('chair', x, 5, { dir: 'down', variant: 1 })),
  ...[37, 38, 39, 40].map((x) => P('chair', x, 8, { dir: 'up', variant: 1 })),
  P('chair', 35, 6, { dir: 'right', variant: 1 }),
  P('chair', 42, 6, { dir: 'left', variant: 1 }),
  // little café tables
  P('roundTable', 45, 5),
  P('chair', 44, 5, { dir: 'right', variant: 1 }),
  P('chair', 47, 5, { dir: 'left', variant: 1 }),
  P('roundTable', 50, 5),
  P('chair', 49, 5, { dir: 'right', variant: 1 }),
  P('chair', 52, 5, { dir: 'left', variant: 1 }),
  P('roundTable', 47, 8),
  P('chair', 46, 8, { dir: 'right', variant: 1 }),
  P('chair', 49, 8, { dir: 'left', variant: 1 }),
  P('roundTable', 32, 6),
  P('chair', 32, 5, { dir: 'down', variant: 1 }),
  P('chair', 34, 7, { dir: 'left', variant: 1 }),
  P('plantSmall', 52, 9),
  P('plant', 32, 9, { variant: 0 }),

  // ---- Private offices ----
  ...officeDecor,

  // ---- Open-plan hall ----
  ...deskPlacements,
  P('noticeBoard', 9, 10),
  P('waterCooler', 8, 11),
  P('printer', 39, 11),
  P('plant', 41, 11, { variant: 0 }),
  P('bin', 16, 15),
  P('plantSmall', 18, 14),
  P('bin', 35, 15),
  P('plant', 8, 29, { variant: 0 }),
  P('plant', 41, 29, { variant: 2 }),
  P('plantSmall', 30, 20),
  // chill corner
  P('rug', 9, 20, { w: 6, h: 4, variant: 1 }),
  P('sofa', 10, 20, { dir: 'down' }),
  P('coffeeTable', 11, 22),
  P('plant', 15, 20, { variant: 2 }),
  // reading nook
  P('rug', 31, 25, { w: 5, h: 3, variant: 2 }),
  P('beanBag', 32, 26, { variant: 0 }),
  P('beanBag', 34, 26, { variant: 1 }),
  P('floorLamp', 35, 25),
  // main entrance (bottom wall) — everyone arrives here
  P('entrance', 24, 30),
  P('doormat', 24, 28),

  // ---- Meeting room ----
  P('noticeBoard', 44, 10),
  P('painting', 51, 10, { variant: 1 }),
  P('meetingTable', 45, 13),
  ...[46, 48, 50].map((x) => P('chair', x, 12, { dir: 'down' })),
  ...[46, 48, 50].map((x) => P('chair', x, 16, { dir: 'up' })),
  P('chair', 44, 14, { dir: 'right' }),
  P('chair', 52, 14, { dir: 'left' }),
  P('plant', 43, 11, { variant: 0 }),
  P('plant', 52, 11, { variant: 1 }),
  P('plantSmall', 52, 18),

  // ---- Gym ----
  P('mirror', 44, 19),
  P('mirror', 47, 19),
  P('treadmill', 44, 20, { id: 'treadmill-1' }),
  P('treadmill', 46, 20, { id: 'treadmill-2' }),
  P('exerciseBike', 48, 20, { id: 'bike-1' }),
  P('exerciseBike', 49, 20, { id: 'bike-2' }),
  P('weightRack', 50, 20, { id: 'weight-rack' }),
  P('yogaMat', 44, 24, { id: 'yoga-1', variant: 0 }),
  P('yogaMat', 45, 24, { id: 'yoga-2', variant: 1 }),
  P('yogaMat', 46, 24, { id: 'yoga-3', variant: 2 }),
  P('weightBench', 49, 24, { id: 'bench' }),
  P('waterCooler', 52, 24),
  P('pingPong', 45, 27, { id: 'ping-pong' }),
  P('punchingBag', 52, 27, { id: 'punching-bag' }),
  P('plant', 43, 29, { variant: 1 }),
  P('plant', 52, 29, { variant: 2 }),
];

// ---------------------------------------------------------------------------
// Labels painted on the walls (like door plaques)
// ---------------------------------------------------------------------------

export interface AreaLabel {
  text: string;
  /** Tile-space centre of the plaque (fractional allowed). */
  tx: number;
  ty: number;
}

export const AREA_LABELS: AreaLabel[] = [
  { text: 'Presentation', tx: 18.5, ty: 10.5 },
  { text: 'Lounge', tx: 29.5, ty: 10.5 },
  { text: 'Pantry', tx: 32.5, ty: 10.5 },
  { text: 'Meeting Room', tx: 48, ty: 10.5 },
  { text: 'Gym', tx: 51, ty: 19.5 },
];

/** Everyone arrives just inside the main entrance (bottom of the open-plan hall). */
export const SPAWN: TilePos = { tx: 25, ty: 29 };
