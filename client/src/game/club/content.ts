/** Silly text for The Potato Club. All original. */
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

export const POTATO_MESSAGES = [
  'You are now officially a potato.',
  'The potato council has approved your performance.',
  'Your singing has caused 3 potatoes to evolve.',
  "Tonight's special guest: Mr. Potato.",
  'You have achieved maximum potato energy.',
  'A nearby potato is weeping with joy.',
  'Potato fact: you are 0% potato. For now.',
  'The fries in the pantry felt that.',
  'Certified fresh. Certified spud.',
] as const;

export function randomPotatoMessage(): string {
  return pick(POTATO_MESSAGES);
}

const SONG_START = ['Mashed', 'Twice-Baked', 'Crispy', 'Sweet', 'Spicy', 'Hash Brown', 'Midnight', 'Loaded'];
const SONG_END = ['Hearts', 'Dreams', 'Feelings', 'Love Song', 'Moonlight', 'Memories', 'Groove'];
const SONG_TAG = ['Club Mix', 'Acoustic', 'Potato Remix', 'Live at the Pantry', 'Extended Spud Version', 'Unplugged'];

/** e.g. "Crispy Moonlight (Potato Remix)" */
export function randomSongTitle(): string {
  return `${pick(SONG_START)} ${pick(SONG_END)} (${pick(SONG_TAG)})`;
}

const SNACKS = [
  'Spicy Hash Brown',
  'Sour Cream Wedges',
  'Truffle Tots',
  'Mini Rösti',
  'Sweet Potato Fries',
  'Potato Mochi',
  'Curly Fries (extra curly)',
  'A Single, Perfect Chip',
];

export function randomSnack(): string {
  return pick(SNACKS);
}

export const MASCOT_LINES = [
  "Tonight's special guest: Mr. Potato.",
  'Mr. Potato says: "spud-tacular!"',
  'Mr. Potato is doing his signature move.',
  'Mr. Potato has entered maximum potato energy.',
  'Mr. Potato approves of your vibe.',
] as const;

export function randomMascotLine(): string {
  return pick(MASCOT_LINES);
}
