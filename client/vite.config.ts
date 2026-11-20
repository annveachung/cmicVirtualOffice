import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Phaser alone is ~1.2MB minified; that's expected for a game engine.
  build: { chunkSizeWarningLimit: 2000 },
});
