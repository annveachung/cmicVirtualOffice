import Phaser from 'phaser';
import {
  CAT_GYM_SPOTS,
  CAT_NAP_TILES,
  DANCE_FLOOR_TILES,
  catPerches,
  catRoams,
  officeAt,
  tileCenter,
  walkableTiles,
  type CatPerch,
  type CollisionGrid,
  type Direction,
  type Spot,
  type Theme,
  type TilePos,
  type Vec2,
} from '@little-office/shared';
import { REACTION_KEYS } from '../../assets/textures';
import { SpeechBubble } from '../../characters/SpeechBubble';
import { DEPTH, NIGHT_TINT } from '../../constants';
import { Walker, pick, rand, type Npc, type NpcContext } from '../common';
import { riding, sitting, type Activity, type Step } from './activities';
import { CRITTER_BEHAVIOURS } from './behaviours';
import type { Species } from './species';

/**
 * THE OFFICE CRITTERS — Mochi the cat and the raccoons (Ziggy and Pudding).
 *
 * Organised in four layers:
 *   Critter.ts      a critter's body — sprite, speech bubble, legs (Walker) — and the loop that
 *                   runs ONE activity at a time, choosing a new one when it finishes.
 *   behaviours.ts   the MENU of things they might decide to do, each with a weight (how often).
 *   activities.ts   the small building blocks a behaviour is made of: walk, sit, nap, perch,
 *                   ride Roomby, work out, dance.
 *   species.ts      what differs per kind of animal (art, speed, lines) + who lives here.
 *
 * Adding a new trick = write an activity (if needed) + add one line to the menu.
 * Adding a new animal = draw it (npcArt.ts) + add a species + add them to CRITTERS.
 */

/** What a critter needs to know about Roomby to hitch a ride (it lives in NpcManager). */
export interface Rideable {
  readonly x: number;
  readonly y: number;
  /** 'player', a critter's name, or null. */
  readonly rider: string | null;
  readonly heading: Direction;
  board(who: string): boolean;
  alight(who: string): void;
  seat(): Vec2;
}

/** Places in the office critters know about (computed once). */
export interface CatPlaces {
  roam: TilePos[];
  napTiles: TilePos[];
  perches: CatPerch[];
  gymSpots: Spot[];
  danceTiles: TilePos[];
}

export class Critter implements Npc {
  readonly verb: string;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly walker: Walker;
  readonly places: CatPlaces;
  /** Where you and the other NPCs are (critters wait rather than walking through anyone). */
  obstacles: Vec2[] = [];
  /** So they don't hop on Roomby every single time it rolls past. */
  rideCooldown = 8000;
  private readonly bubble: SpeechBubble;
  private activity: Activity;

  constructor(
    readonly scene: Phaser.Scene,
    readonly grid: CollisionGrid,
    readonly roomby: Rideable,
    /** Is the player using (or walking to) this seat / machine? */
    readonly seatBusy: (id: string) => boolean,
    readonly name: string,
    readonly species: Species,
    startTile: TilePos,
  ) {
    this.verb = `pet ${name}`;
    const start = tileCenter(startTile);
    this.walker = new Walker(grid, start.x, start.y, species.speed);
    this.places = {
      roam: walkableTiles(grid, catRoams),
      napTiles: CAT_NAP_TILES,
      perches: catPerches(grid).filter((p) => !p.from.some((t) => officeAt(t.tx, t.ty))), // private offices are private
      gymSpots: CAT_GYM_SPOTS,
      danceTiles: DANCE_FLOOR_TILES.filter((t) => !grid.isBlocked(t.tx, t.ty)),
    };
    this.sprite = scene.add.sprite(start.x, start.y, species.texture, 'sit').setOrigin(0.5, 1);
    this.bubble = new SpeechBubble(scene);
    this.activity = sitting(this, 1500);
  }

  get x() {
    return this.walker.x;
  }
  get y() {
    return this.walker.y;
  }

  /** The seat / machine this critter is occupying (nobody else can use it meanwhile). */
  get seatId(): string | null {
    return this.activity.seatId ?? null;
  }

  /** What they're doing right now (handy for debugging: "walk", "perch", "dance"…). */
  get doing(): string {
    return this.activity.name;
  }

  update(dtMs: number, ctx: NpcContext) {
    this.obstacles = ctx.obstacles;
    this.rideCooldown -= dtMs;
    // Roomby rolling right past while they're just sitting? sometimes they can't resist
    if (this.activity.name === 'sit' && this.rideCooldown <= 0 && this.roombyWithin(18)) {
      this.rideCooldown = rand(15000, 25000);
      const ride = Math.random() < 0.6 ? riding(this) : null;
      if (ride) return this.switchTo(ride);
    }
    this.apply(this.activity.update(dtMs));
  }

  /** Pick the next thing to do from the behaviour menu (weighted random). */
  private decide() {
    const options = CRITTER_BEHAVIOURS.filter((b) => !b.only || b.only.includes(this.species.kind));
    while (options.length) {
      const total = options.reduce((n, b) => n + b.weight, 0);
      let roll = Math.random() * total;
      const i = options.findIndex((b) => (roll -= b.weight) < 0);
      const chosen = options.splice(i < 0 ? 0 : i, 1)[0];
      const activity = chosen.start(this);
      if (activity) return this.switchTo(activity);
    }
    this.switchTo(sitting(this, 1000)); // nothing possible right now — try again in a second
  }

  private apply(step: Step) {
    if (step === 'done') this.decide();
    else if (step !== 'continue') this.switchTo(step);
  }

  private switchTo(next: Activity) {
    this.activity.end?.();
    this.activity = next;
  }

  // ------------------------------------------------ helpers for activities --

  roombyWithin(range: number) {
    return Math.hypot(this.roomby.x - this.x, this.roomby.y - this.y) < range;
  }

  moveTo(p: Vec2) {
    this.walker.x = p.x;
    this.walker.y = p.y;
  }

  face(dir: Direction | null) {
    if (dir === 'left') this.sprite.setFlipX(true);
    if (dir === 'right') this.sprite.setFlipX(false);
  }

  /** Standing on the floor where their walker is. */
  drawOnFloor(lift = 0) {
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y + 4 - lift)).setDepth(DEPTH.world + this.y);
    this.bubble.setPosition(this.x, this.y - 12);
  }

  /** Up on something (a chair, a table, Roomby, a treadmill): feet at `pos`, sorted at `depthY`. */
  drawAt(pos: Vec2, depthY: number) {
    this.sprite.setPosition(Math.round(pos.x), Math.round(pos.y - 1)).setDepth(DEPTH.world + depthY);
    this.bubble.setPosition(pos.x, pos.y - 14);
  }

  say(text: string, ms = 2200) {
    this.bubble.say(text);
    this.scene.time.delayedCall(ms, () => this.bubble.hide());
  }

  hush() {
    this.bubble.hide();
  }

  // ------------------------------------------------------------- the NPC API --

  interact() {
    const wasAsleep = this.sprite.frame.name === 'sleep';
    // the activity decides how they take it (default: stop and enjoy the cuddle)
    const next = this.activity.onPet ? this.activity.onPet() : sitting(this, rand(2500, 4000));
    if (next) this.switchTo(next);
    if (wasAsleep && this.sprite.frame.name === 'sleep') this.sprite.setFrame('sit');
    this.say(wasAsleep ? this.species.lines.wake : pick(this.species.lines.pet), 2500);
    const heart = this.scene.add.image(this.sprite.x, this.sprite.y - 14, REACTION_KEYS.heart).setDepth(DEPTH.nameplates + 2);
    this.scene.tweens.add({ targets: heart, y: heart.y - 16, alpha: 0, duration: 1200, onComplete: () => heart.destroy() });
  }

  setTheme(t: Theme) {
    if (t === 'dark') this.sprite.setTint(NIGHT_TINT);
    else this.sprite.clearTint();
  }

  setLabelScale(s: number) {
    this.bubble.setScale(s);
  }

  destroy() {
    this.activity.end?.();
    this.sprite.destroy();
    this.bubble.destroy();
  }
}
