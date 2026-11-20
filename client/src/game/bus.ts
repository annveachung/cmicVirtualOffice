import Phaser from 'phaser';
import type { Theme } from '@little-office/shared';
import type { DanceStyle, Reaction } from './assets/textures';

/**
 * React <-> Phaser bridge.
 *
 * React owns the UI (top bar, menus); Phaser owns the world. Neither imports
 * the other — they talk through this typed event bus. That keeps the game
 * testable on its own and stops React re-renders from touching the canvas.
 */
export interface BusEvents {
  /** React -> Phaser: switch day/night. */
  'theme:set': Theme;
  /** Phaser -> React: scene finished building. */
  'office:ready': undefined;
  /** Phaser -> React: the player walked into / out of a special area (e.g. 'potato-club'). */
  'zone:changed': string | null;
  /** Phaser -> React: a playful achievement was just unlocked. */
  'achievement': { title: string; detail: string };
  /** React -> Phaser: dance in a given style, or pick one at random. */
  'club:dance': DanceStyle | 'random';
  /** React -> Phaser: float a reaction above your character. */
  'club:react': Reaction;
  /** React -> Phaser: start a group dance. */
  'club:group': undefined;
}

const emitter = new Phaser.Events.EventEmitter();

export const bus = {
  emit<K extends keyof BusEvents>(event: K, ...payload: BusEvents[K] extends undefined ? [] : [BusEvents[K]]) {
    emitter.emit(event, ...payload);
  },
  on<K extends keyof BusEvents>(event: K, fn: (payload: BusEvents[K]) => void) {
    emitter.on(event, fn);
    return (): void => {
      emitter.off(event, fn);
    };
  },
};
