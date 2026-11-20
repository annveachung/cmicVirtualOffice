import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './styles/global.css';
import { App } from './App';
import { installClickSound } from './audio/sound';
import { installPixelCursors } from './ui/cursor';

installPixelCursors();
installClickSound();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
