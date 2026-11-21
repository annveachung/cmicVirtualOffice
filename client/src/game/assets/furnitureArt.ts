import { FURNITURE, TILE, footprint, type Direction, type FurnitureDef, type Placement } from '@little-office/shared';
import type { EnvPalette } from './palette';
import { box, drawTemplate, ellipse, hline, makeCanvas, mix, px, rect, roundBox, shade, vline, type Ctx } from './pixel';

/**
 * One draw function per furniture type. Each receives a canvas sized to the
 * footprint plus its overhang (extra height above the footprint, e.g. a tall
 * bookshelf) and paints itself using ONLY palette colours, so every piece
 * automatically works in both themes.
 */
interface Args {
  pal: EnvPalette;
  W: number; // canvas width (px)
  H: number; // canvas height (px)
  oh: number; // overhang (px) — footprint starts at y = oh
  dir: Direction;
  v: number; // variant
}
type Painter = (ctx: Ctx, a: Args) => void;

const accent = (pal: EnvPalette, i: number) => pal.accents[((i % pal.accents.length) + pal.accents.length) % pal.accents.length];

// ------------------------------------------------------------- shared bits --
function leafCluster(ctx: Ctx, pal: EnvPalette, cx: number, cy: number, r: number) {
  ellipse(ctx, cx, cy, r + 1, r, pal.outline);
  ellipse(ctx, cx, cy, r, r - 1, pal.leafDark);
  ellipse(ctx, cx - 1, cy - 1, r - 1, r - 2, pal.leaf);
  px(ctx, cx - 2, cy - 2, pal.leafLight);
  px(ctx, cx + 1, cy - 3, pal.leafLight);
}

function mug(ctx: Ctx, pal: EnvPalette, x: number, y: number, color: string) {
  box(ctx, x, y, 5, 6, color, pal.outline);
  hline(ctx, x + 1, y + 1, 3, shade(color, 0.3));
  px(ctx, x + 5, y + 2, pal.outline);
  px(ctx, x + 5, y + 3, pal.outline);
}

function legs(ctx: Ctx, pal: EnvPalette, xs: number[], y: number, h: number, color = pal.furnDark) {
  for (const x of xs) box(ctx, x, y, 3, h, color, pal.outline);
}

// ----------------------------------------------------------------- painters --
const P: Partial<Record<Placement['type'], Painter>> = {
  desk(ctx, { pal, oh, v, dir }) {
    const y0 = oh;
    legs(ctx, pal, [2, 43], y0 + 22, 10);
    box(ctx, 0, y0, 48, 21, pal.furnLight, pal.outline);
    hline(ctx, 1, y0 + 1, 46, shade(pal.furnLight, 0.18));
    for (let i = 0; i < 3; i++) hline(ctx, 4 + i * 13, y0 + 6 + i * 4, 7, shade(pal.furnLight, -0.08));
    box(ctx, 0, y0 + 20, 48, 6, pal.furn, pal.outline);
    rect(ctx, 21, y0 + 22, 6, 1, pal.furnDark);
    // desk lamp (left)
    ellipse(ctx, 6, y0 + 9, 3, 1, pal.metalDark);
    vline(ctx, 6, 3, y0 + 6, pal.metalDark);
    rect(ctx, 2, 0, 9, 1, pal.outline);
    box(ctx, 1, 1, 11, 5, accent(pal, v + 2), pal.outline);
    hline(ctx, 3, 6, 7, pal.lampLight);
    if (dir === 'up') {
      // the colleague sits below with their back to us, so we see the screen
      box(ctx, 15, 0, 18, 12, pal.outline, pal.outline);
      rect(ctx, 16, 1, 16, 9, pal.screenOn);
      for (let i = 0; i < 4; i++)
        hline(ctx, 18 + (i % 2) * 2, 2 + i * 2, 5 + ((i * 5 + v) % 7), shade(pal.screenOn, -0.35));
    } else {
      // we see the monitor's back — the screen faces the seated colleague
      box(ctx, 15, 0, 18, 12, pal.metalDark, pal.outline);
      hline(ctx, 16, 1, 16, mix(pal.metalDark, pal.screenOn, 0.45));
      rect(ctx, 23, 5, 2, 2, pal.metal);
    }
    box(ctx, 21, 11, 6, 4, pal.metalDark, pal.outline);
    box(ctx, 18, 14, 12, 3, pal.metal, pal.outline);
    // keyboard + mouse
    box(ctx, 16, y0 + 11, 15, 5, pal.plastic, pal.outline);
    for (let i = 0; i < 6; i++) px(ctx, 18 + i * 2, y0 + 13, pal.metalDark);
    roundBox(ctx, 33, y0 + 11, 4, 5, pal.plastic, pal.outline);
    // mug
    mug(ctx, pal, 9, y0 + 9, accent(pal, v));
    // right-hand clutter varies per desk
    if (v % 3 === 0) {
      box(ctx, 38, y0 + 10, 8, 3, accent(pal, v + 1), pal.outline);
      box(ctx, 39, y0 + 8, 7, 3, accent(pal, v + 3), pal.outline);
      box(ctx, 38, y0 + 6, 8, 3, accent(pal, v + 4), pal.outline);
    } else if (v % 3 === 1) {
      box(ctx, 39, y0 + 8, 6, 5, pal.pot, pal.outline);
      leafCluster(ctx, pal, 42, y0 + 5, 3);
    } else {
      box(ctx, 37, y0 + 7, 9, 7, pal.paper, pal.outline);
      hline(ctx, 39, y0 + 9, 5, pal.metal);
      hline(ctx, 39, y0 + 11, 4, pal.metal);
      vline(ctx, 45, y0 + 3, 5, accent(pal, v + 1));
    }
  },

  /**
   * Racing-style gaming chair: tall padded back with a headrest pillow, side
   * wings, armrests and an accent stripe (a different colour per desk).
   */
  deskChair(ctx, { pal, v, dir, W }) {
    const body = mix(pal.metalDark, pal.outline, 0.55);
    const hi = shade(body, 0.22);
    const acc = accent(pal, v + 5);
    const pillow = shade(acc, 0.35);
    const base = () => {
      rect(ctx, 7, 19, 2, 3, pal.metalDark); // gas lift
      box(ctx, 2, 21, 12, 3, pal.metalDark, pal.outline); // star base
      px(ctx, 2, 24, pal.outline);
      px(ctx, 7, 24, pal.outline);
      px(ctx, 13, 24, pal.outline);
    };

    if (dir === 'down') {
      // facing the camera: backrest behind the sitter
      base();
      roundBox(ctx, 3, 0, 10, 16, body, pal.outline);
      rect(ctx, 4, 2, 1, 12, hi); // side wings
      rect(ctx, 11, 2, 1, 12, hi);
      rect(ctx, 7, 1, 2, 13, acc); // racing stripe
      roundBox(ctx, 5, 2, 6, 3, pillow, pal.outline); // headrest pillow
      roundBox(ctx, 5, 9, 6, 3, shade(acc, -0.1), pal.outline); // lumbar cushion
      box(ctx, 0, 10, 3, 6, body, pal.outline); // armrests
      box(ctx, 13, 10, 3, 6, body, pal.outline);
      hline(ctx, 1, 11, 1, acc);
      hline(ctx, 14, 11, 1, acc);
      roundBox(ctx, 2, 13, 12, 7, body, pal.outline); // seat
      hline(ctx, 3, 14, 10, hi);
      rect(ctx, 7, 14, 2, 5, acc);
      return;
    }

    if (dir === 'up') {
      // seen from behind: the backrest is in front of the sitter
      base();
      roundBox(ctx, 2, 10, 12, 7, body, pal.outline); // seat edges
      box(ctx, 0, 9, 3, 6, body, pal.outline); // armrests
      box(ctx, 13, 9, 3, 6, body, pal.outline);
      roundBox(ctx, 3, 6, 10, 15, body, pal.outline); // back of the backrest
      rect(ctx, 4, 8, 1, 11, hi);
      rect(ctx, 11, 8, 1, 11, hi);
      rect(ctx, 7, 7, 2, 12, acc);
      hline(ctx, 5, 8, 6, pillow); // headrest strap
      px(ctx, 7, 16, pal.paper); // little logo
      px(ctx, 8, 16, pal.paper);
      return;
    }

    // side view (drawn facing left; mirrored for right)
    const f = (x: number, w: number) => (dir === 'right' ? W - x - w : x);
    base();
    roundBox(ctx, f(1, 12), 14, 12, 5, body, pal.outline); // seat
    hline(ctx, f(2, 10), 15, 10, acc);
    box(ctx, f(2, 8), 11, 8, 2, body, pal.outline); // armrest
    vline(ctx, f(5, 1), 13, 2, pal.outline);
    roundBox(ctx, f(10, 5), 0, 5, 18, body, pal.outline); // backrest behind the sitter
    vline(ctx, f(12, 1), 2, 14, acc);
    roundBox(ctx, f(9, 3), 2, 3, 4, pillow, pal.outline); // headrest pillow
  },

  chair(ctx, { pal, dir, v }) {
    const fab = v === 1 ? pal.furnLight : pal.fabricB;
    const frame = pal.furn;
    if (dir === 'down') {
      box(ctx, 3, 0, 10, 6, frame, pal.outline);
      vline(ctx, 4, 6, 6, pal.outline);
      vline(ctx, 11, 6, 6, pal.outline);
      box(ctx, 2, 10, 12, 6, fab, pal.outline);
      hline(ctx, 3, 11, 10, shade(fab, 0.2));
      legs(ctx, pal, [3, 10], 15, 6, frame);
    } else if (dir === 'up') {
      box(ctx, 2, 6, 12, 5, fab, pal.outline);
      legs(ctx, pal, [3, 10], 16, 6, frame);
      box(ctx, 2, 9, 12, 9, frame, pal.outline);
      hline(ctx, 3, 10, 10, shade(frame, 0.2));
    } else {
      const back = dir === 'right' ? 1 : 10;
      box(ctx, 2, 10, 12, 6, fab, pal.outline);
      hline(ctx, 3, 11, 10, shade(fab, 0.2));
      legs(ctx, pal, [3, 10], 15, 6, frame);
      box(ctx, back, 0, 5, 16, frame, pal.outline);
      vline(ctx, back + 1, 1, 14, shade(frame, 0.2));
    }
  },

  meetingTable(ctx, { pal, W, H }) {
    legs(ctx, pal, [3, W - 6], H - 10, 10);
    box(ctx, 0, 0, W, H - 6, pal.furnLight, pal.outline);
    hline(ctx, 1, 1, W - 2, shade(pal.furnLight, 0.18));
    for (let i = 0; i < 5; i++) hline(ctx, 6 + ((i * 37) % (W - 30)), 5 + i * ((H - 16) / 5), 14, shade(pal.furnLight, -0.07));
    box(ctx, 0, H - 10, W, 6, pal.furn, pal.outline);
    // papers, laptop, little plant
    const mid = Math.floor((H - 10) / 2);
    box(ctx, 10, mid - 5, 9, 11, pal.paper, pal.outline);
    hline(ctx, 12, mid - 2, 5, pal.metal);
    hline(ctx, 12, mid, 4, pal.metal);
    box(ctx, W - 30, mid - 6, 16, 10, pal.metalDark, pal.outline);
    rect(ctx, W - 29, mid - 5, 14, 7, pal.screenOn);
    box(ctx, W - 32, mid + 3, 20, 3, pal.metal, pal.outline);
    box(ctx, W / 2 - 4, mid - 2, 8, 7, pal.pot, pal.outline);
    leafCluster(ctx, pal, W / 2, mid - 5, 4);
  },

  whiteboard(ctx, { pal, W }) {
    box(ctx, 1, 3, W - 2, 24, pal.metalLight, pal.outline);
    rect(ctx, 3, 5, W - 6, 20, pal.paper);
    hline(ctx, 6, 9, 14, pal.accents[1]);
    hline(ctx, 6, 12, 10, pal.accents[1]);
    hline(ctx, 6, 15, 12, pal.accents[0]);
    for (let i = 0; i < 4; i++) rect(ctx, 26 + i * 4, 20 - i * 3, 3, 3 + i * 3, pal.accents[(i + 2) % pal.accents.length]);
    box(ctx, 36, 6, 6, 6, pal.accents[2], pal.outline);
    box(ctx, 6, 26, W - 12, 3, pal.metal, pal.outline);
  },

  screen(ctx, { pal, W }) {
    box(ctx, 2, 2, W - 4, 26, pal.outline, pal.outline);
    rect(ctx, 4, 4, W - 8, 22, pal.screenOff);
    rect(ctx, 7, 7, 16, 2, pal.metalLight);
    for (let i = 0; i < 5; i++) rect(ctx, 8 + i * 6, 22 - (i * 3 + 3), 4, i * 3 + 3, pal.accents[i]);
    ellipse(ctx, 36, 15, 5, 5, pal.accents[3]);
    rect(ctx, 36, 10, 5, 5, pal.accents[2]);
    rect(ctx, W / 2 - 3, 28, 6, 2, pal.metalDark);
  },

  sofa(ctx, { pal, W, H, dir, v }) {
    const f = [pal.fabricA, pal.fabricB, pal.fabricC][v % 3];
    if (dir === 'up') {
      // seen from behind: seat cushions at the back, the tall backrest in front of whoever sits here
      const cw = (W - 12) / 2;
      for (let i = 0; i < 2; i++) box(ctx, 6 + i * cw, 4, cw, 9, shade(f, 0.08), pal.outline);
      box(ctx, 0, 2, 7, H - 4, shade(f, -0.05), pal.outline); // arms
      box(ctx, W - 7, 2, 7, H - 4, shade(f, -0.05), pal.outline);
      box(ctx, 2, 10, W - 4, H - 12, shade(f, -0.15), pal.outline); // backrest (facing us)
      hline(ctx, 3, 11, W - 6, shade(f, 0.12));
      for (let x = 10; x < W - 8; x += 12) vline(ctx, x, 13, H - 17, shade(f, -0.3)); // stitching
      box(ctx, 2, H - 3, W - 4, 3, shade(f, -0.3), pal.outline);
      return;
    }
    box(ctx, 2, 0, W - 4, 13, shade(f, -0.12), pal.outline);
    hline(ctx, 3, 1, W - 6, shade(f, 0.1));
    const cw = (W - 12) / 2;
    for (let i = 0; i < 2; i++) {
      box(ctx, 6 + i * cw, 10, cw, 10, f, pal.outline);
      hline(ctx, 7 + i * cw, 11, cw - 2, shade(f, 0.25));
    }
    box(ctx, 0, 5, 7, 17, shade(f, -0.05), pal.outline);
    box(ctx, W - 7, 5, 7, 17, shade(f, -0.05), pal.outline);
    box(ctx, 2, 19, W - 4, 4, shade(f, -0.25), pal.outline);
    // throw cushions
    box(ctx, 9, 5, 7, 6, pal.fabricC, pal.outline);
    box(ctx, W - 16, 5, 7, 6, pal.fabricB, pal.outline);
  },

  armchair(ctx, { pal, dir }) {
    const f = pal.fabricB;
    if (dir === 'down') {
      box(ctx, 2, 0, 12, 12, shade(f, -0.12), pal.outline);
      box(ctx, 3, 9, 10, 9, f, pal.outline);
      hline(ctx, 4, 10, 8, shade(f, 0.25));
      box(ctx, 0, 6, 4, 15, shade(f, -0.05), pal.outline);
      box(ctx, 12, 6, 4, 15, shade(f, -0.05), pal.outline);
      box(ctx, 2, 19, 12, 4, shade(f, -0.25), pal.outline);
    } else {
      const backX = dir === 'right' ? 0 : 10;
      box(ctx, 1, 9, 14, 10, f, pal.outline);
      hline(ctx, 2, 10, 12, shade(f, 0.25));
      box(ctx, backX, 0, 6, 22, shade(f, -0.12), pal.outline);
      box(ctx, 1, 16, 14, 7, shade(f, -0.05), pal.outline);
      hline(ctx, 2, 17, 12, shade(f, 0.15));
    }
  },

  coffeeTable(ctx, { pal, W }) {
    legs(ctx, pal, [2, W - 5], 9, 7);
    roundBox(ctx, 0, 1, W, 10, pal.furnLight, pal.outline);
    hline(ctx, 2, 2, W - 4, shade(pal.furnLight, 0.2));
    mug(ctx, pal, 6, 2, pal.accents[0]);
    box(ctx, 17, 4, 9, 5, pal.accents[1], pal.outline);
    hline(ctx, 18, 5, 7, pal.paper);
  },

  bookshelf(ctx, { pal, W, H, v, dir, oh }) {
    if (dir === 'right' || dir === 'left') return sideBookshelf(ctx, pal, W, H, oh, v, dir);
    box(ctx, 0, 0, W, H, pal.furn, pal.outline);
    const shelfH = 10;
    for (let s = 0; s < 3; s++) {
      const sy = 2 + s * (shelfH + 1);
      rect(ctx, 2, sy, W - 4, shelfH, pal.furnDark);
      hline(ctx, 1, sy + shelfH, W - 2, pal.furnLight);
      if ((s + v) % 3 === 2) {
        box(ctx, 5, sy + 5, 6, 5, pal.pot, pal.outline);
        leafCluster(ctx, pal, 8, sy + 3, 3);
        box(ctx, 18, sy + 4, 10, 6, pal.accents[(s + v) % 6], pal.outline);
        continue;
      }
      let x = 3;
      let i = s * 3 + v;
      while (x < W - 5) {
        const bw = 2 + ((i * 7) % 3);
        const bh = shelfH - ((i * 5) % 4);
        rect(ctx, x, sy + shelfH - bh, bw, bh, accent(pal, i));
        px(ctx, x, sy + shelfH - bh, shade(accent(pal, i), 0.3));
        x += bw + 1;
        i++;
      }
    }
    box(ctx, 0, H - 4, W, 4, pal.furnDark, pal.outline);
  },

  floorLamp(ctx, { pal, H }) {
    ellipse(ctx, 8, H - 3, 5, 2, pal.outline);
    ellipse(ctx, 8, H - 3, 4, 1, pal.metalDark);
    vline(ctx, 7, 10, H - 13, pal.outline);
    vline(ctx, 8, 10, H - 13, pal.metalDark);
    // trapezoid shade
    for (let y = 0; y < 10; y++) {
      const half = 3 + Math.floor(y / 2);
      hline(ctx, 8 - half - 1, y + 1, half * 2 + 2, pal.outline);
      if (y > 0 && y < 9) hline(ctx, 8 - half, y + 1, half * 2, y < 3 ? shade(pal.fabricC, 0.2) : pal.fabricC);
    }
    hline(ctx, 4, 10, 8, pal.lampLight);
  },

  counter(ctx, { pal, W, H, oh }) {
    if (H - oh > W) {
      // runs along a side wall: we see its long stone top, and the cabinet front only at the near end
      box(ctx, 0, 0, W, H - 8, pal.metalLight, pal.outline);
      vline(ctx, 1, 1, H - 10, shade(pal.metalLight, 0.4));
      for (let y = oh + TILE; y < H - 8; y += TILE) hline(ctx, 1, y, W - 2, shade(pal.metalLight, -0.08)); // seams
      box(ctx, 0, H - 9, W, 9, pal.furn, pal.outline);
      box(ctx, 2, H - 7, W - 4, 6, pal.furnLight, pal.outline);
      rect(ctx, W / 2 - 2, H - 5, 4, 1, pal.metalDark);
      return;
    }
    box(ctx, 0, 0, W, 11, pal.metalLight, pal.outline);
    hline(ctx, 1, 1, W - 2, shade(pal.metalLight, 0.4));
    box(ctx, 0, 10, W, H - 10, pal.furn, pal.outline);
    for (let x = 0; x < W; x += TILE) {
      box(ctx, x + 1, 12, TILE - 2, H - 14, pal.furnLight, pal.outline);
      rect(ctx, x + 6, 14 + Math.floor(oh / 4), 4, 1, pal.metalDark);
    }
  },


  sink(ctx, { pal }) {
    vline(ctx, 7, 0, 4, pal.metalDark);
    hline(ctx, 7, 0, 4, pal.metalDark);
    box(ctx, 2, 4, 12, 6, pal.metal, pal.outline);
    rect(ctx, 3, 5, 10, 4, pal.metalDark);
    hline(ctx, 3, 5, 10, shade(pal.metalDark, -0.2));
  },



  /** Compact fridge: freezer on top, a couple of magnets and a note on the door. */
  fridge(ctx, { pal, W, H }) {
    const split = Math.round(H * 0.38);
    box(ctx, 1, 0, W - 2, H, pal.metalLight, pal.outline);
    hline(ctx, 2, 1, W - 4, shade(pal.metalLight, 0.4));
    hline(ctx, 1, split, W - 2, pal.outline); // freezer / fridge doors
    box(ctx, W - 5, 3, 2, split - 5, pal.metalDark, pal.outline); // handles
    box(ctx, W - 5, split + 3, 2, H - split - 8, pal.metalDark, pal.outline);
    px(ctx, 4, split + 3, pal.accents[0]); // magnets
    px(ctx, 6, split + 4, pal.accents[2]);
    box(ctx, 3, split + 6, 6, 5, pal.paper, pal.outline); // shopping list
    box(ctx, 1, H - 3, W - 2, 3, pal.metalDark, pal.outline);
  },

  roundTable(ctx, { pal }) {
    rect(ctx, 14, 18, 4, 10, pal.furnDark);
    ellipse(ctx, 16, 28, 7, 2, pal.outline);
    ellipse(ctx, 16, 28, 6, 1, pal.furnDark);
    ellipse(ctx, 16, 12, 16, 11, pal.outline);
    ellipse(ctx, 16, 11, 15, 10, pal.furnLight);
    ellipse(ctx, 14, 9, 9, 5, shade(pal.furnLight, 0.12));
    mug(ctx, pal, 9, 6, pal.accents[3]);
    box(ctx, 18, 9, 7, 5, pal.paper, pal.outline);
  },

  upperCabinet(ctx, { pal, W }) {
    box(ctx, 0, 0, W, 22, pal.furn, pal.outline);
    for (let x = 0; x < W; x += TILE) {
      box(ctx, x + 1, 1, TILE - 2, 20, pal.furnLight, pal.outline);
      rect(ctx, (x / TILE) % 2 === 0 ? x + 12 : x + 3, 14, 1, 4, pal.metalDark);
    }
    hline(ctx, 0, 26, W, pal.furnDark);
    box(ctx, 4, 22, 5, 5, pal.accents[0], pal.outline);
    box(ctx, 12, 23, 4, 4, pal.accents[2], pal.outline);
  },

  plant(ctx, { pal, H, v }) {
    const potY = H - 10;
    if (v === 1) {
      // snake plant
      for (let i = 0; i < 5; i++) {
        const x = 4 + i * 2;
        const top = 2 + ((i * 5) % 7);
        rect(ctx, x - 1, top, 3, potY - top + 1, pal.outline);
        rect(ctx, x, top + 1, 1, potY - top, i % 2 ? pal.leafLight : pal.leaf);
      }
    } else if (v === 2) {
      // round monstera-ish
      leafCluster(ctx, pal, 5, potY - 8, 5);
      leafCluster(ctx, pal, 11, potY - 10, 5);
      leafCluster(ctx, pal, 8, potY - 15, 5);
    } else {
      // bushy fern
      leafCluster(ctx, pal, 8, potY - 11, 6);
      leafCluster(ctx, pal, 4, potY - 4, 4);
      leafCluster(ctx, pal, 12, potY - 5, 4);
    }
    box(ctx, 3, potY, 10, 3, shade(pal.pot, 0.1), pal.outline);
    box(ctx, 4, potY + 2, 8, 8, pal.pot, pal.outline);
    vline(ctx, 5, potY + 3, 5, shade(pal.pot, 0.25));
  },

  plantSmall(ctx, { pal, H }) {
    leafCluster(ctx, pal, 8, H - 11, 4);
    box(ctx, 4, H - 8, 8, 7, pal.pot, pal.outline);
    hline(ctx, 5, H - 7, 6, shade(pal.pot, 0.25));
  },

  bin(ctx, { pal }) {
    box(ctx, 4, 4, 8, 11, pal.metalDark, pal.outline);
    box(ctx, 3, 3, 10, 3, pal.metal, pal.outline);
    vline(ctx, 6, 7, 6, pal.metal);
    ellipse(ctx, 8, 3, 2, 1, pal.paper);
  },

  waterCooler(ctx, { pal, H }) {
    ellipse(ctx, 8, 6, 5, 6, pal.outline);
    ellipse(ctx, 8, 6, 4, 5, pal.glass);
    rect(ctx, 6, 3, 2, 4, pal.glassLight);
    box(ctx, 3, 11, 10, H - 11, pal.plastic, pal.outline);
    rect(ctx, 5, 16, 2, 2, pal.accents[1]);
    rect(ctx, 9, 16, 2, 2, pal.accents[0]);
    box(ctx, 5, 20, 6, 2, pal.metalDark, pal.outline);
  },

  printer(ctx, { pal, W }) {
    box(ctx, 4, 0, W - 8, 6, pal.paper, pal.outline);
    box(ctx, 1, 5, W - 2, 16, pal.plastic, pal.outline);
    rect(ctx, 4, 8, W - 8, 2, pal.outline);
    rect(ctx, W - 10, 13, 6, 3, pal.screenOff);
    px(ctx, W - 9, 14, pal.accents[4]);
    box(ctx, 6, 16, 10, 3, pal.paper, pal.outline);
  },

  window(ctx, { pal, W, v }) {
    box(ctx, 2, 3, W - 4, 24, pal.paper, pal.outline);
    rect(ctx, 4, 5, W - 8, 20, pal.sky);
    rect(ctx, 4, 17, W - 8, 8, pal.glass);
    // diagonal glints
    for (let i = 0; i < 6; i++) px(ctx, 8 + i, 18 - i, pal.glassLight);
    for (let i = 0; i < 4; i++) px(ctx, 20 + i, 20 - i, pal.glassLight);
    // tiny far-away skyline/stars
    px(ctx, 9 + (v % 3) * 4, 8, pal.glassLight);
    px(ctx, 22, 10, pal.glassLight);
    vline(ctx, W / 2, 5, 20, pal.paper);
    hline(ctx, 4, 15, W - 8, pal.paper);
    box(ctx, 0, 26, W, 3, pal.furnLight, pal.outline);
  },

  clock(ctx, { pal }) {
    ellipse(ctx, 8, 8, 6, 6, pal.outline);
    ellipse(ctx, 8, 8, 5, 5, pal.paper);
    vline(ctx, 8, 4, 4, pal.outline);
    hline(ctx, 8, 8, 3, pal.accents[0]);
  },

  painting(ctx, { pal, v }) {
    box(ctx, 2, 3, 12, 11, pal.furn, pal.outline);
    rect(ctx, 3, 4, 10, 9, pal.paper);
    if (v % 4 === 0) {
      rect(ctx, 3, 4, 10, 5, pal.sky);
      ellipse(ctx, 6, 11, 4, 2, pal.leaf);
      ellipse(ctx, 11, 11, 3, 2, pal.leafDark);
      px(ctx, 10, 6, pal.fabricC);
    } else if (v % 4 === 1) {
      ellipse(ctx, 7, 8, 3, 3, pal.accents[0]);
      rect(ctx, 9, 6, 3, 5, pal.accents[1]);
    } else if (v % 4 === 2) {
      vline(ctx, 8, 8, 5, pal.leafDark);
      ellipse(ctx, 8, 7, 2, 2, pal.accents[3]);
      px(ctx, 8, 7, pal.fabricC);
    } else {
      // pixel space-invader-ish doodle for the play corner
      rect(ctx, 5, 6, 6, 4, pal.accents[1]);
      px(ctx, 6, 7, pal.paper);
      px(ctx, 9, 7, pal.paper);
      px(ctx, 5, 10, pal.accents[1]);
      px(ctx, 10, 10, pal.accents[1]);
    }
  },

  noticeBoard(ctx, { pal, W }) {
    box(ctx, 1, 2, W - 2, 13, mix(pal.fabricC, pal.furn, 0.4), pal.outline);
    box(ctx, 4, 4, 7, 8, pal.paper, pal.outline);
    box(ctx, 13, 5, 6, 6, pal.accents[2], pal.outline);
    box(ctx, 21, 4, 7, 7, pal.accents[1], pal.outline);
    px(ctx, 7, 4, pal.accents[0]);
    px(ctx, 16, 5, pal.accents[0]);
    px(ctx, 24, 4, pal.accents[0]);
  },

  arcade(ctx, { pal, H, v, dir }) {
    if (dir === 'left' || dir === 'right') return sideArcade(ctx, pal, H, v, dir);
    const body = [pal.accents[3], pal.accents[1], pal.accents[0]][v % 3];
    box(ctx, 1, 0, 14, H, body, pal.outline);
    box(ctx, 1, 0, 14, 5, shade(body, -0.25), pal.outline);
    rect(ctx, 3, 2, 10, 1, pal.lampLight);
    box(ctx, 2, 6, 12, 10, pal.outline, pal.outline);
    rect(ctx, 3, 7, 10, 8, pal.screenOff);
    // tiny game on screen
    rect(ctx, 5, 9, 2, 2, pal.screenOn);
    rect(ctx, 9, 12, 3, 1, pal.accents[(v + 2) % 6]);
    px(ctx, 10, 8, pal.accents[(v + 4) % 6]);
    box(ctx, 0, 16, 16, 5, shade(body, -0.15), pal.outline);
    px(ctx, 4, 17, pal.outline);
    px(ctx, 4, 18, pal.outline);
    px(ctx, 9, 18, pal.accents[0]);
    px(ctx, 11, 18, pal.accents[2]);
    rect(ctx, 6, H - 9, 4, 2, pal.outline);
    hline(ctx, 2, H - 3, 12, shade(body, -0.3));
  },

  pingPong(ctx, { pal, W, H }) {
    const top = mix(pal.fabricA, pal.outline, 0.25);
    legs(ctx, pal, [4, W - 7], H - 10, 10, pal.metalDark);
    box(ctx, 0, 0, W, H - 8, top, pal.outline);
    rect(ctx, 2, 2, W - 4, 1, pal.paper);
    rect(ctx, 2, H - 11, W - 4, 1, pal.paper);
    vline(ctx, 2, 2, H - 12, pal.paper);
    vline(ctx, W - 3, 2, H - 12, pal.paper);
    hline(ctx, 2, (H - 8) / 2, W - 4, shade(top, 0.25));
    rect(ctx, W / 2 - 1, -1, 2, H - 7, pal.paper);
    vline(ctx, W / 2 - 1, 0, H - 8, pal.outline);
    box(ctx, 0, H - 9, W, 3, shade(top, -0.3), pal.outline);
    // paddles + ball
    ellipse(ctx, 12, 10, 3, 3, pal.accents[0]);
    ellipse(ctx, W - 12, 18, 3, 3, pal.accents[1]);
    px(ctx, W / 2 + 6, 12, pal.paper);
  },

  beanBag(ctx, { pal, v }) {
    const c = accent(pal, v + 1);
    ellipse(ctx, 8, 10, 8, 6, pal.outline);
    ellipse(ctx, 8, 10, 7, 5, c);
    ellipse(ctx, 7, 8, 4, 2, shade(c, 0.25));
    hline(ctx, 3, 13, 10, shade(c, -0.2));
  },

  stage(ctx, { pal, W, H, v }) {
    if (v === 1) return karaokeStage(ctx, pal, W, H);
    const top = shade(pal.furnLight, 0.06);
    const front = 6;
    rect(ctx, 0, 0, W, H - front, top);
    for (let y = 4; y < H - front; y += 5) hline(ctx, 0, y, W, shade(top, -0.08));
    for (let y = 0, r = 0; y < H - front; y += 5, r++) for (let x = (r * 23) % 40; x < W; x += 40) vline(ctx, x, y, 4, shade(top, -0.08));
    ellipse(ctx, W / 2, (H - front) / 2 + 1, 26, 9, shade(top, 0.16)); // spotlight spot
    hline(ctx, W / 2 - 3, (H - front) / 2 + 1, 7, pal.accents[0]); // tape mark
    vline(ctx, W / 2, (H - front) / 2 - 2, 7, pal.accents[0]);
    rect(ctx, 0, H - front, W, front, pal.furnDark); // raised front face
    hline(ctx, 0, H - front, W, shade(pal.furnLight, 0.3));
    for (let x = 8; x < W; x += 16) vline(ctx, x, H - front + 2, front - 3, shade(pal.furnDark, -0.15));
    hline(ctx, 0, H - 1, W, pal.outline);
    vline(ctx, 0, 0, H, pal.outline);
    vline(ctx, W - 1, 0, H, pal.outline);
  },

  podium(ctx, { pal }) {
    vline(ctx, 11, 0, 5, pal.outline); // microphone
    rect(ctx, 10, 0, 3, 2, pal.metalDark);
    box(ctx, 1, 4, 14, 6, pal.furnLight, pal.outline);
    hline(ctx, 2, 5, 12, shade(pal.furnLight, 0.25));
    box(ctx, 3, 9, 10, 15, pal.furn, pal.outline);
    vline(ctx, 5, 11, 11, shade(pal.furn, 0.2));
    rect(ctx, 6, 13, 4, 3, pal.accents[2]);
  },

  diningTable(ctx, { pal, W, H }) {
    legs(ctx, pal, [3, W - 6], H - 10, 10);
    box(ctx, 0, 0, W, H - 6, pal.furnLight, pal.outline);
    hline(ctx, 1, 1, W - 2, shade(pal.furnLight, 0.18));
    for (let i = 0; i < 5; i++) hline(ctx, 5 + ((i * 29) % (W - 24)), 5 + i * 4, 12, shade(pal.furnLight, -0.07));
    box(ctx, 0, H - 9, W, 5, pal.furn, pal.outline);
    const mid = Math.floor((H - 9) / 2);
    rect(ctx, 8, mid - 3, W - 16, 6, pal.accents[4]); // table runner
    hline(ctx, 8, mid - 3, W - 16, shade(pal.accents[4], 0.25));
    for (let x = 18; x < W - 8; x += 16) {
      ellipse(ctx, x, 6, 4, 2, pal.paper); // plates along the far side
      ellipse(ctx, x, H - 14, 4, 2, pal.paper); // and the near side
    }
    box(ctx, W / 2 - 3, mid - 2, 6, 5, pal.glass, pal.outline); // vase
    leafCluster(ctx, pal, W / 2, mid - 4, 3);
    mug(ctx, pal, 28, mid - 5, pal.accents[0]);
    mug(ctx, pal, W - 34, mid, pal.accents[1]);
  },

  treadmill(ctx, { pal, H }) {
    const belt = shade(pal.metalDark, -0.45);
    box(ctx, 1, 10, 14, H - 11, pal.metal, pal.outline);
    rect(ctx, 3, 12, 10, H - 15, belt);
    for (let y = 14; y < H - 4; y += 4) hline(ctx, 3, y, 10, shade(belt, 0.15));
    vline(ctx, 2, 4, 8, pal.metalDark);
    vline(ctx, 13, 4, 8, pal.metalDark);
    box(ctx, 1, 0, 14, 7, pal.metalDark, pal.outline);
    rect(ctx, 4, 2, 8, 3, pal.screenOn);
    px(ctx, 5, 3, shade(pal.screenOn, -0.4));
    px(ctx, 7, 3, shade(pal.screenOn, -0.4));
  },

  exerciseBike(ctx, { pal }) {
    // seen from the front: seat at the back, handlebars + flywheel in front of the rider
    ellipse(ctx, 8, 21, 6, 2, pal.outline);
    box(ctx, 5, 2, 6, 4, pal.fabricB, pal.outline); // seat
    hline(ctx, 6, 3, 4, shade(pal.fabricB, 0.25));
    rect(ctx, 7, 6, 2, 14, pal.metalDark);
    box(ctx, 1, 10, 14, 3, pal.metal, pal.outline); // handlebars
    rect(ctx, 6, 9, 4, 2, pal.screenOn); // little display
    ellipse(ctx, 8, 17, 4, 4, pal.outline);
    ellipse(ctx, 8, 17, 3, 3, pal.accents[1]);
    px(ctx, 8, 17, pal.metalLight);
  },

  weightRack(ctx, { pal, W, H }) {
    box(ctx, 0, 2, W, H - 2, pal.metalDark, pal.outline);
    rect(ctx, 2, 4, W - 4, H - 8, shade(pal.metalDark, -0.25));
    for (const sy of [6, 14]) {
      hline(ctx, 1, sy + 5, W - 2, pal.metal);
      for (let i = 0; i < 5; i++) {
        const x = 3 + i * 9;
        const c = accent(pal, i + (sy > 10 ? 2 : 0));
        rect(ctx, x, sy, 2, 5, c);
        rect(ctx, x + 2, sy + 2, 3, 1, pal.metalLight);
        rect(ctx, x + 5, sy, 2, 5, c);
      }
    }
    box(ctx, 2, H - 4, 4, 4, pal.metalDark, pal.outline);
    box(ctx, W - 6, H - 4, 4, 4, pal.metalDark, pal.outline);
  },

  weightBench(ctx, { pal, H }) {
    legs(ctx, pal, [3, 10], H - 8, 8, pal.metalDark);
    box(ctx, 4, 6, 8, H - 12, mix(pal.fabricA, pal.outline, 0.35), pal.outline);
    vline(ctx, 5, 7, H - 14, shade(mix(pal.fabricA, pal.outline, 0.35), 0.25));
    hline(ctx, 0, 4, 16, pal.metalLight); // barbell
    box(ctx, 0, 0, 3, 9, pal.outline, pal.outline);
    box(ctx, 13, 0, 3, 9, pal.outline, pal.outline);
  },

  yogaMat(ctx, { pal, H, v }) {
    const c = accent(pal, v + 3);
    roundBox(ctx, 2, 1, 12, H - 2, c, shade(c, -0.3));
    box(ctx, 2, 1, 12, 5, shade(c, -0.15), shade(c, -0.3)); // rolled end
    for (let y = 9; y < H - 3; y += 4) hline(ctx, 4, y, 8, shade(c, 0.12));
  },

  punchingBag(ctx, { pal, H }) {
    ellipse(ctx, 8, H - 4, 5, 2, shade(pal.gym, -0.2)); // floor shadow under the bag
    vline(ctx, 8, 0, 5, pal.metalDark);
    const c = pal.fabricB;
    roundBox(ctx, 3, 4, 10, H - 10, shade(c, -0.15), pal.outline);
    vline(ctx, 5, 6, H - 14, shade(c, 0.12));
    hline(ctx, 4, 8, 8, pal.outline);
    hline(ctx, 4, H - 10, 8, pal.outline);
  },

  mirrorLong(ctx, { pal, W }) {
    box(ctx, 1, 1, W - 2, 14, pal.metalLight, pal.outline);
    rect(ctx, 3, 3, W - 6, 9, pal.glassLight);
    for (let x = 10; x < W - 10; x += 28) for (let i = 0; i < 5; i++) px(ctx, x + i, 10 - i, pal.paper);
    hline(ctx, 3, 12, W - 6, pal.lampLight); // warm LED strip
  },

  mirror(ctx, { pal, W }) {
    box(ctx, 1, 1, W - 2, 14, pal.metalLight, pal.outline);
    rect(ctx, 3, 3, W - 6, 10, pal.glassLight);
    for (let i = 0; i < 6; i++) px(ctx, 6 + i, 11 - i, pal.paper);
    for (let i = 0; i < 4; i++) px(ctx, 16 + i, 10 - i, pal.paper);
  },

  projectorScreen(ctx, { pal, W, H }) {
    // pull-up presentation screen standing at the back of the stage
    vline(ctx, 6, 22, H - 23, pal.metalDark);
    vline(ctx, W - 7, 22, H - 23, pal.metalDark);
    hline(ctx, 3, H - 2, 7, pal.outline);
    hline(ctx, W - 10, H - 2, 7, pal.outline);
    box(ctx, 2, 0, W - 4, 4, pal.metalDark, pal.outline);
    box(ctx, 3, 3, W - 6, 20, pal.paper, pal.outline);
    rect(ctx, 7, 6, 18, 2, pal.accents[1]); // slide title
    for (let i = 0; i < 4; i++) rect(ctx, 8 + i * 6, 19 - (i * 2 + 3), 4, i * 2 + 3, pal.accents[(i + 2) % 6]);
    ellipse(ctx, W - 16, 13, 5, 5, pal.accents[0]);
    rect(ctx, W - 16, 8, 5, 5, pal.accents[2]);
    box(ctx, 3, 21, W - 6, 3, pal.metal, pal.outline);
  },

  /** Long shared counter with integrated basins, wooden cabinet front. */
  vanity(ctx, { pal, W, H }) {
    box(ctx, 0, 8, W, H - 8, pal.furnLight, pal.outline);
    for (let x = 4; x < W - 2; x += 4) vline(ctx, x, 10, H - 12, shade(pal.furnLight, -0.08));
    box(ctx, 0, 0, W, 10, pal.metalLight, pal.outline); // stone top
    hline(ctx, 1, 1, W - 2, shade(pal.metalLight, 0.45));
    for (let cx = 8; cx < W; cx += 32) {
      ellipse(ctx, cx, 5, 5, 2, pal.outline);
      ellipse(ctx, cx, 5, 4, 1, pal.paper);
      rect(ctx, cx - 1, 0, 2, 3, pal.metalDark); // tap
      if (cx + 16 < W) {
        rect(ctx, cx + 15, 2, 2, 4, pal.accents[Math.floor(cx / 32) % 6]); // soap bottle
        px(ctx, cx + 15, 1, pal.metalDark);
      }
    }
  },

  /**
   * Cubicle seen from the front: cistern on the back panel, bowl in the middle
   * (where a seated colleague's character appears), door swung flat open.
   */
  toilet(ctx, { pal, H, v }) {
    const lam = v === 0 ? pal.accents[0] : pal.accents[1];
    const lamD = shade(lam, -0.2);
    rect(ctx, 2, 3, 12, H - 5, shade(pal.bath, -0.06)); // cubicle floor shade
    box(ctx, 4, 5, 8, 7, pal.paper, pal.outline); // cistern
    rect(ctx, 7, 7, 2, 2, pal.metalLight); // flush button
    roundBox(ctx, 4, 12, 8, 12, pal.paper, pal.outline); // bowl
    ellipse(ctx, 8, 18, 2, 3, pal.glassLight);
    box(ctx, 0, 2, 2, H - 3, lamD, pal.outline); // partitions
    box(ctx, 14, 2, 2, H - 3, lamD, pal.outline);
    box(ctx, 0, 0, 16, 3, pal.metal, pal.outline); // top rail
    box(ctx, 1, 3, 2, H - 10, lam, pal.outline); // door, swung flat open
    px(ctx, 1, 4, '#7fae6e'); // "vacant" indicator
  },

  urinal(ctx, { pal, H }) {
    box(ctx, 13, 2, 3, H - 4, shade(pal.accents[1], -0.2), pal.outline); // privacy divider
    box(ctx, 6, H - 22, 4, 3, pal.metalLight, pal.outline); // sensor
    vline(ctx, 8, H - 19, 4, pal.metal);
    roundBox(ctx, 3, H - 15, 9, 12, pal.paper, pal.outline);
    rect(ctx, 5, H - 12, 5, 7, pal.glassLight);
  },

  entrance(ctx, { pal, W }) {
    // glass sliding doors in the bottom wall, seen from above
    rect(ctx, 0, 0, W, 16, pal.metalDark);
    hline(ctx, 0, 0, W, pal.outline);
    hline(ctx, 0, 15, W, pal.outline);
    box(ctx, 1, 3, W / 2 - 1, 9, pal.glass, pal.outline);
    box(ctx, W / 2, 3, W / 2 - 1, 9, pal.glass, pal.outline);
    for (let i = 0; i < 4; i++) px(ctx, 5 + i, 9 - i, pal.glassLight);
    for (let i = 0; i < 4; i++) px(ctx, W / 2 + 6 + i, 9 - i, pal.glassLight);
    rect(ctx, W / 2 - 3, 6, 2, 3, pal.metalLight);
    rect(ctx, W / 2 + 1, 6, 2, 3, pal.metalLight);
  },

  doormat(ctx, { pal, W, H }) {
    const c = mix(pal.fabricC, pal.furn, 0.35);
    roundBox(ctx, 3, 6, W - 6, H - 8, c, pal.outline);
    rect(ctx, 5, 8, W - 10, H - 12, shade(c, 0.15));
    for (let x = 8; x < W - 8; x += 3) vline(ctx, x, 10, H - 16, c);
  },

  speaker(ctx, { pal, H }) {
    box(ctx, 1, 0, 14, H - 2, '#2a2236', pal.outline);
    ellipse(ctx, 8, 6, 3, 3, '#4a3d5c');
    ellipse(ctx, 8, 6, 1, 1, pal.neonPurple);
    ellipse(ctx, 8, 16, 5, 5, '#4a3d5c');
    ellipse(ctx, 8, 16, 2, 2, '#16111e');
    px(ctx, 12, 2, pal.neonPink); // power LED
  },

  micStand(ctx, { pal, H }) {
    ellipse(ctx, 8, H - 2, 4, 1, pal.outline);
    vline(ctx, 8, 5, H - 7, pal.metalDark);
    box(ctx, 6, 0, 5, 6, pal.metal, pal.outline); // mic head
    hline(ctx, 7, 2, 3, pal.metalLight);
    px(ctx, 10, 6, pal.neonPink);
  },

  potatoMascot(ctx, { pal, H }) {
    // Mr. Potato: big, round, wearing a party hat
    const cy = H - 14;
    ellipse(ctx, 8, H - 1, 6, 1, pal.potatoDark); // floor shadow
    ellipse(ctx, 8, cy, 8, 13, pal.outline);
    ellipse(ctx, 8, cy, 7, 12, pal.potato);
    ellipse(ctx, 6, cy - 4, 3, 5, pal.potatoLight);
    [[4, cy + 5], [11, cy + 7], [12, cy - 6], [3, cy - 7]].forEach(([x, y]) => px(ctx, x, y, pal.potatoDark));
    px(ctx, 5, cy - 2, pal.outline); // eyes
    px(ctx, 10, cy - 2, pal.outline);
    px(ctx, 4, cy, pal.neonPink); // blush
    px(ctx, 11, cy, pal.neonPink);
    hline(ctx, 6, cy + 2, 4, pal.outline); // smile
    px(ctx, 5, cy + 1, pal.outline);
    px(ctx, 10, cy + 1, pal.outline);
    rect(ctx, 0, cy, 2, 1, pal.potatoDark); // little arms
    rect(ctx, 14, cy - 1, 2, 1, pal.potatoDark);
    for (let i = 0; i < 6; i++) hline(ctx, 8 - Math.floor(i / 2), cy - 18 + i, 1 + Math.floor(i / 2) * 2, pal.neonPink); // party hat
    px(ctx, 8, cy - 19, pal.neonAmber);
  },

  potatoPlush(ctx, { pal, H, v }) {
    const cy = H - 7;
    ellipse(ctx, 8, cy, 6, 5, pal.outline);
    ellipse(ctx, 8, cy, 5, 4, pal.potato);
    px(ctx, 6, cy - 1, pal.outline);
    px(ctx, 10, cy - 1, pal.outline);
    hline(ctx, 7, cy + 1, 3, pal.potatoDark);
    if (v === 1) { rect(ctx, 6, cy - 5, 2, 2, pal.neonPink); rect(ctx, 9, cy - 5, 2, 2, pal.neonPink); px(ctx, 8, cy - 4, pal.neonPink); } // bow
    if (v === 2) { hline(ctx, 6, cy - 4, 5, pal.neonAmber); px(ctx, 6, cy - 5, pal.neonAmber); px(ctx, 8, cy - 5, pal.neonAmber); px(ctx, 10, cy - 5, pal.neonAmber); } // crown
  },

  potatoVending(ctx, { pal, H }) {
    box(ctx, 1, 0, 14, H, mix(pal.neonPurple, pal.outline, 0.35), pal.outline);
    box(ctx, 3, 4, 8, 16, pal.glassLight, pal.outline); // window of snacks
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) rect(ctx, 4 + c * 4, 6 + r * 5, 3, 3, [pal.neonAmber, pal.potatoLight, pal.neonPink][(r + c) % 3]);
    rect(ctx, 12, 6, 2, 3, pal.outline); // coin slot
    px(ctx, 12, 11, pal.neonAmber);
    box(ctx, 3, H - 9, 10, 4, pal.outline, pal.outline); // pickup flap
    ellipse(ctx, 8, 1, 3, 2, pal.potato); // little potato on top
  },

  costumeRack(ctx, { pal, H }) {
    ellipse(ctx, 8, H - 2, 5, 1, pal.outline);
    vline(ctx, 8, 2, H - 4, pal.metalDark);
    hline(ctx, 4, 2, 9, pal.metalDark);
    // the potato suit on its hanger
    ellipse(ctx, 8, 13, 6, 8, pal.outline);
    ellipse(ctx, 8, 13, 5, 7, pal.potato);
    px(ctx, 6, 10, pal.potatoDark);
    px(ctx, 10, 15, pal.potatoDark);
    rect(ctx, 6, 6, 5, 3, shade(pal.potato, -0.1)); // neck hole
    rect(ctx, 7, 7, 3, 1, pal.outline);
  },

  danceFloor(ctx, { pal, W, H }) {
    const colors = [pal.neonPink, pal.neonPurple, pal.neonAmber, pal.glass];
    for (let ty = 0; ty < H / TILE; ty++)
      for (let tx = 0; tx < W / TILE; tx++) {
        const c = mix(colors[(tx + ty * 2) % colors.length], pal.outline, 0.45); // lights "off"; the renderer animates them
        box(ctx, tx * TILE, ty * TILE, TILE, TILE, c, pal.outline);
        hline(ctx, tx * TILE + 2, ty * TILE + 2, 4, shade(c, 0.3));
      }
  },

  clubSign(ctx, { pal, W }) {
    box(ctx, 0, 1, W, 14, '#140b1d', pal.outline);
    hline(ctx, 2, 2, W - 4, pal.neonPurple); // neon tube frame
    hline(ctx, 2, 13, W - 4, pal.neonPurple);
    drawPixelText(ctx, 'POTATO CLUB', W / 2, 4, '#ffd1ec', pal.neonPink);
  },

  /** Open washroom doorway: frame, the door swung flat against the wall, and a ♀/♂ sign. */
  washroomDoor(ctx, { pal, H, v }) {
    const plate = v === 0 ? '#e0708f' : '#4f8fc9'; // pink for women, blue for men
    rect(ctx, 0, 0, 2, H, pal.trim); // door frame posts
    rect(ctx, 14, 0, 2, H, pal.trim);
    vline(ctx, 0, 0, H, pal.outline);
    vline(ctx, 15, 0, H, pal.outline);
    box(ctx, 2, 10, 2, H - 10, shade(plate, 0.25), pal.outline); // door leaf, swung open
    box(ctx, 3, 0, 10, 9, plate, pal.outline); // sign plate above the doorway
    drawTemplate(ctx, v === 0 ? PICTO.women : PICTO.men, 5, 1, { '#': '#ffffff' });
  },

  potatoPoster(ctx, { pal, v }) {
    box(ctx, 2, 1, 12, 14, '#1a1024', pal.neonPurple);
    ellipse(ctx, 8, 9, 4, 4, pal.potato);
    px(ctx, 7, 8, pal.outline);
    px(ctx, 9, 8, pal.outline);
    if (v === 1) { vline(ctx, 12, 6, 5, pal.metalDark); rect(ctx, 11, 4, 3, 2, pal.metal); } // potato with a mic
    else if (v === 2) { px(ctx, 5, 3, pal.neonPink); px(ctx, 7, 3, pal.neonPink); hline(ctx, 5, 4, 3, pal.neonPink); px(ctx, 6, 5, pal.neonPink); } // heart
    else { hline(ctx, 6, 4, 5, pal.neonAmber); px(ctx, 8, 3, pal.neonAmber); } // crown
  },

  /**
   * Long cupboard along the pantry's side wall (the items on it are separate objects).
   * A wooden cabinet edge with door lines runs down its open side, so the whole
   * length reads as a cupboard, not just its far end.
   */
  pantryCounter(ctx, { pal, W, H, oh }) {
    sideCounterBase(ctx, pal, W, H, oh);
    const edge = W - 5;
    rect(ctx, edge, 1, 4, H - 10, pal.furn); // cabinet side, all the way down
    vline(ctx, edge, 1, H - 10, pal.outline);
    for (let y = oh + TILE; y < H - 9; y += TILE) hline(ctx, edge, y, 4, pal.furnDark); // door joins
    for (let y = oh + TILE / 2; y < H - 9; y += TILE) rect(ctx, edge + 1, y - 1, 1, 3, pal.metalDark); // handles
  },

  /** Coffee & tea machine: chunky body, a display, a cup under the spout. */
  coffeeTeaMachine(ctx, { pal, H }) {
    box(ctx, 2, 0, 12, H - 6, '#3a3f4a', pal.outline);
    rect(ctx, 3, 1, 10, 2, '#5b6270');
    rect(ctx, 4, 5, 5, 3, pal.screenOn); // display
    px(ctx, 11, 5, '#e2544e'); // coffee button
    px(ctx, 11, 7, '#5fae6a'); // tea button
    rect(ctx, 6, 10, 4, 2, pal.outline); // spout
    box(ctx, 5, H - 8, 6, 6, '#ffffff', pal.outline); // cup
    rect(ctx, 6, H - 7, 4, 1, '#7a4a2a'); // coffee in the cup
  },

  /** A basket of big red apples. */
  appleBasket(ctx, { pal, H }) {
    const red = '#e2443a';
    for (const [x, y] of [[5, H - 9], [11, H - 9], [8, H - 12]] as const) {
      ellipse(ctx, x, y, 3, 3, shade(red, -0.35));
      ellipse(ctx, x, y, 2, 2, red);
      px(ctx, x - 1, y - 1, '#ff9a8a'); // shine
      px(ctx, x, y - 3, '#5a3a1a'); // stem
      px(ctx, x + 1, y - 3, '#5fae6a'); // leaf
    }
    box(ctx, 1, H - 7, 14, 6, '#b07a45', pal.outline); // basket
    for (let x = 3; x < 14; x += 3) vline(ctx, x, H - 6, 4, '#8a5a30');
  },

  /** A basket of bread: a baguette and a round loaf. */
  breadBasket(ctx, { pal, H }) {
    const crust = '#d9993f';
    ellipse(ctx, 6, H - 9, 4, 3, shade(crust, -0.3)); // round loaf
    ellipse(ctx, 6, H - 9, 3, 2, crust);
    hline(ctx, 4, H - 10, 4, '#f2c57a');
    for (let i = 0; i < 9; i++) rect(ctx, 6 + i, H - 12 + Math.floor(i / 3), 2, 3, i % 3 === 0 ? '#f2c57a' : crust); // baguette
    box(ctx, 1, H - 7, 14, 6, '#b07a45', pal.outline); // basket
    for (let x = 3; x < 14; x += 3) vline(ctx, x, H - 6, 4, '#8a5a30');
  },

  /** A neat stack of breakfast / lunch boxes with coloured lids and a ribbon. */
  mealBoxes(ctx, { pal, H }) {
    const lids = ['#e2544e', '#4f8fc9', '#f2b53a'];
    for (let i = 0; i < 3; i++) {
      const y = H - 7 - i * 6;
      box(ctx, 2, y, 12, 6, '#f4ede0', pal.outline); // box
      rect(ctx, 3, y + 1, 10, 2, lids[i]); // lid
      vline(ctx, 8, y + 1, 4, '#ffffff'); // ribbon
    }
  },

  rug(ctx, { pal, W, H, v }) {
    // 0-2: lounge/hall rugs; 3-6: office carpets in lavender, apricot, rose, sky (no greens)
    const base = [pal.fabricC, pal.accents[3], pal.accents[1], pal.accents[0], pal.accents[2], pal.accents[4], pal.accents[5]][v % 7];
    roundBox(ctx, 0, 0, W, H, mix(base, pal.outline, 0.25), mix(base, pal.outline, 0.45));
    roundBox(ctx, 2, 2, W - 4, H - 4, base, shade(base, 0.25));
    rect(ctx, 4, 4, W - 8, H - 8, base);
    for (let y = 6; y < H - 6; y += 6) for (let x = 6 + ((y / 6) % 2) * 3; x < W - 6; x += 6) px(ctx, x, y, shade(base, 0.2));
  },
};

// ------------------------------------------------------------ club helpers --

function karaokeStage(ctx: Ctx, pal: EnvPalette, W: number, H: number) {
  const top = mix(pal.neonPurple, pal.outline, 0.55);
  const front = 6;
  rect(ctx, 0, 0, W, H - front, top);
  for (let y = 4; y < H - front; y += 5) hline(ctx, 0, y, W, shade(top, -0.12));
  ellipse(ctx, W / 2, (H - front) / 2 + 1, 18, 7, shade(top, 0.15)); // spotlight
  rect(ctx, 0, H - front, W, front, '#1a1024');
  for (let x = 3; x < W; x += 6) px(ctx, x, H - front + 2, [pal.neonPink, pal.neonAmber, pal.neonPurple][(x / 6) % 3 | 0]); // marquee bulbs
  hline(ctx, 0, H - front, W, pal.neonPink);
  hline(ctx, 0, H - 1, W, pal.outline);
  vline(ctx, 0, 0, H, pal.outline);
  vline(ctx, W - 1, 0, H, pal.outline);
}

/** 5x7 pixel font — just the letters the club sign needs. Big enough to read at a glance. */
const GLYPHS: Record<string, string[]> = {
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/** Neon text: a soft drop-shadow underneath, bright letters on top. */
function drawPixelText(ctx: Ctx, text: string, cx: number, y: number, color: string, shadow: string) {
  const pitch = 6;
  const w = text.length * pitch - 1;
  let x = Math.round(cx - w / 2);
  for (const ch of text) {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    g.forEach((row, gy) => [...row].forEach((c, gx) => { if (c === '#') px(ctx, x + gx + 1, y + gy + 1, shadow); }));
    g.forEach((row, gy) => [...row].forEach((c, gx) => { if (c === '#') px(ctx, x + gx, y + gy, color); }));
    x += pitch;
  }
}

/** Washroom door pictograms (5x7). */
const PICTO = {
  women: ['..#..', '.###.', '..#..', '.###.', '#####', '.#.#.', '.#.#.'],
  men: ['..#..', '.###.', '#####', '.###.', '.###.', '.#.#.', '.#.#.'],
};

// ------------------------------------------------------- side-wall helpers --

/** A counter running along a side wall: long stone top, cabinet front at the near end. */
function sideCounterBase(ctx: Ctx, pal: EnvPalette, W: number, H: number, oh: number) {
  box(ctx, 0, 0, W, H - 8, pal.metalLight, pal.outline);
  vline(ctx, W - 2, 1, H - 10, shade(pal.metalLight, 0.4));
  for (let y = oh + TILE; y < H - 8; y += TILE) hline(ctx, 1, y, W - 2, shade(pal.metalLight, -0.08));
  box(ctx, 0, H - 9, W, 9, pal.furn, pal.outline);
  box(ctx, 2, H - 7, W - 4, 6, pal.furnLight, pal.outline);
  rect(ctx, W / 2 - 2, H - 5, 4, 1, pal.metalDark);
}

/** A bookshelf standing against a side wall: we see its top and the book spines along its open side. */
function sideBookshelf(ctx: Ctx, pal: EnvPalette, W: number, H: number, oh: number, v: number, dir: 'left' | 'right') {
  const open = dir === 'right' ? W - 6 : 1; // the side facing into the room
  box(ctx, 0, oh - 6, W, H - oh + 6, pal.furn, pal.outline);
  rect(ctx, 1, oh - 5, W - 2, 3, shade(pal.furn, 0.15)); // top board
  for (let y = oh, i = v; y < H - 4; y += 3, i++) {
    rect(ctx, open, y, 5, 2, accent(pal, i));
    px(ctx, open + (dir === 'right' ? 4 : 0), y, shade(accent(pal, i), 0.3));
  }
  box(ctx, 0, H - 4, W, 4, pal.furnDark, pal.outline);
}

/** An arcade cabinet against a side wall, screen facing into the room. */
function sideArcade(ctx: Ctx, pal: EnvPalette, H: number, v: number, dir: 'left' | 'right') {
  const body = [pal.accents[3], pal.accents[1], pal.accents[0]][v % 3];
  const flip = (x: number, w: number) => (dir === 'left' ? x : 16 - x - w);
  box(ctx, flip(4, 11), 0, 11, H, body, pal.outline); // cabinet side panel
  rect(ctx, flip(6, 7), 3, 7, 2, shade(body, 0.25)); // side stripe
  box(ctx, flip(1, 6), 6, 6, 10, pal.outline, pal.outline); // screen bezel facing the room
  rect(ctx, flip(2, 4), 7, 4, 8, pal.screenOn);
  px(ctx, flip(3, 1), 9, pal.accents[(v + 2) % 6]);
  box(ctx, flip(0, 7), 16, 7, 4, shade(body, -0.15), pal.outline); // control panel sticking out
  px(ctx, flip(2, 1), 17, pal.accents[0]);
  rect(ctx, flip(6, 8), H - 3, 8, 2, shade(body, -0.3));
}

/** Render one placement to its own canvas. */
export function paintFurniture(p: Placement, pal: EnvPalette): HTMLCanvasElement {
  const def: FurnitureDef = FURNITURE[p.type];
  const { w, h } = footprint(p);
  const oh = def.overhang ?? 0;
  const W = w * TILE;
  const H = h * TILE + oh;
  const { canvas, ctx } = makeCanvas(W, H);
  const painter = P[p.type];
  if (painter) painter(ctx, { pal, W, H, oh, dir: p.dir ?? 'down', v: p.variant ?? 0 });
  else box(ctx, 0, 0, W, H, '#ff00ff', '#000'); // loud placeholder so missing art is obvious
  return canvas;
}

/** Cache key: identical-looking pieces share one texture. */
export function furnitureTextureKey(p: Placement, theme: string): string {
  const { w, h } = footprint(p);
  return `furn:${p.type}:${w}x${h}:${p.dir ?? ''}:${p.variant ?? 0}:${theme}`;
}
