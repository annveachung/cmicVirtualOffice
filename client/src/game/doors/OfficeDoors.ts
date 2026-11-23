import Phaser from 'phaser';
import { OFFICE_DOORS, TILE, officeAt, toTile, type CollisionGrid, type OfficeDoor, type Theme, type TilePos, type Vec2 } from '@little-office/shared';
import { PALETTES, type EnvPalette } from '../assets/palette';
import { box, hline, makeCanvas, px, rect, shade, vline } from '../assets/pixel';
import { DEPTH } from '../constants';
import { sound } from '../../audio/sound';

/**
 * PRIVATE-OFFICE DOORS
 *
 *   closed ──knock (from the hall)──▶ (a moment later) open ──nobody in the doorway for a bit──▶ closed
 *   closed ──walk up to it from INSIDE──▶ open   (leaving never needs a knock)
 *
 * A closed door blocks its doorway tiles in the shared collision grid, so the
 * player's movement and everyone's pathfinding treat it like a wall — no
 * special cases anywhere else. Opening it just un-blocks those tiles.
 */

/** How long a door stays open once nobody is standing in / next to it. */
const STAY_OPEN_MS = 2500;
/** After a knock: how long until the door opens ("Come in!"). */
const ANSWER_MS = 800;

interface DoorState {
  def: OfficeDoor;
  img: Phaser.GameObjects.Image;
  open: boolean;
  /** ms left before it closes again (only counts down while nobody is near). */
  closeIn: number;
  /** A knock is waiting to be answered. */
  knocked: boolean;
}

const KEY = (theme: Theme, open: boolean) => `officeDoor:${open ? 'open' : 'closed'}:${theme}`;

export class OfficeDoors {
  private readonly doors: DoorState[];
  private theme: Theme;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: CollisionGrid,
    theme: Theme,
  ) {
    this.theme = theme;
    registerDoorTextures(scene);
    this.doors = OFFICE_DOORS.map((def) => {
      // the sprite covers the doorway column and the office column next to it (where the open leaf swings)
      const img = scene.add.image((def.tiles[0].tx - 1) * TILE, def.tiles[0].ty * TILE, KEY(theme, false)).setOrigin(0);
      const d: DoorState = { def, img, open: true, closeIn: 0, knocked: false };
      this.close(d);
      return d;
    });
  }

  /** A closed door you're standing right outside of (hall side) — you can knock on it. */
  knockable(p: Vec2): OfficeDoor | null {
    const t = toTile(p);
    return this.doors.find((d) => !d.open && !d.knocked && d.def.outside.some((o) => o.tx === t.tx && o.ty === t.ty))?.def ?? null;
  }

  /** Knock knock… and a moment later the door opens. Returns false if it can't be knocked on. */
  knock(door: OfficeDoor, onOpen?: () => void): boolean {
    const d = this.doors.find((x) => x.def.id === door.id);
    if (!d || d.open || d.knocked) return false;
    d.knocked = true;
    sound.knock();
    // little shake of the door
    this.scene.tweens.add({ targets: d.img, x: d.img.x + 1, yoyo: true, repeat: 3, duration: 45 });
    this.scene.time.delayedCall(ANSWER_MS, () => {
      d.knocked = false;
      this.openDoor(d);
      onOpen?.();
    });
    return true;
  }

  /** Is this tile behind (or on) a closed office door, while `from` is outside that office? */
  closedOfficeAt(target: TilePos, from: Vec2): OfficeDoor | null {
    const office = officeAt(target.tx, target.ty) ?? this.doors.find((d) => d.def.tiles.some((t) => t.tx === target.tx && t.ty === target.ty))?.def;
    if (!office) return null;
    const here = toTile(from);
    if (officeAt(here.tx, here.ty)?.id === office.id) return null; // already inside
    const d = this.doors.find((x) => x.def.id === office.id);
    return d && !d.open ? office : null;
  }

  /** Inside an office and heading out? Open its door straight away (leaving never needs a knock). */
  openIfLeaving(from: Vec2, target: TilePos) {
    const here = toTile(from);
    const office = officeAt(here.tx, here.ty);
    if (!office || officeAt(target.tx, target.ty)?.id === office.id) return;
    const d = this.doors.find((x) => x.def.id === office.id);
    if (d) this.openDoor(d);
  }

  /** The hall-side tile to stand on to knock on a door (the closer of the two). */
  knockSpot(door: OfficeDoor, from: Vec2): TilePos {
    const t = toTile(from);
    return [...door.outside].sort((a, b) => Math.abs(a.ty - t.ty) - Math.abs(b.ty - t.ty))[0];
  }

  /** Where to show the "E · knock" hint. */
  hintAt(door: OfficeDoor): Vec2 {
    return { x: door.tiles[0].tx * TILE + TILE / 2, y: door.tiles[0].ty * TILE - 4 };
  }

  /**
   * Every frame: open doors for people leaving, keep doors open while anyone is
   * in or right next to the doorway, and close them a little after they've gone.
   */
  update(dtMs: number, people: Vec2[]) {
    for (const d of this.doors) {
      const near = (list: TilePos[]) => people.some((p) => list.some((t) => isOn(p, t)));
      if (!d.open && near(d.def.inside)) this.openDoor(d); // leaving: no knock needed
      if (!d.open) continue;
      if (near(d.def.tiles) || near(d.def.inside) || near(d.def.outside)) d.closeIn = STAY_OPEN_MS;
      else if ((d.closeIn -= dtMs) <= 0) this.close(d);
    }
  }

  setTheme(t: Theme) {
    this.theme = t;
    for (const d of this.doors) d.img.setTexture(KEY(t, d.open));
  }

  private openDoor(d: DoorState) {
    if (d.open) return;
    d.open = true;
    d.closeIn = STAY_OPEN_MS;
    for (const t of d.def.tiles) this.grid.setBlocked(t.tx, t.ty, false);
    // an open leaf lies flat against the wall at the top of the doorway — behind anyone walking through
    d.img.setTexture(KEY(this.theme, true)).setDepth(DEPTH.world + d.def.tiles[0].ty * TILE + 1);
  }

  private close(d: DoorState) {
    d.open = false;
    for (const t of d.def.tiles) this.grid.setBlocked(t.tx, t.ty, true);
    const bottom = (d.def.tiles[d.def.tiles.length - 1].ty + 1) * TILE;
    d.img.setTexture(KEY(this.theme, false)).setDepth(DEPTH.world + bottom);
  }
}

const isOn = (p: Vec2, t: TilePos) => Math.floor(p.x / TILE) === t.tx && Math.floor(p.y / TILE) === t.ty;

// ------------------------------------------------------------------ art --

function registerDoorTextures(scene: Phaser.Scene) {
  for (const theme of ['light', 'dark'] as Theme[]) {
    const pal = PALETTES[theme];
    for (const open of [false, true]) {
      const key = KEY(theme, open);
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, paintDoor(pal, open));
    }
  }
}

/**
 * 32×32: the left half is the office's last floor column, the right half the doorway.
 * Closed: a wooden door filling the doorway, with panels and a brass knob on the hall side.
 * Open: the door swung into the office, lying along the top of the doorway.
 */
export function paintDoor(pal: EnvPalette, open: boolean): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(32, 32);
  const wood = pal.furn;
  const dark = shade(wood, -0.25);
  const light = shade(wood, 0.18);
  // door frame posts at both ends of the doorway (top and bottom)
  rect(ctx, 16, 0, 16, 2, pal.trim);
  rect(ctx, 16, 30, 16, 2, pal.trim);
  hline(ctx, 16, 2, 16, pal.outline);
  hline(ctx, 16, 29, 16, pal.outline);
  if (!open) {
    box(ctx, 19, 2, 10, 28, wood, pal.outline); // the door
    box(ctx, 21, 5, 6, 9, light, dark); // upper panel
    box(ctx, 21, 17, 6, 10, light, dark); // lower panel
    vline(ctx, 28, 3, 26, dark); // edge shadow
    px(ctx, 27, 15, '#e2b84a'); // brass knob (hall side)
    px(ctx, 27, 16, shade('#e2b84a', -0.3));
  } else {
    // swung inward on its top hinge: seen edge-on as a long plank along the top
    box(ctx, 5, 2, 16, 5, dark, pal.outline);
    hline(ctx, 6, 3, 14, wood);
    px(ctx, 7, 5, '#e2b84a');
  }
  return canvas;
}
