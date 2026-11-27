import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { OFFICE_DOORS, cleanSay, isStatusId, type ClientEvents, type ServerEvents } from '@little-office/shared';
import { OfficeRoom } from './room';

/**
 * CMiCity server: one Node process that
 *   1. serves the built web app (client/dist) in production, and
 *   2. runs the Socket.IO "office" everyone joins.
 *
 * In development Vite serves the app on :5173 and forwards /socket.io here (see client/vite.config.ts).
 */
const PORT = Number(process.env.PORT ?? 3001);
const DIST = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../client/dist');

const room = new OfficeRoom();
const http = createServer(serveStatic);
const io = new Server<ClientEvents, ServerEvents>(http, {
  // A small, friendly office: tiny messages only.
  maxHttpBufferSize: 4096,
});

io.on('connection', (socket) => {
  let joined = false;
  /** Crude flood guard: at most ~40 messages a second per person. */
  let budget = 40;
  const refill = setInterval(() => (budget = 40), 1000);
  const allowed = () => joined && budget-- > 0;

  socket.on('join', (req, ack) => {
    if (typeof ack !== 'function' || joined) return;
    const res = room.join(socket.id, req?.name, req?.appearance);
    ack(res);
    if (!res.ok) return;
    joined = true;
    socket.join('office');
    socket.to('office').emit('player:joined', res.you);
    log(`${res.you.name} joined (${room.size} online)`);
  });

  socket.on('move', (m) => {
    if (!allowed()) return;
    const clean = room.move(socket.id, m);
    if (clean) socket.to('office').volatile.emit('player:moved', socket.id, clean); // volatile: fine to drop if the network is busy
  });

  socket.on('status', (s) => {
    const p = room.get(socket.id);
    if (!allowed() || !p || !isStatusId(s)) return;
    p.status = s;
    socket.to('office').emit('player:status', socket.id, s);
  });

  socket.on('say', (text) => {
    const line = cleanSay(text);
    if (allowed() && line) socket.to('office').emit('player:said', socket.id, line);
  });

  socket.on('react', (kind) => {
    if (allowed() && typeof kind === 'string' && kind.length <= 16) socket.to('office').emit('player:reacted', socket.id, kind);
  });

  socket.on('costume', (on) => {
    const p = room.get(socket.id);
    if (!allowed() || !p) return;
    p.costume = on === true;
    socket.to('office').emit('player:costume', socket.id, p.costume);
  });

  socket.on('knock', (doorId) => {
    if (allowed() && OFFICE_DOORS.some((d) => d.id === doorId)) socket.to('office').emit('door:knocked', doorId);
  });

  socket.on('disconnect', () => {
    clearInterval(refill);
    const p = room.get(socket.id);
    if (!room.leave(socket.id)) return;
    io.to('office').emit('player:left', socket.id);
    log(`${p?.name} left (${room.size} online)`);
  });
});

http.listen(PORT, () => log(`CMiCity server on http://localhost:${PORT}`));

// ------------------------------------------------------------ static files --

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

/** Serve client/dist (after `npm run build`). Unknown paths get index.html (single-page app). */
async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  const file = join(DIST, normalize(path).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(DIST)) return send(res, 403, 'Forbidden');
  try {
    const isFile = (await stat(file)).isFile();
    const target = isFile ? file : join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream' });
    res.end(await readFile(target));
  } catch {
    try {
      res.writeHead(200, { 'Content-Type': TYPES['.html'] });
      res.end(await readFile(join(DIST, 'index.html')));
    } catch {
      send(res, 404, 'Run `npm run build` first, or use `npm run dev` and open http://localhost:5173');
    }
  }
}

function send(res: ServerResponse, code: number, text: string) {
  res.writeHead(code, { 'Content-Type': 'text/plain' });
  res.end(text);
}

function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}
