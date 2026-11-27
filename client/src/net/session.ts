import { io, type Socket } from 'socket.io-client';
import type { Appearance, ClientEvents, JoinResult, Motion, PlayerSnapshot, ServerEvents, StatusId } from '@little-office/shared';

type OfficeSocket = Socket<ServerEvents, ClientEvents>;

/** Something that happened to another person in the office (or to the connection). */
export type SessionEvent =
  | { type: 'joined'; player: PlayerSnapshot }
  | { type: 'left'; player: PlayerSnapshot }
  | { type: 'moved'; id: string; motion: Motion }
  | { type: 'status'; id: string; status: StatusId }
  | { type: 'said'; id: string; text: string }
  | { type: 'reacted'; id: string; kind: string }
  | { type: 'costume'; id: string; on: boolean }
  | { type: 'knock'; doorId: string }
  /** Reconnected after a blip: the whole roster was replaced. */
  | { type: 'reset' }
  | { type: 'connection'; online: boolean };

/**
 * Your live connection to the shared office.
 *
 * It keeps `players` (everyone else who's here) up to date from the moment you
 * join, so the game can be created a bit later and still see everyone. React
 * and Phaser both subscribe with `on()`.
 */
export class Session {
  /** Everyone else in the office, by connection id. */
  readonly players = new Map<string, PlayerSnapshot>();
  private readonly listeners = new Set<(e: SessionEvent) => void>();
  /** What to re-send after reconnecting (the server forgets you when the connection drops). */
  private mine: { status: StatusId | null; costume: boolean; motion: Motion | null } = { status: null, costume: false, motion: null };

  constructor(
    private readonly socket: OfficeSocket,
    public you: PlayerSnapshot,
    others: PlayerSnapshot[],
  ) {
    this.setRoster(others);
    const s = socket;
    s.on('player:joined', (p) => {
      this.players.set(p.id, p);
      this.emit({ type: 'joined', player: p });
    });
    s.on('player:left', (id) => {
      const p = this.players.get(id);
      if (!p) return;
      this.players.delete(id);
      this.emit({ type: 'left', player: p });
    });
    s.on('player:moved', (id, motion) => {
      const p = this.players.get(id);
      if (!p) return;
      Object.assign(p, motion);
      this.emit({ type: 'moved', id, motion });
    });
    s.on('player:status', (id, status) => this.patch(id, { status }, { type: 'status', id, status }));
    s.on('player:costume', (id, on) => this.patch(id, { costume: on }, { type: 'costume', id, on }));
    s.on('player:said', (id, text) => this.emit({ type: 'said', id, text }));
    s.on('player:reacted', (id, kind) => this.emit({ type: 'reacted', id, kind }));
    s.on('door:knocked', (doorId) => this.emit({ type: 'knock', doorId }));
    s.on('disconnect', () => this.emit({ type: 'connection', online: false }));
    // Socket.IO reconnects by itself; the server sees a brand-new connection, so walk back in.
    s.io.on('reconnect', () => this.rejoin());
  }

  get online(): boolean {
    return this.socket.connected;
  }

  on(fn: (e: SessionEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ------------------------------------------------------------ outgoing --

  move(m: Motion) {
    this.mine.motion = m;
    this.socket.volatile.emit('move', m);
  }
  status(s: StatusId) {
    this.mine.status = s;
    this.socket.emit('status', s);
  }
  say(text: string) {
    this.socket.emit('say', text);
  }
  react(kind: string) {
    this.socket.emit('react', kind);
  }
  costume(on: boolean) {
    this.mine.costume = on;
    this.socket.emit('costume', on);
  }
  knock(doorId: string) {
    this.socket.emit('knock', doorId);
  }

  close() {
    this.listeners.clear();
    this.socket.disconnect();
  }

  // ------------------------------------------------------------- helpers --

  private emit(e: SessionEvent) {
    for (const fn of this.listeners) fn(e);
  }

  private patch(id: string, fields: Partial<PlayerSnapshot>, e: SessionEvent) {
    const p = this.players.get(id);
    if (!p) return;
    Object.assign(p, fields);
    this.emit(e);
  }

  private setRoster(list: PlayerSnapshot[]) {
    this.players.clear();
    for (const p of list) this.players.set(p.id, p);
  }

  private rejoin() {
    this.socket.emit('join', { name: this.you.name, appearance: this.you.appearance }, (res) => {
      if (!res.ok) return; // e.g. someone took the name meanwhile — stay solo until you re-enter
      this.you = res.you;
      this.setRoster(res.others);
      this.emit({ type: 'reset' });
      this.emit({ type: 'connection', online: true });
      if (this.mine.motion) this.move(this.mine.motion);
      if (this.mine.status) this.status(this.mine.status);
      if (this.mine.costume) this.costume(true);
    });
  }
}

export type JoinOutcome =
  | { kind: 'joined'; session: Session }
  | { kind: 'refused'; error: Exclude<JoinResult, { ok: true }>['error'] }
  | { kind: 'offline' };

/** How long to wait for the server before letting you into a solo office instead. */
const CONNECT_TIMEOUT_MS = 4000;

/** Connect to the office server and walk in under `name`. */
export function joinOffice(name: string, appearance: Appearance): Promise<JoinOutcome> {
  const socket: OfficeSocket = io({ timeout: CONNECT_TIMEOUT_MS, reconnectionDelayMax: 4000 });
  return new Promise((done) => {
    const giveUp = window.setTimeout(() => {
      socket.disconnect();
      done({ kind: 'offline' });
    }, CONNECT_TIMEOUT_MS);
    socket.once('connect', () => {
      socket.emit('join', { name, appearance }, (res) => {
        window.clearTimeout(giveUp);
        if (res.ok) done({ kind: 'joined', session: new Session(socket, res.you, res.others) });
        else {
          socket.disconnect();
          done({ kind: 'refused', error: res.error });
        }
      });
    });
  });
}
