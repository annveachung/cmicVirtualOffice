import { describe, expect, it } from 'vitest';
import { DEFAULT_STATUS, STATUSES, isStatusId, statusInfo } from './status.js';

describe('statuses', () => {
  it('has exactly the seven agreed statuses, in order', () => {
    const ids = STATUSES.map((s) => s.id);
    expect(ids).toEqual(['available', 'working', 'slacking', 'break', 'eating', 'away', 'dnd']);
  });

  it('validates untrusted input', () => {
    expect(isStatusId('working')).toBe(true);
    expect(isStatusId('hacking')).toBe(false);
    expect(isStatusId(42)).toBe(false);
    expect(statusInfo(DEFAULT_STATUS).label).toBe('Available');
  });
});
