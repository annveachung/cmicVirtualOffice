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
 *   'p' Potato Club party carpet
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
 *   │ Off1│                                  │ The Potato  │
 *   ├─────┤                                  │    Club     │
 *   │ Off2│   Open-plan hall: 12 desks in a  ├─────────────┤
 *   ├─────┤   trio, cluster, 2 pairs, 2 solos │             │
 *   │ Off3│                     ┌─[vanity]──┐│     Gym     │
 *   ├─────┤                     │ M   │  W  ││             │
 *   │ Off4│                     │ ▢▢⊓⊓│ ▢▢▢ ││             │
 *   └─────┴─────────[ entrance ]────┴───┴───┴┴─────────────┘
 */
export type TileKind = '#' | 'c' | 'w' | 'k' | 'g' | 'b' | 'p';

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
  rect(48, 11, 57, 18, 'p'); // The Potato Club (karaoke + dance room)
  rect(48, 20, 57, 29, 'g'); // gym

  // Washrooms (bottom-right of the hall): a shared hand-wash lobby, then
  // separate women's and men's rooms with cubicles.
  rect(37, 23, 46, 29, '#');
  rect(38, 24, 46, 25, 'b'); // shared vanity lobby
  rect(38, 27, 41, 29, 'b'); // men
  rect(43, 27, 46, 29, 'b'); // women

  // Doorways
  rect(13, 10, 15, 10, 'c'); // lounge
  rect(23, 10, 25, 10, 'c'); // meeting room
  rect(34, 10, 37, 10, 'c'); // pantry
  for (const r of OFFICE_ROOMS) rect(7, r.y0 + 1, 7, r.y0 + 2, 'w'); // office doors
  rect(47, 14, 47, 15, 'p'); // The Potato Club
  rect(47, 21, 47, 22, 'g'); // gym
  rect(37, 24, 37, 25, 'b'); // washroom lobby (from the hall)
  rect(40, 26, 40, 26, 'b'); // men's room
  rect(44, 26, 44, 26, 'b'); // women's room
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
  // Trio row: three desks side by side, facing the room
  desk(5, 'Trio row · left', 'open', 'down', 10, 14),
  desk(6, 'Trio row · middle', 'open', 'down', 13, 14),
  desk(7, 'Trio row · right', 'open', 'down', 16, 14),
  // Face-to-face pair (monitors back to back)
  desk(8, 'Face-to-face · north', 'open', 'down', 22, 13),
  desk(9, 'Face-to-face · south', 'open', 'up', 22, 15),
  // Cluster of three: two side by side, a third facing them
  desk(10, 'Cluster · left', 'open', 'down', 28, 13),
  desk(11, 'Cluster · right', 'open', 'down', 31, 13),
  desk(12, 'Cluster · front', 'open', 'up', 28, 15), // lined up under the left desk
  // Side-by-side pair near the sofa corner
  desk(13, 'Sofa-side pair · left', 'open', 'up', 11, 26),
  desk(14, 'Sofa-side pair · right', 'open', 'up', 14, 26),
  // Two single desks, near each other in the middle of the hall
  desk(15, 'Solo spot · west', 'open', 'down', 17, 21), // near the sofa corner, clear of the entrance
  desk(16, 'Solo spot · east', 'open', 'down', 29, 21),
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
  P('floorLamp', 1, r.y0), // fills the corner the chair would otherwise box in
  P('bookshelf', 5, r.y0, { variant: i }),
  P('armchair', 6, r.y1, { dir: 'left' }),
]);

export const PLACEMENTS: Placement[] = [
  // ---- Lounge (top-left, sunny) ----
  // shelf and arcades stand flat against the side walls, keeping the window clear
  P('bookshelf', 1, 4, { w: 1, h: 3, dir: 'right', variant: 1 }),
  // main seating group: two sofas facing each other across a coffee table
  P('rug', 4, 4, { w: 6, h: 5, variant: 0 }),
  P('sofa', 5, 4, { dir: 'down' }),
  P('coffeeTable', 6, 6),
  P('sofa', 5, 8, { dir: 'up' }),
  P('armchair', 3, 6, { dir: 'right' }),
  P('armchair', 10, 6, { dir: 'left' }),
  P('floorLamp', 10, 4),
  P('arcade', 15, 3, { id: 'arcade', variant: 1 }), // one cabinet in the corner, screen facing you

  // ---- Meeting room with a small stage (top-middle, sunny) ----
  P('stage', 19, 3, { w: 11, h: 2 }),
  P('projectorScreen', 22, 3, { w: 4 }),
  P('podium', 27, 4),
  P('meetingTable', 21, 6, { w: 7, h: 2 }),
  // everyone faces the stage: no chairs on the stage side, so the aisle in front of it stays clear
  ...[22, 23, 24, 25, 26].map((x) => P('deskChair', x, 8, { dir: 'up', variant: 3 })),
  ...[6, 7].map((y) => P('deskChair', 20, y, { dir: 'right', variant: 3 })),
  ...[6, 7].map((y) => P('deskChair', 28, y, { dir: 'left', variant: 3 })),

  // ---- Pantry ----
  // the kitchen runs along the RIGHT wall, so the skyline window stays clear
  P('counter', 57, 3, { w: 1, h: 5 }),
  P('microwave', 57, 3),
  P('coffeeMachine', 57, 4, { id: 'coffee-machine' }),
  P('cups', 57, 5),
  P('sink', 57, 6),
  P('fridge', 56, 9),
  P('waterCooler', 55, 9),
  P('bin', 57, 8),
  // left wall: tea & drinks station, then the breakfast/lunch buffet
  P('beverageCounter', 32, 3, { id: 'beverage-station', w: 1, h: 3 }),
  P('buffetCounter', 32, 6, { id: 'buffet', w: 1, h: 3 }),
  // the big communal table sits in the middle, well away from the entrance
  P('diningTable', 42, 5, { w: 6, h: 2 }),
  ...[43, 44, 45, 46].map((x) => P('chair', x, 4, { dir: 'down', variant: 1 })),
  ...[43, 44, 45, 46].map((x) => P('chair', x, 7, { dir: 'up', variant: 1 })),
  P('chair', 41, 5, { dir: 'right', variant: 1 }),
  P('chair', 48, 5, { dir: 'left', variant: 1 }),
  // little café tables, none near the door
  P('roundTable', 37, 4),
  P('chair', 36, 4, { dir: 'right', variant: 1 }),
  P('chair', 39, 4, { dir: 'left', variant: 1 }),
  P('roundTable', 51, 4),
  P('chair', 50, 4, { dir: 'right', variant: 1 }),
  P('chair', 53, 4, { dir: 'left', variant: 1 }),
  // a cosy booth for four against the bottom wall: two benches facing across a table
  // each bench is two 1-tile pieces (back seat / front seat), so someone sitting
  // in the front seat is drawn over the back seat, not hidden behind it
  P('boothBench', 50, 8, { id: 'booth-west-back', dir: 'right', variant: 0 }),
  P('boothBench', 50, 9, { id: 'booth-west-front', dir: 'right', variant: 1 }),
  P('boothTable', 51, 8),
  P('boothBench', 53, 8, { id: 'booth-east-back', dir: 'left', variant: 0 }),
  P('boothBench', 53, 9, { id: 'booth-east-front', dir: 'left', variant: 1 }),

  // ---- Private offices ----
  ...officeDecor,

  // ---- Open-plan hall ----
  ...deskPlacements,
  P('waterCooler', 8, 11),
  P('printer', 39, 11),
  P('bin', 19, 15),
  P('bin', 35, 15),
  // chill corner
  P('rug', 9, 20, { w: 6, h: 4, variant: 1 }),
  P('sofa', 10, 20, { dir: 'down' }),
  P('coffeeTable', 11, 22),
  // reading nook
  P('rug', 28, 24, { w: 5, h: 3, variant: 2 }),
  P('beanBag', 29, 25, { variant: 0 }),
  P('beanBag', 31, 25, { variant: 1 }),
  P('floorLamp', 32, 24),
  // main entrance (bottom wall) — everyone arrives here
  P('entrance', 24, 30),
  P('doormat', 24, 28),

  // ---- Washrooms ----
  // shared lobby: one long vanity under a wide mirror
  P('mirrorLong', 39, 23, { w: 7 }),
  P('vanity', 39, 24, { w: 7 }),
  // men (left room): cubicles + urinals, with a ♂ door
  P('washroomDoor', 40, 26, { id: 'door-men', variant: 1 }),
  P('toilet', 38, 29, { variant: 1 }),
  P('toilet', 39, 29, { variant: 1 }),
  P('urinal', 40, 29),
  P('urinal', 41, 29),
  // women (right room): a row of cubicles, with a ♀ door
  P('washroomDoor', 44, 26, { id: 'door-women', variant: 0 }),
  P('toilet', 44, 29, { variant: 0 }),
  P('toilet', 45, 29, { variant: 0 }),
  P('toilet', 46, 29, { variant: 0 }),

  // ---- The Potato Club: karaoke stage, dance floor, disco ball, potatoes ----
  P('potatoPoster', 48, 10, { variant: 0 }),
  P('clubSign', 49, 10, { w: 6 }),
  P('potatoPoster', 55, 10, { variant: 1 }),
  P('potatoPoster', 57, 10, { variant: 2 }),
  P('stage', 49, 11, { w: 7, h: 2, variant: 1 }), // variant 1 = karaoke stage
  P('speaker', 49, 11),
  P('potatoPlush', 50, 11, { variant: 0 }),
  P('micStand', 52, 12, { id: 'karaoke-mic' }),
  P('potatoMascot', 54, 11, { id: 'potato-mascot' }),
  P('speaker', 55, 11),
  P('danceFloor', 50, 14, { w: 4, h: 3 }),
  P('discoBall', 51, 14, { w: 2, h: 2 }),
  P('costumeRack', 48, 11, { id: 'potato-costume' }),
  P('potatoVending', 57, 11, { id: 'potato-vending' }),
  P('beanBag', 48, 17, { variant: 0 }),
  P('beanBag', 50, 18, { variant: 4 }),
  P('armchair', 56, 15, { dir: 'left' }),
  P('armchair', 56, 17, { dir: 'left' }),
  P('potatoPlush', 54, 18, { variant: 1 }),
  P('potatoPlush', 57, 18, { variant: 2 }),

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
];

// ---------------------------------------------------------------------------
// Area tags — each room's name tag sits in a BOTTOM corner, on the room's
// bottom wall: it never blocks the skyline windows, nobody can stand on a
// wall, and tags are drawn like a painted sign so characters pass in front.
// ---------------------------------------------------------------------------

export interface AreaLabel {
  text: string;
  /** Wall tile where the tag's top-left corner sits. */
  tx: number;
  ty: number;
}

export const AREA_LABELS: AreaLabel[] = [
  { text: 'Lounge', tx: 10, ty: 10 }, // bottom-right of the lounge
  { text: 'Meeting Room', tx: 18, ty: 10 }, // bottom-left
  { text: 'Pantry', tx: 44, ty: 10 }, // bottom-right
  // The Potato Club is labelled by its neon sign.
  { text: 'Gym', tx: 48, ty: 30 }, // bottom-left
  { text: 'Men', tx: 38, ty: 30 },
  { text: 'Women', tx: 43, ty: 30 },
];

/** The Potato Club's floor area (inclusive tile bounds) — the client shows the club controls inside it. */
export const POTATO_CLUB = { x0: 48, y0: 11, x1: 57, y1: 18 } as const;

/** Everyone arrives just inside the main entrance (bottom of the open-plan hall). */
export const SPAWN: TilePos = { tx: 25, ty: 29 };
