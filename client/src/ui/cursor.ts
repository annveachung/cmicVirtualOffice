/**
 * Pixel-art mouse cursors, drawn from ASCII templates onto a canvas at startup
 * and applied via CSS custom properties (no image files).
 *   X = outline, W = fill, . = transparent
 */
const ARROW = [
  'X...........',
  'XX..........',
  'XWX.........',
  'XWWX........',
  'XWWWX.......',
  'XWWWWX......',
  'XWWWWWX.....',
  'XWWWWWWX....',
  'XWWWWWWWX...',
  'XWWWWWWWWX..',
  'XWWWWWWWWWX.',
  'XWWWWWWXXXXX',
  'XWWWXWWX....',
  'XWWXXWWX....',
  'XWX..XWWX...',
  'XX...XWWX...',
  'X.....XWWX..',
  '......XWWX..',
  '.......XX...',
];

const HAND = [
  '.....XX.........',
  '....XWWX........',
  '....XWWX........',
  '....XWWX........',
  '....XWWXXX......',
  '....XWWXWWXXX...',
  '..XXXWWXWWXWWXX.',
  '.XWWXWWWWWWWWWWX',
  '.XWWWWWWWWWWWWWX',
  '..XWWWWWWWWWWWWX',
  '..XWWWWWWWWWWWWX',
  '...XWWWWWWWWWWWX',
  '...XWWWWWWWWWWX.',
  '....XWWWWWWWWWX.',
  '....XWWWWWWWWX..',
  '.....XWWWWWWWX..',
  '.....XXXXXXXXX..',
];

const SCALE = 2;

function toDataUrl(rows: string[], outline: string, fill: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length * SCALE;
  canvas.height = rows.length * SCALE;
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'X' ? outline : fill;
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }),
  );
  return canvas.toDataURL('image/png');
}

export function installPixelCursors() {
  const outline = '#1f3a2c';
  const fill = '#fbf8ee';
  const root = document.documentElement.style;
  root.setProperty('--cursor', `url(${toDataUrl(ARROW, outline, fill)}) 0 0, auto`);
  root.setProperty('--cursor-hand', `url(${toDataUrl(HAND, outline, fill)}) ${5 * SCALE} 0, pointer`);
}
