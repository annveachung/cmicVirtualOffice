# Milestone 2: Multiplayer, what we built and why

## 1. Client–server: one source of truth
Until now each browser ran its own private copy of the office. To share it, one **server**
(Node + Socket.IO, in `server/`) keeps the list of who's here. Every browser:
1. connects and says "I'm Ann, I look like this" (`join`);
2. gets back everyone already in the office;
3. sends its own moves and hears about everyone else's.

The server is the **referee**: it decides whether a name is free, and nobody talks to anyone
except through it.

## 2. WebSockets and Socket.IO
Normal HTTP is "ask → answer". A game needs the server to **push** news ("Ben moved") at any
time, so the browser keeps one **WebSocket** connection open both ways. Socket.IO adds handy bits
on top:
- **named events** (`socket.emit('move', …)` / `socket.on('player:moved', …)`);
- **acks**: `join` gets a reply, like a function call over the network;
- **rooms**: `socket.to('office')` means "everyone else";
- **automatic reconnection**.

## 3. A shared protocol: types both sides agree on
`shared/src/protocol.ts` lists every message (`ClientEvents`, `ServerEvents`) and its payload.
The client's socket and the server's `Server` are both typed with it, so a misspelt event or a
missing field is a **compile error** on both sides.

## 4. Never trust the client
Anyone can open dev tools and send anything. The server therefore checks every message before
storing or relaying it:
- **Names:** must match the name rule (`isValidName`).
- **Moves:** must be numbers inside the map, a real direction, and a short letters-only animation
  name (`cleanMotion`).
- **Speech:** trimmed to 140 characters, with control characters stripped (`cleanSay`).
- **Looks:** clamped to real options (`sanitizeAppearance`).
- **Message rate:** a small budget per second stops one tab from flooding everyone.

The browser also only plays animations it knows. React renders names as text, never as HTML, so a
name can't inject markup.

## 5. Unique names without passwords
`OfficeRoom.join` compares names with `nameKey()`, which lowercases and trims them, so "Ann" and
" ann " clash. A name is only reserved **while you're online**: when you disconnect, it's free
again. This logic has no sockets in it, which makes it easy to unit-test (`room.test.ts`).

## 6. Sending movement cheaply
Sending your position every frame (60 times a second) would waste bandwidth. `syncMotion` sends
it **at most 10 times a second** and **only when something changed**, so standing still costs
nothing. Moves are sent as **volatile**: if the network is busy, an old position can be dropped,
because a newer one is coming anyway. Speech and status are sent normally, since those must
arrive.

## 7. Interpolation: smooth motion from jumpy updates
Drawing colleagues exactly where the last message said would make them jump every 100ms. Instead,
`RemotePlayers` makes each character **walk towards** its latest known position, slightly faster
than walking pace so it never falls behind, playing the walk cycle until it arrives. Two
exceptions:
- **Big jumps** (lag, a respawn) snap straight to the new position.
- **Activity poses** (sit, lift, dance) also snap, because the local player teleports onto seats
  too.

## 8. Everything else plugs into existing hooks
Earlier milestones built "who's in the way?" and "is this seat taken?" as small callbacks. That
paid off here:
- **Solid colleagues:** `controller.blockers` now adds their positions.
- **NPCs avoid them:** the NPCs' obstacle list includes them too.
- **Taken seats:** a colleague sitting exactly on a spot makes it taken ("Ben got here first").
- **Doors:** a knock is broadcast, and the door opens on every screen. Doors stay open while
  anyone is near.
- **Speech, reactions, potato suit:** a tiny `echo` hook on the local `Character` sends these.
  Remote characters have no hook, so nothing bounces back.

## 9. Graceful failure
- **Server unreachable:** if it doesn't answer within 4 seconds, you still get into a solo office,
  with a small notice.
- **Connection drops:** Socket.IO reconnects on its own. `Session` then re-joins and re-sends
  your status and potato suit.
- **Joining late:** `Session` keeps the roster up to date from the moment you join. The game
  canvas can start a moment later and still see everyone.

## 10. One process in production
In development, **Vite** serves the app on :5173 and **proxies** `/socket.io` to the server on
:3001, so the browser only talks to one address. In production, `npm start` runs only the server.
It serves the built app from `client/dist` and runs Socket.IO on the same port, so it can be
hosted as a single service.

### Known limits (on purpose, for now)
- **Each browser runs its own NPCs:** Mochi may be on the sofa for you and in the gym for Ben.
- **Carrying and riding aren't shared:** others don't see the critter in your arms or Roomby
  under your feet.
- **The server doesn't check walls:** it only checks that positions are inside the map.
