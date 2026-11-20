/**
 * Tiny pixel-art toolkit on top of the Canvas 2D API.
 *
 * All art in The Little Office is generated in code at startup instead of
 * being loaded from PNG files. Benefits: original art (no licensing worries),
 * one consistent style, and themes/colour variations are just palette swaps.
 * Everything is drawn at 1 pixel = 1 art pixel; Phaser scales it up with
 * nearest-neighbour filtering so it stays crisp.
 */
export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Fill a rectangle (integer pixels). */
export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export const px = (ctx: Ctx, x: number, y: number, color: string) => rect(ctx, x, y, 1, 1, color);

/** Filled rectangle with a 1px outline — the basic building block of most furniture. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, outline: string): void {
  rect(ctx, x, y, w, h, outline);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

/** Outlined box with rounded (cut) corners. */
export function roundBox(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, outline: string): void {
  rect(ctx, x + 1, y, w - 2, h, outline);
  rect(ctx, x, y + 1, w, h - 2, outline);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

export function hline(ctx: Ctx, x: number, y: number, w: number, color: string) { rect(ctx, x, y, w, 1, color); }
export function vline(ctx: Ctx, x: number, y: number, h: number, color: string) { rect(ctx, x, y, 1, h, color); }

/** Pixel ellipse (filled), good for pots, rugs, shadows. */
export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1);
  }
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** amt > 0 lightens towards white, amt < 0 darkens towards a warm near-black (cozier than pure black). */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex);
  if (amt >= 0) return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  const t = -amt;
  return toHex(r + (40 - r) * t, g + (28 - g) * t, b + (30 - b) * t);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function hexToInt(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

/**
 * Draw an ASCII pixel template. Each character maps to a colour via `colors`;
 * '.' (or any unmapped char) is transparent. `mirror` flips horizontally.
 */
export function drawTemplate(
  ctx: Ctx,
  rows: readonly string[],
  ox: number,
  oy: number,
  colors: Record<string, string | undefined>,
  mirror = false,
): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = mirror ? row[row.length - 1 - x] : row[x];
      const c = colors[ch];
      if (c) px(ctx, ox + x, oy + y, c);
    }
  });
}
