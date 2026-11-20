import Phaser from 'phaser';
import { PLACEMENTS, appearanceKey, type Appearance, type Theme } from '@little-office/shared';
import { paintBackground, paintGlow, paintSunbeams } from './backgroundArt';
import { DIRECTIONS, FRAME_H, FRAME_W, POSES, buildCharacterSheet, frameName, type Pose } from './characterArt';
import { furnitureTextureKey, paintFurniture } from './furnitureArt';
import { PALETTES } from './palette';

/**
 * Turns our canvas drawings into Phaser textures + animations.
 * Called once per scene start; character sheets are added lazily the first
 * time an appearance is seen (other players will arrive in Milestone 2).
 */
const THEMES: Theme[] = ['light', 'dark'];

export const bgKey = (t: Theme) => `bg:${t}`;
export const GLOW_KEYS = { lamp: 'glow:lamp', screen: 'glow:screen', small: 'glow:small' } as const;
export const BEAM_KEYS = { sun: 'beams:sun', moon: 'beams:moon' } as const;

export function registerEnvironmentTextures(scene: Phaser.Scene): void {
  const tex = scene.textures;
  for (const theme of THEMES) {
    const pal = PALETTES[theme];
    if (!tex.exists(bgKey(theme))) tex.addCanvas(bgKey(theme), paintBackground(pal));
    for (const p of PLACEMENTS) {
      const key = furnitureTextureKey(p, theme);
      if (!tex.exists(key)) tex.addCanvas(key, paintFurniture(p, pal));
    }
  }
  if (!tex.exists(BEAM_KEYS.sun)) tex.addCanvas(BEAM_KEYS.sun, paintSunbeams('#fff4cf'));
  if (!tex.exists(BEAM_KEYS.moon)) tex.addCanvas(BEAM_KEYS.moon, paintSunbeams('#8ea4d6'));
  if (!tex.exists(GLOW_KEYS.lamp)) tex.addCanvas(GLOW_KEYS.lamp, paintGlow(40, PALETTES.dark.lampLight, 0.55));
  if (!tex.exists(GLOW_KEYS.small)) tex.addCanvas(GLOW_KEYS.small, paintGlow(22, PALETTES.dark.lampLight, 0.5));
  if (!tex.exists(GLOW_KEYS.screen)) tex.addCanvas(GLOW_KEYS.screen, paintGlow(22, '#8fc4ff', 0.5));
}

/**
 * Every animation a character can play, as a list of frames from the sheet.
 * Activity spots (shared/spots.ts) name one of these as their `action`.
 */
export const ANIMS = {
  idle: { frames: ['idle', 'breathe'], fps: 1.6 },
  walk: { frames: ['walkA', 'idle', 'walkB', 'idle'], fps: 8 },
  sit: { frames: ['sit'], fps: 1 },
  run: { frames: ['walkA', 'breathe', 'walkB', 'breathe'], fps: 14 },
  pedal: { frames: ['pedalA', 'pedalB'], fps: 6 },
  lift: { frames: ['liftDown', 'liftUp'], fps: 2 },
  benchPress: { frames: ['benchDown', 'benchUp'], fps: 2 },
  stretch: { frames: ['armsUp', 'armsUp', 'idle'], fps: 1.4 },
  punch: { frames: ['idle', 'punch'], fps: 5 },
  play: { frames: ['idle', 'breathe'], fps: 7 },
  wash: { frames: ['idle', 'breathe'], fps: 5 },
} satisfies Record<string, { frames: Pose[]; fps: number }>;

export type AnimName = keyof typeof ANIMS;

export const charKey = (a: Appearance) => `char:${appearanceKey(a)}`;
export const animKey = (a: Appearance, name: string) => `${charKey(a)}:${name}`;

/** Ensure a sprite sheet + all animations exist for this look. */
export function ensureCharacter(scene: Phaser.Scene, a: Appearance): string {
  const key = charKey(a);
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.addCanvas(key, buildCharacterSheet(a))!;
  DIRECTIONS.forEach((dir, row) =>
    POSES.forEach((pose, col) => texture.add(frameName(dir, pose), 0, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H)),
  );
  for (const dir of DIRECTIONS) {
    for (const [name, def] of Object.entries(ANIMS)) {
      scene.anims.create({
        key: animKey(a, `${name}-${dir}`),
        frames: def.frames.map((pose) => ({ key, frame: frameName(dir, pose) })),
        frameRate: def.fps,
        repeat: -1,
      });
    }
  }
  return key;
}
