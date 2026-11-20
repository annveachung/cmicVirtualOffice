import Phaser from 'phaser';
import {
  MAP_H,
  MAP_W,
  SPOTS,
  SPAWN,
  TILE,
  buildCollisionGrid,
  canReachSpot,
  spotForTile,
  tileCenter,
  toTile,
  type Appearance,
  type CollisionGrid,
  type Spot,
  type Theme,
} from '@little-office/shared';
import { registerEnvironmentTextures } from '../assets/textures';
import { bus } from '../bus';
import { Character } from '../characters/Character';
import { DEPTH, LABEL_PX, MAX_ZOOM, TOP_BAR_PX } from '../constants';
import { OfficeRenderer } from '../maps/OfficeRenderer';
import { PlayerController } from '../movement/PlayerController';

export interface OfficeSceneData {
  name: string;
  appearance: Appearance;
  theme: Theme;
  /** Desk to label with the player's name (assigned for real in Milestone 3). */
  deskId: number | null;
}

const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;

/**
 * The one and only game scene: the shared office.
 * Lifecycle: init(data) -> create() once -> update() every frame.
 *
 * Camera has two modes:
 *  - "overview" (default): the whole office fits the window, nothing moves —
 *    you can see where everyone is at a glance.
 *  - "follow": after zooming in with the wheel, the camera tracks you.
 */
export class OfficeScene extends Phaser.Scene {
  private grid!: CollisionGrid;
  private office!: OfficeRenderer;
  private player!: Character;
  private controller!: PlayerController;
  private marker!: Phaser.GameObjects.Rectangle;
  private spotHint!: Phaser.GameObjects.Text;
  private nearbySpot: Spot | null = null;
  private data0!: OfficeSceneData;
  /** Multiplier on top of the "fit" zoom. 1 = whole office visible. */
  private zoomFactor = 1;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    super('office');
  }

  init(data: OfficeSceneData) {
    this.data0 = data;
  }

  create() {
    const { name, appearance, theme, deskId } = this.data0;
    registerEnvironmentTextures(this);
    this.grid = buildCollisionGrid();
    this.office = new OfficeRenderer(this, theme);
    if (deskId !== null) this.office.setDeskOwner(deskId, name);

    // Everyone walks in through the entrance, facing into the office.
    this.player = new Character(this, appearance, name, { isLocal: true });
    const spawn = tileCenter(SPAWN);
    this.player.setPosition(spawn.x, spawn.y);
    this.player.setMotion('up', 'idle');
    this.player.setTheme(theme);
    this.controller = new PlayerController(this, this.grid);

    // Click-to-move target marker (a small pulsing diamond on the floor)
    this.marker = this.add.rectangle(0, 0, 5, 5, 0xfff3cf, 0.9).setAngle(45).setDepth(DEPTH.marker).setVisible(false);
    this.tweens.add({ targets: this.marker, scale: { from: 1, to: 0.6 }, yoyo: true, repeat: -1, duration: 420 });
    this.controller.onPathEnd = () => this.marker.setVisible(false);

    // "E · sit" / "E · run" hint shown above a spot you're standing next to
    this.spotHint = this.add
      .text(0, 0, 'E · sit', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${LABEL_PX.hint}px`,
        color: '#2e2422',
        backgroundColor: 'rgba(255, 243, 207, 0.95)',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.nameplates)
      .setVisible(false);
    this.spotHint.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) return;
      const here = { x: this.player.x, y: this.player.y };
      const spot = spotForTile(toTile({ x: pointer.worldX, y: pointer.worldY }));
      const dest = spot ? this.controller.goUse(here, spot) : this.controller.goTo(here, { x: pointer.worldX, y: pointer.worldY });
      this.marker.setVisible(!!dest);
      if (dest) this.marker.setPosition(dest.x, dest.y);
    });

    this.input.keyboard!.on('keydown-E', () => {
      if (isTyping()) return;
      this.controller.interact({ x: this.player.x, y: this.player.y }, this.nearbySpot);
    });

    // Camera
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    this.applyZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.zoomFactor = dy > 0 ? this.zoomFactor / 1.15 : this.zoomFactor * 1.15;
      this.applyZoom();
    });

    this.unsubscribers.push(
      bus.on('theme:set', (t) => {
        this.office.applyTheme(t);
        this.player.setTheme(t);
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribers.forEach((u) => u());
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyZoom, this);
    });

    bus.emit('office:ready');
  }

  /** Zoom at which the entire office fits below the top bar. */
  private fitZoom(): number {
    const { width, height } = this.scale;
    return Math.min(width / WORLD_W, (height - TOP_BAR_PX) / WORLD_H);
  }

  private applyZoom() {
    const cam = this.cameras.main;
    const fit = this.fitZoom();
    this.zoomFactor = Phaser.Math.Clamp(this.zoomFactor, 1, Math.max(1, MAX_ZOOM / fit));
    const zoom = fit * this.zoomFactor;
    cam.setZoom(zoom);

    if (this.zoomFactor <= 1.001) {
      // Overview: centre the office in the space under the top bar.
      cam.stopFollow();
      cam.removeBounds();
      cam.centerOn(WORLD_W / 2, WORLD_H / 2 - TOP_BAR_PX / 2 / zoom);
    } else {
      cam.setBounds(0, -TOP_BAR_PX / zoom, WORLD_W, WORLD_H + TOP_BAR_PX / zoom);
      cam.startFollow(this.player.sprite, true, 0.15, 0.15);
    }

    // Labels stay the same size on screen at every zoom level.
    const s = 1 / zoom;
    this.player.setLabelScale(s);
    this.office.setLabelScale(s);
    this.spotHint.setScale(s);
  }

  update(_time: number, delta: number) {
    const m = this.controller.update({ x: this.player.x, y: this.player.y }, delta);
    this.player.setPosition(m.x, m.y);
    this.player.setMotion(m.dir, m.pose);
    this.updateSpotHint(this.controller.activeSpot !== null);
  }

  /** Find a usable spot next to (or under) the player and show the "E · verb" hint above it. */
  private updateSpotHint(busy: boolean) {
    this.nearbySpot = null;
    if (!busy) {
      const here = toTile({ x: this.player.x, y: this.player.y });
      let bestD = Infinity;
      for (const s of SPOTS) {
        if (!canReachSpot(here, s)) continue;
        const d = Math.hypot(s.pos.x - this.player.x, s.pos.y - this.player.y);
        if (d < bestD) {
          bestD = d;
          this.nearbySpot = s;
        }
      }
    }
    const s = this.nearbySpot;
    this.spotHint.setVisible(!!s);
    if (!s) return;
    const label = `E · ${s.verb}`;
    if (this.spotHint.text !== label) {
      this.spotHint.setText(label); // only re-render the text texture when it changes
      this.spotHint.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.spotHint.setPosition(s.pos.x, s.tile.ty * TILE - 6);
  }
}

function isTyping(): boolean {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
}
