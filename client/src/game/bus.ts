import Phaser from 'phaser';
import type { Theme } from '@little-office/shared';

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
}

const emitter = new Phaser.Events.EventEmitter();

export const bus = {
  emit<K extends keyof BusEvents>(event: K, ...payload: BusEvents[K] extends undefined ? [] : [BusEvents[K]]) {
    emitter.emit(event, ...payload);
  },
  on<K extends keyof BusEvents>(event: K, fn: (payload: BusEvents[K]) => void) {
    emitter.on(event, fn);
    return () => emitter.off(event, fn);
  },
};
