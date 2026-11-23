import type Phaser from 'phaser';
import { TILE, tileCenter, toTile, type CatPerch, type Spot, type TilePos } from '@little-office/shared';
import { freeTileNear, pick, rand } from '../common';
import type { Critter } from './Critter';

/**
 * ACTIVITIES — the building blocks of a critter's day (Mochi's and the raccoons'). Each is a tiny object:
 *   update(dt) → 'continue' | 'done' | <the next activity>
 *   onPet()    → how they react to a pet (return a new activity, or nothing to carry on)
 *   end()      → tidy up (stop animations / tweens) when switching away
 *   seatId     → the seat or machine they're occupying, so nobody else can use it
 */
export type Step = 'continue' | 'done' | Activity;

export interface Activity {
  readonly name: 'sit' | 'walk' | 'nap' | 'perch' | 'ride' | 'gym' | 'dance' | 'forage';
  readonly seatId?: string;
  update(dtMs: number): Step;
  onPet?(): Activity | void;
  end?(): void;
}

/** Sit and look around for a moment. */
export function sitting(critter: Critter, ms = rand(2000, 5000)): Activity {
  critter.sprite.stop().setFrame('sit');
  let left = ms;
  return {
    name: 'sit',
    update(dt) {
      critter.drawOnFloor();
      return (left -= dt) <= 0 ? 'done' : 'continue';
    },
    onPet() {
      left = Math.max(left, rand(2500, 4000)); // stays a moment for the cuddle
    },
  };
}

/**
 * Walk to a tile, then carry on with `then()` (or null if there's no way there).
 * `mustArrive: false` = run `then()` even if someone blocked the last bit (e.g. chasing Roomby).
 */
export function walking(critter: Critter, to: TilePos, then: () => Activity, mustArrive = true): Activity | null {
  if (!critter.walker.goTo(to)) return null;
  critter.hush();
  critter.sprite.play(critter.species.walkAnim, true);
  return {
    name: 'walk',
    update(dt) {
      critter.face(critter.walker.update(dt, critter.obstacles));
      critter.drawOnFloor();
      if (critter.walker.moving) return 'continue';
      critter.sprite.stop();
      // someone stood in the way until they gave up? then they never got there — just sit
      const goal = tileCenter(to);
      if (mustArrive && Math.hypot(goal.x - critter.x, goal.y - critter.y) > 4) return sitting(critter, rand(1000, 2500));
      return then();
    },
    onPet() {
      critter.walker.goTo(toTile(critter)); // stop where they are
      return sitting(critter, rand(2500, 4000));
    },
  };
}

/** Curl up on the floor and snooze. */
export function napping(critter: Critter): Activity {
  critter.sprite.stop().setFrame('sleep');
  critter.say('z z z', 4000);
  let left = rand(10000, 18000);
  return {
    name: 'nap',
    update(dt) {
      critter.drawOnFloor();
      return (left -= dt) <= 0 ? 'done' : 'continue';
    },
    // petting wakes them up (Critter swaps the frame); default reaction = sit and enjoy it
  };
}

/**
 * Hop up onto a chair, sofa cushion or table and sit (or doze) there.
 * If it's a seat, it's theirs until they hop down.
 */
export function perching(critter: Critter, perch: CatPerch, from: TilePos): Activity | null {
  // a seat's id (you can't sit there either), or the tabletop spot's own id (other critters only)
  const claim = perch.seatId ?? perch.id;
  if (critter.seatBusy(claim)) return null; // someone beat them to it
  critter.moveTo(perch.pos);
  const doze = Math.random() < 0.5;
  critter.sprite.stop().setFrame(doze ? 'sleep' : 'sit');
  if (doze) critter.say('z z z', 4000);
  let left = rand(12000, 22000);
  return {
    name: 'perch',
    seatId: claim,
    update(dt) {
      if ((left -= dt) <= 0) return hopDown(critter, from);
      critter.drawAt(perch.pos, perch.depthY);
      return 'continue';
    },
    onPet() {
      left = Math.max(left, 4000); // enjoys it (and wakes up) — but keeps the seat
    },
  };
}

/** Hitch a ride on Roomby (null if someone's already on it). */
export function riding(critter: Critter): Activity | null {
  if (!critter.roomby.board(critter.name)) return null;
  critter.walker.goTo(toTile(critter)); // drop any path they were on
  critter.sprite.stop().setFrame('sit');
  critter.say(pick(critter.species.lines.hopOn));
  let left = rand(9000, 16000);
  return {
    name: 'ride',
    update(dt) {
      // sit on top of Roomby, facing the way it rolls
      const seat = critter.roomby.seat();
      critter.moveTo(seat);
      critter.face(critter.roomby.heading);
      critter.drawAt({ x: seat.x, y: seat.y + 2 }, critter.roomby.y - 3);
      if ((left -= dt) > 0) return 'continue';
      critter.roomby.alight(critter.name);
      critter.moveTo(freeTileNear(critter.grid, critter.roomby));
      return sitting(critter, rand(2000, 4000));
    },
    onPet() {}, // keeps riding
    end() {
      if (critter.roomby.rider === critter.name) critter.roomby.alight(critter.name);
    },
  };
}

/** Work out in the gym: jog on a treadmill, or stretch on a yoga mat. That machine is hers meanwhile. */
export function workingOut(critter: Critter, spot: Spot, from: TilePos): Activity | null {
  if (critter.seatBusy(spot.id)) return null;
  critter.moveTo(spot.pos);
  const running = spot.action === 'run';
  let stretch: Phaser.Tweens.Tween | null = null;
  if (running) {
    critter.face('right');
    critter.sprite.play(critter.species.walkAnim, true);
    critter.sprite.anims.timeScale = 2.5; // little legs going fast
    critter.say(pick(critter.species.lines.run));
  } else {
    critter.sprite.stop().setFrame('walkA');
    stretch = critter.scene.tweens.add({ targets: critter.sprite, scaleX: 1.25, scaleY: 0.85, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    critter.say(pick(critter.species.lines.stretch));
  }
  let left = rand(8000, 14000);
  return {
    name: 'gym',
    seatId: spot.id,
    update(dt) {
      if ((left -= dt) <= 0) return hopDown(critter, from);
      critter.drawAt(spot.pos, spot.pos.y + 1);
      return 'continue';
    },
    onPet() {}, // keeps going
    end() {
      critter.sprite.anims.timeScale = 1;
      stretch?.remove();
      critter.sprite.setScale(1);
    },
  };
}

/** Dance on the disco floor: bounce, spin around, little music notes. */
export function dancing(critter: Critter): Activity {
  critter.sprite.stop().setFrame('sit');
  critter.say(pick(critter.species.lines.dance));
  let left = rand(10000, 16000);
  let beat = 0;
  let t = 0;
  return {
    name: 'dance',
    update(dt) {
      t += dt;
      beat -= dt;
      if (beat <= 0) {
        // every beat: turn around and switch pose
        beat = 420;
        critter.sprite.setFlipX(!critter.sprite.flipX);
        critter.sprite.setFrame(critter.sprite.frame.name === 'sit' ? 'walkA' : 'sit');
        if (Math.random() < 0.12) critter.say(pick(['♪', '♫', '♪ ♫']), 1200);
      }
      critter.drawOnFloor(Math.abs(Math.sin(t / 135)) * 4); // bounce
      return (left -= dt) <= 0 ? sitting(critter, rand(1500, 3000)) : 'continue';
    },
    onPet() {}, // keeps dancing
  };
}

/**
 * Busy little hands at something next to them (a bin, a sink): face it, fidget,
 * say `start`… then, a few seconds later, one of `done`.
 */
export function fiddling(critter: Critter, thing: TilePos, start: string, done: string[]): Activity {
  critter.face(thing.tx * TILE + TILE / 2 < critter.x ? 'left' : 'right');
  critter.sprite.stop().setFrame('walkA');
  critter.say(start, 2500);
  let left = rand(5000, 8000);
  let fidget = 0;
  return {
    name: 'forage',
    update(dt) {
      fidget -= dt;
      if (fidget <= 0) {
        fidget = 180; // quick paw movements
        critter.sprite.setFrame(critter.sprite.frame.name === 'walkA' ? 'walkB' : 'walkA');
      }
      critter.drawOnFloor(fidget > 90 ? 1 : 0);
      if ((left -= dt) > 0) return 'continue';
      critter.say(pick(done), 2500);
      return sitting(critter, rand(2500, 4000));
    },
    onPet() {}, // too busy — keeps going
  };
}

/** Hop down from wherever they were onto a floor tile next to it. */
function hopDown(critter: Critter, from: TilePos): Activity {
  critter.moveTo(tileCenter(from));
  critter.hush();
  return sitting(critter, rand(1500, 3000));
}
