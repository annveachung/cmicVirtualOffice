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

## 22. A re-theme is mostly a palette swap
Turning the cozy cottage office into a bright tech campus was mainly **one file**: `palette.ts`
(plus the CSS tokens for the UI). Every painter draws with named colours like `pal.furnLight` or
`pal.carpet`, never with literal hex codes, so changing the palette re-skins hundreds of objects at
once. The few real code changes were *new things*: glass walls (a new tile kind `'G'` that blocks
like a wall but paints see-through), dual monitors, the neon sign, the dashboard and the snack wall.
A test also guards privacy: no glass is allowed next to washroom tiles.

## 24. Undoing a direction cleanly with `git revert`
The "tech look" was merged to `main`, then rejected. Instead of hand-editing it back, each of its
commits was undone with `git revert <sha>`. That creates a *new* commit that applies the exact
opposite change, so history stays honest ("we tried this, then undid it") and features merged since
(presenting) are untouched. This is why small, single-purpose commits matter: you can revert just the
visual ones and keep the rest. Then the Figma colours were applied on top as one palette change.

## 25. Procedural skylines with a seeded "random"
The city behind the window wall isn't an image. It's generated from a tiny pseudo-random function
(`rand(n) = fract(sin(n·12.9898+78.233)·43758.5453)`, a classic shader trick). Feed it the same
number and you always get the same answer, so the skyline is random-looking but **identical every
time and for every player**, which matters once everyone shares one office. Two layers of buildings
(far and near), stepped sky gradient bands, a grid of windows where ~40% are lit, and a few stars. At
night the same code runs with the dark palette: navy sky, warm lit windows.

## 26. Sound with zero audio files (Web Audio API)
Both the click blip and the background music are **synthesised** in `audio/sound.ts`:
an `OscillatorNode` makes a raw wave (square = classic 8-bit lead, triangle = soft bass), a
`GainNode` shapes its volume (quick attack, soft release), and a low-pass `BiquadFilterNode`
rounds off the harsh edges so it sounds "comfy". The tune itself is just data (`song.ts`): MIDI
note numbers per eighth-note, converted with `hz = 440 · 2^((note − 69)/12)`.
Two browser rules shaped the design:
- **Autoplay policy:** audio can only start after a user gesture, so the `AudioContext` is created
  lazily on the first click ("Enter the office" counts).
- **Timing:** JavaScript timers are jittery, so a *look-ahead scheduler* wakes every 25ms and books
  notes ~120ms ahead on the audio clock, which is sample-accurate. That's the standard Web Audio
  pattern for steady rhythm.
The music is an original composition: real game music (e.g. Nintendo's) is copyrighted.

## 27. Custom cursors from code
The pixel cursors are ASCII templates drawn onto a `<canvas>`, turned into a PNG with
`canvas.toDataURL()`, and handed to CSS (`cursor: url(data:...) x y, auto`). The `x y` numbers are
the **hotspot**, the exact pixel that "clicks" (the arrow's tip, the hand's fingertip).

## 28. Building a feature room as its own module
The Potato Club touches nearly every layer, but each layer only got a small, focused addition:
- **shared**: the room's tiles, furniture and spots (`sing`, `dance`, plus *instant* actions
  `costume`/`vend`/`mascot` that fire once instead of putting you in a pose)
- **art**: painters for each new object, a 3×5 pixel font for the neon sign, a potato-suit overlay
- **animation data**: four dance styles, where "spin" reuses one frame across all four directions
- **`club/PotatoClub.ts`**: all the club *behaviour* in one class (songs, messages, snacks,
  mascot, achievements); the scene just forwards events to it
- **React**: a `ClubPanel` that only appears in the club (`zone:changed` on the bus) and achievement toasts
Keeping the behaviour in one module means the scene stays readable, and in Milestone 2 there's one
obvious place to add "broadcast this to everyone".

**Instant vs ongoing actions** is a useful distinction in any interaction system: sitting, singing
and dancing are *states* you're in until you leave; putting on a costume or getting a snack are
*events* that happen once.

## 29. Screen-space vs world-space labels, revisited
Earlier, *all* labels were screen-sized (scaled by `1/zoom`), so they stay readable. That's right for
things attached to **people** (name tags, speech bubbles, hints) but wrong for things attached to the
**building**: room tags then seem to shrink as the room grows when you zoom in. Now room tags use a
*fixed* world scale (`1/coverZoom`), readable at 100% and growing with the room like any furniture.

## 30. Map-app camera controls
`camera/CameraRig.ts` copies what people already know from map apps:
- **Drag to pan:** a press only counts as a click if the pointer moves less than 6px, so you can tap
  to walk *and* drag to look around with the same button.
- **Zoom towards the cursor:** remember the world point under the mouse, change zoom, then shift the
  scroll so that point is still under the mouse.
- **Smooth zoom:** `zoom *= e^(−delta·k)` works for both chunky mouse wheels and fine trackpad pinches.
- **Follow modes:** looking around pauses following; walking resumes it; "Find me" snaps back.

## 31. A crash you can't see, and a test that can
"Opening the office…" never going away meant the game threw an error while *building* the scene,
which showed only in the browser console. The cause: `colors[(x * 7 + y * 3) % 6]` where `x` wasn't a
whole number, so the array lookup returned `undefined`, and turning `undefined` into a shade crashed.
TypeScript can't catch this (`colors[i]` is typed as a colour even when `i` is 1.5).
The fix was one `Math.floor`. The lasting fix is `art.smoke.test.ts`: it runs **every painter for
every placement in both themes** against a fake canvas that refuses bad colours, so this whole class
of bug now fails `npm test` in under a second instead of freezing the game.

## 32. NPCs as tiny state machines
Each NPC (`game/npcs/NpcManager.ts`) is a few states and a timer:
- **Mochi the cat:** `idle → walk (to a random nearby tile, or a nap spot) → sit | nap → idle…`
- **Roomby the vacuum:** walks a fixed loop of waypoints, pathfinding between them.
- **Coach Rio:** wanders gym tiles and, on a timer, cheers if *your* pose is a workout pose.
- **Pip:** stands still, greets once, cycles tips on request.
They reuse what already exists: A* + path smoothing for movement, the `Character` class for
the two people, `SpeechBubble` for talking. Their homes and routes live in **shared** map data,
because in multiplayer the *server* should run NPCs. Otherwise every player would see a
different cat in a different place.

## 33. Riding Roomby: one thing following another
Riding has no physics. Each frame, the rider's position is **copied** from the vehicle (`roomby.seat()`).
- **You:** while `riding` is true, the scene skips the movement controller entirely and only watches
  for "get off" input (an arrow key, E or a click).
- **Mochi:** riding is just another state in her state machine (`idle → walk → sit | nap | ride`).
- **One rider at a time:** Roomby keeps a `rider` field, a tiny **lock**. `board()` fails if someone
  else holds it, and `alight()` releases it.

## 34. Organising behaviour: a menu + building blocks
Mochi's code lives in `game/npcs/cat/` and is split into three layers:
- **`Cat.ts` (the body):** her sprite, speech bubble and legs, plus a loop that runs **one activity
  at a time**.
- **`activities.ts` (the building blocks):** walk, sit, nap, perch, ride, work out, dance. Each one
  is a small object with `update()` returning `'continue'`, `'done'` or the next activity. Examples:
  - walking returns "perch" when she arrives;
  - perching returns "sit" after hopping down.
- **`behaviours.ts` (the menu):** what she might choose, with **weights** for a weighted random pick.
  For example, `{ id: 'disco', weight: 9, start: walk to the dance floor, then dance }`.

Adding a trick means writing (maybe) one activity and adding one line to the menu.
This pattern is common in games: designers tune the menu, and programmers write the building blocks.

## 35. Data-driven NPCs: one class, many animals
Adding three raccoons didn't copy the cat code. Mochi's code became a generic **`Critter`**, and
everything that differs between animals is **data** in `critters/species.ts`:
- the art (sprite texture and walk animation);
- the speed;
- what they say.

`CRITTERS` lists who lives in the office. Adding a fourth raccoon is one line; adding a new
animal means drawing it plus adding one species entry. This is "data-driven design":
- behaviour lives in code, written once;
- variety lives in data, which is easy to change.

**Shared resources:** with several critters, a seat needs one owner. Each critter asks
`seatBusy(id)`, which says yes if you **or any other critter** holds that seat or table spot.

## 36. Doors: changing the world at runtime
The map is static data, but a door changes while the game runs. When a door closes, the client
**marks its doorway tiles as blocked** in the collision grid; opening it un-blocks them.
Everything that reads the grid then respects the door automatically:
- your movement;
- click-to-walk pathfinding;
- NPC routes.

There's no `if (door)` scattered around the codebase. The door's rules form a tiny state machine:
- closed → knock from the hall → open a moment later;
- closed → walk up to it from inside → open (leaving never needs a knock);
- open → nobody nearby for 2.5s → closed.
