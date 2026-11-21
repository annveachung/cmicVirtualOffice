import Phaser from 'phaser';
import { PLACEMENTS, appearanceKey, type Appearance, type Theme } from '@little-office/shared';
import { paintBackground, paintGlow, paintSunbeams } from './backgroundArt';
import { DIRECTIONS, FRAME_H, FRAME_W, POSES, buildCharacterSheet, drawPotatoSuit, frameName, type Pose } from './characterArt';
import { drawTemplate, makeCanvas, vline } from './pixel';
import { furnitureTextureKey, paintFurniture } from './furnitureArt';
import { PALETTES } from './palette';

/**
 * Turns our canvas drawings into Phaser textures + animations.
 * Called once per scene start; character sheets are added lazily the first
 * time an appearance is seen (other players will arrive in Milestone 2).
 */
const THEMES: Theme[] = ['light', 'dark'];

export const bgKey = (t: Theme) => `bg:${t}`;
export const GLOW_KEYS = {
  lamp: 'glow:lamp',
  screen: 'glow:screen',
  small: 'glow:small',
  clubPink: 'glow:club-pink',
  clubPurple: 'glow:club-purple',
  clubAmber: 'glow:club-amber',
} as const;
export const BEAM_KEYS = { sun: 'beams:sun', moon: 'beams:moon' } as const;

export const COSTUME_KEY = 'costume:potato';
export const REACTION_KEYS = { heart: 'react:heart', laugh: 'react:laugh' } as const;
export type Reaction = keyof typeof REACTION_KEYS;
export const DISCO_KEY = 'disco-ball';

/** Small pixel icons for reactions (9x9), the potato suit, and the 4-frame disco ball. */
function registerClubTextures(scene: Phaser.Scene) {
  const tex = scene.textures;
  const pal = PALETTES.light;
  if (!tex.exists(COSTUME_KEY)) {
    const { canvas, ctx } = makeCanvas(FRAME_W, FRAME_H);
    drawPotatoSuit(ctx, 0, 0, pal);
    tex.addCanvas(COSTUME_KEY, canvas);
  }
  const icon = (key: string, rows: string[], colors: Record<string, string>) => {
    if (tex.exists(key)) return;
    const { canvas, ctx } = makeCanvas(rows[0].length, rows.length);
    drawTemplate(ctx, rows, 0, 0, colors);
    tex.addCanvas(key, canvas);
  };
  icon(REACTION_KEYS.heart, ['.OO.OO...', 'OHHOHHO..', 'OHHHHHO..', 'OHHHHHO..', '.OHHHO...', '..OHO....', '...O.....'], { O: '#5a1630', H: '#ff5fa0' });
  icon(REACTION_KEYS.laugh, ['..OOOOO..', '.OYYYYYO.', 'OYOYYYOYO', 'OYYYYYYYO', 'OYOOOOOYO', '.OYRRRYO.', '..OOOOO..'], { O: '#5a3a14', Y: '#ffd24a', R: '#e2544e' });
  if (!tex.exists(DISCO_KEY)) {
    // 4 frames side by side; the sparkle pattern shifts each frame so it looks like it's turning
    const S = 14;
    const { canvas, ctx } = makeCanvas(S * 4, S + 6);
    for (let f = 0; f < 4; f++) {
      const ox = f * S;
      vline(ctx, ox + 7, 0, 6, '#3a3048');
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const dx = x - 6.5;
          const dy = y - 6.5;
          if (dx * dx + dy * dy > 42) continue;
          const lit = (Math.floor(x / 2) + Math.floor(y / 2) + f) % 3 === 0;
          ctx.fillStyle = dx * dx + dy * dy > 30 ? '#3a3048' : lit ? '#ffffff' : (x + y + f) % 2 ? '#b9c3d6' : '#8a93a8';
          ctx.fillRect(ox + x, 6 + y, 1, 1);
        }
    }
    const t = tex.addCanvas(DISCO_KEY, canvas)!;
    for (let f = 0; f < 4; f++) t.add(f, 0, f * S, 0, S, S + 6);
  }
}

export function registerEnvironmentTextures(scene: Phaser.Scene): void {
  registerClubTextures(scene);
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
  if (!tex.exists(GLOW_KEYS.clubPink)) tex.addCanvas(GLOW_KEYS.clubPink, paintGlow(26, '#ff5fb4', 0.6));
  if (!tex.exists(GLOW_KEYS.clubPurple)) tex.addCanvas(GLOW_KEYS.clubPurple, paintGlow(26, '#b779ff', 0.6));
  if (!tex.exists(GLOW_KEYS.clubAmber)) tex.addCanvas(GLOW_KEYS.clubAmber, paintGlow(26, '#ffb547', 0.6));
  if (!tex.exists(GLOW_KEYS.screen)) tex.addCanvas(GLOW_KEYS.screen, paintGlow(22, '#8fc4ff', 0.5));
}

/**
 * Every animation a character can play, as a list of frames from the sheet.
 * Activity spots (shared/spots.ts) name one of these as their `action`.
 */
export const ANIMS = {
  idle: { frames: ['idle', 'breathe'], fps: 1.6 },
  walk: { frames: ['walkA', 'idle', 'walkB', 'idle'], fps: 11 }, // matched to WALK_SPEED so feet don't slide
  sit: { frames: ['sit'], fps: 1 },
  run: { frames: ['walkA', 'breathe', 'walkB', 'breathe'], fps: 14 },
  pedal: { frames: ['pedalA', 'pedalB'], fps: 6 },
  lift: { frames: ['liftDown', 'liftUp'], fps: 2 },
  benchPress: { frames: ['benchDown', 'benchUp'], fps: 2 },
  stretch: { frames: ['armsUp', 'armsUp', 'idle'], fps: 1.4 },
  punch: { frames: ['idle', 'punch'], fps: 5 },
  play: { frames: ['idle', 'breathe'], fps: 7 },
  wash: { frames: ['idle', 'breathe'], fps: 5 },
  pee: { frames: ['idle', 'breathe'], fps: 1.2 },
  present: { frames: ['idle', 'breathe'], fps: 3 }, // a lively talking bob
  sing: { frames: ['armsUp', 'breathe', 'idle', 'breathe'], fps: 3 }, // belting it out
  // dances (the Potato Club). 'dance' is the default; the scene picks a style.
  dance: { frames: ['armsUp', 'idle', 'armsUp', 'breathe'], fps: 4 },
  danceGroove: { frames: ['armsUp', 'idle', 'armsUp', 'breathe'], fps: 4 },
  danceShuffle: { frames: ['walkA', 'breathe', 'walkB', 'breathe'], fps: 7 },
  danceHop: { frames: ['idle', 'hop', 'idle', 'breathe'], fps: 5 },
  danceSpin: { frames: ['idle'], fps: 7, spin: true }, // turns through all four directions
} satisfies Record<string, { frames: Pose[]; fps: number; spin?: boolean }>;

export const DANCE_STYLES = ['danceGroove', 'danceShuffle', 'danceHop', 'danceSpin'] as const;
export type DanceStyle = (typeof DANCE_STYLES)[number];

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
      const spin = 'spin' in def && def.spin;
      scene.anims.create({
        key: animKey(a, `${name}-${dir}`),
        frames: spin
          ? (['down', 'right', 'up', 'left'] as const).map((d) => ({ key, frame: frameName(d, def.frames[0]) }))
          : def.frames.map((pose) => ({ key, frame: frameName(dir, pose) })),
        frameRate: def.fps,
        repeat: -1,
      });
    }
  }
  return key;
}
