import Phaser from 'phaser';
import {
  CAT_NAP_TILES,
  RECEPTIONIST_TILE,
  TILE,
  VACUUM_ROUTE,
  catRoams,
  coachRoams,
  findPath,
  smoothPath,
  tileCenter,
  toTile,
  walkableTiles,
  zoneAt,
  type Appearance,
  type CollisionGrid,
  type Direction,
  type Theme,
  type TilePos,
  type Vec2,
} from '@little-office/shared';
import { CAT_KEY, VACUUM_KEY, registerNpcArt } from '../assets/npcArt';
import { REACTION_KEYS } from '../assets/textures';
import { Character, type CharacterPose } from '../characters/Character';
import { SpeechBubble } from '../characters/SpeechBubble';
import { DEPTH, NIGHT_TINT } from '../constants';

/**
 * The office's NPCs: Mochi the cat, Roomby the robot vacuum, Pip at reception
 * and Coach Rio in the gym. Each is a tiny state machine (idle → walk → do a
 * thing → idle…). They run on this screen for now; in Milestone 2 the server
 * will run them so everyone sees the same cat in the same place.
 */

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export interface NpcContext {
  playerX: number;
  playerY: number;
  playerPose: CharacterPose;
}

export interface Npc {
  readonly x: number;
  readonly y: number;
  /** Shown in the "E · ___" hint. */
  readonly verb: string;
  update(dtMs: number, ctx: NpcContext): void;
  interact(): void;
  setTheme(t: Theme): void;
  setLabelScale(s: number): void;
  destroy(): void;
}

/** Follows A* paths across the tile grid at a fixed speed (NPCs don't collide with people). */
class Walker {
  private waypoints: Vec2[] = [];
  private waited = 0;

  constructor(
    private readonly grid: CollisionGrid,
    public x: number,
    public y: number,
    private readonly speed: number,
  ) {}

  get moving() {
    return this.waypoints.length > 0;
  }

  goTo(t: TilePos): boolean {
    const here = { x: this.x, y: this.y };
    const path = findPath(this.grid, toTile(here), t);
    if (!path) return false;
    this.waypoints = smoothPath(this.grid, here, path.slice(1));
    return this.waypoints.length > 0;
  }

  /**
   * Returns the direction travelled this frame (or null if standing still).
   * If `avoid` (the player) is right in the way, it waits instead of walking through.
   */
  update(dtMs: number, avoid?: Vec2): Direction | null {
    const wp = this.waypoints[0];
    if (!wp) return null;
    const step = (this.speed * Math.min(dtMs, 50)) / 1000;
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const d = Math.hypot(dx, dy);
    if (avoid && d > 0) {
      const nx = this.x + (dx / d) * Math.min(step, d);
      const ny = this.y + (dy / d) * Math.min(step, d);
      const before = Math.hypot(this.x - avoid.x, this.y - avoid.y);
      const after = Math.hypot(nx - avoid.x, ny - avoid.y);
      if (after < 12 && after < before) {
        // politely wait — but if you're parked in the way for a while, give up and do something else
        this.waited += dtMs;
        if (this.waited > 1500) {
          this.waypoints = [];
          this.waited = 0;
        }
        return null;
      }
    }
    this.waited = 0;
    if (d <= step) {
      this.x = wp.x;
      this.y = wp.y;
      this.waypoints.shift();
    } else {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
    }
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
  }
}

// ------------------------------------------------------------------ Mochi ----

class Cat implements Npc {
  readonly verb = 'pet Mochi';
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bubble: SpeechBubble;
  private readonly walker: Walker;
  private readonly roam: TilePos[];
  private state: 'idle' | 'walk' | 'sit' | 'nap' = 'idle';
  private napping = false;
  private timer = 1500;

  constructor(
    private readonly scene: Phaser.Scene,
    grid: CollisionGrid,
  ) {
    const start = tileCenter(CAT_NAP_TILES[0]);
    this.walker = new Walker(grid, start.x, start.y, 38);
    this.roam = walkableTiles(grid, catRoams);
    this.sprite = scene.add.sprite(start.x, start.y, CAT_KEY, 'sit').setOrigin(0.5, 1);
    this.bubble = new SpeechBubble(scene);
  }

  get x() {
    return this.walker.x;
  }
  get y() {
    return this.walker.y;
  }

  update(dtMs: number, ctx: NpcContext) {
    const dir = this.walker.update(dtMs, { x: ctx.playerX, y: ctx.playerY });
    if (this.state === 'walk') {
      if (dir === 'left') this.sprite.setFlipX(true);
      if (dir === 'right') this.sprite.setFlipX(false);
      if (!this.walker.moving) this.arrive();
    } else {
      this.timer -= dtMs;
      if (this.timer <= 0) this.decide();
    }
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y + 4)).setDepth(DEPTH.world + this.y);
    this.bubble.setPosition(this.x, this.y - 12);
  }

  private decide() {
    // usually wander somewhere nearby; sometimes go for a nap on a cosy spot
    this.napping = Math.random() < 0.3;
    const near = this.roam.filter((t) => Math.abs(t.tx - toTile(this).tx) + Math.abs(t.ty - toTile(this).ty) < 12);
    const target = this.napping ? pick(CAT_NAP_TILES) : pick(near.length ? near : this.roam);
    if (this.walker.goTo(target)) {
      this.state = 'walk';
      this.bubble.hide();
      this.sprite.play('cat-walk', true);
    } else this.timer = 1000;
  }

  private arrive() {
    this.sprite.stop();
    if (this.napping) {
      this.state = 'nap';
      this.sprite.setFrame('sleep');
      this.bubble.say('z z z');
      this.timer = rand(10000, 18000);
    } else {
      this.state = 'sit';
      this.sprite.setFrame('sit');
      this.timer = rand(2000, 5000);
    }
  }

  interact() {
    const wasNapping = this.state === 'nap';
    this.state = 'sit';
    this.sprite.stop().setFrame('sit');
    this.timer = rand(2500, 4000); // stays a moment for the cuddle
    this.bubble.say(wasNapping ? '…mrrp? 💕' : pick(['Meow! 💕', 'Purrrr… 💕', 'Mrow! 🐟']));
    this.scene.time.delayedCall(2500, () => this.bubble.hide());
    const heart = this.scene.add.image(this.x, this.y - 10, REACTION_KEYS.heart).setDepth(DEPTH.nameplates + 2);
    this.scene.tweens.add({ targets: heart, y: heart.y - 16, alpha: 0, duration: 1200, onComplete: () => heart.destroy() });
    this.scene.tweens.add({ targets: this.sprite, scaleY: 0.85, yoyo: true, duration: 120 }); // happy wiggle
  }

  setTheme(t: Theme) {
    if (t === 'dark') this.sprite.setTint(NIGHT_TINT);
    else this.sprite.clearTint();
  }

  setLabelScale(s: number) {
    this.bubble.setScale(s);
  }

  destroy() {
    this.sprite.destroy();
    this.bubble.destroy();
  }
}

// ----------------------------------------------------------------- Roomby ----

class Vacuum implements Npc {
  readonly verb = 'say hi to Roomby';
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bubble: SpeechBubble;
  private readonly walker: Walker;
  private leg = 0;
  private pause = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    grid: CollisionGrid,
  ) {
    const start = tileCenter(VACUUM_ROUTE[0]);
    this.walker = new Walker(grid, start.x, start.y, 22);
    this.sprite = scene.add.sprite(start.x, start.y, VACUUM_KEY, 'a').setOrigin(0.5, 0.7).play('vacuum-blink');
    this.bubble = new SpeechBubble(scene);
  }

  get x() {
    return this.walker.x;
  }
  get y() {
    return this.walker.y;
  }

  update(dtMs: number, ctx: NpcContext) {
    if (this.pause > 0) this.pause -= dtMs;
    else if (!this.walker.moving) {
      this.leg = (this.leg + 1) % VACUUM_ROUTE.length;
      this.walker.goTo(VACUUM_ROUTE[this.leg]);
    } else this.walker.update(dtMs, { x: ctx.playerX, y: ctx.playerY });
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y)).setDepth(DEPTH.world + this.y - 4);
    this.bubble.setPosition(this.x, this.y - 6);
  }

  interact() {
    this.pause = 1600;
    this.bubble.say(pick(['beep boop ✨', 'boop! 🧹', 'beep beep! ✨']));
    this.scene.time.delayedCall(2000, () => this.bubble.hide());
    this.scene.tweens.add({ targets: this.sprite, angle: 360, duration: 700, onComplete: () => this.sprite.setAngle(0) });
  }

  setTheme(t: Theme) {
    if (t === 'dark') this.sprite.setTint(NIGHT_TINT);
    else this.sprite.clearTint();
  }

  setLabelScale(s: number) {
    this.bubble.setScale(s);
  }

  destroy() {
    this.sprite.destroy();
    this.bubble.destroy();
  }
}

// ---------------------------------------------------------- Pip (reception) ----

const TIPS = [
  'Meal boxes: breakfast at 10:00, lunch at 12:00 🍱',
  'Set your status in the top bar so people know 💬',
  'Press T for night mode 🌙',
  'The Potato Club has karaoke — try the mic 🎤',
  'Mr. Potato loves visitors 🥔',
  'Need a break? The lounge sofas are comfy 🛋️',
  'Step on this mat when you head home 👋',
];

class Receptionist implements Npc {
  readonly verb = 'talk to Pip';
  private readonly person: Character;
  private tip = 0;

  constructor(scene: Phaser.Scene, playerName: string) {
    const look: Appearance = { skin: 2, hairStyle: 2, hairColor: 0, outfit: 5 }; // bun, cream outfit
    this.person = new Character(scene, look, 'Pip · Reception', { isLocal: false });
    const p = tileCenter(RECEPTIONIST_TILE);
    this.person.setPosition(p.x, p.y);
    this.person.setMotion('down', 'idle');
    // greet you once the welcome title has played
    scene.time.delayedCall(3800, () => this.person.say(`Welcome back, ${playerName}! ☀️`, 4500));
  }

  get x() {
    return this.person.x;
  }
  get y() {
    return this.person.y;
  }

  update() {}

  interact() {
    this.person.say(TIPS[this.tip++ % TIPS.length], 4500);
  }

  setTheme(t: Theme) {
    this.person.setTheme(t);
  }

  setLabelScale(s: number) {
    this.person.setLabelScale(s);
  }

  destroy() {
    this.person.destroy();
  }
}

// ---------------------------------------------------------------- Coach Rio ----

const ACTIVE: ReadonlySet<CharacterPose> = new Set(['run', 'pedal', 'lift', 'benchPress', 'stretch', 'punch']);
const CHEERS = ['One more rep! 💪', "You're crushing it! 🔥", 'Breathe in… and out 🌬️', 'Looking strong! ⭐', 'Keep that pace! 🏃', 'Nice form! 👌'];
const NUDGES = ['Grab a treadmill! 🏃', 'The bikes are free 🚲', 'Try the punching bag! 🥊', 'Yoga mat is open 🧘'];

class Coach implements Npc {
  readonly verb = 'talk to Coach Rio';
  private readonly person: Character;
  private readonly walker: Walker;
  private readonly roam: TilePos[];
  private idle = 2000;
  private cheer = 4000;

  constructor(scene: Phaser.Scene, grid: CollisionGrid) {
    const look: Appearance = { skin: 3, hairStyle: 3, hairColor: 4, outfit: 1 }; // spiky hair, rose tank top
    this.person = new Character(scene, look, 'Coach Rio', { isLocal: false, build: 'buff' }); // the muscly build
    this.roam = walkableTiles(grid, coachRoams);
    const p = tileCenter(pick(this.roam));
    this.walker = new Walker(grid, p.x, p.y, 60);
    this.person.setPosition(p.x, p.y);
    this.person.setMotion('down', 'idle');
  }

  get x() {
    return this.walker.x;
  }
  get y() {
    return this.walker.y;
  }

  update(dtMs: number, ctx: NpcContext) {
    const dir = this.walker.update(dtMs, { x: ctx.playerX, y: ctx.playerY });
    if (dir) this.person.setMotion(dir, 'walk');
    else {
      this.person.setMotion('down', 'idle');
      this.idle -= dtMs;
      if (this.idle <= 0) {
        this.walker.goTo(pick(this.roam));
        this.idle = rand(2500, 6000);
      }
    }
    this.person.setPosition(this.x, this.y);

    // cheer you on while you're working out in the gym
    const t = toTile({ x: ctx.playerX, y: ctx.playerY });
    if (zoneAt(t.tx, t.ty) === 'gym') {
      this.cheer -= dtMs;
      if (this.cheer <= 0) {
        const working = ACTIVE.has(ctx.playerPose);
        this.person.say(working ? pick(CHEERS) : pick(NUDGES), 3500);
        this.cheer = working ? rand(6000, 9000) : rand(12000, 16000);
      }
    } else this.cheer = 3000;
  }

  interact() {
    this.person.say(pick([...CHEERS, "Let's go! 💪"]), 3500);
  }

  setTheme(t: Theme) {
    this.person.setTheme(t);
  }

  setLabelScale(s: number) {
    this.person.setLabelScale(s);
  }

  destroy() {
    this.person.destroy();
  }
}

// ---------------------------------------------------------------- manager ----

export class NpcManager {
  private readonly npcs: Npc[];

  constructor(scene: Phaser.Scene, grid: CollisionGrid, playerName: string) {
    registerNpcArt(scene);
    this.npcs = [new Cat(scene, grid), new Vacuum(scene, grid), new Receptionist(scene, playerName), new Coach(scene, grid)];
  }

  update(dtMs: number, ctx: NpcContext) {
    for (const n of this.npcs) n.update(dtMs, ctx);
  }

  /** Where every NPC is (they're solid: the player can't walk through them). */
  positions(): Vec2[] {
    return this.npcs.map((n) => ({ x: n.x, y: n.y }));
  }

  /** The closest NPC within `range` px of a point (for the E hint and key). */
  nearest(x: number, y: number, range = TILE * 1.6): Npc | null {
    let best: Npc | null = null;
    let bestD = range;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  /** The NPC under a click (their sprite sits a little above their feet). */
  hit(wx: number, wy: number): Npc | null {
    return this.nearest(wx, wy + 8, 12);
  }

  setTheme(t: Theme) {
    this.npcs.forEach((n) => n.setTheme(t));
  }

  setLabelScale(s: number) {
    this.npcs.forEach((n) => n.setLabelScale(s));
  }

  destroy() {
    this.npcs.forEach((n) => n.destroy());
  }
}
