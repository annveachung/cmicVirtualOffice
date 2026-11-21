import Phaser from 'phaser';
import type { Appearance, Direction, Theme } from '@little-office/shared';
import { FEET_ROW, FRAME_H } from '../assets/characterArt';
import { COSTUME_KEY, REACTION_KEYS, animKey, ensureCharacter, type AnimName, type Reaction } from '../assets/textures';
import { CHARACTER_SCALE, DEPTH, GAME_FONT, LABEL_PX, NIGHT_TINT, TEXT_RESOLUTION, TOP_BAR_PX } from '../constants';
import { SpeechBubble } from './SpeechBubble';

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
  private readonly bubble: SpeechBubble;
  private readonly costume: Phaser.GameObjects.Image;
  private sayTimer: Phaser.Time.TimerEvent | null = null;
  private labelScale = 1;
  private dir: Direction = 'down';
  private pose: CharacterPose = 'idle';
  x = 0;
  y = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly appearance: Appearance,
    name: string,
    opts: { isLocal: boolean },
  ) {
    const texKey = ensureCharacter(scene, appearance);
    this.shadow = scene.add.ellipse(0, 0, 11 * CHARACTER_SCALE, 4 * CHARACTER_SCALE, 0x2a1e1a, 0.25);
    this.sprite = scene.add.sprite(0, 0, texKey, 'down-idle').setOrigin(0.5, FEET_ROW / FRAME_H).setScale(CHARACTER_SCALE);
    this.nameTag = scene.add
      .text(0, 0, name, {
        fontFamily: GAME_FONT,
        fontSize: `${LABEL_PX.name}px`,
        color: '#1f3a2c',
        backgroundColor: opts.isLocal ? '#d4ef84' : '#fbf8ee', // you = lime tag, others = cream
        padding: { x: 2, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(TEXT_RESOLUTION)
      .setDepth(DEPTH.nameplates);
    // Name tags are sized in SCREEN pixels: the scene scales them by 1/zoom so they
    // stay readable when the whole office is zoomed out to fit the monitor.
    this.nameTag.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.bubble = new SpeechBubble(scene);
    this.costume = scene.add.image(0, 0, COSTUME_KEY).setOrigin(0.5, FEET_ROW / FRAME_H).setScale(CHARACTER_SCALE).setVisible(false);
    this.playAnim();
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    const rx = Math.round(x);
    const ry = Math.round(y);
    this.sprite.setPosition(rx, ry).setDepth(DEPTH.world + y);
    // the potato suit follows the body (and sinks with it when sitting)
    this.costume.setPosition(rx, ry + (SEATED.has(this.pose) ? 2 * CHARACTER_SCALE : 0)).setDepth(DEPTH.world + y + 0.1);
    this.shadow.setPosition(rx, ry).setDepth(DEPTH.world + y - 0.5);
    const tagY = ry - (SEATED.has(this.pose) ? 19 : 21) * CHARACTER_SCALE;
    this.nameTag.setPosition(rx, tagY);
    // bubble floats just above the name tag (both measured in screen px, scaled by 1/zoom)
    // Speech bubble goes above the name tag — unless that would run off the top of the
    // screen (e.g. on the meeting-room stage), then it sits to the character's right.
    const aboveY = tagY - this.nameTag.displayHeight - 2 * this.labelScale;
    const cam = this.scene.cameras.main;
    const bubbleTopOnScreen = (aboveY - cam.worldView.y) * cam.zoom - this.bubble.heightPx;
    if (bubbleTopOnScreen < TOP_BAR_PX + 6) {
      this.bubble.setSide('right');
      this.bubble.setPosition(rx + 7 * CHARACTER_SCALE, ry - 12 * CHARACTER_SCALE);
    } else {
      this.bubble.setSide('above');
      this.bubble.setPosition(rx, aboveY);
    }
  }

  /** Update facing + pose; only restarts the animation when something changed. */
  setMotion(dir: Direction, pose: CharacterPose): void {
    if (dir === this.dir && pose === this.pose) return;
    this.dir = dir;
    this.pose = pose;
    this.playAnim();
    this.shadow.setVisible(!SEATED.has(pose)); // the seat already grounds a seated character
    // Presenting shows an animated "..." bubble while you're on stage.
    if (pose === 'present') this.bubble.typing();
    else if (!this.sayTimer) this.bubble.hide();
  }

  /** Keep the name tag a constant on-screen size regardless of camera zoom. */
  setLabelScale(scale: number): void {
    this.labelScale = scale;
    this.nameTag.setScale(scale);
    this.bubble.setScale(scale);
  }

  setTheme(theme: Theme): void {
    if (theme === 'dark') {
      this.sprite.setTint(NIGHT_TINT);
      this.costume.setTint(NIGHT_TINT);
    } else {
      this.sprite.clearTint();
      this.costume.clearTint();
    }
  }

  private playAnim(): void {
    this.sprite.play(animKey(this.appearance, `${this.pose}-${this.dir}`), true);
  }

  /** Show a message in the speech bubble for a few seconds. */
  say(text: string, ms = 3500): void {
    this.sayTimer?.remove();
    this.bubble.say(text);
    this.sayTimer = this.scene.time.delayedCall(ms, () => {
      this.sayTimer = null;
      if (this.pose === 'present') this.bubble.typing();
      else this.bubble.hide();
    });
  }

  /** Put the potato suit on / take it off. */
  setCostume(on: boolean): void {
    this.costume.setVisible(on);
  }

  get wearingCostume(): boolean {
    return this.costume.visible;
  }

  /** A little reaction icon (heart, clap, laugh) floats up from the head and fades. */
  react(kind: Reaction): void {
    const icon = this.scene.add
      .image(this.x + (Math.random() * 8 - 4), this.y - 26 * CHARACTER_SCALE, REACTION_KEYS[kind])
      .setDepth(DEPTH.nameplates + 2);
    this.scene.tweens.add({
      targets: icon,
      y: icon.y - 18,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.4 },
      duration: 1400,
      ease: 'Sine.easeOut',
      onComplete: () => icon.destroy(),
    });
  }

  destroy(): void {
    this.sayTimer?.remove();
    this.costume.destroy();
    this.sprite.destroy();
    this.shadow.destroy();
    this.nameTag.destroy();
    this.bubble.destroy();
  }
}
