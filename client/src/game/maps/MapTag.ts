import Phaser from 'phaser';
import type { Theme } from '@little-office/shared';
import { GAME_FONT, TEXT_RESOLUTION } from '../constants';

/**
 * A small bordered tag, like the room/desk labels in the team's Figma design:
 * cream fill, 1px forest-green border, uppercase monospace text.
 *
 * Drawn in SCREEN pixels inside a container; the scene scales it by 1/zoom so
 * it's always crisp and the same size, whatever the zoom.
 */
const COLORS: Record<Theme, { fill: number; border: number; text: string }> = {
  light: { fill: 0xfbf8ee, border: 0x1f3a2c, text: '#1f3a2c' },
  dark: { fill: 0x16261e, border: 0x7fe0b0, text: '#e6f3c2' },
};

export class MapTag {
  private readonly container: Phaser.GameObjects.Container;
  private readonly box: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  /**
   * @param anchor 'corner' pins the tag's top-left to (x, y); 'center' centres it there.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    private readonly anchor: 'corner' | 'center',
    fontPx: number,
    depth: number,
  ) {
    this.box = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text.toUpperCase(), {
        fontFamily: GAME_FONT,
        fontSize: `${fontPx}px`,
      })
      .setOrigin(0, 0)
      .setResolution(TEXT_RESOLUTION);
    this.container = scene.add.container(x, y, [this.box, this.label]).setDepth(depth);
    this.setTheme('light');
  }

  setTheme(theme: Theme): void {
    const c = COLORS[theme];
    this.label.setColor(c.text);
    this.label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    const padX = 6;
    const padY = 3;
    const w = Math.ceil(this.label.width) + padX * 2;
    const h = Math.ceil(this.label.height) + padY * 2;
    const ox = this.anchor === 'center' ? -w / 2 : 0;
    const oy = this.anchor === 'center' ? -h / 2 : 0;
    this.box.clear().fillStyle(c.border).fillRect(ox, oy, w, h).fillStyle(c.fill).fillRect(ox + 1, oy + 1, w - 2, h - 2);
    this.label.setPosition(ox + padX, oy + padY);
  }

  setScale(scale: number): void {
    this.container.setScale(scale);
  }

  destroy(): void {
    this.container.destroy();
  }
}
