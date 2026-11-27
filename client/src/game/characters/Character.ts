import Phaser from 'phaser';
import type { Appearance, Direction, StatusId, Theme } from '@little-office/shared';
import { FEET_ROW, FRAME_H, type Build } from '../assets/characterArt';
import { COSTUME_KEY, REACTION_KEYS, animKey, ensureCharacter, statusKey, type AnimName, type Reaction } from '../assets/textures';
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
  private readonly build: Build;
  private statusIcon: Phaser.GameObjects.Image | null = null;
  private sayTimer: Phaser.Time.TimerEvent | null = null;
  private labelScale = 1;
  private dir: Direction = 'down';
  private pose: CharacterPose = 'idle';
  x = 0;
  y = 0;
  /**
   * Local player only: called when something happens that everyone else should
   * see too (speech, reactions, the potato suit), so the scene can send it to the
   * server. Other people's characters leave this null, so nothing echoes back.
   */
  echo: { say(text: string): void; react(kind: Reaction): void; costume(on: boolean): void } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly appearance: Appearance,
    readonly name: string,
    opts: { isLocal: boolean; build?: Build },
  ) {
    this.build = opts.build ?? 'regular';
    const texKey = ensureCharacter(scene, appearance, this.build);
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
    this.placeStatusIcon();
    // bubble floats just above the name tag (both measured in screen px, scaled by 1/zoom)
    // Speech bubble goes above the name tag — unless that would run off the top of the
    // screen (e.g. on the meeting-room stage), then it sits to the character's right.
    const aboveY = tagY - this.nameTag.displayHeight - 2 * this.labelScale;
    const cam = this.scene.cameras.main;
    const bubbleTopOnScreen = (aboveY - cam.worldView.y) * cam.zoomY - this.bubble.heightPx;
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
    this.sprite.play(animKey(this.appearance, `${this.pose}-${this.dir}`, this.build), true);
  }

  /** Show a small pixel status dot just left of the name tag. */
  setStatus(id: StatusId): void {
    if (!this.statusIcon) this.statusIcon = this.scene.add.image(0, 0, statusKey(id)).setDepth(DEPTH.nameplates + 0.5);
    else this.statusIcon.setTexture(statusKey(id));
    this.placeStatusIcon();
  }

  private placeStatusIcon() {
    if (!this.statusIcon) return;
    const s = this.labelScale * 1.5; // ~13px on screen, matching the name text
    this.statusIcon
      .setScale(s)
      .setPosition(this.nameTag.x - this.nameTag.displayWidth / 2 - (9 * s) / 2 - 1 * this.labelScale, this.nameTag.y - this.nameTag.displayHeight / 2);
  }

  /** Show a message in the speech bubble for a few seconds. */
  say(text: string, ms = 3500): void {
    this.echo?.say(text);
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
    if (on !== this.costume.visible) this.echo?.costume(on);
    this.costume.setVisible(on);
  }

  get wearingCostume(): boolean {
    return this.costume.visible;
  }

  /** A little reaction icon (heart, clap, laugh) floats up from the head and fades. */
  react(kind: Reaction): void {
    this.echo?.react(kind);
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
    this.statusIcon?.destroy();
    this.sprite.destroy();
    this.shadow.destroy();
    this.nameTag.destroy();
    this.bubble.destroy();
  }
}
