import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // npm workspaces hoist packages (like the pixel font) into the repo-root node_modules,
    // which is outside client/. Allow the dev server to serve files from the whole workspace.
    fs: { allow: ['..'] }, // '..' = the repo root (relative to client/)
  },
  // Phaser alone is ~1.2MB minified; that's expected for a game engine.
  build: { chunkSizeWarningLimit: 2000 },
});
