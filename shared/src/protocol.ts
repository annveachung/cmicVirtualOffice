import { sanitizeAppearance } from './appearance.js';
import { DEFAULT_STATUS, type StatusId } from './status.js';
import { TILE } from './config.js';
import { MAP_H, MAP_W } from './map/office.js';
import type { Appearance, Direction } from './types.js';

/**
 * MULTIPLAYER PROTOCOL — the messages the browser and the server send each other
 * over Socket.IO. Both sides import these types, so a typo in an event name or a
 * missing field is a compile error instead of a silent bug.
 *
 *   browser ──join {name, look}──▶ server ──(ack) everyone already here──▶ browser
 *   browser ──move / status / say…──▶ server ──player:moved / player:status…──▶ everyone else
 *
 * The server never trusts what a browser sends: every payload goes through the
 * `clean*` helpers below before it is stored or relayed.
 */

/** Where someone is and what they're doing — sent ~10 times a second while it changes. */
export interface Motion {
  x: number;
  y: number;
  dir: Direction;
  /** Animation name (idle, walk, sit, danceSpin…). The browser checks it exists before playing it. */
  anim: string;
}

/** Everything a newcomer needs to draw someone who is already in the office. */
export interface PlayerSnapshot extends Motion {
  id: string;
  name: string;
  appearance: Appearance;
  status: StatusId;
  costume: boolean;
}

export type JoinResult =
  | { ok: true; you: PlayerSnapshot; others: PlayerSnapshot[] }
  | { ok: false; error: 'name-taken' | 'bad-name' | 'full' };

/** Browser → server. */
export interface ClientEvents {
  join: (req: { name: string; appearance: Appearance }, ack: (res: JoinResult) => void) => void;
  move: (m: Motion) => void;
  status: (s: StatusId) => void;
  say: (text: string) => void;
  react: (kind: string) => void;
  costume: (on: boolean) => void;
  knock: (doorId: string) => void;
}

/** Server → browser. */
export interface ServerEvents {
  'player:joined': (p: PlayerSnapshot) => void;
  'player:left': (id: string) => void;
  'player:moved': (id: string, m: Motion) => void;
  'player:status': (id: string, s: StatusId) => void;
  'player:said': (id: string, text: string) => void;
  'player:reacted': (id: string, kind: string) => void;
  'player:costume': (id: string, on: boolean) => void;
  'door:knocked': (doorId: string) => void;
}

/** How many people fit in the office at once. */
export const MAX_PLAYERS = 30;
/** Longest speech bubble the server will relay. */
export const MAX_SAY_LENGTH = 140;

const NAME_RE = /^[A-Za-z0-9 _-]{1,12}$/;

/** 1–12 letters, numbers, spaces, _ or - (after trimming). */
export function isValidName(name: unknown): boolean {
  return typeof name === 'string' && NAME_RE.test(name.trim());
}

/** Names are unique ignoring case and extra spaces: "Ann" and " ann " are the same person. */
export const nameKey = (name: string) => name.trim().toLowerCase();

const DIRS: readonly Direction[] = ['up', 'down', 'left', 'right'];

/** Validate a motion update; null if it's junk (out of the map, not numbers…). */
export function cleanMotion(m: unknown): Motion | null {
  if (!m || typeof m !== 'object') return null;
  const { x, y, dir, anim } = m as Record<string, unknown>;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 0 || y < 0 || x > MAP_W * TILE || y > MAP_H * TILE) return null;
  if (!DIRS.includes(dir as Direction)) return null;
  if (typeof anim !== 'string' || !/^[a-zA-Z]{1,24}$/.test(anim)) return null;
  return { x, y, dir: dir as Direction, anim };
}

/** Trim a speech line to something safe to show; null if empty. */
export function cleanSay(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const t = text.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, MAX_SAY_LENGTH);
  return t || null;
}

/** A fresh snapshot for someone who just walked in. */
export function newPlayer(id: string, name: string, appearance: unknown, spawn: { x: number; y: number }): PlayerSnapshot {
  return {
    id,
    name: name.trim(),
    appearance: sanitizeAppearance(appearance as Partial<Appearance>),
    x: spawn.x,
    y: spawn.y,
    dir: 'up',
    anim: 'idle',
    status: DEFAULT_STATUS,
    costume: false,
  };
}
