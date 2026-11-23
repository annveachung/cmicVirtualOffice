import type Phaser from 'phaser';
import { tileCenter, toTile, type CatPerch, type Spot, type TilePos } from '@little-office/shared';
import { freeTileNear, pick, rand } from '../common';
import type { Cat } from './Cat';

/**
 * ACTIVITIES — the building blocks of Mochi's day. Each one is a tiny object:
 *   update(dt) → 'continue' | 'done' | <the next activity>
 *   onPet()    → how she reacts to a pet (return a new activity, or nothing to carry on)
 *   end()      → tidy up (stop animations / tweens) when switching away
 *   seatId     → the seat or machine she's occupying, so nobody else can use it
 */
export type Step = 'continue' | 'done' | Activity;

export interface Activity {
  readonly name: 'sit' | 'walk' | 'nap' | 'perch' | 'ride' | 'gym' | 'dance';
  readonly seatId?: string;
  update(dtMs: number): Step;
  onPet?(): Activity | void;
  end?(): void;
}

/** Sit and look around for a moment. */
export function sitting(cat: Cat, ms = rand(2000, 5000)): Activity {
  cat.sprite.stop().setFrame('sit');
  let left = ms;
  return {
    name: 'sit',
    update(dt) {
      cat.drawOnFloor();
      return (left -= dt) <= 0 ? 'done' : 'continue';
    },
    onPet() {
      left = Math.max(left, rand(2500, 4000)); // stays a moment for the cuddle
    },
  };
}

/** Walk to a tile, then carry on with `then()` (or null if there's no way there). */
export function walking(cat: Cat, to: TilePos, then: () => Activity): Activity | null {
  if (!cat.walker.goTo(to)) return null;
  cat.hush();
  cat.sprite.play('cat-walk', true);
  return {
    name: 'walk',
    update(dt) {
      cat.face(cat.walker.update(dt, cat.player));
      cat.drawOnFloor();
      if (cat.walker.moving) return 'continue';
      cat.sprite.stop();
      return then();
    },
    onPet() {
      cat.walker.goTo(toTile(cat)); // stop where she is
      return sitting(cat, rand(2500, 4000));
    },
  };
}

/** Curl up on the floor and snooze. */
export function napping(cat: Cat): Activity {
  cat.sprite.stop().setFrame('sleep');
  cat.say('z z z', 4000);
  let left = rand(10000, 18000);
  return {
    name: 'nap',
    update(dt) {
      cat.drawOnFloor();
      return (left -= dt) <= 0 ? 'done' : 'continue';
    },
    // petting wakes her up (Cat swaps the frame); default reaction = sit and enjoy it
  };
}

/**
 * Hop up onto a chair, sofa cushion or table and sit (or doze) there.
 * If it's a seat, it's hers until she hops down.
 */
export function perching(cat: Cat, perch: CatPerch, from: TilePos): Activity | null {
  if (perch.seatId && cat.seatBusy(perch.seatId)) return null; // someone beat her to it
  cat.moveTo(perch.pos);
  const doze = Math.random() < 0.5;
  cat.sprite.stop().setFrame(doze ? 'sleep' : 'sit');
  if (doze) cat.say('z z z', 4000);
  let left = rand(12000, 22000);
  return {
    name: 'perch',
    seatId: perch.seatId,
    update(dt) {
      if ((left -= dt) <= 0) return hopDown(cat, from);
      cat.drawAt(perch.pos, perch.depthY);
      return 'continue';
    },
    onPet() {
      left = Math.max(left, 4000); // enjoys it (and wakes up) — but keeps the seat
    },
  };
}

/** Hitch a ride on Roomby (null if someone's already on it). */
export function riding(cat: Cat): Activity | null {
  if (!cat.roomby.board('cat')) return null;
  cat.walker.goTo(toTile(cat)); // drop any path she was on
  cat.sprite.stop().setFrame('sit');
  cat.say(pick(['mrrp! 🐾', 'Wheee! 🐱', '*hops on* 🐾']));
  let left = rand(9000, 16000);
  return {
    name: 'ride',
    update(dt) {
      // sit on top of Roomby, facing the way it rolls
      const seat = cat.roomby.seat();
      cat.moveTo(seat);
      cat.face(cat.roomby.heading);
      cat.drawAt({ x: seat.x, y: seat.y + 2 }, cat.roomby.y - 3);
      if ((left -= dt) > 0) return 'continue';
      cat.roomby.alight('cat');
      cat.moveTo(freeTileNear(cat.grid, cat.roomby));
      return sitting(cat, rand(2000, 4000));
    },
    onPet() {}, // keeps riding
    end() {
      if (cat.roomby.rider === 'cat') cat.roomby.alight('cat');
    },
  };
}

/** Work out in the gym: jog on a treadmill, or stretch on a yoga mat. That machine is hers meanwhile. */
export function workingOut(cat: Cat, spot: Spot, from: TilePos): Activity | null {
  if (cat.seatBusy(spot.id)) return null;
  cat.moveTo(spot.pos);
  const running = spot.action === 'run';
  let stretch: Phaser.Tweens.Tween | null = null;
  if (running) {
    cat.face('right');
    cat.sprite.play('cat-walk', true);
    cat.sprite.anims.timeScale = 2.5; // little legs going fast
    cat.say(pick(['💪 mrrow!', '🏃 nyoom', 'cardio 🐾']));
  } else {
    cat.sprite.stop().setFrame('walkA');
    stretch = cat.scene.tweens.add({ targets: cat.sprite, scaleX: 1.25, scaleY: 0.85, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' });
    cat.say(pick(['🧘 mrrrr…', 'big stretch 🐾', 'namaste 🐱']));
  }
  let left = rand(8000, 14000);
  return {
    name: 'gym',
    seatId: spot.id,
    update(dt) {
      if ((left -= dt) <= 0) return hopDown(cat, from);
      cat.drawAt(spot.pos, spot.pos.y + 1);
      return 'continue';
    },
    onPet() {}, // keeps going
    end() {
      cat.sprite.anims.timeScale = 1;
      stretch?.remove();
      cat.sprite.setScale(1);
    },
  };
}

/** Dance on the disco floor: bounce, spin around, little music notes. */
export function dancing(cat: Cat): Activity {
  cat.sprite.stop().setFrame('sit');
  cat.say(pick(['♪ ♫', '🪩 mrow~', '♫ meow meow ♪']));
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
        cat.sprite.setFlipX(!cat.sprite.flipX);
        cat.sprite.setFrame(cat.sprite.frame.name === 'sit' ? 'walkA' : 'sit');
        if (Math.random() < 0.12) cat.say(pick(['♪', '♫', '♪ ♫']), 1200);
      }
      cat.drawOnFloor(Math.abs(Math.sin(t / 135)) * 4); // bounce
      return (left -= dt) <= 0 ? sitting(cat, rand(1500, 3000)) : 'continue';
    },
    onPet() {}, // keeps dancing
  };
}

/** Hop down from wherever she was onto a floor tile next to it. */
function hopDown(cat: Cat, from: TilePos): Activity {
  cat.moveTo(tileCenter(from));
  cat.hush();
  return sitting(cat, rand(1500, 3000));
}
