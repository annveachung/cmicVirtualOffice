import { CRITTER_ART, type CritterKind } from '../../assets/npcArt';

/**
 * Everything that differs between kinds of critter: their art, how fast they
 * trot, and what they say. Behaviour is the same for all (see behaviours.ts).
 */
export interface Species {
  kind: CritterKind;
  texture: string;
  walkAnim: string;
  speed: number;
  lines: {
    pet: string[];
    wake: string;
    hopOn: string[];
    run: string[];
    stretch: string[];
    dance: string[];
  };
}

export const SPECIES: Record<CritterKind, Species> = {
  cat: {
    kind: 'cat',
    ...CRITTER_ART.cat,
    speed: 38,
    lines: {
      pet: ['Meow! 💕', 'Purrrr… 💕', 'Mrow! 🐟'],
      wake: '…mrrp? 💕',
      hopOn: ['mrrp! 🐾', 'Wheee! 🐱', '*hops on* 🐾'],
      run: ['💪 mrrow!', '🏃 nyoom', 'cardio 🐾'],
      stretch: ['🧘 mrrrr…', 'big stretch 🐾', 'namaste 🐱'],
      dance: ['♪ ♫', '🪩 mrow~', '♫ meow meow ♪'],
    },
  },
  raccoon: {
    kind: 'raccoon',
    ...CRITTER_ART.raccoon,
    speed: 34,
    lines: {
      pet: ['chitter chitter! 💕', '*happy trash-panda noises* 🦝', 'hehe, snack? 🍪'],
      wake: '…chrr? 🦝',
      hopOn: ['yeehaw! 🦝', '*climbs aboard* 🐾', 'free ride! 🦝'],
      run: ['🏃 scurry scurry', '💪 chrrr!', 'gains 🦝'],
      stretch: ['🧘 chrrrr…', 'big raccoon stretch 🐾', 'zen panda 🦝'],
      dance: ['♪ chitter ♫', '🪩 🦝', '♫ trash party ♪'],
    },
  },
};

/** Who lives in the office. */
export const CRITTERS: { name: string; kind: CritterKind }[] = [
  { name: 'Mochi', kind: 'cat' },
  { name: 'Bandit', kind: 'raccoon' },
  { name: 'Ziggy', kind: 'raccoon' },
  { name: 'Pudding', kind: 'raccoon' },
];
