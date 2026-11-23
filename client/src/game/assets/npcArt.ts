import Phaser from 'phaser';
import { drawTemplate, ellipse, makeCanvas, px, rect } from './pixel';

/**
 * Pixel art for the non-human NPCs: Mochi the office cat and Roomby the robot
 * vacuum. Same ASCII-template approach as the characters.
 *   O outline  C coat  S stripe  E eye  P nose  - closed eye  . transparent
 * The cat is drawn facing right; facing left is a flipped sprite.
 */
const CAT = {
  walkA: [
    '...........O..O.',
    '..........OCOOCO',
    '..........OCCCCO',
    '..........OCECEO',
    'O.........OCCPCO',
    'OO..OOOOOOOCCCCO',
    '.OOOCCCCCCCCCCO.',
    '...OCCSCCCSCCCO.',
    '...OCCCCCCCCCO..',
    '...OCOOOOOOOCO..',
    '...OCO.....OCO..',
    '...OO......OO...',
  ],
  walkB: [
    '...........O..O.',
    '..........OCOOCO',
    '..........OCCCCO',
    '..........OCECEO',
    'O.........OCCPCO',
    'OO..OOOOOOOCCCCO',
    '.OOOCCCCCCCCCCO.',
    '...OCCSCCCSCCCO.',
    '...OCCCCCCCCCO..',
    '...OCOOOOOOOCO..',
    '....OCO...OCO...',
    '....OO.....OO...',
  ],
  sit: [
    '................',
    '........O..O....',
    '.......OCOOCO...',
    '.......OCCCCO...',
    '.......OCECEO...',
    '.......OCCPCO...',
    '......OOCCCCOO..',
    'O....OCCCCCCCO..',
    'OO...OCCSCCSCO..',
    '.OO..OCCCCCCCO..',
    '..OOOOCCCCCCCO..',
    '....OOOOOOOOOO..',
  ],
  sleep: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '..........O.O...',
    '....OOOOOOOCOCO.',
    '...OCCSCCSCOCCO.',
    '..OCCCCCCCCOC-CO',
    '..OCCCCCCCCCCCO.',
    '...OOOOOOOOOOO..',
  ],
};

const CAT_COLORS = { O: '#3a2a22', C: '#e3a15d', S: '#c27d3e', E: '#2a2a2a', P: '#e88a9a', '-': '#3a2a22' };
export const CAT_FRAMES = ['walkA', 'walkB', 'sit', 'sleep'] as const;
export const CAT_KEY = 'npc:cat';
export const VACUUM_KEY = 'npc:vacuum';
const CAT_W = 16;
const CAT_H = 12;

/** Register the cat + vacuum textures and their animations (once). */
export function registerNpcArt(scene: Phaser.Scene) {
  if (!scene.textures.exists(CAT_KEY)) {
    const { canvas, ctx } = makeCanvas(CAT_W * CAT_FRAMES.length, CAT_H);
    CAT_FRAMES.forEach((f, i) => drawTemplate(ctx, CAT[f], i * CAT_W, 0, CAT_COLORS));
    const tex = scene.textures.addCanvas(CAT_KEY, canvas)!;
    CAT_FRAMES.forEach((f, i) => tex.add(f, 0, i * CAT_W, 0, CAT_W, CAT_H));
    scene.anims.create({ key: 'cat-walk', frames: [{ key: CAT_KEY, frame: 'walkA' }, { key: CAT_KEY, frame: 'walkB' }], frameRate: 6, repeat: -1 });
  }
  if (!scene.textures.exists(VACUUM_KEY)) {
    // a round robot seen from slightly above; two frames so its light blinks
    const { canvas, ctx } = makeCanvas(14 * 2, 9);
    for (let f = 0; f < 2; f++) {
      const ox = f * 14;
      ellipse(ctx, ox + 7, 5, 6, 3, '#2b2f36');
      ellipse(ctx, ox + 7, 4, 5, 2, '#5d6470');
      ellipse(ctx, ox + 6, 3, 3, 1, '#7d8592');
      rect(ctx, ox + 2, 6, 10, 1, '#1b1e23'); // bumper
      px(ctx, ox + 10, 4, f === 0 ? '#5fe08a' : '#2f7048'); // status light
    }
    const tex = scene.textures.addCanvas(VACUUM_KEY, canvas)!;
    tex.add('a', 0, 0, 0, 14, 9);
    tex.add('b', 0, 14, 0, 14, 9);
    scene.anims.create({ key: 'vacuum-blink', frames: [{ key: VACUUM_KEY, frame: 'a' }, { key: VACUUM_KEY, frame: 'b' }], frameRate: 2, repeat: -1 });
  }
}

/** Exposed for the template-width test. */
export const CAT_TEMPLATES_FOR_TEST = CAT;
