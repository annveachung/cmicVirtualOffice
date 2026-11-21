import { describe, expect, it } from 'vitest';
import { DEFAULT_STATUS, STATUSES, isStatusId, statusInfo } from './status.js';

describe('statuses', () => {
  it('includes the spec statuses plus daydreaming, with unique ids', () => {
    const ids = STATUSES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['working', 'coffee', 'lunch', 'away', 'available', 'playing', 'dnd', 'daydreaming']) expect(ids).toContain(id);
  });

  it('validates untrusted input', () => {
    expect(isStatusId('working')).toBe(true);
    expect(isStatusId('hacking')).toBe(false);
    expect(isStatusId(42)).toBe(false);
    expect(statusInfo(DEFAULT_STATUS).label).toBe('Available to chat');
  });
});
