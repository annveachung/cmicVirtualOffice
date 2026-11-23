import Phaser from 'phaser';
import {
  CAT_NAP_TILES,
  RECEPTIONIST_TILE,
  TILE,
  VACUUM_ROUTE,
  coachRoams,
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
import { VACUUM_KEY, registerNpcArt } from '../assets/npcArt';
import { Critter } from './critters/Critter';
import { CRITTERS, SPECIES } from './critters/species';
import { Walker, pick, rand, type Npc, type NpcContext } from './common';

export { freeTileNear, type Npc, type NpcContext } from './common';
import { Character, type CharacterPose } from '../characters/Character';
import { SpeechBubble } from '../characters/SpeechBubble';
import { DEPTH, NIGHT_TINT } from '../constants';

/**
 * The office's NPCs: the critters (Mochi the cat + raccoons Ziggy and Pudding), Roomby the robot vacuum, Pip at reception and Coach Rio in the gym. Each is a tiny state machine (idle → walk → do a
 * thing → idle…). They run on this screen for now; in Milestone 2 the server
 * will run them so everyone sees the same critters in the same places.
 */

// ----------------------------------------------------------------- Roomby ----

/** 'player' (you) or a critter's name. */
export type Rider = string;

const ROOMBY_SPEED = 22;
const ROOMBY_RIDE_SPEED = 30;

class Vacuum implements Npc {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly bubble: SpeechBubble;
  private readonly walker: Walker;
  private leg = 0;
  private pause = 0;
  /** Who's standing (or sitting) on top. One rider at a time. */
  rider: Rider | null = null;
  /** The way it last rolled (riders face this way). */
  heading: Direction = 'right';

  constructor(
    private readonly scene: Phaser.Scene,
    grid: CollisionGrid,
  ) {
    const start = tileCenter(VACUUM_ROUTE[0]);
    this.walker = new Walker(grid, start.x, start.y, ROOMBY_SPEED);
    this.sprite = scene.add.sprite(start.x, start.y, VACUUM_KEY, 'a').setOrigin(0.5, 0.7).play('vacuum-blink');
    this.bubble = new SpeechBubble(scene);
  }

  get x() {
    return this.walker.x;
  }
  get y() {
    return this.walker.y;
  }
  get verb() {
    return this.rider ? 'say hi to Roomby' : 'hop on Roomby';
  }

  /** Where a rider stands: on top of the robot, a little up from its centre. */
  seat(): Vec2 {
    return { x: this.x, y: this.y - 3 };
  }

  /** Climb aboard. Returns false (and says so) if someone's already riding. */
  board(who: Rider): boolean {
    if (this.rider && this.rider !== who) {
      if (who === 'player') this.say(`beep! ${this.rider}'s riding — next one! 🐾`);
      return false;
    }
    this.rider = who;
    this.pause = 0;
    this.walker.speed = ROOMBY_RIDE_SPEED;
    this.say(who === 'player' ? 'beep boop, all aboard! 🚂' : `beep! passenger: ${who} 🐾`);
    return true;
  }

  alight(who: Rider) {
    if (this.rider !== who) return;
    this.rider = null;
    this.walker.speed = ROOMBY_SPEED;
    if (who === 'player') this.say('boop! come again ✨');
  }

  update(dtMs: number, ctx: NpcContext) {
    if (this.pause > 0) this.pause -= dtMs;
    else if (!this.walker.moving) {
      this.leg = (this.leg + 1) % VACUUM_ROUTE.length;
      this.walker.goTo(VACUUM_ROUTE[this.leg]);
    } else {
      this.heading = this.walker.update(dtMs, ctx.obstacles) ?? this.heading;
    }
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y)).setDepth(DEPTH.world + this.y - 4);
    this.bubble.setPosition(this.x, this.y - (this.rider === 'player' ? 30 : 6));
  }

  /** E / click while not riding it (or a critter is): a hello and a spin. */
  interact() {
    if (this.rider) {
      this.say(this.rider !== 'player' ? `beep! ${this.rider}'s riding — next one! 🐾` : 'beep boop ✨');
      return;
    }
    this.pause = 1600;
    this.say(pick(['beep boop ✨', 'boop! 🧹', 'beep beep! ✨']));
    this.scene.tweens.add({ targets: this.sprite, angle: 360, duration: 700, onComplete: () => this.sprite.setAngle(0) });
  }

  private say(text: string) {
    this.bubble.say(text);
    this.scene.time.delayedCall(2200, () => this.bubble.hide());
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
    const dir = this.walker.update(dtMs, ctx.obstacles);
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
  /** Roomby, the rideable one. */
  readonly roomby: Vacuum;
  /** Mochi + the raccoons. */
  private readonly critters: Critter[];
  /** Set by the scene: is the player using (or walking to) this seat? */
  seatBusy: (id: string) => boolean = () => false;

  constructor(scene: Phaser.Scene, grid: CollisionGrid, playerName: string) {
    registerNpcArt(scene);
    this.roomby = new Vacuum(scene, grid);
    // each starts on a different cosy spot; a seat is busy if you OR another critter has it
    this.critters = CRITTERS.map(({ name, kind }, i) => {
      const busy = (id: string) => this.seatBusy(id) || this.critters.some((c) => c.name !== name && c.seatId === id);
      return new Critter(scene, grid, this.roomby, busy, name, SPECIES[kind], CAT_NAP_TILES[(i * 2) % CAT_NAP_TILES.length]);
    });
    this.npcs = [...this.critters, this.roomby, new Receptionist(scene, playerName), new Coach(scene, grid)];
  }

  /**
   * Everyone is solid: each NPC is told where you and all the OTHER NPCs are, so
   * nobody walks through anybody. (Roomby and whoever is riding it don't count —
   * the rider is on top of it.)
   */
  update(dtMs: number, ctx: Omit<NpcContext, 'obstacles'>) {
    const player = { x: ctx.playerX, y: ctx.playerY };
    const riderOf = (n: Npc) => (n === this.roomby ? this.roomby.rider : null);
    const isRiding = (n: Npc) => n instanceof Critter && this.roomby.rider === n.name;
    for (const n of this.npcs) {
      const obstacles: Vec2[] = [];
      if (riderOf(n) !== 'player') obstacles.push(player);
      for (const o of this.npcs) {
        if (o === n) continue;
        if (n === this.roomby && isRiding(o)) continue; // its own passenger
        if (o === this.roomby && isRiding(n)) continue;
        obstacles.push({ x: o.x, y: o.y });
      }
      n.update(dtMs, { ...ctx, obstacles });
    }
  }

  /** The name of the critter occupying a seat / machine (nobody else can use it), if any. */
  critterOn(spotId: string): string | null {
    return this.critters.find((c) => c.seatId === spotId)?.name ?? null;
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
