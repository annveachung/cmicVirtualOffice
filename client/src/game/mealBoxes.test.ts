import { describe, expect, it } from 'vitest';
import { mealBoxMessage, mealBoxStatus } from './mealBoxes';

const at = (h: number, m = 0) => new Date(2026, 10, 21, h, m);

describe('meal boxes', () => {
  it('serves breakfast boxes 10:00–10:59 and lunch boxes 12:00–12:59', () => {
    expect(mealBoxStatus(at(10, 0)).open).toBe('breakfast');
    expect(mealBoxStatus(at(10, 59)).open).toBe('breakfast');
    expect(mealBoxStatus(at(12, 30)).open).toBe('lunch');
    expect(mealBoxStatus(at(11, 0)).open).toBeNull();
    expect(mealBoxStatus(at(9, 59)).open).toBeNull();
    expect(mealBoxStatus(at(13, 0)).open).toBeNull();
  });

  it('says when the next boxes arrive and asks you to wait', () => {
    expect(mealBoxMessage(at(9, 0))).toBe('🍱 Breakfast boxes arrive at 10:00 — in 1h 0m. Please wait!');
    expect(mealBoxMessage(at(11, 15))).toBe('🍱 Lunch boxes arrive at 12:00 — in 45m. Please wait!');
    expect(mealBoxMessage(at(10, 30))).toBe('🍱 Got a breakfast box! Enjoy.');
  });

  it('after lunch, points to tomorrow’s breakfast', () => {
    const s = mealBoxStatus(at(15, 0));
    expect(s.next).toEqual({ meal: 'breakfast', hour: 10, minutesUntil: 19 * 60 });
  });
});
