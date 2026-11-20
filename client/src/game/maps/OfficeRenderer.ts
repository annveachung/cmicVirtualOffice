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
import { BEAM_KEYS, GLOW_KEYS, bgKey } from '../assets/textures';
import { DEPTH, LABEL_PX } from '../constants';

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
  private readonly plaques: Phaser.GameObjects.Text[] = [];
  private readonly deskTags = new Map<number, Phaser.GameObjects.Text>();
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
      if (def.layer !== 'object') continue;
      const bottom = (p.ty + h) * TILE;
      const img = add.image(p.tx * TILE, bottom, furnitureTextureKey(p, theme)).setOrigin(0, 1);
      img.setDepth(DEPTH.world + furnitureDepth(p, def, bottom));
      this.furniture.push({ p, img });
    }

    for (const l of AREA_LABELS) {
      this.plaques.push(
        this.makeLabel(l.tx * TILE, l.ty * TILE, l.text.toUpperCase(), LABEL_PX.plaque).setDepth(DEPTH.labels),
      );
    }
    this.applyTheme(theme);
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

  private makeLabel(x: number, y: number, text: string, size: number): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: '"Pixelify Sans", monospace', fontSize: `${size}px`, padding: { x: 3, y: 1 } })
      .setOrigin(0.5)
      .setScale(this.labelScale);
    t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return t;
  }

  /** Show who owns a desk (name plate under the desk). */
  setDeskOwner(deskId: number, name: string | null): void {
    this.deskTags.get(deskId)?.destroy();
    this.deskTags.delete(deskId);
    const desk = DESKS.find((d) => d.id === deskId);
    if (!desk || !name) return;
    const tag = this.makeLabel((desk.desk.tx + 1.5) * TILE, (desk.desk.ty + 2) * TILE + 5, name, LABEL_PX.desk).setDepth(DEPTH.labels);
    this.deskTags.set(deskId, tag);
    this.styleLabels();
  }

  /** Labels are sized in screen pixels; the scene passes 1/zoom whenever the zoom changes. */
  setLabelScale(scale: number): void {
    this.labelScale = scale;
    this.plaques.forEach((t) => t.setScale(scale));
    this.deskTags.forEach((t) => t.setScale(scale));
  }

  applyTheme(theme: Theme): void {
    this.theme = theme;
    this.bg.setTexture(bgKey(theme));
    for (const { p, img } of this.furniture) img.setTexture(furnitureTextureKey(p, theme));
    this.sun.setVisible(theme === 'light');
    this.moon.setVisible(theme === 'dark');
    for (const g of this.glows) g.setVisible(theme === 'dark');
    this.scene.cameras.main.setBackgroundColor(PALETTES[theme].bg);
    this.styleLabels();
  }

  private styleLabels() {
    const pal = PALETTES[this.theme];
    const style = (t: Phaser.GameObjects.Text) =>
      t.setColor(this.theme === 'light' ? '#1f3a2c' : '#e6f3c2').setBackgroundColor(this.theme === 'light' ? pal.paper : '#1a3024');
    this.plaques.forEach(style);
    this.deskTags.forEach(style);
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
  if (def.onTop) return bottom + 0.5;
  return bottom;
}
