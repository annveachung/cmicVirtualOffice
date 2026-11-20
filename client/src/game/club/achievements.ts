/**
 * Playful, personal achievements for joining in at The Potato Club.
 * No scores, no leaderboards — just little "you did a thing!" moments.
 *
 * Stored per device in localStorage for now; moves to the account in Milestone 3.
 */
export const ACHIEVEMENTS = {
  firstDance: { title: 'First Groove', detail: 'Danced at The Potato Club' },
  danceScholar: { title: 'Dance Scholar', detail: 'Tried every dance style' },
  micDrop: { title: 'Mic Drop', detail: 'Sang your first karaoke song' },
  certifiedPotato: { title: 'Certified Potato', detail: 'Wore the potato suit' },
  snackAttack: { title: 'Snack Attack', detail: 'Got 3 snacks from the potato machine' },
  mascotFriend: { title: 'Friend of Mr. Potato', detail: 'Said hi to Mr. Potato' },
  groupGroove: { title: 'Group Groove', detail: 'Started a group dance' },
  cheerleader: { title: 'Cheerleader', detail: 'Sent 5 reactions' },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;

const KEY = 'little-office:achievements';

interface Store {
  unlocked: AchievementId[];
  counters: Record<string, number>;
  dances: string[];
}

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { unlocked: s.unlocked ?? [], counters: s.counters ?? {}, dances: s.dances ?? [] };
  } catch {
    return { unlocked: [], counters: {}, dances: [] };
  }
}

function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked — achievements just won't persist */
  }
}

/** Returns the achievement if it was newly unlocked (so the UI can celebrate), else null. */
export function unlock(id: AchievementId): (typeof ACHIEVEMENTS)[AchievementId] | null {
  const s = load();
  if (s.unlocked.includes(id)) return null;
  s.unlocked.push(id);
  save(s);
  return ACHIEVEMENTS[id];
}

/** Increment a counter; returns the new count. */
export function bump(counter: string): number {
  const s = load();
  s.counters[counter] = (s.counters[counter] ?? 0) + 1;
  save(s);
  return s.counters[counter];
}

/** Record a dance style; returns how many different styles you've tried. */
export function recordDance(style: string): number {
  const s = load();
  if (!s.dances.includes(style)) s.dances.push(style);
  save(s);
  return s.dances.length;
}
