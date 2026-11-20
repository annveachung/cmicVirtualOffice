import Phaser from 'phaser';
import type { Appearance, Direction, Theme } from '@little-office/shared';
import { FEET_ROW, FRAME_H } from '../assets/characterArt';
import { animKey, ensureCharacter, type AnimName } from '../assets/textures';
import { DEPTH, LABEL_PX, NIGHT_TINT } from '../constants';

/** Which animation is playing: idle, walk, sit, run, pedal, lift... (see ANIMS). */
export type CharacterPose = AnimName;

const SEATED: ReadonlySet<CharacterPose> = new Set(['sit', 'pedal', 'benchPress']);

/**
 * A character in the world: sprite + floor shadow + floating name tag.
 *
 * Position is the point between the feet (same convention as the shared
 * collision code). Depth = feet y, so characters walking "behind" a desk are
 * drawn behind it, and in front of it when they walk below it — the classic
 * y-sorting trick for top-down games.
 */
export class Character {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly nameTag: Phaser.GameObjects.Text;
  private dir: Direction = 'down';
  private pose: CharacterPose = 'idle';
  x = 0;
  y = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly appearance: Appearance,
    name: string,
    opts: { isLocal: boolean },
  ) {
    const texKey = ensureCharacter(scene, appearance);
    this.shadow = scene.add.ellipse(0, 0, 11, 4, 0x2a1e1a, 0.25);
    this.sprite = scene.add.sprite(0, 0, texKey, 'down-idle').setOrigin(0.5, FEET_ROW / FRAME_H);
    this.nameTag = scene.add
      .text(0, 0, name, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${LABEL_PX.name}px`,
        color: opts.isLocal ? '#fff3cf' : '#f6efe2',
        backgroundColor: opts.isLocal ? 'rgba(122, 82, 56, 0.9)' : 'rgba(46, 36, 34, 0.78)',
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.nameplates);
    // Name tags are sized in SCREEN pixels: the scene scales them by 1/zoom so they
    // stay readable when the whole office is zoomed out to fit the monitor.
    this.nameTag.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.playAnim();
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    const rx = Math.round(x);
    const ry = Math.round(y);
    this.sprite.setPosition(rx, ry).setDepth(DEPTH.world + y);
    this.shadow.setPosition(rx, ry).setDepth(DEPTH.world + y - 0.5);
    this.nameTag.setPosition(rx, ry - (SEATED.has(this.pose) ? 19 : 21));
  }

  /** Update facing + pose; only restarts the animation when something changed. */
  setMotion(dir: Direction, pose: CharacterPose): void {
    if (dir === this.dir && pose === this.pose) return;
    this.dir = dir;
    this.pose = pose;
    this.playAnim();
    this.shadow.setVisible(!SEATED.has(pose)); // the seat already grounds a seated character
  }

  /** Keep the name tag a constant on-screen size regardless of camera zoom. */
  setLabelScale(scale: number): void {
    this.nameTag.setScale(scale);
  }

  setTheme(theme: Theme): void {
    if (theme === 'dark') this.sprite.setTint(NIGHT_TINT);
    else this.sprite.clearTint();
  }

  private playAnim(): void {
    this.sprite.play(animKey(this.appearance, `${this.pose}-${this.dir}`), true);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.nameTag.destroy();
  }
}
