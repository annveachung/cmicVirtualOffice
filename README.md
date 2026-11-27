# CMiCity

A cozy, private, browser-based pixel-art virtual office for a small remote team (<15 people).
For fun and informal bonding, not productivity monitoring.

## Status

| Milestone | Status |
| --- | --- |
| 1. Visual prototype (single-player) | ✅ built |
| 2. Multiplayer foundation (Socket.IO) | ✅ join by name, see and bump into colleagues |
| 3. Accounts (username + PIN + invite code), persistence | ⏳ |
| 4. Social: status, speech bubbles, emotes | ⏳ |
| 5. Environmental interactions (sit, coffee, arcade) | ⏳ |
| 6. Testing & deployment | ⏳ |

## What's in the office

- **Your colleagues**: everyone who opens the app is in the same office. Just type a name (no password) to walk in. You see each other move, sit, dance, react, chat in speech bubbles and change status. Names must be unique among the people online.
- **Your character**: pick hair, skin and outfit, set a status, then walk around by keyboard or by clicking.
- **Things to use**: desks and sofas to sit on, a gym (treadmill, bike, weights, punching bag, yoga mat), ping-pong, a karaoke stage, a disco floor, a vending machine and a meeting room to present in.
- **Private offices**: knock on the door to go in. Leaving opens it automatically, and it closes behind you.
- **Pantry**: breakfast boxes from 9:00 to 11:00 and lunch boxes from 12:00 to 14:00.
- **The Potato Club**: put on the potato suit, poke Mr. Potato and unlock silly achievements.
- **Office residents**:
  - **Kit** at reception, with tips.
  - **Coach** in the gym, who gives you a workout buff.
  - **Roomby** the robot vacuum, which you can ride.
  - **Mochi** the cat and the raccoons **Ziggy** and **Pudding**, who nap, perch on furniture, work out, dance, chase Roomby and dig through bins. You can pick them up and carry them.
- **Day and night themes**.

## Controls

| Key | Action |
| --- | --- |
| Arrows / WASD, or click | Walk |
| E | Use the thing you're next to (sit, lift, knock, pet…) |
| C | Pick up / put down a cat or raccoon |
| + / − | Zoom in / out |
| 0 | Show the whole office |
| F | Jump to yourself |
| T | Day / night theme |
| ? | Help |

## Running locally

Requires Node 20+.

```bash
npm install
npm run dev        # office server (:3001) + web app at http://localhost:5173
npm test           # shared, client and server tests
npm run typecheck
npm run build
```

Open the page in two browser windows with different names to see multiplayer.

If `localhost` doesn't resolve in your browser, try `npm run dev -w client -- --host 127.0.0.1` while the server runs.

### Letting colleagues in

- **Same Wi-Fi / office network**: run `npm run dev -w server` and `npm run dev -w client -- --host`, then share the `Network:` address Vite prints.
- **Hosted**: `npm run build && npm start` runs one Node process on `$PORT` (default 3001) that serves the app *and* the office. Any Node host with WebSockets works (Render, Railway, Fly.io…).

## Repository layout

```text
shared/            # code BOTH client and (future) server use
  src/config.ts    # tile size, walk speed, hitbox
  src/appearance.ts# character customisation options
  src/map/         # office layout data, collision grid, A* pathfinding (+ tests)
  src/protocol.ts  # multiplayer messages + validation, used by client AND server
client/            # React + Vite + Phaser 3
  src/pages/       # LoginPage, OfficePage
  src/components/  # TopBar, ThemeToggle, CharacterCreator, PixelIcon…
  src/net/         # Session: the live Socket.IO connection
  src/hooks/       # useTheme, useRoster
  src/styles/      # global.css (theme tokens + pixel UI kit)
  src/game/
    GameCanvas.tsx # the only React component that touches Phaser
    bus.ts         # typed React <-> Phaser event bus
    scenes/        # OfficeScene
    maps/          # OfficeRenderer (draws map data, swaps themes)
    camera/        # CameraRig (fit-to-screen zoom, intro pan)
    characters/    # Character (sprite + shadow + name tag)
    doors/         # OfficeDoors (knock to enter private offices)
    npcs/          # NpcManager: Kit, Coach, Roomby + critters/ (cat & raccoons)
    club/          # The Potato Club: content and achievements
    movement/      # PlayerController (keyboard + click-to-move)
    net/           # RemotePlayers (draws colleagues, smooths their movement)
    assets/        # procedural pixel art: palettes, characters, furniture, background
server/            # Node + Socket.IO
  src/index.ts     # the office server (also serves client/dist in production)
  src/room.ts      # who's in the office; name rules (+ tests)
docs/learning/     # short write-ups of the concepts used in each milestone
```

All pixel art is original and generated in code at startup (see `client/src/game/assets/`), so there are no third-party asset licences to track.
