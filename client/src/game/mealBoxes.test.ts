import { describe, expect, it } from 'vitest';
import { mealBoxMessage, mealBoxStatus } from './mealBoxes';

const at = (h: number, m = 0) => new Date(2026, 10, 21, h, m);

describe('meal boxes', () => {
  it('serves breakfast boxes 9:00–11:00 and lunch boxes 12:00–14:00', () => {
    expect(mealBoxStatus(at(9, 0)).open).toBe('breakfast');
    expect(mealBoxStatus(at(10, 59)).open).toBe('breakfast');
    expect(mealBoxStatus(at(12, 0)).open).toBe('lunch');
    expect(mealBoxStatus(at(13, 59)).open).toBe('lunch');
    expect(mealBoxStatus(at(8, 59)).open).toBeNull();
    expect(mealBoxStatus(at(11, 0)).open).toBeNull();
    expect(mealBoxStatus(at(14, 0)).open).toBeNull();
  });

  it('says when the next boxes arrive and asks you to wait', () => {
    expect(mealBoxMessage(at(8, 0))).toBe('🍱 Breakfast boxes arrive at 9:00 — in 1h 0m. Please wait!');
    expect(mealBoxMessage(at(11, 15))).toBe('🍱 Lunch boxes arrive at 12:00 — in 45m. Please wait!');
    expect(mealBoxMessage(at(10, 30))).toBe('🍱 Got a breakfast box! Enjoy. (Out until 11:00)');
    expect(mealBoxMessage(at(13, 30))).toBe('🍱 Got a lunch box! Enjoy. (Out until 14:00)');
  });

  it('after lunch, points to tomorrow’s breakfast', () => {
    const s = mealBoxStatus(at(15, 0));
    expect(s.next).toEqual({ meal: 'breakfast', hour: 9, minutesUntil: 18 * 60 });
  });
});
