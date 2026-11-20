import Phaser from 'phaser';
import { DEPTH, GAME_FONT, TEXT_RESOLUTION } from '../constants';

/**
 * A small pixel-style speech bubble that floats above a character.
 *
 * It's drawn in SCREEN pixels inside a container that the character scales
 * by 1/zoom, so it stays readable at any zoom (same trick as name tags).
 * Used now for the presenter's "..." and, in Milestone 4, for chat messages.
 */
export class SpeechBubble {
  private readonly container: Phaser.GameObjects.Container;
  private readonly box: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private typingTimer: Phaser.Time.TimerEvent | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.box = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: GAME_FONT,
        fontSize: '11px',
        color: '#2e2422',
        align: 'center',
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5, 1)
      .setResolution(TEXT_RESOLUTION);
    this.container = scene.add.container(0, 0, [this.box, this.label]).setDepth(DEPTH.nameplates + 1).setVisible(false);
  }

  /** Show a static message. */
  say(text: string): void {
    this.stopTyping();
    this.setText(text);
    this.container.setVisible(true);
  }

  /** Show animated "." → ".." → "..." (someone is talking / presenting). */
  typing(): void {
    if (this.typingTimer) return;
    let n = 0;
    const frames = ['.', '..', '...'];
    this.setText('...');
    this.container.setVisible(true);
    this.typingTimer = this.scene.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => this.setText(frames[n++ % frames.length]),
    });
  }

  hide(): void {
    this.stopTyping();
    this.container.setVisible(false);
  }

  /** (x, y) = world point the tail should point at. */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }

  destroy(): void {
    this.stopTyping();
    this.container.destroy();
  }

  private stopTyping() {
    this.typingTimer?.remove();
    this.typingTimer = null;
  }

  /** Redraw the bubble around the text: rounded box with a hard pixel outline and a little tail. */
  private setText(text: string) {
    this.label.setText(text);
    this.label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    // Keep a stable width for the dots so the bubble doesn't jitter while animating.
    const w = Math.max(28, Math.ceil(this.label.width) + 14);
    const h = Math.ceil(this.label.height) + 8;
    const tail = 5;
    const g = this.box.clear();
    const x = -w / 2;
    const y = -h - tail;
    g.fillStyle(0x33262a).fillRect(x - 1, y, w + 2, h).fillRect(x, y - 1, w, h + 2);
    g.fillStyle(0xfffaf0).fillRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle(0x33262a).fillTriangle(-4, -tail - 1, 4, -tail - 1, 0, 1);
    g.fillStyle(0xfffaf0).fillTriangle(-2, -tail - 1, 2, -tail - 1, 0, -2);
    this.label.setPosition(0, -tail - 4);
  }
}
