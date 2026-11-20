import Phaser from 'phaser';
import { OfficeScene, type OfficeSceneData } from './scenes/OfficeScene';

/** Create the Phaser game inside a DOM element. React calls this once and destroys it on unmount. */
export function createGame(parent: HTMLElement, data: OfficeSceneData): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: true, // nearest-neighbour scaling everywhere: crisp pixels
    roundPixels: true,
    backgroundColor: '#14151d',
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    disableContextMenu: true,
    banner: false,
    scene: [],
  });
  game.scene.add('office', OfficeScene, true, data);
  return game;
}
