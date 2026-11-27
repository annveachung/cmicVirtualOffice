import { useEffect, useState } from 'react';
import { DEFAULT_STATUS, type StatusId, type Theme, type ZoneId } from '@little-office/shared';
import type { Profile } from '../App';
import { TopBar } from '../components/TopBar';
import { GameCanvas } from '../game/GameCanvas';
import { bus } from '../game/bus';
import { AchievementToast } from '../components/AchievementToast';
import { ClubPanel } from '../components/ClubPanel';
import { ZoomControls } from '../components/ZoomControls';
import { PantryPrompt } from '../components/PantryPrompt';
import { LeavePrompt } from '../components/LeavePrompt';
import { WelcomeBanner } from '../components/WelcomeBanner';
import { sound } from '../audio/sound';
import type { Session } from '../net/session';
import { useRoster } from '../hooks/useRoster';

interface Props {
  profile: Profile;
  /** Connection to the shared office, or null when playing solo. */
  session: Session | null;
  theme: Theme;
  onToggleTheme: () => void;
  onLeave: () => void;
}

export function OfficePage({ profile, session, theme, onToggleTheme, onLeave }: Props) {
  const roster = useRoster(session, profile.name);
  const [ready, setReady] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [status, setStatus] = useState<StatusId>(DEFAULT_STATUS);
  // tell the game whenever the status changes (and once it's ready)
  useEffect(() => bus.emit('status:set', status), [status, ready]);
  useEffect(() => bus.on('zone:changed', setZone), []);
  // each special area has its own soundtrack; the cozy office tune plays everywhere else
  useEffect(() => sound.setTrack(zone === 'potato-club' ? 'club' : zone === 'gym' ? 'gym' : 'office'), [zone]);

  // Cozy background music while you're in the office (if not switched off).
  useEffect(() => {
    sound.startMusic();
    return () => {
      sound.stopMusic();
      sound.setTrack('office'); // next visit starts with the office tune
    };
  }, []);

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
      if (e.key === '+' || e.key === '=') bus.emit('camera:zoom', 'in');
      if (e.key === '-' || e.key === '_') bus.emit('camera:zoom', 'out');
      if (e.key === '0') bus.emit('camera:zoom', 'fit');
      if (e.key === 'f' || e.key === 'F') bus.emit('camera:recenter');
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
        session={session}
        theme={theme}
        onReady={() => setReady(true)}
      />
      <TopBar
        theme={theme}
        online={roster.names}
        status={status}
        onStatusChange={setStatus}
        onToggleTheme={onToggleTheme}
        onToggleHelp={() => setShowHelp((v) => !v)}
        onLeave={onLeave}
      />
      {ready && !roster.online && (
        <div className="offline-note pixel-panel" role="status">
          {session ? 'Reconnecting to the office…' : 'Couldn’t reach the office server, so it’s just you for now.'}
        </div>
      )}
      {!ready && <div className="loading pixel-panel">Opening the office…</div>}
      {zone === 'potato-club' && <ClubPanel />}
      <AchievementToast />
      <ZoomControls />
      <PantryPrompt />
      <LeavePrompt onLeave={onLeave} />
      {ready && <WelcomeBanner name={profile.name} />}
      {showHelp && (
        <aside className="help pixel-panel">
          <button className="help-close" onClick={() => setShowHelp(false)} aria-label="Hide controls">×</button>
          <p>
            Use the arrow keys <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> to move around
          </p>
          <p>Scroll or pinch to zoom in · drag to look around while zoomed</p>
        </aside>
      )}
    </div>
  );
}
