import { describe, expect, it } from 'vitest';
import { OfficeRoom } from './room';

const look = { skin: 0, hairStyle: 1, hairColor: 2, outfit: 3 };

describe('OfficeRoom', () => {
  it('lets people in by name and tells newcomers who is already here', () => {
    const room = new OfficeRoom();
    expect(room.join('a', 'Ann', look)).toMatchObject({ ok: true, others: [] });
    const res = room.join('b', 'Ben', look);
    expect(res.ok && res.others.map((p) => p.name)).toEqual(['Ann']);
    expect(room.size).toBe(2);
  });

  it('rejects a name that is already online (ignoring case and spaces), and frees it on leave', () => {
    const room = new OfficeRoom();
    room.join('a', 'Ann', look);
    expect(room.join('b', ' ann ', look)).toEqual({ ok: false, error: 'name-taken' });
    room.leave('a');
    expect(room.join('b', 'ann', look).ok).toBe(true);
  });

  it('rejects bad names and cleans up a junk appearance', () => {
    const room = new OfficeRoom();
    expect(room.join('a', '', look)).toEqual({ ok: false, error: 'bad-name' });
    expect(room.join('a', '<script>', look)).toEqual({ ok: false, error: 'bad-name' });
    const res = room.join('a', 'Ann', { skin: 999, hairStyle: -1 });
    expect(res.ok && res.you.appearance).toEqual({ skin: 0, hairStyle: 0, hairColor: 0, outfit: 0 });
  });

  it('stores valid moves and ignores junk or moves from people who never joined', () => {
    const room = new OfficeRoom();
    room.join('a', 'Ann', look);
    expect(room.move('a', { x: 100, y: 120, dir: 'left', anim: 'walk' })).toEqual({ x: 100, y: 120, dir: 'left', anim: 'walk' });
    expect(room.get('a')).toMatchObject({ x: 100, y: 120, anim: 'walk' });
    expect(room.move('a', { x: -5, y: 0, dir: 'left', anim: 'walk' })).toBeNull();
    expect(room.move('a', { x: 10, y: 10, dir: 'sideways', anim: 'walk' })).toBeNull();
    expect(room.move('a', { x: 10, y: 10, dir: 'up', anim: 'x; drop table' })).toBeNull();
    expect(room.move('ghost', { x: 10, y: 10, dir: 'up', anim: 'idle' })).toBeNull();
  });
});
