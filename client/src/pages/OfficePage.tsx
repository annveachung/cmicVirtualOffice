import { useEffect, useState } from 'react';
import type { Theme } from '@little-office/shared';
import type { Profile } from '../App';
import { TopBar } from '../components/TopBar';
import { GameCanvas } from '../game/GameCanvas';

interface Props {
  profile: Profile;
  theme: Theme;
  onToggleTheme: () => void;
  onLeave: () => void;
}

export function OfficePage({ profile, theme, onToggleTheme, onLeave }: Props) {
  const [ready, setReady] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  // "T" toggles day/night (ignored while typing in a text field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      if (e.key === 't' || e.key === 'T') onToggleTheme();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleTheme]);

  return (
    <div className="office-page">
      <GameCanvas
        name={profile.name}
        appearance={profile.appearance}
        deskId={null}
        theme={theme}
        onReady={() => setReady(true)}
      />
      <TopBar theme={theme} onlineCount={1} onToggleTheme={onToggleTheme} onLeave={onLeave} />
      {!ready && <div className="loading pixel-panel">Opening the office…</div>}
      {showHelp && (
        <aside className="help pixel-panel">
          <button className="help-close" onClick={() => setShowHelp(false)} aria-label="Hide controls">×</button>
          <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows to walk</p>
          <p>Click the floor to walk, click a seat to sit</p>
          <p><kbd>E</kbd> sit / stand · <kbd>T</kbd> day/night</p>
          <p>Scroll to zoom in and follow yourself</p>
        </aside>
      )}
    </div>
  );
}
