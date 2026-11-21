import type { Theme } from '@little-office/shared';

/**
 * Environment palettes. Both themes share the exact same art code — only these
 * colours change. Light = warm daytime (cream, beige, sage, wood, dusty pastels);
 * dark = cozy evening (navy, charcoal, warm brown, forest green, amber).
 */
export interface EnvPalette {
  outline: string;
  // walls
  wallTop: string;
  wallTopEdge: string;
  wallPaper: string;
  wallPaperAlt: string;
  wainscot: string;
  trim: string;
  // floors
  carpet: string;
  carpetAlt: string;
  wood: string;
  woodAlt: string;
  woodSeam: string;
  kitchen: string;
  kitchenAlt: string;
  gym: string;
  gymAlt: string;
  bath: string;
  bathAlt: string;
  // furniture
  furn: string;
  furnDark: string;
  furnLight: string;
  fabricA: string; // sage
  fabricB: string; // dusty rose
  fabricC: string; // mustard
  metal: string;
  metalDark: string;
  metalLight: string;
  plastic: string;
  screenOff: string;
  screenOn: string;
  paper: string;
  leaf: string;
  leafDark: string;
  leafLight: string;
  pot: string;
  glass: string;
  glassLight: string;
  accents: string[]; // dusty pastels for books, cups, rugs, paintings
  lampLight: string;
  shadow: string; // rgba for soft shadows
  sky: string;
  bg: string;
  /** Private-office carpets: soft, desaturated Y2K / classic-game tones (no greens). */
  officeCarpets: [string, string, string];
  // The Potato Club: purple party room, neon lights, potatoes
  clubFloor: string;
  clubFloorAlt: string;
  clubWall: string;
  clubWallAlt: string;
  neonPink: string;
  neonPurple: string;
  neonAmber: string;
  potato: string;
  potatoDark: string;
  potatoLight: string;
  // city skyline seen through the back window wall
  skyTop: string;
  skyHorizon: string;
  cityFar: string;
  city: string;
  cityWindow: string;
  cityWindowLit: string;
 // page/canvas background outside the map
}

export const PALETTES: Record<Theme, EnvPalette> = {
  // Matched to the team's Figma reference: warm cream floors, thin forest-green
  // walls, tan wood desks with dark-green monitors, sage chairs, lavender soft
  // furnishings, lime highlights and terracotta pots.
  light: {
    outline: '#1f3a2c',
    wallTop: '#21402f',
    wallTopEdge: '#2f5640',
    wallPaper: '#efe7cf',
    wallPaperAlt: '#e9e0c5',
    wainscot: '#cfdcc3',
    trim: '#5e8a6e',
    carpet: '#c9996a',
    carpetAlt: '#bf8f60',
    wood: '#b98a5f',
    woodAlt: '#b28259',
    woodSeam: '#94693f',
    kitchen: '#e0cba4',
    kitchenAlt: '#cfb68b',
    gym: '#8f9a80',
    gymAlt: '#87927a',
    bath: '#eaf0e3',
    bathAlt: '#d7e1cd',
    furn: '#c98f5e',
    furnDark: '#8a5a3a',
    furnLight: '#ddb07f',
    fabricA: '#a99bd6',
    fabricB: '#9d8fd0',
    fabricC: '#c8e07a',
    metal: '#b9c4b2',
    metalDark: '#3d5c4c',
    metalLight: '#e6ecdc',
    plastic: '#eef0e4',
    screenOff: '#2f5a4a',
    screenOn: '#8fd6b4',
    paper: '#fbf8ee',
    leaf: '#5f9a4e',
    leafDark: '#3f7238',
    leafLight: '#8cc36a',
    pot: '#c9784e',
    glass: '#cfe3d6',
    glassLight: '#eef6ee',
    accents: ['#a99bd6', '#c8e07a', '#e0a46a', '#6e9c82', '#d98a7a', '#8fbfd9'],
    lampLight: '#fff0c4',
    shadow: 'rgba(31, 58, 44, 0.14)',
    sky: '#d8ebe4',
    bg: '#b9cbb2',
    officeCarpets: ['#a7a1bd', '#9fb0c4', '#b89aa6'], // dusty lilac, powder blue-grey, muted mauve
    clubFloor: '#3d2754',
    clubFloorAlt: '#36224c',
    clubWall: '#5a3680',
    clubWallAlt: '#523176',
    neonPink: '#ff5fb4',
    neonPurple: '#b779ff',
    neonAmber: '#ffb547',
    potato: '#cf9f5f',
    potatoDark: '#9b7140',
    potatoLight: '#e8c486',
    skyTop: '#6fa4e0',
    skyHorizon: '#cfe4f5',
    cityFar: '#a3b6cc',
    city: '#6e8199',
    cityWindow: '#b9cbdc',
    cityWindowLit: '#fff3c4',
  },
  // The same office after sunset: deep forest greens, warm wood, glowing mint screens.
  dark: {
    outline: '#0c1711',
    wallTop: '#0e1c14',
    wallTopEdge: '#1a3024',
    wallPaper: '#2b3a31',
    wallPaperAlt: '#28362e',
    wainscot: '#22312a',
    trim: '#3f5f4c',
    carpet: '#3b2c22',
    carpetAlt: '#35281f',
    wood: '#33261d',
    woodAlt: '#2f231b',
    woodSeam: '#241a14',
    kitchen: '#3a3026',
    kitchenAlt: '#33291f',
    gym: '#232c25',
    gymAlt: '#202822',
    bath: '#2b3630',
    bathAlt: '#25302a',
    furn: '#7a5638',
    furnDark: '#4f3624',
    furnLight: '#8c6644',
    fabricA: '#655b8e',
    fabricB: '#5e5588',
    fabricC: '#7c9046',
    metal: '#56645a',
    metalDark: '#22362b',
    metalLight: '#6f7e72',
    plastic: '#5a6458',
    screenOff: '#16261e',
    screenOn: '#7fe0b0',
    paper: '#c9c6b4',
    leaf: '#3f6b38',
    leafDark: '#2b4f28',
    leafLight: '#55874a',
    pot: '#8a4f33',
    glass: '#22392f',
    glassLight: '#34523f',
    accents: ['#7e72ad', '#93ab4f', '#b07b4a', '#4f7a63', '#a8665a', '#5f8ea6'],
    lampLight: '#ffd896',
    shadow: 'rgba(0, 8, 4, 0.36)',
    sky: '#13221b',
    bg: '#16221b',
    officeCarpets: ['#5e5a72', '#55627a', '#6d5560'], // the same carpets after dark
    clubFloor: '#2a1a3c',
    clubFloorAlt: '#251735',
    clubWall: '#3b2358',
    clubWallAlt: '#351f50',
    neonPink: '#ff5fb4',
    neonPurple: '#b779ff',
    neonAmber: '#ffb547',
    potato: '#b88a50',
    potatoDark: '#86603a',
    potatoLight: '#d4ad72',
    skyTop: '#0a0f2e',
    skyHorizon: '#2c2a5e',
    cityFar: '#1d2449',
    city: '#121833',
    cityWindow: '#1f2850',
    cityWindowLit: '#ffd36e',
  },
};
