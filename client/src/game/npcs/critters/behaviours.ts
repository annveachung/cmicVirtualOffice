import { BIN_TILES, SINK_TILES, approachTiles, besideTile, toTile } from '@little-office/shared';
import type { CritterKind } from '../../assets/npcArt';
import { pick } from '../common';
import { dancing, fiddling, napping, perching, riding, sitting, walking, workingOut, type Activity } from './activities';
import type { Critter } from './Critter';

/**
 * THE CRITTER MENU — everything Mochi and the raccoons might decide to do when free.
 * `weight` = how often they pick it, relative to the others. `start` returns the
 * first activity (usually "walk there, then …"), or null when it isn't possible
 * right now (e.g. every seat is taken), in which case they pick something else.
 *
 * Things that just *happen* (not on the menu):
 *   - Roomby rolls past while they're sitting → they often hop on  (Critter.update)
 *   - you pet them → each activity decides how they react         (activities.ts onPet)
 *   - the seat / machine they're on can't be used by anyone else   (seatId)
 *
 * Raccoon-only habits at the bottom (`only: ['raccoon']`).
 */
export interface CritterBehaviour {
  id: string;
  weight: number;
  /** Only these kinds of critter do it (e.g. raccoon habits). Everyone if left out. */
  only?: CritterKind[];
  start(critter: Critter): Activity | null;
}

export const CRITTER_BEHAVIOURS: CritterBehaviour[] = [
  {
    id: 'wander', // stroll somewhere nearby in the lounge / hall and sit
    weight: 38,
    start(critter) {
      const here = toTile(critter);
      const near = critter.places.roam.filter((t) => Math.abs(t.tx - here.tx) + Math.abs(t.ty - here.ty) < 12);
      return walking(critter, pick(near.length ? near : critter.places.roam), () => sitting(critter));
    },
  },
  {
    id: 'nap', // a cosy spot on a rug / in the sun
    weight: 12,
    start: (critter) => walking(critter, pick(critter.places.napTiles), () => napping(critter)),
  },
  {
    id: 'perch', // a free office chair, sofa cushion, pantry or meeting table
    weight: 22,
    start(critter) {
      const free = critter.places.perches.filter((p) => !critter.seatBusy(p.seatId ?? p.id));
      if (!free.length) return null;
      const perch = pick(free);
      const from = pick(perch.from);
      return walking(critter, from, () => perching(critter, perch, from) ?? sitting(critter));
    },
  },
  {
    id: 'gym', // jog on a treadmill or stretch on a yoga mat
    weight: 9,
    start(critter) {
      const free = critter.places.gymSpots.filter((s) => !critter.seatBusy(s.id));
      if (!free.length) return null;
      const spot = pick(free);
      const from = pick(approachTiles(critter.grid, spot));
      if (!from) return null;
      return walking(critter, from, () => workingOut(critter, spot, from) ?? sitting(critter));
    },
  },
  {
    id: 'disco', // dance on the Potato Club's dance floor
    weight: 9,
    start: (critter) => (critter.places.danceTiles.length ? walking(critter, pick(critter.places.danceTiles), () => dancing(critter)) : null),
  },
  {
    id: 'chase-roomby', // run after Roomby and hop on if they catch it
    weight: 10,
    start(critter) {
      if (critter.rideCooldown > 0 || critter.roomby.rider) return null;
      return walking(critter, toTile(critter.roomby), () => {
        critter.rideCooldown = 15000 + Math.random() * 10000;
        return (critter.roombyWithin(32) && riding(critter)) || sitting(critter);
      });
    },
  },

  // ---- raccoon habits ----
  {
    id: 'rummage', // trash panda: dig through a bin for treasure
    weight: 14,
    only: ['raccoon'],
    start(critter) {
      const bin = pick(BIN_TILES);
      const beside = bin && besideTile(critter.grid, bin);
      if (!beside) return null;
      return walking(critter, beside, () =>
        fiddling(critter, bin, '*rummage rummage* 🗑️', ['found a snack! 🍕', 'ooh, half a donut 🍩', 'treasure! 🥨', 'a shiny wrapper ✨']),
      );
    },
  },
  {
    id: 'wash-snack', // raccoons wash their food — at the pantry sink
    weight: 8,
    only: ['raccoon'],
    start(critter) {
      const sink = pick(SINK_TILES);
      const beside = sink && besideTile(critter.grid, sink);
      if (!beside) return null;
      return walking(critter, beside, () =>
        fiddling(critter, sink, '🧼 scrub scrub scrub', ['squeaky clean 🍎✨', 'now it\'s ready 🍇', '*washes it again* 🫧']),
      );
    },
  },
];
