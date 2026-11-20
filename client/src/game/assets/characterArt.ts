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
// Upper body rows 12..17, legs rows 18..21.
const BODY_FRONT_TOP = [
  '....OTTTTTTO....',
  '...OTTTTTTTTO...',
  '...OTtTTTTtTO...',
  '...OTtTTTTtTO...',
  '...OStTTTTtSO...',
  '...OOPPPPPPOO...',
];
/** Arms raised: the torso without hands at the sides... */
const BODY_FRONT_ARMS_UP = [
  '...OTTTTTTTTO...',
  '...OTTTTTTTTO...',
  '....OTTTTTTO....',
  '....OTTTTTTO....',
  '....OTTTTTTO....',
  '...OOPPPPPPOO...',
];
/** ...plus the raised arms, drawn over the head (rows 7..12). */
const ARMS_UP_OVERLAY = [
  '..O..........O..',
  '.OSO........OSO.',
  '.OTO........OTO.',
  '.OTO........OTO.',
  '..OTO......OTO..',
  '...OTTTTTTTTO...',
];
const DUMBBELLS_UP = '.DDD........DDD.'; // row 7, above the raised hands
const DUMBBELLS_DOWN = '..DDD......DDD..'; // row 17, in the lowered hands

const BODY_SIDE_TOP = [
  '.....OTTTTO.....',
  '....OTTTTTTO....',
  '....OTTtTTTO....',
  '....OTTtTTTO....',
  '....OTTSTTTO....',
  '....OPPPPPPO....',
];
/** Facing left with the arm thrown forward (punch / ping-pong swing). */
const BODY_SIDE_PUNCH = [
  '.....OTTTTO.....',
  '....OTTTTTTO....',
  'OOOOOTTTTTTO....',
  'OSSTTTTTTTTO....',
  'OOOOOTTTTTTO....',
  '....OPPPPPPO....',
];

const LEGS_FRONT = {
  stand: ['....OPPPPPPO....', '....OPPOOPPO....', '....OBBOOBBO....', '.....OO..OO.....'],
  stepA: ['....OPPPPPPO....', '....OPPOOBBO....', '....OBBO.OOO....', '.....OO.........'],
  sit: ['....OPPPPPPO....', '....OBBOOBBO....', '.....OO..OO.....', '................'],
  pedalA: ['....OPPPPPPO....', '....OBBOOPPO....', '.....OO.OBBO....', '.........OO.....'],
};
const LEGS_SIDE = {
  stand: ['.....OPPPPO.....', '.....OPPPPO.....', '.....OBBBBO.....', '......OOOO......'],
  stepA: ['....OPPOOPPO....', '...OPPO..OPPO...', '...OBBO..OBBO...', '....OO....OO....'],
  sit: ['....OPPPPPPO....', '...OBBPPPPPO....', '...OOOOOOOO.....', '................'],
};

type Arms = 'side' | 'up' | 'punch';
type Legs = 'stand' | 'stepA' | 'stepB' | 'sit' | 'pedalA' | 'pedalB';
interface FrameSpec {
  arms: Arms;
  legs: Legs;
  /** Head bobs down 1px for bounce/breathing. */
  headDy?: number;
  /** Seated characters sink 2px so the desk/sofa covers their legs. */
  sitDy?: number;
  dumbbells?: boolean;
}

/**
 * Every frame in the sheet, described as data. Animations (textures.ts) are
 * just sequences of these names.
 */
export const FRAMES = {
  idle: { arms: 'side', legs: 'stand' },
  breathe: { arms: 'side', legs: 'stand', headDy: 1 },
  walkA: { arms: 'side', legs: 'stepA', headDy: 1 },
  walkB: { arms: 'side', legs: 'stepB', headDy: 1 },
  sit: { arms: 'side', legs: 'sit', sitDy: 2 },
  pedalA: { arms: 'side', legs: 'pedalA', sitDy: 2 },
  pedalB: { arms: 'side', legs: 'pedalB', sitDy: 2, headDy: 1 },
  liftUp: { arms: 'up', legs: 'stand', dumbbells: true },
  liftDown: { arms: 'side', legs: 'stand', headDy: 1, dumbbells: true },
  benchUp: { arms: 'up', legs: 'sit', sitDy: 2, dumbbells: true },
  benchDown: { arms: 'side', legs: 'sit', sitDy: 2, headDy: 1, dumbbells: true },
  armsUp: { arms: 'up', legs: 'stand' },
  punch: { arms: 'punch', legs: 'stand' },
  hop: { arms: 'up', legs: 'stand', sitDy: -2 }, // airborne, arms up — for the hop dance
} satisfies Record<string, FrameSpec>;

export type Pose = keyof typeof FRAMES;
export const POSES = Object.keys(FRAMES) as Pose[];
export const DIRECTIONS: Direction[] = ['down', 'left', 'right', 'up'];

const reverse = (s: string) => s.split('').reverse().join('');

function legRows(facing: Facing, legs: Legs): string[] {
  if (facing === 'side') {
    if (legs === 'stepA') return LEGS_SIDE.stepA;
    if (legs === 'sit' || legs === 'pedalA' || legs === 'pedalB') return LEGS_SIDE.sit;
    return LEGS_SIDE.stand;
  }
  if (legs === 'stepB') return LEGS_FRONT.stepA.map(reverse);
  if (legs === 'pedalB') return LEGS_FRONT.pedalA.map(reverse);
  return LEGS_FRONT[legs as keyof typeof LEGS_FRONT];
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
    D: '#4d4f58',
  };
}

/** Draw one frame at (ox, oy). Pure canvas — also used by the React character preview. */
export function drawCharacterFrame(ctx: Ctx, ox: number, oy: number, a: Appearance, dir: Direction, pose: Pose): void {
  const facing: Facing = dir === 'left' || dir === 'right' ? 'side' : dir;
  const mirror = dir === 'right';
  const colors = colorsFor(a);
  const style = HAIR_STYLES[a.hairStyle];
  const spec: FrameSpec = FRAMES[pose];
  const headDy = spec.headDy ?? 0;
  const sitDy = spec.sitDy ?? 0;
  // Raised arms only make sense facing front/back; punching only sideways.
  const arms: Arms =
    spec.arms === 'up' && facing === 'side' ? 'side' : spec.arms === 'punch' && facing !== 'side' ? 'side' : spec.arms;

  const top =
    facing === 'side' ? (arms === 'punch' ? BODY_SIDE_PUNCH : BODY_SIDE_TOP) : arms === 'up' ? BODY_FRONT_ARMS_UP : BODY_FRONT_TOP;
  const y0 = oy + sitDy;
  drawTemplate(ctx, [...top, ...legRows(facing, spec.legs)], ox, y0 + 12, colors, mirror);
  drawTemplate(ctx, HEAD[facing], ox, y0 + headDy, colors, mirror);
  drawTemplate(ctx, HAIR[style][facing], ox, y0 + headDy, colors, mirror);
  if (arms === 'up') {
    drawTemplate(ctx, ARMS_UP_OVERLAY, ox, y0 + 7, colors);
    if (spec.dumbbells) drawTemplate(ctx, [DUMBBELLS_UP], ox, y0 + 7, colors);
  } else if (spec.dumbbells && facing !== 'side') {
    drawTemplate(ctx, [DUMBBELLS_DOWN], ox, y0 + 17, colors);
  }
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

/**
 * The potato costume, drawn over the character's body (the head stays visible
 * above it, like wearing a mascot suit). Same 16x24 frame as the character.
 */
export function drawPotatoSuit(ctx: Ctx, ox: number, oy: number, palette: { potato: string; potatoDark: string; potatoLight: string; outline: string }) {
  const { potato, potatoDark, potatoLight, outline } = palette;
  const cx = ox + 8;
  const cy = oy + 17;
  // outline + body
  for (let dy = -7; dy <= 6; dy++) {
    const half = Math.round(7 * Math.sqrt(Math.max(0, 1 - (dy * dy) / 49)));
    ctx.fillStyle = outline;
    ctx.fillRect(cx - half - 1, cy + dy, half * 2 + 2, 1);
    ctx.fillStyle = potato;
    ctx.fillRect(cx - half, cy + dy, half * 2, 1);
  }
  ctx.fillStyle = potatoLight;
  ctx.fillRect(cx - 4, cy - 4, 3, 3);
  ctx.fillStyle = potatoDark;
  [[-3, 3], [3, -2], [4, 3], [-1, 0]].forEach(([dx, dy]) => ctx.fillRect(cx + dx, cy + dy, 1, 1));
  // stubby feet
  ctx.fillStyle = outline;
  ctx.fillRect(cx - 4, cy + 6, 3, 1);
  ctx.fillRect(cx + 1, cy + 6, 3, 1);
}
