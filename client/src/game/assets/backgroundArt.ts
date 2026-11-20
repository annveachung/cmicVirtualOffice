import { FURNITURE, MAP_H, MAP_W, PLACEMENTS, TILE, TILES, footprint, isSolidTile, type FurnitureDef, type TileKind } from '@little-office/shared';
import { paintFurniture } from './furnitureArt';
import type { EnvPalette } from './palette';
import { hline, makeCanvas, px, rect, vline, type Ctx } from './pixel';

/**
 * Paints everything that never moves — floors, walls, wall decorations and
 * rugs — into ONE big canvas. Phaser then shows it as a single image, which
 * is far cheaper than thousands of individual tile sprites.
 */
const isWall = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || isSolidTile(TILES[ty][tx]);
const isGlass = (tx: number, ty: number) => TILES[ty]?.[tx] === 'G';

type WallKind = 'top' | 'face' | 'upper';
function wallKind(tx: number, ty: number): WallKind {
  if (!isWall(tx, ty + 1)) return 'face';
  if (ty === 1 && wallKind(tx, 2) === 'face') return 'upper'; // the tall back wall is 2 tiles high
  return 'top';
}

function paintFloor(ctx: Ctx, pal: EnvPalette, tx: number, ty: number, kind: TileKind = TILES[ty][tx]) {
  const x = tx * TILE;
  const y = ty * TILE;
  switch (kind) {
    case 'c': {
      // polished concrete: big 2x2-tile slabs, faint seams, a few speckles
      rect(ctx, x, y, TILE, TILE, pal.carpet);
      if (tx % 2 === 0) vline(ctx, x, y, TILE, pal.carpetAlt);
      if (ty % 2 === 0) hline(ctx, x, y, TILE, pal.carpetAlt);
      px(ctx, x + ((tx * 7 + ty * 3) % 13) + 1, y + ((tx * 5 + ty * 11) % 13) + 1, pal.carpetAlt);
      px(ctx, x + ((tx * 3 + ty * 7) % 11) + 3, y + ((tx * 13 + ty * 5) % 11) + 2, pal.carpetAlt);
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

/** The floor kind next to a wall tile (so a slim glass wall can sit on matching floor). */
function neighbourFloor(tx: number, ty: number): TileKind {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = TILES[ty + dy]?.[tx + dx];
    if (k && !isSolidTile(k)) return k;
  }
  return 'c';
}

/**
 * Glass partitions — the modern-office look. A glass wall seen face-on is a
 * framed pane with a frosted privacy band and glints; a glass wall running
 * "into" the screen is drawn as a slim strip standing on the floor.
 */
function paintGlass(ctx: Ctx, pal: EnvPalette, tx: number, ty: number) {
  const x = tx * TILE;
  const y = ty * TILE;
  paintFloor(ctx, pal, tx, ty, neighbourFloor(tx, ty));
  if (wallKind(tx, ty) === 'face') {
    rect(ctx, x, y + 2, TILE, TILE - 4, pal.glass);
    hline(ctx, x, y + 1, TILE, pal.metalDark); // top frame
    hline(ctx, x, y + TILE - 3, TILE, pal.metalDark); // bottom frame
    hline(ctx, x, y + TILE - 2, TILE, pal.outline);
    hline(ctx, x, y, TILE, pal.outline);
    for (let i = 0; i < TILE; i += 2) px(ctx, x + i + (ty % 2), y + 8, pal.glassLight); // frosted band
    px(ctx, x + 3 + (tx % 3), y + 5, pal.glassLight); // glints
    px(ctx, x + 4 + (tx % 3), y + 4, pal.glassLight);
    if (!isGlass(tx + 1, ty)) vline(ctx, x + TILE - 1, y, TILE, pal.metalDark); // mullion at the run's end
    if (tx % 2 === 0) vline(ctx, x, y + 2, TILE - 4, pal.metalDark); // mullion every 2 tiles
    return;
  }
  // vertical run: a 4px glass strip down the middle
  rect(ctx, x + 6, y, 4, TILE, pal.glass);
  vline(ctx, x + 6, y, TILE, pal.metalDark);
  vline(ctx, x + 9, y, TILE, pal.metalDark);
  px(ctx, x + 7, y + 4 + (ty % 3) * 3, pal.glassLight);
  if (!isWall(tx, ty + 1)) hline(ctx, x + 6, y + TILE - 1, 4, pal.outline);
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
      // solid walls cast a soft shadow; glass lets the light through
      if (isWall(tx, ty - 1) && !isGlass(tx, ty - 1)) ctx.fillRect(tx * TILE, ty * TILE, TILE, 3);
      if (isWall(tx - 1, ty) && !isGlass(tx - 1, ty) && wallKind(tx - 1, ty) === 'top') ctx.fillRect(tx * TILE, ty * TILE, 2, TILE);
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
      if (isGlass(tx, ty)) paintGlass(ctx, pal, tx, ty);
      else if (isWall(tx, ty)) paintWall(ctx, pal, tx, ty);
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

