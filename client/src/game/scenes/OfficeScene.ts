import Phaser from 'phaser';
import {
  SPOTS,
  SPAWN,
  TILE,
  buildCollisionGrid,
  isInFrontOf,
  spotForTile,
  tileCenter,
  toTile,
  type Appearance,
  type CollisionGrid,
  type Spot,
  type Theme,
  type ZoneId,
  zoneAt,
  DEFAULT_STATUS,
} from '@little-office/shared';
import { registerEnvironmentTextures } from '../assets/textures';
import { bus, type PantryItem } from '../bus';
import { Character } from '../characters/Character';
import { DEPTH, GAME_FONT, LABEL_PX, TEXT_RESOLUTION } from '../constants';
import { OfficeRenderer } from '../maps/OfficeRenderer';
import { PlayerController } from '../movement/PlayerController';
import { PotatoClub } from '../club/PotatoClub';
import { CameraRig } from '../camera/CameraRig';
import { NpcManager, freeTileNear, type Npc } from '../npcs/NpcManager';
import { mealBoxMessage } from '../mealBoxes';

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
  private npcs!: NpcManager;
  private nearbyNpc: Npc | null = null;
  /** Standing on Roomby, riding its cleaning route. */
  private riding = false;
  private zone: ZoneId | null = null;

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
    this.player.setStatus(DEFAULT_STATUS);
    this.controller = new PlayerController(this, this.grid);

    // Click-to-move target marker (a small pulsing diamond on the floor)
    this.marker = this.add.rectangle(0, 0, 5, 5, 0xfff3cf, 0.9).setAngle(45).setDepth(DEPTH.marker).setVisible(false);
    this.tweens.add({ targets: this.marker, scale: { from: 1, to: 0.6 }, yoyo: true, repeat: -1, duration: 420 });
    this.controller.onPathEnd = () => this.marker.setVisible(false);
    this.club = new PotatoClub(this, this.player, this.controller, this.office);
    this.npcs = new NpcManager(this, this.grid, name);
    this.npcs.setTheme(theme);
    this.controller.blockers = () => this.npcs.positions(); // NPCs are solid
    // one-off actions: the pantry counters ask what you'd like; everything else is the club's
    this.controller.onInstant = (spot) => {
      if (spot.action === 'pantry') this.usePantry(spot.id);
      else if (spot.action === 'leave') bus.emit('leave:prompt');
      else this.club.onInstant(spot);
    };

    // "E · sit" / "E · run" hint shown above a spot you're standing next to
    this.spotHint = this.add
      .text(0, 0, 'E · sit', {
        fontFamily: GAME_FONT,
        fontSize: `${LABEL_PX.hint}px`,
        color: '#2e2422',
        backgroundColor: 'rgba(255, 243, 207, 0.95)',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setResolution(TEXT_RESOLUTION)
      .setDepth(DEPTH.nameplates)
      .setVisible(false);
    this.spotHint.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.input.keyboard!.on('keydown-E', () => {
      if (isTyping()) return;
      if (this.riding) return this.hopOff();
      // a spot you're using or standing in front of wins; otherwise talk to a nearby NPC
      if (this.controller.activeSpot || this.nearbySpot || !this.nearbyNpc)
        this.controller.interact({ x: this.player.x, y: this.player.y }, this.nearbySpot);
      else this.useNpc(this.nearbyNpc);
    });

    // Camera: map-app style (drag to look around, scroll/pinch to zoom, buttons in the UI)
    this.camera = new CameraRig(this, this.player.sprite, {
      screenScale: (sc) => {
        this.player.setLabelScale(sc);
        this.spotHint.setScale(sc);
        this.club.setLabelScale(sc);
        this.npcs.setLabelScale(sc);
      },
      worldScale: (sc) => this.office.setLabelScale(sc),
      onTap: (wx, wy) => this.tapAt(wx, wy),
    });
    this.camera.playIntro();

    this.unsubscribers.push(
      bus.on('pantry:choose', (item) => this.player.say(pantryLine(item))),
      bus.on('status:set', (id) => this.player.setStatus(id)),
      bus.on('theme:set', (t) => {
        this.office.applyTheme(t);
        this.player.setTheme(t);
        this.npcs.setTheme(t);
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.club.destroy();
      this.npcs.destroy();
      this.unsubscribers.forEach((u) => u());
      this.camera.destroy();
    });

    bus.emit('office:ready');
  }

  /** A click that wasn't a drag: use the thing you clicked, or walk there. */
  private tapAt(wx: number, wy: number) {
    const npc = this.npcs.hit(wx, wy);
    if (this.riding) {
      this.hopOff(); // any click gets you off — and walks you there, unless you clicked Roomby itself
      if (npc === this.npcs.roomby) return;
    }
    const here = { x: this.player.x, y: this.player.y };
    if (npc) {
      if (Math.hypot(npc.x - here.x, npc.y - here.y) <= TILE * 1.6) this.useNpc(npc);
      else {
        const dest = this.controller.goTo(here, { x: npc.x, y: npc.y + TILE });
        this.marker.setVisible(!!dest);
        if (dest) this.marker.setPosition(dest.x, dest.y);
      }
      return;
    }
    const spot = spotForTile(toTile({ x: wx, y: wy }));
    const dest = spot ? this.controller.goUse(here, spot) : this.controller.goTo(here, { x: wx, y: wy });
    this.marker.setVisible(!!dest);
    if (dest) this.marker.setPosition(dest.x, dest.y);
  }

  /** Talk to / pet an NPC — or, for Roomby, hop on for a ride. */
  private useNpc(npc: Npc) {
    if (npc !== this.npcs.roomby || this.npcs.roomby.rider === 'cat') return npc.interact();
    if (!this.npcs.roomby.board('player')) return;
    this.controller.halt({ x: this.player.x, y: this.player.y });
    this.marker.setVisible(false);
    this.riding = true;
  }

  /** Step off Roomby onto a free tile next to it. */
  private hopOff() {
    if (!this.riding) return;
    this.riding = false;
    this.npcs.roomby.alight('player');
    const land = freeTileNear(this.grid, this.npcs.roomby);
    this.player.setPosition(land.x, land.y);
  }

  update(_time: number, delta: number) {
    if (this.riding) {
      if (this.controller.steering) this.hopOff(); // an arrow / WASD key hops you off
      else return this.updateRiding(delta);
    }
    const m = this.controller.update({ x: this.player.x, y: this.player.y }, delta);
    this.player.setPosition(m.x, m.y);
    this.camera.update(); // cheap no-op unless the zoom changed
    this.player.setMotion(m.dir, this.club.animFor(m.pose));
    this.club.update(m.pose);
    this.updateZone();
    this.npcs.update(delta, { playerX: this.player.x, playerY: this.player.y, playerPose: m.pose });
    this.updateSpotHint(this.controller.activeSpot !== null);
  }

  /** On Roomby: stand on top of it and face the way it rolls. */
  private updateRiding(delta: number) {
    const roomby = this.npcs.roomby;
    const seat = roomby.seat();
    this.player.setPosition(seat.x, seat.y);
    this.player.setMotion(roomby.heading, 'idle');
    this.camera.update();
    this.club.update('idle');
    this.updateZone();
    this.npcs.update(delta, { playerX: this.player.x, playerY: this.player.y, playerPose: 'idle' });
    this.updateSpotHint(true);
  }

  /** The pantry counter: machine asks coffee or tea; apples/bread are instant; meal boxes only at 10:00 & 12:00. */
  private usePantry(id: string) {
    if (id === 'pantry-machine') bus.emit('pantry:prompt');
    else if (id === 'pantry-apples') this.player.say(pick(APPLE_LINES));
    else if (id === 'pantry-bread') this.player.say(pick(BREAD_LINES));
    else if (id === 'pantry-boxes') this.player.say(mealBoxMessage(new Date()), 5000);
  }

  /** Tell the UI when you walk into or out of a special area (music, club controls…). */
  private updateZone() {
    const t = toTile({ x: this.player.x, y: this.player.y });
    const zone = zoneAt(t.tx, t.ty);
    if (zone === this.zone) return;
    this.zone = zone;
    bus.emit('zone:changed', zone);
  }

  /** Find a spot you're standing in front of and show the "E · verb" hint above it. */
  private updateSpotHint(busy: boolean) {
    this.nearbySpot = null;
    if (!busy) {
      const here = toTile({ x: this.player.x, y: this.player.y });
      let bestD = Infinity;
      for (const s of SPOTS) {
        if (!isInFrontOf(this.grid, here, s)) continue; // only when you're facing it, not standing behind
        const d = Math.hypot(s.pos.x - this.player.x, s.pos.y - this.player.y);
        if (d < bestD) {
          bestD = d;
          this.nearbySpot = s;
        }
      }
    }
    // no spot here? maybe an NPC is close enough to chat with
    this.nearbyNpc = !busy && !this.nearbySpot ? this.npcs.nearest(this.player.x, this.player.y) : null;
    if (this.nearbyNpc) {
      this.showHint(`E · ${this.nearbyNpc.verb}`, this.nearbyNpc.x, this.nearbyNpc.y - 24);
      return;
    }
    const s = this.nearbySpot;
    this.spotHint.setVisible(!!s);
    if (!s) return;
    const at = s.hintAt ?? { x: s.pos.x, y: s.tile.ty * TILE - 6 };
    this.showHint(`E · ${s.verb}`, at.x, at.y);
  }

  private showHint(label: string, x: number, y: number) {
    this.spotHint.setVisible(true);
    if (this.spotHint.text !== label) {
      this.spotHint.setText(label); // only re-render the text texture when it changes
      this.spotHint.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.spotHint.setPosition(x, y);
  }
}

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

const PANTRY_LINES: Record<PantryItem, string[]> = {
  coffee: ['☕ Fresh coffee. Productivity +10!', '☕ Espresso shot! Let\'s go.', '☕ Flat white, just how I like it.'],
  tea: ['🍵 A calm cup of tea.', '🍵 Green tea — zen mode on.', '🍵 Chamomile. Very relaxing.'],
};
const APPLE_LINES = ['🍎 A crunchy apple. Healthy choice!', '🍎 An apple a day…', '🍎 Shiny red apple, yum.'];
const BREAD_LINES = ['🍞 A slice of fresh bread.', '🥖 Tore off a bit of baguette.', '🍞 Warm bread — cozy.'];

const pantryLine = (i: PantryItem) => pick(PANTRY_LINES[i]);

function isTyping(): boolean {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
}
