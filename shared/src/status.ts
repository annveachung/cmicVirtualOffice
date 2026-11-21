/**
 * Statuses a colleague can show above their character. Kept in shared code so
 * the server (Milestone 2) can validate them and broadcast changes to everyone.
 * Light-hearted on purpose: this is not attendance tracking.
 */
export const STATUSES = [
  { id: 'available', label: 'Available' },
  { id: 'working', label: 'Working' },
  { id: 'slacking', label: 'Slacking' },
  { id: 'break', label: 'On a break' },
  { id: 'eating', label: 'Eating' },
  { id: 'away', label: 'Away' },
  { id: 'dnd', label: 'Do not disturb' },
] as const;

export type StatusId = (typeof STATUSES)[number]['id'];

export const DEFAULT_STATUS: StatusId = 'available';

/** Type guard for untrusted input (e.g. a message from a client). */
export function isStatusId(v: unknown): v is StatusId {
  return typeof v === 'string' && STATUSES.some((s) => s.id === v);
}

export function statusInfo(id: StatusId) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0];
}
