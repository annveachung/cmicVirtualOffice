import {
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  SKIN_TONES,
  type Appearance,
  type Direction,
  type HairStyle,
} from '@little-office/shared';
import { drawTemplate, makeCanvas, shade, type Ctx } from './pixel';

/**
 * Characters are drawn from ASCII templates (16 x 24 px per frame).
 *
 *   O outline   S skin   E eye   b blush   T top   t top shadow
 *   P pants     B shoes  H hair  h hair shadow   . transparent
 *
 * A frame = body template + head template + hair overlay, so 5 hair styles x
 * 3 directions x N poses come from a handful of small drawings. Facing right
 * is just facing left, mirrored.
 */
export const FRAME_W = 16;
export const FRAME_H = 24;
/** Feet sit on this row of the frame — used as the sprite origin. */
export const FEET_ROW = 22;

type Facing = 'down' | 'up' | 'side';

// ---------------------------------------------------------------- heads ----
const HEAD: Record<Facing, string[]> = {
  down: [
    '................',
    '................',
    '................',
    '.....OOOOOO.....',
    '....OSSSSSSO....',
    '...OSSSSSSSSO...',
    '...OSSSSSSSSO...',
    '...OSSESSESSO...',
    '...OSSESSESSO...',
    '...ObSSSSSSbO...',
    '....OSSSSSSO....',
    '.....OOOOOO.....',
  ],
  up: [
    '................',
    '................',
    '................',
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OHHHHHHHHO...',
    '...OhHHHHHHhO...',
    '....OhhhhhhO....',
    '.....OOOOOO.....',
  ],
  side: [
    '................',
    '................',
    '................',
    '....OOOOOO......',
    '...OSSSSSSO.....',
    '..OSSSSSSSSO....',
    '..OSSSSSSSSO....',
    '..OSESSSSSSO....',
    '..OSESSSSSSO....',
    '..OSSbSSSSSO....',
    '...OSSSSSSO.....',
    '....OOOOOO......',
  ],
};

// ----------------------------------------------------------- hair overlays ----
// Rows start at row 0 of the frame; '.' leaves the head underneath visible.
const HAIR: Record<HairStyle, Record<Facing, string[]>> = {
  short: {
    down: [
      '................',
      '................',
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '...OHHHhHHHHO...',
      '...OH......HO...',
    ],
    up: [],
    side: [
      '................',
      '................',
      '................',
      '....OOOOOO......',
      '...OHHHHHHO.....',
      '..OHHHHHHHHO....',
      '..OHhHHHHHHO....',
      '..O....HHHHO....',
      '..O.....HHHO....',
      '.........HHO....',
    ],
  },
  long: {
    down: [
      '................',
      '................',
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '..OHHHHhHHHHHO..',
      '..OHH......HHO..',
      '..OHH......HHO..',
      '..OHH......HHO..',
      '..OHH......HHO..',
      '..OHHO....OHHO..',
      '..OHhO....OhHO..',
      '..OhhO....OhhO..',
      '...OO......OO...',
    ],
    up: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '....OHHHHHHO....',
      '....OHHHHHHO....',
      '....OhHHHHhO....',
      '....OhhhhhhO....',
      '.....OOOOOO.....',
    ],
    side: [
      '................',
      '................',
      '................',
      '....OOOOOO......',
      '...OHHHHHHO.....',
      '..OHHHHHHHHO....',
      '..OHhHHHHHHO....',
      '..O....HHHHO....',
      '..O....HHHHO....',
      '.......HHHHO....',
      '.......HHHHO....',
      '.......HHHHO....',
      '......OhHHHO....',
      '......OhhhhO....',
      '.......OOOO.....',
    ],
  },
  bun: {
    down: [
      '......OOOO......',
      '.....OHHHHO.....',
      '.....OhHHhO.....',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '...OHHHhHHHHO...',
      '...OH......HO...',
    ],
    up: [
      '......OOOO......',
      '.....OHHHHO.....',
      '.....OhHHhO.....',
    ],
    side: [
      '........OOO.....',
      '.......OHHHO....',
      '.......OhHhO....',
      '....OOOOOOO.....',
      '...OHHHHHHO.....',
      '..OHHHHHHHHO....',
      '..OHhHHHHHHO....',
      '..O....HHHHO....',
      '..O.....HHHO....',
      '.........HHO....',
    ],
  },
  spiky: {
    down: [
      '................',
      '....O..OO..O....',
      '...OHOOHHOOHO...',
      '...OHHHHHHHHO...',
      '...OHHHHHHHHO...',
      '...OHHHHHHHHO...',
      '...OHhHHHHhHO...',
      '...OH......HO...',
    ],
    up: [
      '................',
      '....O..OO..O....',
      '...OHOOHHOOHO...',
      '...OHHHHHHHHO...',
    ],
    side: [
      '................',
      '....O.O.O.......',
      '...OHOHOHOO.....',
      '...OHHHHHHO.....',
      '...OHHHHHHO.....',
      '..OHHHHHHHHO....',
      '..OHhHHHHHHO....',
      '..O....HHHHO....',
      '..O.....HHHO....',
      '.........HHO....',
    ],
  },
  bob: {
    down: [
      '................',
      '................',
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '..OHH......HHO..',
      '..OHH......HHO..',
      '..OHh......hHO..',
      '..OhhO....OhhO..',
      '...OO......OO...',
    ],
    up: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '..OHHHHHHHHHHO..',
      '..OhhhhhhhhhhO..',
      '...OOOOOOOOOO...',
    ],
    side: [
      '................',
      '................',
      '................',
      '....OOOOOO......',
      '...OHHHHHHO.....',
      '..OHHHHHHHHO....',
      '..OHHHHHHHHHO...',
      '..O....HHHHHO...',
      '..O....HHHHHO...',
      '.......HHHHHO...',
      '.......hhhhhO...',
      '........OOOO....',
    ],
  },
};

// ---------------------------------------------------------------- bodies ----
// Body rows 12..21 (10 rows).
const BODY_FRONT_TOP = [
  '....OTTTTTTO....',
  '...OTTTTTTTTO...',
  '...OTtTTTTtTO...',
  '...OTtTTTTtTO...',
  '...OStTTTTtSO...',
  '...OOPPPPPPOO...',
];
const LEGS_FRONT = {
  stand: ['....OPPPPPPO....', '....OPPOOPPO....', '....OBBOOBBO....', '.....OO..OO.....'],
  stepA: ['....OPPPPPPO....', '....OPPOOBBO....', '....OBBO.OOO....', '.....OO.........'],
  sit: ['....OPPPPPPO....', '....OBBOOBBO....', '.....OO..OO.....', '................'],
};
const BODY_SIDE_TOP = [
  '.....OTTTTO.....',
  '....OTTTTTTO....',
  '....OTTtTTTO....',
  '....OTTtTTTO....',
  '....OTTSTTTO....',
  '....OPPPPPPO....',
];
const LEGS_SIDE = {
  stand: ['.....OPPPPO.....', '.....OPPPPO.....', '.....OBBBBO.....', '......OOOO......'],
  stepA: ['....OPPOOPPO....', '...OPPO..OPPO...', '...OBBO..OBBO...', '....OO....OO....'],
  sit: ['....OPPPPPPO....', '...OBBPPPPPO....', '...OOOOOOOO.....', '................'],
};

export type Pose = 'idle' | 'breathe' | 'walkA' | 'walkB' | 'sit';
export const POSES: Pose[] = ['idle', 'breathe', 'walkA', 'walkB', 'sit'];
export const DIRECTIONS: Direction[] = ['down', 'left', 'right', 'up'];

const reverse = (s: string) => s.split('').reverse().join('');

function bodyRows(facing: Facing, pose: Pose): string[] {
  const top = facing === 'side' ? BODY_SIDE_TOP : BODY_FRONT_TOP;
  const legs = facing === 'side' ? LEGS_SIDE : LEGS_FRONT;
  let l: string[];
  if (pose === 'sit') l = legs.sit;
  else if (pose === 'walkA') l = legs.stepA;
  else if (pose === 'walkB') l = facing === 'side' ? legs.stand : legs.stepA.map(reverse);
  else l = legs.stand;
  return [...top, ...l];
}

function colorsFor(a: Appearance): Record<string, string> {
  const skin = SKIN_TONES[a.skin];
  const hair = HAIR_COLORS[a.hairColor];
  const outfit = OUTFITS[a.outfit];
  return {
    O: '#33262a',
    E: '#2a2028',
    S: skin,
    s: shade(skin, -0.15),
    b: '#e59a8f',
    T: outfit.top,
    t: shade(outfit.top, -0.18),
    P: outfit.pants,
    p: shade(outfit.pants, -0.2),
    B: '#3d302c',
    H: hair,
    h: shade(hair, -0.25),
  };
}

/** Draw one frame at (ox, oy). Pure canvas — also used by the React character preview. */
export function drawCharacterFrame(ctx: Ctx, ox: number, oy: number, a: Appearance, dir: Direction, pose: Pose): void {
  const facing: Facing = dir === 'left' || dir === 'right' ? 'side' : dir;
  const mirror = dir === 'right';
  const colors = colorsFor(a);
  const style = HAIR_STYLES[a.hairStyle];
  // Head bobs down 1px on alternate frames for a bouncy walk / breathing idle.
  const headDy = pose === 'breathe' || pose === 'walkA' || pose === 'walkB' ? 1 : 0;
  // Seated characters sink 2px so the desk/sofa covers their legs.
  const sitDy = pose === 'sit' ? 2 : 0;

  drawTemplate(ctx, bodyRows(facing, pose), ox, oy + 12 + sitDy, colors, mirror);
  drawTemplate(ctx, HEAD[facing], ox, oy + headDy + sitDy, colors, mirror);
  drawTemplate(ctx, HAIR[style][facing], ox, oy + headDy + sitDy, colors, mirror);
}

/**
 * Build a full sprite sheet for one appearance: rows = directions, columns = poses.
 * Returns the canvas plus a frame-name lookup.
 */
export function buildCharacterSheet(a: Appearance): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(FRAME_W * POSES.length, FRAME_H * DIRECTIONS.length);
  DIRECTIONS.forEach((dir, row) =>
    POSES.forEach((pose, col) => drawCharacterFrame(ctx, col * FRAME_W, row * FRAME_H, a, dir, pose)),
  );
  return canvas;
}

export const frameName = (dir: Direction, pose: Pose) => `${dir}-${pose}`;

/** Exposed for tests / sanity checks. */
export const TEMPLATES_FOR_VALIDATION = { HEAD, HAIR, BODY_FRONT_TOP, BODY_SIDE_TOP, LEGS_FRONT, LEGS_SIDE };
