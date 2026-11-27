import {
  MAX_PLAYERS,
  SPAWN,
  cleanMotion,
  isValidName,
  nameKey,
  newPlayer,
  tileCenter,
  type JoinResult,
  type Motion,
  type PlayerSnapshot,
} from '@little-office/shared';

/**
 * The office as the server sees it: who is here and their latest state.
 *
 * Pure data and rules, with no sockets, so it can be unit-tested. index.ts
 * wires it to Socket.IO and does the broadcasting.
 */
export class OfficeRoom {
  private readonly players = new Map<string, PlayerSnapshot>();

  get size(): number {
    return this.players.size;
  }

  get(id: string): PlayerSnapshot | undefined {
    return this.players.get(id);
  }

  list(): PlayerSnapshot[] {
    return [...this.players.values()];
  }

  /** Let someone in by name (no password). Names must be unique while they're online. */
  join(id: string, name: unknown, appearance: unknown): JoinResult {
    if (!isValidName(name)) return { ok: false, error: 'bad-name' };
    if (this.list().some((p) => nameKey(p.name) === nameKey(String(name)))) return { ok: false, error: 'name-taken' };
    if (this.players.size >= MAX_PLAYERS) return { ok: false, error: 'full' };
    const others = this.list();
    const you = newPlayer(id, String(name), appearance, tileCenter(SPAWN));
    this.players.set(id, you);
    return { ok: true, you, others };
  }

  leave(id: string): boolean {
    return this.players.delete(id);
  }

  /** Store a validated move; returns it for relaying, or null if it was junk or they never joined. */
  move(id: string, m: unknown): Motion | null {
    const p = this.players.get(id);
    const clean = cleanMotion(m);
    if (!p || !clean) return null;
    Object.assign(p, clean);
    return clean;
  }
}
