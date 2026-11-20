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
 * The whole back wall (rows 1-2) is floor-to-ceiling glass with a city skyline
 * behind it — painted by the client, so there are no separate window objects.
 *
 * 59 x 31 tiles ≈ the shape of a typical desktop browser window (~1.9:1),
 * so the office fills the screen edge to edge without zooming.
 *
 *   ┌──────────────┬────────────┬──────────────────────────┐
 *   │    Lounge    │  Meeting   │          Pantry          │
 *   ├─────┬────────┴────────────┴────────────┬─────────────┤
 *   │ Off1│                                  │    Flex     │
 *   ├─────┤                                  │    room     │
 *   │ Off2│   Open-plan hall: 12 desks       ├─────────────┤
 *   ├─────┤   in pairs, pods and solo         │             │
 *   │ Off3│                     ┌─[vanity]──┐│     Gym     │
 *   ├─────┤                     │ W   │  M  ││             │
 *   │ Off4│                     │ ▢▢▢ │ ▢▢⊓⊓││             │
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
  rect(1, 3, 16, 9, 'w'); // lounge (sunny: windows on the back wall)
  rect(18, 3, 30, 9, 'w'); // meeting room with stage (sunny too)
  rect(32, 3, 57, 9, 'k'); // pantry

  rect(8, 11, 46, 29, 'c'); // open-plan hall
  for (const r of OFFICE_ROOMS) rect(1, r.y0, 6, r.y1, 'w'); // private offices
  rect(48, 11, 57, 18, 'w'); // flex room (kept open for a future use)
  rect(48, 20, 57, 29, 'g'); // gym

  // Washrooms (bottom-right of the hall): a shared hand-wash lobby, then
  // separate women's and men's rooms with cubicles.
  rect(37, 23, 46, 29, '#');
  rect(38, 24, 46, 25, 'b'); // shared vanity lobby
  rect(38, 27, 41, 29, 'b'); // women
  rect(43, 27, 46, 29, 'b'); // men

  // Doorways
  rect(13, 10, 15, 10, 'c'); // lounge
  rect(23, 10, 25, 10, 'c'); // meeting room
  rect(34, 10, 37, 10, 'c'); // pantry
  for (const r of OFFICE_ROOMS) rect(7, r.y0 + 1, 7, r.y0 + 2, 'w'); // office doors
  rect(47, 14, 47, 15, 'w'); // flex room
  rect(47, 21, 47, 22, 'g'); // gym
  rect(37, 24, 37, 25, 'b'); // washroom lobby (from the hall)
  rect(40, 26, 40, 26, 'b'); // women's room
  rect(44, 26, 44, 26, 'b'); // men's room
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
  // ---- Lounge (top-left, sunny) ----
  P('plant', 1, 3, { variant: 2 }),
  P('bookshelf', 2, 3, { variant: 1 }),
  P('rug', 4, 4, { w: 6, h: 5, variant: 0 }),
  P('sofa', 5, 4, { dir: 'down' }),
  P('coffeeTable', 6, 6),
  P('armchair', 3, 6, { dir: 'right' }),
  P('armchair', 10, 6, { dir: 'left' }),
  P('floorLamp', 10, 4),
  P('arcade', 13, 3, { id: 'arcade-1', variant: 0 }),
  P('arcade', 14, 3, { id: 'arcade-2', variant: 1 }),
  P('arcade', 15, 3, { id: 'arcade-3', variant: 2 }),
  P('beanBag', 13, 6, { variant: 0 }),
  P('beanBag', 15, 6, { variant: 2 }),
  P('plant', 16, 3, { variant: 1 }),
  P('plant', 1, 9, { variant: 1 }),
  P('plantSmall', 16, 9),

  // ---- Meeting room with a small stage (top-middle, sunny) ----
  P('stage', 19, 3, { w: 11, h: 2 }),
  P('projectorScreen', 22, 3, { w: 4 }),
  P('podium', 27, 4),
  P('meetingTable', 21, 6, { w: 7, h: 2 }),
  ...[22, 23, 24, 25, 26].map((x) => P('deskChair', x, 5, { dir: 'down', variant: 3 })),
  ...[22, 23, 24, 25, 26].map((x) => P('deskChair', x, 8, { dir: 'up', variant: 3 })),
  P('deskChair', 20, 6, { dir: 'right', variant: 3 }),
  P('deskChair', 28, 6, { dir: 'left', variant: 3 }),
  P('plant', 18, 3, { variant: 0 }),
  P('plant', 30, 3, { variant: 2 }),
  P('plantSmall', 18, 9),
  P('plantSmall', 30, 9),

  // ---- Pantry ----
  P('upperCabinet', 33, 1),
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
  P('waterCooler', 8, 11),
  P('printer', 39, 11),
  P('plant', 46, 11, { variant: 0 }),
  P('bin', 16, 15),
  P('plantSmall', 18, 14),
  P('bin', 35, 15),
  P('plant', 8, 29, { variant: 0 }),
  P('plant', 36, 29, { variant: 2 }),
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
  // shared lobby: one long vanity under a wide mirror
  P('mirrorLong', 39, 23, { w: 7 }),
  P('vanity', 39, 24, { w: 7 }),
  P('plantSmall', 46, 24),
  // women: a row of cubicles
  P('toilet', 39, 29, { variant: 0 }),
  P('toilet', 40, 29, { variant: 0 }),
  P('toilet', 41, 29, { variant: 0 }),
  P('plantSmall', 38, 29),
  // men: cubicles + urinals
  P('toilet', 43, 29, { variant: 1 }),
  P('toilet', 44, 29, { variant: 1 }),
  P('urinal', 45, 29),
  P('urinal', 46, 29),

  // ---- Flex room (kept open for a future use) ----
  P('noticeBoard', 48, 10),
  P('painting', 57, 10, { variant: 1 }),
  P('rug', 50, 13, { w: 6, h: 4, variant: 2 }),
  P('beanBag', 51, 14, { variant: 0 }),
  P('beanBag', 54, 14, { variant: 1 }),
  P('beanBag', 52, 16, { variant: 2 }),
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
// Area tags — small labels pinned in the top-left corner inside each room
// ---------------------------------------------------------------------------

export interface AreaLabel {
  text: string;
  /** Top-left floor tile of the room; the tag is pinned just inside that corner. */
  tx: number;
  ty: number;
}

export const AREA_LABELS: AreaLabel[] = [
  { text: 'Lounge', tx: 1, ty: 3 },
  { text: 'Meeting Room', tx: 18, ty: 3 },
  { text: 'Pantry', tx: 32, ty: 3 },
  { text: 'Flex Room', tx: 48, ty: 11 },
  { text: 'Gym', tx: 48, ty: 20 },
  { text: 'Women', tx: 38, ty: 27 },
  { text: 'Men', tx: 43, ty: 27 },
];

/** Everyone arrives just inside the main entrance (bottom of the open-plan hall). */
export const SPAWN: TilePos = { tx: 25, ty: 29 };
