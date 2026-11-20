/**
 * Central game configuration shared by client and (later) server.
 * Anything that both sides must agree on — tile size, speeds, hitbox —
 * lives here so the server can validate movement with the exact same rules.
 */
export const TILE = 16; // pixels per tile (art is authored at 1x)

/** Walking speed in world pixels per second (~4.5 tiles/s). */
export const WALK_SPEED = 72;

/**
 * Collision box around a character's feet. Position (x, y) of a character
 * is the point between their feet; the box is centred on it.
 */
export const FEET_HITBOX = { w: 10, h: 6 } as const;
