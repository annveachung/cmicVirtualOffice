import { FURNITURE, MAP_H, MAP_W, PLACEMENTS, TILE, TILES, footprint, type FurnitureDef } from '@little-office/shared';
import { paintFurniture } from './furnitureArt';
import type { EnvPalette } from './palette';
import { hline, makeCanvas, px, rect, vline, type Ctx } from './pixel';

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
      rect(ctx, x, y, TILE, TILE, (tx + ty) % 2 ? pal.carpet : pal.carpetAlt);
      px(ctx, x + 4, y + 4, pal.carpetAlt);
      px(ctx, x + 12, y + 12, pal.carpetAlt);
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
  const stripes = (y0: number, h: number) => {
    rect(ctx, x, y0, TILE, h, pal.wallPaper);
    for (let sx = 2; sx < TILE; sx += 4) vline(ctx, x + sx, y0, h, pal.wallPaperAlt);
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
  paintShadows(ctx, pal);
  for (const p of PLACEMENTS) {
    if (FURNITURE[p.type].layer === 'wall') ctx.drawImage(paintFurniture(p, pal), p.tx * TILE, p.ty * TILE);
  }
  return canvas;
}

/**
 * Light-mode sunbeams: translucent slanted shafts falling from each window in
 * the back wall onto the floor. Returned as its own layer so it can fade out
 * when switching to night.
 */
export function paintSunbeams(color: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(MAP_W * TILE, MAP_H * TILE);
  ctx.fillStyle = color;
  for (const p of PLACEMENTS) {
    if (p.type !== 'window' || p.ty !== 1) continue;
    const x0 = p.tx * TILE + 4;
    const y0 = 3 * TILE;
    const w = 2 * TILE - 8;
    for (let i = 0; i < 44; i++) {
      ctx.globalAlpha = 0.55 * (1 - i / 44);
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

// ---------------------------------------------------------------------------
// Outdoors: a repeating garden tile + a paved path, shown around the building
// so the office always fills the whole window, whatever its shape.
// ---------------------------------------------------------------------------

export function paintGrassTile(pal: EnvPalette): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(48, 48);
  rect(ctx, 0, 0, 48, 48, pal.grass);
  const tuft = (x: number, y: number) => {
    px(ctx, x, y, pal.grassDark);
    px(ctx, x + 2, y, pal.grassDark);
    px(ctx, x + 1, y - 1, pal.grassDark);
  };
  [[5, 7], [30, 4], [18, 20], [40, 26], [8, 36], [27, 41], [44, 12]].forEach(([x, y]) => tuft(x, y));
  [[12, 14], [36, 36], [22, 31]].forEach(([x, y]) => px(ctx, x, y, pal.grassLight));
  // a few tiny flowers
  [[14, 27, 0], [38, 9, 3], [3, 44, 1]].forEach(([x, y, c]) => {
    px(ctx, x, y, pal.accents[c]);
    px(ctx, x - 1, y + 1, pal.accents[c]);
    px(ctx, x + 1, y + 1, pal.accents[c]);
    px(ctx, x, y + 1, pal.paper);
  });
  return canvas;
}

export function paintPavingTile(pal: EnvPalette): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(16, 16);
  rect(ctx, 0, 0, 16, 16, pal.paving);
  hline(ctx, 0, 7, 16, pal.pavingAlt);
  hline(ctx, 0, 15, 16, pal.pavingAlt);
  vline(ctx, 7, 0, 7, pal.pavingAlt);
  vline(ctx, 15, 8, 7, pal.pavingAlt);
  return canvas;
}
