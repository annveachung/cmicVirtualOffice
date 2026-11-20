import type { Direction } from '../types.js';

/**
 * Where a piece of furniture is drawn:
 *  - floor:  painted into the static background (rugs)
 *  - wall:   painted onto wall faces in the static background (windows, whiteboards)
 *  - object: a separate sprite, depth-sorted against characters by its bottom edge
 *  - ceiling: hangs above everyone (disco ball), drawn over characters
 */
export type FurnitureLayer = 'floor' | 'wall' | 'object' | 'ceiling';

export interface FurnitureDef {
  /** Footprint in tiles (can be overridden per placement for resizable things like rugs). */
  w: number;
  h: number;
  /** Does the footprint block walking? */
  blocks: boolean;
  layer: FurnitureLayer;
  /** Extra sprite height (px) drawn above the footprint, e.g. a fridge is taller than one tile. */
  overhang?: number;
  /** Sits on top of another object (e.g. coffee machine on the counter) — drawn just above it. */
  onTop?: boolean;
}

export const FURNITURE = {
  // workstations
  desk: { w: 3, h: 2, blocks: true, layer: 'object', overhang: 8 },
  deskChair: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 10 },
  // meeting
  meetingTable: { w: 7, h: 3, blocks: true, layer: 'object', overhang: 4 },
  chair: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 6 },
  whiteboard: { w: 3, h: 2, blocks: false, layer: 'wall' },
  screen: { w: 3, h: 2, blocks: false, layer: 'wall' },
  // lounge
  sofa: { w: 4, h: 1, blocks: true, layer: 'object', overhang: 8 },
  armchair: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 8 },
  coffeeTable: { w: 2, h: 1, blocks: true, layer: 'object' },
  bookshelf: { w: 2, h: 1, blocks: true, layer: 'object', overhang: 20 },
  floorLamp: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 18 },
  rug: { w: 4, h: 3, blocks: false, layer: 'floor' },
  // coffee corner
  counter: { w: 4, h: 1, blocks: true, layer: 'object', overhang: 4 },
  coffeeMachine: { w: 1, h: 1, blocks: true, layer: 'object', onTop: true, overhang: 10 },
  sink: { w: 1, h: 1, blocks: true, layer: 'object', onTop: true, overhang: 4 },
  microwave: { w: 1, h: 1, blocks: true, layer: 'object', onTop: true, overhang: 6 },
  cups: { w: 1, h: 1, blocks: true, layer: 'object', onTop: true, overhang: 4 },
  fridge: { w: 2, h: 1, blocks: true, layer: 'object', overhang: 22 },
  roundTable: { w: 2, h: 2, blocks: true, layer: 'object' },
  upperCabinet: { w: 4, h: 2, blocks: false, layer: 'wall' },
  // shared / misc
  plant: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 14 },
  plantSmall: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 4 },
  bin: { w: 1, h: 1, blocks: true, layer: 'object' },
  waterCooler: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 14 },
  printer: { w: 2, h: 1, blocks: true, layer: 'object', overhang: 6 },
  window: { w: 2, h: 2, blocks: false, layer: 'wall' },
  clock: { w: 1, h: 1, blocks: false, layer: 'wall' },
  painting: { w: 1, h: 1, blocks: false, layer: 'wall' },
  noticeBoard: { w: 2, h: 1, blocks: false, layer: 'wall' },
  // presentation
  stage: { w: 12, h: 3, blocks: false, layer: 'floor' },
  podium: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 8 },
  // pantry
  diningTable: { w: 6, h: 2, blocks: true, layer: 'object', overhang: 4 },
  // gym
  treadmill: { w: 1, h: 2, blocks: true, layer: 'object', overhang: 10 },
  exerciseBike: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 8 },
  weightRack: { w: 3, h: 1, blocks: true, layer: 'object', overhang: 10 },
  weightBench: { w: 1, h: 2, blocks: true, layer: 'object', overhang: 2 },
  yogaMat: { w: 1, h: 2, blocks: false, layer: 'floor' },
  punchingBag: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 18 },
  mirror: { w: 2, h: 1, blocks: false, layer: 'wall' },
  projectorScreen: { w: 4, h: 1, blocks: true, layer: 'object', overhang: 18 },
  // washrooms
  vanity: { w: 7, h: 1, blocks: true, layer: 'object', overhang: 4 },
  mirrorLong: { w: 7, h: 1, blocks: false, layer: 'wall' },
  toilet: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 14 },
  urinal: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 10 },
  washroomDoor: { w: 1, h: 1, blocks: false, layer: 'object', overhang: 8 }, // open doorway you walk through
  // The Potato Club
  speaker: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 12 },
  micStand: { w: 1, h: 1, blocks: false, layer: 'object', overhang: 8 },
  potatoMascot: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 22 },
  potatoPlush: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 2 },
  potatoVending: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 18 },
  costumeRack: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 14 },
  danceFloor: { w: 4, h: 3, blocks: false, layer: 'floor' },
  discoBall: { w: 2, h: 2, blocks: false, layer: 'ceiling' },
  clubSign: { w: 4, h: 1, blocks: false, layer: 'wall' },
  potatoPoster: { w: 1, h: 1, blocks: false, layer: 'wall' },
  // lounge + pantry extras
  boothBench: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 10 }, // one seat; variant 0 = back piece, 1 = front piece
  boothTable: { w: 2, h: 2, blocks: true, layer: 'object', overhang: 2 },
  beverageCounter: { w: 1, h: 3, blocks: true, layer: 'object', overhang: 4 },
  buffetCounter: { w: 1, h: 3, blocks: true, layer: 'object', overhang: 4 },
  // entrance
  entrance: { w: 3, h: 1, blocks: false, layer: 'wall' },
  doormat: { w: 3, h: 2, blocks: false, layer: 'floor' },
  // recreation
  arcade: { w: 1, h: 1, blocks: true, layer: 'object', overhang: 18 },
  pingPong: { w: 4, h: 2, blocks: true, layer: 'object', overhang: 2 },
  beanBag: { w: 1, h: 1, blocks: true, layer: 'object' },
} satisfies Record<string, FurnitureDef>;

export type FurnitureType = keyof typeof FURNITURE;

/** One piece of furniture placed on the map (top-left tile of its footprint). */
export interface Placement {
  id: string;
  type: FurnitureType;
  tx: number;
  ty: number;
  /** Size override (rugs, counters). */
  w?: number;
  h?: number;
  /** Which way a seat faces. */
  dir?: Direction;
  /** Cosmetic variant (plant species, painting, rug colour...). */
  variant?: number;
}

export function footprint(p: Placement): { w: number; h: number } {
  const def: FurnitureDef = FURNITURE[p.type];
  return { w: p.w ?? def.w, h: p.h ?? def.h };
}
