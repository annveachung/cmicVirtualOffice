import Phaser from 'phaser';
import {
  AREA_LABELS,
  DESKS,
  FURNITURE,
  PLACEMENTS,
  TILE,
  footprint,
  type FurnitureDef,
  type Placement,
  type Theme,
} from '@little-office/shared';
import { furnitureTextureKey } from '../assets/furnitureArt';
import { PALETTES } from '../assets/palette';
import { BEAM_KEYS, DISCO_KEY, GLOW_KEYS, bgKey } from '../assets/textures';
import { DEPTH, LABEL_PX } from '../constants';
import { MapTag } from './MapTag';

/**
 * Builds the visible office from the shared map data, and re-skins it when
 * the theme changes. Map data never knows how it's drawn; this class never
 * decides where things are. ("Separate map data from rendering logic.")
 */
export class OfficeRenderer {
  private readonly bg: Phaser.GameObjects.Image;
  private readonly sun: Phaser.GameObjects.Image;
  private readonly moon: Phaser.GameObjects.Image;
  private readonly furniture: { p: Placement; img: Phaser.GameObjects.Image }[] = [];
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private readonly areaTags: MapTag[] = [];
  private readonly deskTags = new Map<number, MapTag>();
  private readonly clubLights: Phaser.GameObjects.Image[] = [];
  private labelScale = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private theme: Theme,
  ) {
    const add = scene.add;
    this.bg = add.image(0, 0, bgKey(theme)).setOrigin(0).setDepth(DEPTH.background);
    this.sun = add.image(0, 0, BEAM_KEYS.sun).setOrigin(0).setDepth(DEPTH.sunbeams).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45);
    this.moon = add.image(0, 0, BEAM_KEYS.moon).setOrigin(0).setDepth(DEPTH.sunbeams).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.22);

    for (const p of PLACEMENTS) {
      const def: FurnitureDef = FURNITURE[p.type];
      const { h } = footprint(p);
      this.addGlowsFor(p, h);
      if (p.type === 'discoBall') this.addDiscoBall(p);
      if (p.type === 'danceFloor') this.addDanceFloorLights(p);
      if (def.layer !== 'object') continue;
      const bottom = (p.ty + h) * TILE;
      const img = add.image(p.tx * TILE, bottom, furnitureTextureKey(p, theme)).setOrigin(0, 1);
      img.setDepth(DEPTH.world + furnitureDepth(p, def, bottom));
      this.furniture.push({ p, img });
    }

    // Room tags live on walls (see AREA_LABELS) and sit under characters, like a painted sign
    for (const l of AREA_LABELS) {
      this.areaTags.push(new MapTag(scene, l.tx * TILE + 2, l.ty * TILE + 2, l.text, 'corner', LABEL_PX.plaque, DEPTH.wallTags));
    }
    this.applyTheme(theme);
  }

  /** The furniture sprite for a placement id (e.g. to make Mr. Potato dance). */
  furnitureImage(id: string): Phaser.GameObjects.Image | undefined {
    return this.furniture.find((f) => f.p.id === id)?.img;
  }

  /** A spinning disco ball hanging over the dance floor (drawn above everyone). */
  private addDiscoBall(p: Placement) {
    const { w, h } = footprint(p);
    const ball = this.scene.add
      .sprite(p.tx * TILE + (w * TILE) / 2, p.ty * TILE + (h * TILE) / 2 - 10, DISCO_KEY, 0)
      .setDepth(DEPTH.glow - 1);
    let f = 0;
    this.scene.time.addEvent({ delay: 160, loop: true, callback: () => ball.setFrame(++f % 4) });
    this.scene.tweens.add({ targets: ball, y: ball.y + 2, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });
  }

  /**
   * Dance-floor tiles light up in random neon colours, plus three coloured
   * spotlights drift across the floor. Shown day and night (it's a club!).
   */
  private addDanceFloorLights(p: Placement) {
    const { w, h } = footprint(p);
    const colors = [0xff5fb4, 0xb779ff, 0xffb547, 0x7ff0ff];
    const g = this.scene.add.graphics().setDepth(DEPTH.sunbeams + 0.5).setBlendMode(Phaser.BlendModes.ADD);
    const redraw = () => {
      g.clear();
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (Math.random() < 0.45) continue;
          g.fillStyle(colors[Math.floor(Math.random() * colors.length)], 0.45);
          g.fillRect((p.tx + x) * TILE + 1, (p.ty + y) * TILE + 1, TILE - 2, TILE - 2);
        }
    };
    redraw();
    this.scene.time.addEvent({ delay: 420, loop: true, callback: redraw });

    const x0 = p.tx * TILE;
    const y0 = p.ty * TILE;
    [GLOW_KEYS.clubPink, GLOW_KEYS.clubPurple, GLOW_KEYS.clubAmber].forEach((key, i) => {
      const light = this.scene.add
        .image(x0 + (i + 1) * ((w * TILE) / 4), y0 + (h * TILE) / 2, key)
        .setDepth(DEPTH.glow)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.clubLights.push(light);
      const wander = () =>
        this.scene.tweens.add({
          targets: light,
          x: x0 - 8 + Math.random() * (w * TILE + 16),
          y: y0 - 8 + Math.random() * (h * TILE + 16),
          duration: 1400 + Math.random() * 1200,
          ease: 'Sine.easeInOut',
          onComplete: wander,
        });
      wander();
    });
  }

  /** Night-time light sources. Positions are derived from the furniture they belong to. */
  private addGlowsFor(p: Placement, h: number) {
    const top = (p.ty + h) * TILE - ((FURNITURE[p.type] as FurnitureDef).overhang ?? 0);
    const glow = (key: string, x: number, y: number) =>
      this.glows.push(this.scene.add.image(x, y, key).setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD));
    const x = p.tx * TILE;
    switch (p.type) {
      case 'desk':
        glow(GLOW_KEYS.small, x + 6, top + 7);
        if (p.dir === 'up') glow(GLOW_KEYS.screen, x + 24, top + 6);
        break;
      case 'stage': glow(GLOW_KEYS.lamp, x + (footprint(p).w * TILE) / 2, p.ty * TILE + 20); break;
      case 'treadmill': glow(GLOW_KEYS.screen, x + 8, top + 3); break;
      case 'mirrorLong': glow(GLOW_KEYS.lamp, x + (footprint(p).w * TILE) / 2, p.ty * TILE + 12); break;
      case 'projectorScreen': glow(GLOW_KEYS.lamp, x + (footprint(p).w * TILE) / 2, top + 12); break;
      case 'floorLamp': glow(GLOW_KEYS.lamp, x + 8, top + 9); break;
      case 'arcade': glow(GLOW_KEYS.screen, x + 8, top + 11); break;
      case 'coffeeMachine': glow(GLOW_KEYS.small, x + 6, top + 6); break;
      case 'waterCooler': glow(GLOW_KEYS.screen, x + 8, top + 6); break;
    }
  }

  /** Show who owns a desk (name plate under the desk). */
  setDeskOwner(deskId: number, name: string | null): void {
    this.deskTags.get(deskId)?.destroy();
    this.deskTags.delete(deskId);
    const desk = DESKS.find((d) => d.id === deskId);
    if (!desk || !name) return;
    const tag = new MapTag(this.scene, (desk.desk.tx + 1.5) * TILE, (desk.desk.ty + 2) * TILE + 5, name, 'center', LABEL_PX.desk, DEPTH.wallTags);
    tag.setTheme(this.theme);
    tag.setScale(this.labelScale);
    this.deskTags.set(deskId, tag);
  }

  /** Labels are sized in screen pixels; the scene passes 1/zoom whenever the zoom changes. */
  setLabelScale(scale: number): void {
    this.labelScale = scale;
    this.areaTags.forEach((t) => t.setScale(scale));
    this.deskTags.forEach((t) => t.setScale(scale));
  }

  applyTheme(theme: Theme): void {
    this.theme = theme;
    this.bg.setTexture(bgKey(theme));
    for (const { p, img } of this.furniture) img.setTexture(furnitureTextureKey(p, theme));
    this.sun.setVisible(theme === 'light');
    this.moon.setVisible(theme === 'dark');
    for (const g of this.glows) g.setVisible(theme === 'dark');
    for (const l of this.clubLights) l.setAlpha(theme === 'dark' ? 0.9 : 0.45); // club lights are always on
    // any margin around the office (when the window's shape differs) matches the outer walls
    this.scene.cameras.main.setBackgroundColor(PALETTES[theme].wallTop);
    this.areaTags.forEach((t) => t.setTheme(theme));
    this.deskTags.forEach((t) => t.setTheme(theme));
  }


}

/**
 * Depth rule for y-sorting. Most furniture sorts by its bottom edge. Things you
 * get ON — seats facing the camera, treadmills, the weight bench — sort by
 * their TOP edge so the person using them is drawn in front. Seats
 * facing away sort normally, so their backrest hides the sitter's back.
 * Items on a counter sort just above it.
 */
const TOP_SORTED = new Set<Placement['type']>(['deskChair', 'chair', 'armchair', 'sofa', 'beanBag', 'treadmill', 'weightBench', 'toilet']);

function furnitureDepth(p: Placement, def: FurnitureDef, bottom: number): number {
  if (TOP_SORTED.has(p.type) && (p.dir ?? 'down') === 'down') return p.ty * TILE + 1;
  if (def.onTop) {
    // sit just above whatever counter they're on (it may run down a wall, so its bottom can be lower)
    const base = PLACEMENTS.find((q) => {
      const f = footprint(q);
      return q.type === 'counter' && p.tx >= q.tx && p.tx < q.tx + f.w && p.ty >= q.ty && p.ty < q.ty + f.h;
    });
    return (base ? (base.ty + footprint(base).h) * TILE : bottom) + 0.5;
  }
  return bottom;
}
