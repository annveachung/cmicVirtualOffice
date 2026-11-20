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

  // The controls card shows on arrival, then gets out of the way.
  useEffect(() => {
    const id = window.setTimeout(() => setShowHelp(false), 9000);
    return () => window.clearTimeout(id);
  }, []);

  // "T" toggles day/night, "?" toggles the controls card (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      if (e.key === 't' || e.key === 'T') onToggleTheme();
      if (e.key === '?') setShowHelp((v) => !v);
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
      <TopBar
        theme={theme}
        onlineCount={1}
        onToggleTheme={onToggleTheme}
        onToggleHelp={() => setShowHelp((v) => !v)}
        onLeave={onLeave}
      />
      {!ready && <div className="loading pixel-panel">Opening the office…</div>}
      {showHelp && (
        <aside className="help pixel-panel">
          <button className="help-close" onClick={() => setShowHelp(false)} aria-label="Hide controls">×</button>
          <p>
            Use the arrow keys <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> to move around
          </p>
        </aside>
      )}
    </div>
  );
}
