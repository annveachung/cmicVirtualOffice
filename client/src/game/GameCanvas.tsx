import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import type { Appearance, Theme } from '@little-office/shared';
import { bus } from './bus';
import { createGame } from './createGame';

interface Props {
  name: string;
  appearance: Appearance;
  theme: Theme;
  deskId: number | null;
  onReady?: () => void;
}

/**
 * The only React component that touches Phaser. It mounts the game once and
 * forwards prop changes as bus events — it never re-creates the game, so
 * switching theme keeps everyone exactly where they are.
 */
export function GameCanvas({ name, appearance, theme, deskId, onReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const host = hostRef.current!;
    let game: Phaser.Game | null = null;
    let cancelled = false;
    const off = bus.on('office:ready', () => onReady?.());
    // Wait for the pixel font so canvas text doesn't render in a fallback font.
    // If the font can't load, start anyway (with a fallback font) — never leave the user stuck.
    const start = () => {
      if (!cancelled && !game) game = createGame(host, { name, appearance, deskId, theme: themeRef.current });
    };
    document.fonts.load('16px "Pixelify Sans"').then(start, start);
    return () => {
      cancelled = true;
      off();
      game?.destroy(true);
    };
    // The game is created once per identity; theme changes go through the bus below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, appearance, deskId]);

  useEffect(() => {
    bus.emit('theme:set', theme);
  }, [theme]);

  return <div ref={hostRef} className="game-host" />;
}
