/** Render-order layers. Objects in the world use DEPTH.world + their feet y. */
export const DEPTH = {
  background: 0,
  sunbeams: 1,
  marker: 2,
  world: 10, // + y in pixels (max map height 512)
  glow: 2000,
  labels: 2500,
  nameplates: 3000,
} as const;

/** Max camera zoom when zooming in with the wheel. Minimum is "whole office fits". */
export const MAX_ZOOM = 4;

/** Space reserved for the React top bar, so the fitted office isn't hidden under it. */
export const TOP_BAR_PX = 56;

/** Label font sizes in SCREEN pixels (labels are counter-scaled by 1/zoom). */
export const LABEL_PX = { name: 12, plaque: 11, desk: 10, hint: 11 } as const;

/** Tint applied to characters at night so they sit in the darker scene. */
export const NIGHT_TINT = 0xc9c2d8;
