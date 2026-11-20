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
 // page/canvas background outside the map
}

export const PALETTES: Record<Theme, EnvPalette> = {
  // Bright, airy tech campus: white walls, polished concrete, light oak,
  // and bold primary accents (blue / coral / yellow / green / purple / teal).
  light: {
    outline: '#2b3038',
    wallTop: '#59626d',
    wallTopEdge: '#77818c',
    wallPaper: '#f5f7f9',
    wallPaperAlt: '#eef1f4',
    wainscot: '#e2e7ec',
    trim: '#8f99a4',
    carpet: '#dcdfe3',
    carpetAlt: '#d5d9de',
    wood: '#e6cfaa',
    woodAlt: '#dfc79f',
    woodSeam: '#c9ac84',
    kitchen: '#fafaf8',
    kitchenAlt: '#e8ebee',
    gym: '#434b54',
    gymAlt: '#3d454e',
    bath: '#eef3f6',
    bathAlt: '#d6e0e6',
    furn: '#d9c6a6',
    furnDark: '#596169',
    furnLight: '#f4f1ea',
    fabricA: '#5b8def',
    fabricB: '#e8655a',
    fabricC: '#f4c04e',
    metal: '#c9ced4',
    metalDark: '#7d858f',
    metalLight: '#eef1f4',
    plastic: '#f2f4f6',
    screenOff: '#2f3742',
    screenOn: '#8fd0ff',
    paper: '#ffffff',
    leaf: '#4fa35c',
    leafDark: '#357a42',
    leafLight: '#7cc57a',
    pot: '#eceff2',
    glass: '#c4e5f7',
    glassLight: '#eaf7fd',
    accents: ['#e8655a', '#5b8def', '#f4c04e', '#43b06b', '#9a7cf0', '#2fb8b6'],
    lampLight: '#fff3cf',
    shadow: 'rgba(30, 40, 52, 0.13)',
    sky: '#d3ebfb',
    bg: '#e9edf1',
  },
  // Evening at the campus: deep navy/charcoal, glowing screens, neon accents.
  dark: {
    outline: '#0b0d12',
    wallTop: '#10131a',
    wallTopEdge: '#1b202a',
    wallPaper: '#262d39',
    wallPaperAlt: '#222834',
    wainscot: '#1d222c',
    trim: '#3b4453',
    carpet: '#2a3039',
    carpetAlt: '#272d35',
    wood: '#4b3f35',
    woodAlt: '#463b32',
    woodSeam: '#3a3029',
    kitchen: '#363b44',
    kitchenAlt: '#30353d',
    gym: '#22272e',
    gymAlt: '#1f242a',
    bath: '#323a45',
    bathAlt: '#2a313b',
    furn: '#5c4c3c',
    furnDark: '#3a414b',
    furnLight: '#4a515c',
    fabricA: '#3f69b8',
    fabricB: '#b34d46',
    fabricC: '#c49a3c',
    metal: '#5f6773',
    metalDark: '#414853',
    metalLight: '#7b8490',
    plastic: '#6b7380',
    screenOff: '#151a22',
    screenOn: '#5fb4ff',
    paper: '#c9ced6',
    leaf: '#357a48',
    leafDark: '#255a35',
    leafLight: '#4c9a5c',
    pot: '#5a626d',
    glass: '#22344d',
    glassLight: '#34507a',
    accents: ['#e46a5f', '#5d95f2', '#e9bd4d', '#47b871', '#9d82f2', '#35c2c0'],
    lampLight: '#ffd9a0',
    shadow: 'rgba(0, 0, 8, 0.34)',
    sky: '#14203a',
    bg: '#0f1218',
  },
};
