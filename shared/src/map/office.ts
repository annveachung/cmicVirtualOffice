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
 * Rough plan (60 x 38 tiles):
 *
 *   ┌────────────────────┬─────────────┬──────────────────────┐
 *   │ Presentation room  │   Lounge    │       Pantry         │
 *   │  (stage + seats)   │ (+ arcades) │ (long table, cafés)  │
 *   ├──────┬─────────────┴─────────────┴────────┬─────────────┤
 *   │ Off1 │                                    │  Meeting    │
 *   ├──────┤      Open-plan hall: 12 desks      ├─────────────┤
 *   │ Off2 │      in pairs, pods and solo        │             │
 *   ├──────┤      spots + a chill corner         │    Gym      │
 *   │ Off3 │                                    │             │
 *   ├──────┤                                    │             │
 *   │ Off4 │                                    │             │
 *   └──────┴──────────────[ entrance ]──────────┴─────────────┘
 */
export type TileKind = '#' | 'c' | 'w' | 'k' | 'g';

export const MAP_W = 60;
export const MAP_H = 38;

// ---------------------------------------------------------------------------
// Floor plan
// ---------------------------------------------------------------------------

/** Private offices down the left side: top row of each room + door rows. */
const OFFICE_ROOMS = [
  { y0: 13, y1: 17 },
  { y0: 19, y1: 23 },
  { y0: 25, y1: 29 },
  { y0: 31, y1: 36 },
];

function buildTiles(): TileKind[][] {
  const g: TileKind[][] = Array.from({ length: MAP_H }, () => Array<TileKind>(MAP_W).fill('#'));
  const rect = (x0: number, y0: number, x1: number, y1: number, k: TileKind) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = k;
  };

  // Top row of rooms (rows 0-2 are the tall back wall), divider wall at row 12
  rect(1, 3, 20, 11, 'w'); // presentation room
  rect(22, 3, 35, 11, 'w'); // lounge
  rect(37, 3, 58, 11, 'k'); // pantry

  // Open-plan hall
  rect(9, 13, 44, 36, 'c');

  // Private offices (x 1-7), separated by single-tile walls
  for (const r of OFFICE_ROOMS) rect(1, r.y0, 7, r.y1, 'w');

  // Meeting room (top right) and gym (bottom right)
  rect(46, 13, 58, 22, 'w');
  rect(46, 24, 58, 36, 'g');

  // Doorways
  rect(9, 12, 11, 12, 'c'); // presentation room
  rect(25, 12, 32, 12, 'c'); // lounge (wide opening)
  rect(39, 12, 42, 12, 'c'); // pantry
  for (const r of OFFICE_ROOMS) rect(8, r.y0 + 2, 8, r.y0 + 3, 'w'); // office doors
  rect(45, 16, 45, 18, 'w'); // meeting room
  rect(45, 29, 45, 31, 'g'); // gym
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
  label: string; // shown in the desk picker
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
  // Private offices
  ...OFFICE_ROOMS.map((r, i) => desk(i + 1, `Private office ${i + 1}`, 'office', 'down', 2, r.y0 + 1)),
  // Buddy pair, side by side
  desk(5, 'Buddy pair · left', 'open', 'down', 11, 16),
  desk(6, 'Buddy pair · right', 'open', 'down', 14, 16),
  // Face-to-face pair (monitors back to back)
  desk(7, 'Face-to-face · north', 'open', 'down', 21, 16),
  desk(8, 'Face-to-face · south', 'open', 'up', 21, 18),
  // Trio row near the pantry
  desk(9, 'Trio · left', 'open', 'down', 28, 15),
  desk(10, 'Trio · middle', 'open', 'down', 31, 15),
  desk(11, 'Trio · right', 'open', 'down', 34, 15),
  // Quiet solo spot
  desk(12, 'Quiet corner', 'open', 'down', 11, 32),
  // Pod of four (two facing two)
  desk(13, 'Pod of four · NW', 'open', 'down', 24, 27),
  desk(14, 'Pod of four · NE', 'open', 'down', 27, 27),
  desk(15, 'Pod of four · SW', 'open', 'up', 24, 29),
  desk(16, 'Pod of four · SE', 'open', 'up', 27, 29),
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
  P('painting', 4, r.y0 - 1, { variant: i }),
  P('bookshelf', 6, r.y0, { variant: i }),
  P('armchair', 6, r.y0 + 3, { dir: 'left' }),
  P('plant', 1, r.y1, { variant: i % 3 }),
]);

/** Two rows of audience chairs with a centre aisle, all facing the stage. */
const audience: Placement[] = [7, 9].flatMap((y) => [5, 6, 7, 12, 13, 14].map((x) => P('chair', x, y, { dir: 'up' })));

export const PLACEMENTS: Placement[] = [
  // ---- Presentation room ----
  P('whiteboard', 2, 1),
  P('screen', 8, 1, { w: 4 }),
  P('window', 14, 1),
  P('window', 17, 1),
  P('clock', 20, 1),
  P('stage', 4, 3, { w: 12, h: 3 }),
  P('podium', 13, 4),
  P('plantSmall', 4, 3),
  P('plantSmall', 15, 3),
  ...audience,
  P('plant', 1, 3, { variant: 0 }),
  P('plant', 20, 3, { variant: 1 }),
  P('plant', 1, 11, { variant: 2 }),
  P('plant', 20, 11, { variant: 0 }),

  // ---- Lounge (with arcade machines) ----
  P('window', 26, 1),
  P('painting', 28, 1, { variant: 0 }),
  P('painting', 29, 1, { variant: 1 }),
  P('window', 30, 1),
  P('plant', 22, 3, { variant: 2 }),
  P('bookshelf', 23, 3, { variant: 1 }),
  P('rug', 25, 5, { w: 6, h: 5, variant: 0 }),
  P('sofa', 26, 5, { dir: 'down' }),
  P('coffeeTable', 27, 7),
  P('armchair', 24, 7, { dir: 'right' }),
  P('armchair', 31, 7, { dir: 'left' }),
  P('floorLamp', 31, 4),
  P('arcade', 33, 3, { id: 'arcade-1', variant: 0 }),
  P('arcade', 34, 3, { id: 'arcade-2', variant: 1 }),
  P('arcade', 35, 3, { id: 'arcade-3', variant: 2 }),
  P('beanBag', 33, 5, { variant: 0 }),
  P('beanBag', 35, 6, { variant: 2 }),
  P('plant', 22, 11, { variant: 1 }),
  P('plantSmall', 35, 11),

  // ---- Pantry ----
  P('upperCabinet', 38, 1),
  P('window', 43, 1),
  P('upperCabinet', 45, 1, { w: 2 }),
  P('window', 54, 1),
  P('painting', 57, 1, { variant: 2 }),
  P('counter', 38, 3, { w: 10 }),
  P('microwave', 38, 3),
  P('coffeeMachine', 40, 3, { id: 'coffee-machine' }),
  P('cups', 41, 3),
  P('sink', 44, 3),
  P('bin', 48, 3),
  P('fridge', 49, 3),
  P('waterCooler', 52, 3),
  P('plant', 58, 3, { variant: 2 }),
  // the big communal table
  P('diningTable', 41, 6, { w: 6, h: 2 }),
  ...[42, 43, 44, 45].map((x) => P('chair', x, 5, { dir: 'down', variant: 1 })),
  ...[42, 43, 44, 45].map((x) => P('chair', x, 8, { dir: 'up', variant: 1 })),
  P('chair', 40, 6, { dir: 'right', variant: 1 }),
  P('chair', 47, 6, { dir: 'left', variant: 1 }),
  // little café tables
  P('roundTable', 50, 6),
  P('chair', 49, 6, { dir: 'right', variant: 1 }),
  P('chair', 52, 6, { dir: 'left', variant: 1 }),
  P('roundTable', 55, 6),
  P('chair', 54, 6, { dir: 'right', variant: 1 }),
  P('chair', 57, 6, { dir: 'left', variant: 1 }),
  P('roundTable', 51, 9),
  P('chair', 50, 9, { dir: 'right', variant: 1 }),
  P('chair', 53, 9, { dir: 'left', variant: 1 }),
  P('roundTable', 55, 9),
  P('chair', 54, 10, { dir: 'right', variant: 1 }),
  P('chair', 57, 10, { dir: 'left', variant: 1 }),
  P('plant', 37, 11, { variant: 0 }),
  P('plantSmall', 58, 11),

  // ---- Private offices ----
  ...officeDecor,

  // ---- Open-plan hall ----
  ...deskPlacements,
  P('noticeBoard', 12, 12),
  P('painting', 33, 12, { variant: 3 }),
  P('waterCooler', 38, 13),
  P('printer', 43, 13),
  P('bin', 17, 17),
  P('plantSmall', 20, 17),
  P('bin', 37, 16),
  P('plant', 44, 21, { variant: 1 }),
  P('plantSmall', 31, 23),
  P('plant', 37, 23, { variant: 0 }),
  P('plantSmall', 41, 20),
  P('plant', 33, 33, { variant: 1 }),
  P('plant', 9, 36, { variant: 0 }),
  P('plant', 44, 36, { variant: 2 }),
  P('plantSmall', 14, 33),
  // main entrance (bottom wall) — everyone arrives here
  P('entrance', 25, 37),
  P('doormat', 25, 35),
  // chill corner
  P('rug', 10, 21, { w: 6, h: 4, variant: 1 }),
  P('sofa', 11, 22, { dir: 'down' }),
  P('coffeeTable', 12, 24),
  P('plant', 16, 22, { variant: 2 }),
  // reading nook
  P('rug', 36, 30, { w: 6, h: 4, variant: 2 }),
  P('beanBag', 37, 31, { variant: 0 }),
  P('beanBag', 39, 32, { variant: 1 }),
  P('floorLamp', 41, 30),

  // ---- Meeting room ----
  P('noticeBoard', 47, 12),
  P('painting', 57, 12, { variant: 1 }),
  P('meetingTable', 49, 16),
  ...[50, 52, 54].map((x) => P('chair', x, 15, { dir: 'down' })),
  ...[50, 52, 54].map((x) => P('chair', x, 19, { dir: 'up' })),
  P('chair', 48, 17, { dir: 'right' }),
  P('chair', 56, 17, { dir: 'left' }),
  P('plant', 46, 13, { variant: 0 }),
  P('plant', 58, 13, { variant: 1 }),
  P('plantSmall', 58, 22),

  // ---- Gym ----
  P('mirror', 47, 23),
  P('mirror', 50, 23),
  P('mirror', 53, 23),
  P('treadmill', 47, 25),
  P('treadmill', 49, 25),
  P('treadmill', 51, 25),
  P('exerciseBike', 53, 25),
  P('exerciseBike', 55, 25),
  P('weightRack', 56, 27),
  P('weightBench', 55, 30),
  P('yogaMat', 47, 29, { variant: 0 }),
  P('yogaMat', 48, 29, { variant: 1 }),
  P('yogaMat', 49, 29, { variant: 2 }),
  P('pingPong', 49, 33),
  P('punchingBag', 57, 33),
  P('waterCooler', 58, 30),
  P('plant', 46, 36, { variant: 1 }),
  P('plant', 58, 36, { variant: 2 }),
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
  { text: 'Presentation Room', tx: 17, ty: 12.5 },
  { text: 'Lounge', tx: 23, ty: 12.5 },
  { text: 'Pantry', tx: 36, ty: 12.5 },
  { text: 'Meeting Room', tx: 52, ty: 12.5 },
  { text: 'Gym', tx: 57, ty: 23.5 },
];

/** Everyone arrives just inside the main entrance (bottom of the open-plan hall). */
export const SPAWN: TilePos = { tx: 26, ty: 36 };
