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
  light: {
    outline: '#4a362d',
    wallTop: '#8a7262',
    wallTopEdge: '#a48b78',
    wallPaper: '#f1e6cf',
    wallPaperAlt: '#e9dcc2',
    wainscot: '#d9c4a2',
    trim: '#a9805f',
    carpet: '#a7b598',
    carpetAlt: '#9fae90',
    wood: '#caa47c',
    woodAlt: '#c39b72',
    woodSeam: '#a9825f',
    kitchen: '#efe5d3',
    kitchenAlt: '#ddd0b8',
    gym: '#a3adab',
    gymAlt: '#9aa4a2',
    bath: '#e8eff0',
    bathAlt: '#cddcdf',
    furn: '#a8774f',
    furnDark: '#7e5438',
    furnLight: '#c4946a',
    fabricA: '#8ea98a',
    fabricB: '#cf968c',
    fabricC: '#d8b46e',
    metal: '#cfcbc3',
    metalDark: '#9d988e',
    metalLight: '#ebe8e2',
    plastic: '#e8e2d6',
    screenOff: '#465365',
    screenOn: '#9fd0dc',
    paper: '#fbf7ee',
    leaf: '#6f9a5c',
    leafDark: '#4f7544',
    leafLight: '#93ba78',
    pot: '#c27a5a',
    glass: '#b9dbe8',
    glassLight: '#e4f3f7',
    accents: ['#cf968c', '#8eaecb', '#d8b46e', '#ad9cc7', '#8ea98a', '#e5b7a0'],
    lampLight: '#ffe7b0',
    shadow: 'rgba(74, 54, 45, 0.16)',
    sky: '#cfe6ef',
    bg: '#e8dcc4',
  },
  dark: {
    outline: '#16141c',
    wallTop: '#1f2230',
    wallTopEdge: '#2d3143',
    wallPaper: '#3a3f55',
    wallPaperAlt: '#353a4f',
    wainscot: '#4a3a33',
    trim: '#5c4433',
    carpet: '#3d4c45',
    carpetAlt: '#38463f',
    wood: '#5b4436',
    woodAlt: '#544033',
    woodSeam: '#45352b',
    kitchen: '#45434d',
    kitchenAlt: '#3b3a43',
    gym: '#353c41',
    gymAlt: '#31373c',
    bath: '#3b4652',
    bathAlt: '#323c47',
    furn: '#6a4a36',
    furnDark: '#4a3326',
    furnLight: '#835e45',
    fabricA: '#4f6a55',
    fabricB: '#7a4e4c',
    fabricC: '#8a6d3e',
    metal: '#6d6f78',
    metalDark: '#4d4f58',
    metalLight: '#8a8c95',
    plastic: '#7d7a80',
    screenOff: '#1f2633',
    screenOn: '#ffcf7a',
    paper: '#bdb6a6',
    leaf: '#46664a',
    leafDark: '#33503a',
    leafLight: '#5c7f5c',
    pot: '#7b4a3a',
    glass: '#1f2b4a',
    glassLight: '#34446a',
    accents: ['#8a5550', '#4f6a85', '#94773f', '#6a5c85', '#4f6a55', '#8c6a58'],
    lampLight: '#ffc46b',
    shadow: 'rgba(5, 5, 12, 0.32)',
    sky: '#1b2440',
    bg: '#14151d',
  },
};
