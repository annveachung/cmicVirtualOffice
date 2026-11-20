import { FURNITURE, MAP_H, MAP_W, PLACEMENTS, TILE, TILES, footprint, type FurnitureDef } from '@little-office/shared';
import { paintFurniture } from './furnitureArt';
import type { EnvPalette } from './palette';
import { hline, makeCanvas, mix, px, rect, shade, vline, type Ctx } from './pixel';

/**
 * Paints everything that never moves — floors, walls, wall decorations and
 * rugs — into ONE big canvas. Phaser then shows it as a single image, which
 * is far cheaper than thousands of individual tile sprites.
 */
const isWall = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || TILES[ty][tx] === '#';

type WallKind = 'top' | 'face' | 'upper';
function wallKind(tx: number, ty: number): WallKind {
  if (!isWall(tx, ty + 1)) return 'face';
  if (ty === 1 && wallKind(tx, 2) === 'face') return 'upper'; // the tall back wall is 2 tiles high
  return 'top';
}

function paintFloor(ctx: Ctx, pal: EnvPalette, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  switch (TILES[ty][tx]) {
    case 'c': {
      // warm terracotta-tan floor tiles with darker grout, like a retro office
      rect(ctx, x, y, TILE, TILE, (tx + ty) % 2 ? pal.carpet : pal.carpetAlt);
      hline(ctx, x, y, TILE, shade(pal.carpet, -0.14));
      vline(ctx, x, y, TILE, shade(pal.carpet, -0.14));
      hline(ctx, x + 1, y + 1, TILE - 1, shade(pal.carpet, 0.1));
      break;
    }
    case 'w': {
      for (let r = 0; r < 4; r++) {
        const py = y + r * 4;
        rect(ctx, x, py, TILE, 4, (ty * 4 + r) % 2 ? pal.wood : pal.woodAlt);
        hline(ctx, x, py + 3, TILE, pal.woodSeam);
        const seam = (tx * 16 + (ty * 4 + r) * 11) % 24;
        if (seam < 16) vline(ctx, x + seam, py, 3, pal.woodSeam);
      }
      break;
    }
    case 'k': {
      for (let i = 0; i < 4; i++) {
        const cx = (i % 2) * 8;
        const cy = Math.floor(i / 2) * 8;
        rect(ctx, x + cx, y + cy, 8, 8, (i === 0 || i === 3) ? pal.kitchen : pal.kitchenAlt);
      }
      break;
    }
    case 'p': {
      // Potato Club party carpet: deep purple with confetti specks
      rect(ctx, x, y, TILE, TILE, (tx + ty) % 2 ? pal.clubFloor : pal.clubFloorAlt);
      const confetti = [pal.neonPink, pal.neonAmber, pal.neonPurple, pal.glassLight];
      for (let i = 0; i < 3; i++) px(ctx, x + ((tx * 7 + ty * 3 + i * 5) % 15), y + ((tx * 5 + ty * 11 + i * 7) % 15), confetti[(tx + ty + i) % 4]);
      break;
    }
    case 'b': {
      // small square washroom tiles with grout lines
      rect(ctx, x, y, TILE, TILE, pal.bath);
      for (let i = 0; i < TILE; i += 4) {
        hline(ctx, x, y + i, TILE, pal.bathAlt);
        vline(ctx, x + i, y, TILE, pal.bathAlt);
      }
      break;
    }
    case 'g': {
      // interlocking rubber gym tiles with a few speckles
      rect(ctx, x, y, TILE, TILE, (tx + ty) % 2 ? pal.gym : pal.gymAlt);
      hline(ctx, x, y, TILE, pal.gymAlt);
      vline(ctx, x, y, TILE, pal.gymAlt);
      px(ctx, x + 5, y + 4, pal.gymAlt);
      px(ctx, x + 11, y + 9, pal.gymAlt);
      px(ctx, x + 3, y + 12, pal.gymAlt);
      break;
    }
  }
}

function paintWall(ctx: Ctx, pal: EnvPalette, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  const kind = wallKind(tx, ty);
  if (kind === 'top') {
    rect(ctx, x, y, TILE, TILE, pal.wallTop);
    // outline only the edges that touch floor, so walls read as thin and tidy
    if (!isWall(tx - 1, ty)) vline(ctx, x, y, TILE, pal.outline);
    if (!isWall(tx + 1, ty)) vline(ctx, x + TILE - 1, y, TILE, pal.outline);
    if (!isWall(tx, ty - 1)) hline(ctx, x, y, TILE, pal.outline);
    if (!isWall(tx - 1, ty)) vline(ctx, x + 1, y, TILE, pal.wallTopEdge);
    return;
  }
  // walls facing into the Potato Club get purple party wallpaper
  const club = TILES[ty + 1]?.[tx] === 'p';
  const stripes = (y0: number, h: number) => {
    rect(ctx, x, y0, TILE, h, club ? pal.clubWall : pal.wallPaper);
    for (let sx = 2; sx < TILE; sx += 4) vline(ctx, x + sx, y0, h, club ? pal.clubWallAlt : pal.wallPaperAlt);
  };
  if (kind === 'upper') {
    stripes(y, TILE);
    hline(ctx, x, y, TILE, pal.outline);
    hline(ctx, x, y + 1, TILE, pal.wallPaperAlt);
    return;
  }
  // face: a short divider shows its top cap first; the tall back wall doesn't
  let top = y;
  if (!isWall(tx, ty - 1)) {
    rect(ctx, x, y, TILE, 4, pal.wallTop);
    hline(ctx, x, y, TILE, pal.outline);
    hline(ctx, x, y + 3, TILE, pal.outline);
    top = y + 4;
  }
  const bottom = y + TILE;
  const wainH = top === y ? 7 : 4;
  stripes(top, bottom - top - wainH - 2);
  hline(ctx, x, bottom - wainH - 2, TILE, pal.trim);
  rect(ctx, x, bottom - wainH - 1, TILE, wainH - 1, pal.wainscot);
  for (let sx = 3; sx < TILE; sx += 8) vline(ctx, x + sx, bottom - wainH, wainH - 3, pal.trim);
  rect(ctx, x, bottom - 2, TILE, 2, pal.trim);
  if (!isWall(tx - 1, ty)) vline(ctx, x, y, TILE, pal.outline);
  if (!isWall(tx + 1, ty)) vline(ctx, x + TILE - 1, y, TILE, pal.outline);
}

function paintShadows(ctx: Ctx, pal: EnvPalette) {
  ctx.fillStyle = pal.shadow;
  for (let ty = 0; ty < MAP_H; ty++)
    for (let tx = 0; tx < MAP_W; tx++) {
      if (isWall(tx, ty)) continue;
      if (isWall(tx, ty - 1)) ctx.fillRect(tx * TILE, ty * TILE, TILE, 3);
      if (isWall(tx - 1, ty) && wallKind(tx - 1, ty) === 'top') ctx.fillRect(tx * TILE, ty * TILE, 2, TILE);
    }
  // soft contact shadow under every standing piece of furniture
  for (const p of PLACEMENTS) {
    const def: FurnitureDef = FURNITURE[p.type];
    if (def.layer !== 'object' || def.onTop) continue;
    const { w, h } = footprint(p);
    ctx.fillRect(p.tx * TILE + 2, (p.ty + h) * TILE - 1, w * TILE - 3, 3);
  }
}

// ---------------------------------------------------------------------------
// The back wall: floor-to-ceiling windows looking out over a city skyline
// ---------------------------------------------------------------------------

/** Tiny deterministic pseudo-random number in [0, 1) — same city every time. */
const rand = (n: number) => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Building heights for every pixel column across the map (step function of random-width blocks). */
function skylineHeights(width: number, seed: number, minW: number, maxW: number, minH: number, maxH: number): number[] {
  const out = new Array<number>(width);
  for (let x = 0, i = 0; x < width; i++) {
    const w = minW + Math.floor(rand(seed + i) * (maxW - minW));
    const h = minH + Math.floor(rand(seed + i + 500) * (maxH - minH));
    for (let k = 0; k < w && x + k < width; k++) out[x + k] = h;
    x += w;
  }
  return out;
}

/** Back-wall columns that are part of the tall window wall (above a room, not a pillar). */
const isWindowWall = (tx: number) => wallKind(tx, 1) === 'upper' && wallKind(tx, 2) === 'face';

function paintSkyline(ctx: Ctx, pal: EnvPalette) {
  const W = MAP_W * TILE;
  const top = TILE + 1; // just under the wall cap
  const bottom = 3 * TILE - 4; // leave room for the sill
  const H = bottom - top;
  const far = skylineHeights(W, 11, 5, 12, Math.floor(H * 0.35), Math.floor(H * 0.75));
  const near = skylineHeights(W, 97, 6, 15, Math.floor(H * 0.2), Math.floor(H * 0.9));

  for (let tx = 0; tx < MAP_W; tx++) {
    if (!isWindowWall(tx)) continue;
    for (let X = tx * TILE; X < (tx + 1) * TILE; X++) {
      for (let r = 0; r < H; r++) {
        const Y = top + r;
        const fromBottom = H - r;
        let c: string;
        if (fromBottom <= near[X]) {
          // near building, with a grid of windows (some lit)
          const win = X % 3 === 1 && r % 3 === 1 && fromBottom < near[X] - 1;
          c = win ? (rand(X * 31 + r * 7) > 0.62 ? pal.cityWindowLit : pal.cityWindow) : pal.city;
        } else if (fromBottom <= far[X]) {
          c = pal.cityFar;
        } else {
          // sky: stepped gradient bands (pixel-art style) + a few stars
          const t = Math.floor((r / H) * 5) / 5;
          c = mix(pal.skyTop, pal.skyHorizon, t);
          if (rand(X * 13 + r * 101) > 0.992) c = mix(c, '#ffffff', 0.7);
        }
        ctx.fillStyle = c;
        ctx.fillRect(X, Y, 1, 1);
      }
    }
    const x = tx * TILE;
    // window frames: a mullion every 2 tiles, frame along the top, chunky sill at the bottom
    if (tx % 2 === 0) rect(ctx, x, top, 2, H, pal.outline);
    hline(ctx, x, top - 1, TILE, pal.outline);
    hline(ctx, x, top, TILE, pal.metalDark);
    rect(ctx, x, bottom, TILE, 3, pal.trim);
    hline(ctx, x, bottom + 3, TILE, pal.outline);
    // glass glint
    if (tx % 4 === 1) for (let i = 0; i < 5; i++) px(ctx, x + 4 + i, top + 10 - i, mix(pal.skyHorizon, '#ffffff', 0.6));
  }
}

export function paintBackground(pal: EnvPalette): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(MAP_W * TILE, MAP_H * TILE);
  for (let ty = 0; ty < MAP_H; ty++)
    for (let tx = 0; tx < MAP_W; tx++) {
      if (isWall(tx, ty)) paintWall(ctx, pal, tx, ty);
      else paintFloor(ctx, pal, tx, ty);
    }
  // rugs and wall decorations are static, so they're baked in too
  for (const p of PLACEMENTS) {
    const layer = FURNITURE[p.type].layer;
    if (layer === 'floor') ctx.drawImage(paintFurniture(p, pal), p.tx * TILE, p.ty * TILE);
  }
  paintSkyline(ctx, pal);
  paintShadows(ctx, pal);
  for (const p of PLACEMENTS) {
    if (FURNITURE[p.type].layer === 'wall') ctx.drawImage(paintFurniture(p, pal), p.tx * TILE, p.ty * TILE);
  }
  return canvas;
}

/**
 * Light-mode sunbeams (and moonlight at night): translucent slanted shafts
 * falling through the window wall onto the floor. Returned as its own layer so
 * it can be swapped when the theme changes.
 */
export function paintSunbeams(color: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(MAP_W * TILE, MAP_H * TILE);
  ctx.fillStyle = color;
  // a slanted shaft through every other window bay of the back wall
  for (let tx = 0; tx < MAP_W; tx += 4) {
    if (!isWindowWall(tx) || !isWindowWall(tx + 1)) continue;
    const x0 = tx * TILE + 4;
    const y0 = 3 * TILE;
    const w = 2 * TILE - 8;
    for (let i = 0; i < 44; i++) {
      ctx.globalAlpha = 0.5 * (1 - i / 44);
      ctx.fillRect(x0 + Math.floor(i * 0.45), y0 + i, w, 1);
    }
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/**
 * Pixel-style radial glow used for lamps at night (drawn with additive
 * blending). Alpha falls off in 5 hard steps instead of a smooth gradient,
 * which matches the pixel-art look.
 */
export function paintGlow(radius: number, hex: string, peak = 0.5): HTMLCanvasElement {
  const size = radius * 2;
  const { canvas, ctx } = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const STEPS = 5;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - radius, (y + 0.5 - radius) * 1.25) / radius; // slightly squashed: 3/4 view
      if (d >= 1) continue;
      const a = (Math.ceil((1 - d) * STEPS) / STEPS) * peak;
      const i = (y * size + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(a * a * 255);
    }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

