# Milestone 1: what's worth learning

## 1. Monorepo with npm workspaces
`package.json` → `"workspaces": ["shared", "client"]`. npm links `@little-office/shared` into
`node_modules`, so the client imports it like any package. **Why:** the server (Milestone 2)
will import the *same* map + collision code to validate movement. One source of truth means the
client and server can never disagree about where a wall is.

## 2. React for UI, Phaser for the world, an event bus between them
React is great at forms and menus but re-renders often; a game loop runs 60×/sec and must not be
interrupted. So:
- `GameCanvas.tsx` mounts Phaser **once** and never re-creates it.
- Prop changes (e.g. theme) are sent as events on `bus.ts`, and Phaser emits events back the same way.
This is the "two systems, one narrow contract" pattern. Neither side imports the other's internals.

## 3. Data vs rendering separation
`shared/src/map/office.ts` is pure data: tiles + furniture placements. It knows nothing about
pixels or colours. `OfficeRenderer.ts` turns that data into sprites. To move a sofa you edit one
line of data; the art, collision and pathfinding all follow automatically.

## 4. Tile-based collision
The map is a grid of 16×16 tiles; `buildCollisionGrid()` marks walls and furniture as blocked in a
`Uint8Array`. A character has a small **feet hitbox** (10×6 px). To check a move we test the four
corners of the hitbox against the grid. Moves are resolved **one axis at a time**, which is why you
slide along walls instead of sticking to them.

## 5. A* pathfinding (click-to-move)
A* explores tiles in order of `f = g + h`:
- `g` = cost so far (1 straight, √2 diagonal)
- `h` = heuristic estimate to the goal (octile distance, exact on an empty 8-way grid)
A min-heap picks the lowest `f` quickly. Diagonals are refused when they'd clip a corner. The raw
path zig-zags tile to tile, so `smoothPath()` does "string pulling": skip every waypoint you
already have a clear straight line past.

## 6. Y-sorting (depth)
In top-down 3/4 view, whatever is lower on screen is closer to the camera. Every object's depth
equals its bottom-edge y, so you walk *behind* a desk from above and *in front* of it from below.
Chairs facing the camera sort by their top edge so a seated person sits in front of the backrest.

## 7. Procedural pixel art + palette-swap theming
No PNGs. Characters are ASCII templates (`'O'` = outline, `'H'` = hair…) drawn onto a canvas with a
colour map. Hair colour and outfits are just different colour maps, and facing right is facing left
mirrored. Furniture is painted with tiny helpers (`box`, `ellipse`) using **only palette colours**,
so day/night is the same drawing code run with a second palette. Both versions are generated at
startup, and switching theme only swaps texture keys, so nobody moves.
Static things (floors, walls, rugs, wall art) are baked into **one** big image, which is much cheaper
than thousands of tile sprites.

## 8. Crisp pixels
`pixelArt: true` makes Phaser use nearest-neighbour scaling. `roundPixels` stops sub-pixel shimmer.
In CSS, `image-rendering: pixelated` does the same for the character preview `<canvas>`.

## 9. Frame-rate-independent movement
Speed is in pixels per *second*; each frame moves `speed × dt`. `dt` is clamped to 50 ms so a
lagging/background tab can't make you jump through a wall.

## 10. Design tokens
All UI colours are CSS variables under `:root[data-theme=…]`. Components never mention a theme;
flipping one attribute on `<html>` re-skins everything.

## 11. Tests that protect the map
`map.test.ts` flood-fills from the spawn point and fails if any floor tile is unreachable, if
furniture overlaps, or if a desk can't be reached. If you edit the layout, run `npm test`.

## 12. Why the layout change was cheap (data-driven design)
Redesigning the office (private offices, desk groups, gym, stage) touched only:
- `office.ts`: new coordinates (data)
- `furniture.ts`: a registry entry per new object type (size, blocks?, layer)
- `furnitureArt.ts`: one painter per new type
Collision, pathfinding, depth sorting, night lighting and theme swapping all picked it up
automatically, because they read the data rather than hard-coding positions. The map tests
caught nothing because nothing was wrong, which is the point: if a sofa had blocked an office
door, `npm test` would have failed with the exact tile.

**Desks are now records** (`DeskDef`: id, label, zone, facing). A stable `id` is what the
database will store in Milestone 3. The `label` ("Buddy pair · left") is for humans. Keeping the
two separate means you can rename a desk without breaking anyone's assignment.

## 13. Fit-to-screen camera + screen-sized labels
`fitZoom = min(screenW / worldW, (screenH − topBar) / worldH)` is the largest zoom at which the
whole office is visible. The zoom is usually fractional (e.g. 1.27×). The pixel art still scales
with nearest-neighbour, and name tags are counter-scaled by `1 / zoom`, so they stay 12px on screen
however far you zoom out. That's a common game trick: **world-space** objects (sprites) vs
**screen-space** objects (UI text).

## 14. Sitting is a tiny state machine
`standing → walking → seated → standing`. A seat tile is *blocked* for walking. You walk to a free
tile next to it, then "snap" onto the seat and remember where you came from, so standing up puts you
back on valid floor. Seats are derived from furniture data (`seats.ts`), so every chair you add is
sittable automatically. The server will validate "are you next to that seat?" with the same
`isNextToSeat()` in Milestone 2.

## 15. One abstraction for "things you can use"
Sitting, running on a treadmill, punching a bag and playing an arcade game all turned out to be
the same thing: **a position + a facing direction + an animation**, reached by walking next to it.
So `seats.ts` became `spots.ts`, with an `action` field ('sit', 'run', 'pedal', 'lift'…). The
controller doesn't know what a treadmill is; it just "uses a spot". Adding a rowing machine later
= one painter + one `case` in `spotsFor()` + an animation. Spotting when two features are really
one is one of the most valuable refactoring skills.

## 16. Animations as data
Character frames are described as data (`FRAMES`: which arms, which legs, head bob, dumbbells?),
and animations are lists of frame names with a speed (`ANIMS`). Running is literally the walk
frames at 14 fps instead of 8. New moves come from recombining parts rather than redrawing.

## 17. Tests catch layout bugs humans miss
Compacting the map, the reachability tests failed three times: a café chair sealing off one tile,
a corner table cutting off the coffee machine, and two chairs boxed in between a counter and a
table. All are invisible in a screenshot until someone gets stuck. Cheap automated checks over
your *data* pay off fast.

## 18. Filling any screen shape
The office has one aspect ratio and monitors have many. Instead of cropping (hiding colleagues) or
black bars, the camera fits the building and the leftover space shows a repeating garden texture
(`TileSprite`) that extends far beyond the map. It's like a letterbox, but it looks like it belongs there.

## 19. "Contain" vs "cover"
Two ways to put a fixed-shape picture into a window of a different shape (the same words as CSS
`object-fit`):
- **contain** = `min(screenW/worldW, screenH/worldH)`: everything visible, but empty bars on one axis.
- **cover** = `max(...)`: no bars, but a little gets cropped on one axis.
We now use *cover*, and made the map's shape (59×31 ≈ 1.9:1) match a typical desktop browser
window, so the crop is usually zero or a few pixels. When it isn't, the camera follows you within the
map's bounds, so nothing is ever unreachable. Matching the content's shape to the screen did more
than any camera setting could.

## 20. Restyling without touching behaviour
Turning every office chair into a gaming chair changed **one painter function** (`deskChair` in
`furnitureArt.ts`) and switched the meeting room's chairs to that type in the map data. Sitting,
depth sorting and seat positions didn't change at all, because they depend on the furniture's
*type and direction*, not on how it looks. That's the payoff of separating "what it is" (data)
from "how it's drawn" (painters): visual redesigns are cheap and can't break gameplay.

## 21. Build the reusable piece, not the one-off
"Show '...' when presenting" could have been a hard-coded text above one character. Instead it's a
`SpeechBubble` component (`characters/SpeechBubble.ts`) with `say(text)`, `typing()` and `hide()`.
Presenting uses `typing()` today; Milestone 4's chat bubbles will use `say()` with no new drawing
code. When a small feature is obviously the first case of a bigger one, give it the general shape.
