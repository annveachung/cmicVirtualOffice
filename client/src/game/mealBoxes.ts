/**
 * Breakfast and lunch boxes in the pantry are only out at set times
 * (using the viewer's local clock):
 *   - breakfast boxes: 10:00 – 10:59
 *   - lunch boxes:     12:00 – 12:59
 */
export const MEAL_TIMES = [
  { meal: 'breakfast', hour: 10 },
  { meal: 'lunch', hour: 12 },
] as const;

export type Meal = (typeof MEAL_TIMES)[number]['meal'];

export interface MealBoxStatus {
  /** The meal whose boxes are out right now, if any. */
  open: Meal | null;
  /** The next time boxes come out (if none are out now). */
  next: { meal: Meal; hour: number; minutesUntil: number };
}

export function mealBoxStatus(now: Date): MealBoxStatus {
  const h = now.getHours();
  const open = MEAL_TIMES.find((t) => t.hour === h)?.meal ?? null;
  const minutesNow = h * 60 + now.getMinutes();
  // the first slot later today, otherwise breakfast tomorrow
  const later = MEAL_TIMES.find((t) => t.hour * 60 > minutesNow);
  const slot = later ?? MEAL_TIMES[0];
  const minutesUntil = (later ? slot.hour * 60 : slot.hour * 60 + 24 * 60) - minutesNow;
  return { open, next: { meal: slot.meal, hour: slot.hour, minutesUntil } };
}

const pretty = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** What your character says when they reach for a meal box. */
export function mealBoxMessage(now: Date): string {
  const s = mealBoxStatus(now);
  if (s.open) return `🍱 Got a ${s.open} box! Enjoy.`;
  return `🍱 ${cap(s.next.meal)} boxes arrive at ${s.next.hour}:00 — in ${pretty(s.next.minutesUntil)}. Please wait!`;
}
