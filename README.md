# The Little Office

A cozy, private, browser-based pixel-art virtual office for a small remote team (<15 people).
For fun and informal bonding, not productivity monitoring.

## Status

| Milestone | Status |
| --- | --- |
| 1. Visual prototype (single-player) | ✅ built, awaiting review |
| 2. Multiplayer foundation (Socket.IO) | ⏳ |
| 3. Accounts (username + PIN + invite code), persistence | ⏳ |
| 4. Social: status, speech bubbles, emotes | ⏳ |
| 5. Environmental interactions (sit, coffee, arcade) | ⏳ |
| 6. Testing & deployment | ⏳ |

## Running locally

Requires Node 20+.

```bash
npm install
npm run dev        # client at http://localhost:5173
npm test           # shared logic tests (map integrity, collision, A*)
npm run typecheck
npm run build
```

If `localhost` doesn't resolve in your browser, try `npm run dev -- --host 127.0.0.1`.

## Repository layout

```text
shared/            # code BOTH client and (future) server use
  src/config.ts    # tile size, walk speed, hitbox
  src/appearance.ts# character customisation options
  src/map/         # office layout data, collision grid, A* pathfinding (+ tests)
client/            # React + Vite + Phaser 3
  src/pages/       # LoginPage, OfficePage
  src/components/  # TopBar, ThemeToggle, CharacterCreator, PixelIcon…
  src/hooks/       # useTheme
  src/styles/      # global.css (theme tokens + pixel UI kit)
  src/game/
    GameCanvas.tsx # the only React component that touches Phaser
    bus.ts         # typed React <-> Phaser event bus
    scenes/        # OfficeScene
    maps/          # OfficeRenderer (draws map data, swaps themes)
    characters/    # Character (sprite + shadow + name tag)
    movement/      # PlayerController (keyboard + click-to-move)
    assets/        # procedural pixel art: palettes, characters, furniture, background
server/            # arrives in Milestone 2
docs/learning/     # short write-ups of the concepts used in each milestone
```

All pixel art is original and generated in code at startup (see `client/src/game/assets/`), so there are no third-party asset licences to track.
