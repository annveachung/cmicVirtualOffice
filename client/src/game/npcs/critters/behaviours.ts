import { approachTiles, toTile } from '@little-office/shared';
import { pick } from '../common';
import { dancing, napping, perching, riding, sitting, walking, workingOut, type Activity } from './activities';
import type { Cat } from './Cat';

/**
 * MOCHI'S MENU — everything she might decide to do when she's free.
 * `weight` = how often she picks it, relative to the others. `start` returns the
 * first activity (usually "walk there, then …"), or null when it isn't possible
 * right now (e.g. every seat is taken), in which case she picks something else.
 *
 * Things that just *happen* (not on the menu):
 *   - Roomby rolls past while she's sitting → she often hops on   (Cat.update)
 *   - you pet her → each activity decides how she reacts          (activities.ts onPet)
 *   - the seat / machine she's on can't be used by anyone else    (seatId)
 */
export interface CatBehaviour {
  id: string;
  weight: number;
  start(cat: Cat): Activity | null;
}

export const CAT_BEHAVIOURS: CatBehaviour[] = [
  {
    id: 'wander', // stroll somewhere nearby in the lounge / hall and sit
    weight: 38,
    start(cat) {
      const here = toTile(cat);
      const near = cat.places.roam.filter((t) => Math.abs(t.tx - here.tx) + Math.abs(t.ty - here.ty) < 12);
      return walking(cat, pick(near.length ? near : cat.places.roam), () => sitting(cat));
    },
  },
  {
    id: 'nap', // a cosy spot on a rug / in the sun
    weight: 12,
    start: (cat) => walking(cat, pick(cat.places.napTiles), () => napping(cat)),
  },
  {
    id: 'perch', // a free office chair, sofa cushion, pantry or meeting table
    weight: 22,
    start(cat) {
      const free = cat.places.perches.filter((p) => !p.seatId || !cat.seatBusy(p.seatId));
      if (!free.length) return null;
      const perch = pick(free);
      const from = pick(perch.from);
      return walking(cat, from, () => perching(cat, perch, from) ?? sitting(cat));
    },
  },
  {
    id: 'gym', // jog on a treadmill or stretch on a yoga mat
    weight: 9,
    start(cat) {
      const free = cat.places.gymSpots.filter((s) => !cat.seatBusy(s.id));
      if (!free.length) return null;
      const spot = pick(free);
      const from = pick(approachTiles(cat.grid, spot));
      if (!from) return null;
      return walking(cat, from, () => workingOut(cat, spot, from) ?? sitting(cat));
    },
  },
  {
    id: 'disco', // dance on the Potato Club's dance floor
    weight: 9,
    start: (cat) => (cat.places.danceTiles.length ? walking(cat, pick(cat.places.danceTiles), () => dancing(cat)) : null),
  },
  {
    id: 'chase-roomby', // run after Roomby and hop on if she catches it
    weight: 10,
    start(cat) {
      if (cat.rideCooldown > 0 || cat.roomby.rider) return null;
      return walking(cat, toTile(cat.roomby), () => {
        cat.rideCooldown = 15000 + Math.random() * 10000;
        return (cat.roombyWithin(32) && riding(cat)) || sitting(cat);
      });
    },
  },
];
