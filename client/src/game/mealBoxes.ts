/**
 * Breakfast and lunch boxes in the pantry are only out at set times
 * (using the viewer's local clock). `hour` = when they come out, `until` = when
 * they're cleared away (exclusive):
 *   - breakfast boxes: 9:00 – 11:00
 *   - lunch boxes:     12:00 – 14:00
 */
export const MEAL_TIMES = [
  { meal: 'breakfast', hour: 9, until: 11 },
  { meal: 'lunch', hour: 12, until: 14 },
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
  const open = MEAL_TIMES.find((t) => h >= t.hour && h < t.until)?.meal ?? null;
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
  if (s.open) {
    const until = MEAL_TIMES.find((t) => t.meal === s.open)!.until;
    return `🍱 Got a ${s.open} box! Enjoy. (Out until ${until}:00)`;
  }
  return `🍱 ${cap(s.next.meal)} boxes arrive at ${s.next.hour}:00 — in ${pretty(s.next.minutesUntil)}. Please wait!`;
}
