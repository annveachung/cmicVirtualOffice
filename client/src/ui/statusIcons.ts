import type { StatusId } from '@little-office/shared';

/**
 * Simple pixel status dots (9x9): a coloured circle, plus a tiny white symbol
 * where it helps tell statuses apart. Used by both the React menu (as SVG)
 * and the game (as a canvas texture next to the name tag).
 *   O = outline, F = fill colour, W = white symbol, . = transparent
 */
const CIRCLE = [
  '..OOOOO..',
  '.OFFFFFO.',
  'OFFFFFFFO',
  'OFFFFFFFO',
  'OFFFFFFFO',
  'OFFFFFFFO',
  'OFFFFFFFO',
  '.OFFFFFO.',
  '..OOOOO..',
];

/** White symbol drawn on top of the circle (same 9x9 grid). */
const SYMBOLS: Record<StatusId, string[]> = {
  available: [],
  working: ['', '', '...WWW...', '', '...WWW...', '', '...WWW...'], // typing lines
  slacking: ['', '', '', '..W...W..', '...WWW...'], // wave / easy smile
  break: ['', '', '...W.W...', '...W.W...', '...W.W...', '...W.W...'], // pause bars
  eating: ['', '', '', '..W...W..', '..WWWWW..', '...WWW...'], // a bowl
  away: ['', '', '....W....', '....W....', '....WWW..'], // clock hands
  dnd: ['', '', '', '', '..WWWWW..'], // the classic "do not disturb" bar
};

export const STATUS_COLORS: Record<StatusId, string> = {
  available: '#3fbf5a',
  working: '#4a8fe0',
  slacking: '#f2c23a',
  break: '#f08a3a',
  eating: '#e86a9a',
  away: '#9aa3ad',
  dnd: '#e0483f',
};

const OUTLINE = '#1f2a24';

/** The icon as a list of coloured pixels — shared by the SVG and canvas renderers. */
export function statusPixels(id: StatusId): { x: number; y: number; color: string }[] {
  const out: { x: number; y: number; color: string }[] = [];
  const sym = SYMBOLS[id];
  CIRCLE.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '.') return;
      const white = sym[y]?.[x] === 'W';
      out.push({ x, y, color: c === 'O' ? OUTLINE : white ? '#ffffff' : STATUS_COLORS[id] });
    }),
  );
  return out;
}

export const STATUS_ICON_SIZE = 9;
