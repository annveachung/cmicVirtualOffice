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
 *   'k' pantry tiles   'g' gym rubber floor     'b' washroom tiles
 *
 * 59 x 31 tiles ≈ the shape of a typical desktop browser window (~1.9:1),
 * so the office fills the screen edge to edge without zooming.
 *
 *   ┌──────────────┬────────────┬──────────────────────────┐
 *   │  Flex room   │   Lounge   │          Pantry          │
 *   ├─────┬────────┴────────────┴────────────┬─────────────┤
 *   │ Off1│                                  │  Meeting +  │
 *   ├─────┤                                  │    stage    │
 *   │ Off2│   Open-plan hall: 12 desks       ├─────────────┤
 *   ├─────┤   in pairs, pods and solo         │             │
 *   │ Off3│                         ┌───┬───┐│     Gym     │
 *   ├─────┤                         │ W │ M ││             │
 *   │ Off4│                         │   │   ││             │
 *   └─────┴─────────[ entrance ]────┴───┴───┴┴─────────────┘
 */
export type TileKind = '#' | 'c' | 'w' | 'k' | 'g' | 'b';

export const MAP_W = 59;
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
  rect(1, 3, 16, 9, 'w'); // flex room
  rect(18, 3, 30, 9, 'w'); // lounge
  rect(32, 3, 57, 9, 'k'); // pantry

  rect(8, 11, 46, 29, 'c'); // open-plan hall
  for (const r of OFFICE_ROOMS) rect(1, r.y0, 6, r.y1, 'w'); // private offices
  rect(48, 11, 57, 18, 'w'); // meeting room
  rect(48, 20, 57, 29, 'g'); // gym

  // Washrooms carved out of the hall's bottom-right corner
  rect(39, 23, 46, 29, '#');
  rect(40, 24, 42, 29, 'b'); // women
  rect(44, 24, 46, 29, 'b'); // men

  // Doorways
  rect(13, 10, 15, 10, 'c'); // flex room
  rect(21, 10, 27, 10, 'c'); // lounge (wide opening)
  rect(34, 10, 37, 10, 'c'); // pantry
  for (const r of OFFICE_ROOMS) rect(7, r.y0 + 1, 7, r.y0 + 2, 'w'); // office doors
  rect(47, 14, 47, 15, 'w'); // meeting room
  rect(47, 21, 47, 22, 'g'); // gym
  rect(41, 23, 41, 23, 'b'); // women's washroom
  rect(45, 23, 45, 23, 'b'); // men's washroom
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
  desk(12, 'Quiet corner', 'open', 'down', 42, 17),
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

export const PLACEMENTS: Placement[] = [
  // ---- Flex room (kept open for a future use) ----
  P('whiteboard', 1, 1),
  P('window', 6, 1),
  P('window', 10, 1),
  P('clock', 14, 1),
  P('rug', 4, 4, { w: 9, h: 4, variant: 2 }),
  P('beanBag', 5, 5, { variant: 0 }),
  P('beanBag', 8, 6, { variant: 1 }),
  P('beanBag', 11, 5, { variant: 2 }),
  P('plant', 1, 3, { variant: 0 }),
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
  P('window', 54, 1),
  P('counter', 33, 3, { w: 9 }),
  P('microwave', 33, 3),
  P('coffeeMachine', 35, 3, { id: 'coffee-machine' }),
  P('cups', 36, 3),
  P('sink', 39, 3),
  P('bin', 42, 3),
  P('fridge', 43, 3),
  P('waterCooler', 45, 3),
  P('plant', 57, 3, { variant: 2 }),
  // the big communal table
  P('diningTable', 36, 6, { w: 6, h: 2 }),
  ...[37, 38, 39, 40].map((x) => P('chair', x, 5, { dir: 'down', variant: 1 })),
  ...[37, 38, 39, 40].map((x) => P('chair', x, 8, { dir: 'up', variant: 1 })),
  P('chair', 35, 6, { dir: 'right', variant: 1 }),
  P('chair', 42, 6, { dir: 'left', variant: 1 }),
  // little café tables
  P('roundTable', 32, 6),
  P('chair', 32, 5, { dir: 'down', variant: 1 }),
  P('chair', 34, 7, { dir: 'left', variant: 1 }),
  P('roundTable', 45, 5),
  P('chair', 44, 5, { dir: 'right', variant: 1 }),
  P('chair', 47, 5, { dir: 'left', variant: 1 }),
  P('roundTable', 50, 5),
  P('chair', 49, 5, { dir: 'right', variant: 1 }),
  P('chair', 52, 5, { dir: 'left', variant: 1 }),
  P('roundTable', 55, 5),
  P('chair', 54, 5, { dir: 'right', variant: 1 }),
  P('chair', 57, 5, { dir: 'left', variant: 1 }),
  P('roundTable', 47, 8),
  P('chair', 46, 8, { dir: 'right', variant: 1 }),
  P('chair', 49, 8, { dir: 'left', variant: 1 }),
  P('roundTable', 53, 8),
  P('chair', 52, 8, { dir: 'right', variant: 1 }),
  P('chair', 55, 8, { dir: 'left', variant: 1 }),
  P('plant', 32, 9, { variant: 0 }),
  P('plantSmall', 57, 9),

  // ---- Private offices ----
  ...officeDecor,

  // ---- Open-plan hall ----
  ...deskPlacements,
  P('noticeBoard', 9, 10),
  P('waterCooler', 8, 11),
  P('printer', 39, 11),
  P('plant', 46, 11, { variant: 0 }),
  P('bin', 16, 15),
  P('plantSmall', 18, 14),
  P('bin', 35, 15),
  P('plant', 8, 29, { variant: 0 }),
  P('plant', 38, 29, { variant: 2 }),
  P('plantSmall', 30, 20),
  P('plant', 46, 19, { variant: 1 }),
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

  // ---- Washrooms ----
  P('washBasin', 40, 24, { variant: 0 }),
  P('washBasin', 42, 24, { variant: 0 }),
  P('toilet', 40, 29),
  P('toilet', 42, 29),
  P('plantSmall', 40, 27),
  P('washBasin', 44, 24, { variant: 1 }),
  P('washBasin', 46, 24, { variant: 1 }),
  P('toilet', 44, 29),
  P('toilet', 46, 29),
  P('plantSmall', 46, 27),

  // ---- Meeting room (with a small stage for presentations) ----
  P('noticeBoard', 48, 10),
  P('painting', 57, 10, { variant: 1 }),
  P('stage', 49, 11, { w: 8, h: 2 }),
  P('projectorScreen', 51, 11, { w: 4 }),
  P('podium', 55, 12),
  P('meetingTable', 50, 14, { w: 6 }),
  ...[51, 52, 53, 54].map((x) => P('chair', x, 13, { dir: 'down' })),
  ...[51, 52, 53, 54].map((x) => P('chair', x, 17, { dir: 'up' })),
  P('chair', 49, 15, { dir: 'right' }),
  P('chair', 56, 15, { dir: 'left' }),
  P('plant', 48, 11, { variant: 0 }),
  P('plant', 57, 11, { variant: 1 }),
  P('plantSmall', 48, 18),
  P('plantSmall', 57, 18),

  // ---- Gym ----
  P('mirror', 49, 19),
  P('mirror', 52, 19),
  P('treadmill', 49, 20, { id: 'treadmill-1' }),
  P('treadmill', 51, 20, { id: 'treadmill-2' }),
  P('exerciseBike', 53, 20, { id: 'bike-1' }),
  P('exerciseBike', 54, 20, { id: 'bike-2' }),
  P('weightRack', 55, 20, { id: 'weight-rack' }),
  P('yogaMat', 49, 24, { id: 'yoga-1', variant: 0 }),
  P('yogaMat', 50, 24, { id: 'yoga-2', variant: 1 }),
  P('yogaMat', 51, 24, { id: 'yoga-3', variant: 2 }),
  P('weightBench', 54, 24, { id: 'bench' }),
  P('waterCooler', 57, 24),
  P('pingPong', 50, 27, { id: 'ping-pong' }),
  P('punchingBag', 57, 27, { id: 'punching-bag' }),
  P('plant', 48, 29, { variant: 1 }),
  P('plant', 57, 29, { variant: 2 }),
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
  { text: 'Flex Room', tx: 18.5, ty: 10.5 },
  { text: 'Lounge', tx: 29.5, ty: 10.5 },
  { text: 'Pantry', tx: 32.5, ty: 10.5 },
  { text: 'Meeting Room', tx: 53, ty: 10.5 },
  { text: 'Gym', tx: 56, ty: 19.5 },
  { text: 'Women', tx: 41.5, ty: 23.5 },
  { text: 'Men', tx: 45.5, ty: 23.5 },
];

/** Everyone arrives just inside the main entrance (bottom of the open-plan hall). */
export const SPAWN: TilePos = { tx: 25, ty: 29 };
