import Phaser from 'phaser';
import {
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
import { DEPTH, LABEL_PX } from '../constants';
import { OfficeRenderer } from '../maps/OfficeRenderer';
import { PlayerController } from '../movement/PlayerController';
import { PotatoClub } from '../club/PotatoClub';
import { CameraRig } from '../camera/CameraRig';

export interface OfficeSceneData {
  name: string;
  appearance: Appearance;
  theme: Theme;
  /** Desk to label with the player's name (assigned for real in Milestone 3). */
  deskId: number | null;
}


/**
 * The one and only game scene: the shared office.
 * Lifecycle: init(data) -> create() once -> update() every frame.
 *
 * Camera behaviour (zoom, drag-to-look-around, following you) lives in CameraRig.
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
  private unsubscribers: (() => void)[] = [];
  private club!: PotatoClub;
  private camera!: CameraRig;

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
    this.club = new PotatoClub(this, this.player, this.controller, this.office);

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

    this.input.keyboard!.on('keydown-E', () => {
      if (isTyping()) return;
      this.controller.interact({ x: this.player.x, y: this.player.y }, this.nearbySpot);
    });

    // Camera: map-app style (drag to look around, scroll/pinch to zoom, buttons in the UI)
    this.camera = new CameraRig(this, this.player.sprite, {
      screenScale: (sc) => {
        this.player.setLabelScale(sc);
        this.spotHint.setScale(sc);
        this.club.setLabelScale(sc);
      },
      worldScale: (sc) => this.office.setLabelScale(sc),
      onTap: (wx, wy) => this.tapAt(wx, wy),
    });
    this.camera.playIntro();

    this.unsubscribers.push(
      bus.on('theme:set', (t) => {
        this.office.applyTheme(t);
        this.player.setTheme(t);
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.club.destroy();
      this.unsubscribers.forEach((u) => u());
      this.camera.destroy();
    });

    bus.emit('office:ready');
  }

  /** A click that wasn't a drag: use the thing you clicked, or walk there. */
  private tapAt(wx: number, wy: number) {
    const here = { x: this.player.x, y: this.player.y };
    const spot = spotForTile(toTile({ x: wx, y: wy }));
    const dest = spot ? this.controller.goUse(here, spot) : this.controller.goTo(here, { x: wx, y: wy });
    this.marker.setVisible(!!dest);
    if (dest) this.marker.setPosition(dest.x, dest.y);
    this.camera.follow(); // you're heading somewhere: the camera comes along
  }

  update(_time: number, delta: number) {
    const m = this.controller.update({ x: this.player.x, y: this.player.y }, delta);
    this.player.setPosition(m.x, m.y);
    if (m.keyboard) this.camera.follow(); // steering with the keys brings the camera back to you
    this.camera.update(); // cheap no-op unless the zoom changed
    this.player.setMotion(m.dir, this.club.animFor(m.pose));
    this.club.update(m.pose);
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
