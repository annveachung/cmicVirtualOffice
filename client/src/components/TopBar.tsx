import type { StatusId, Theme } from '@little-office/shared';
import { Clock } from './Clock';
import { PixelIcon } from './PixelIcon';
import { ThemeToggle } from './ThemeToggle';
import { StatusPicker } from './StatusPicker';
import { useSound } from '../hooks/useSound';

interface Props {
  theme: Theme;
  /** Names of everyone in the office (you first). */
  online: string[];
  status: StatusId;
  onStatusChange: (s: StatusId) => void;
  onToggleTheme: () => void;
  onToggleHelp: () => void;
  onLeave: () => void;
}

export function TopBar({ theme, online, status, onStatusChange, onToggleTheme, onToggleHelp, onLeave }: Props) {
  const { sfx, music, toggleSfx, toggleMusic } = useSound();
  return (
    <header className="topbar pixel-panel">
      <div className="brand">
        <span className="logo-mark"><PixelIcon name="house" size={20} /></span>
        <span className="brand-name">CMiCity</span>
      </div>
      <Clock />
      <div className="topbar-actions">
        <StatusPicker status={status} onChange={onStatusChange} />
        <span className="online-pill" title={`In the office: ${online.join(', ')}`}>
          <span className="dot" /> {online.length} online
        </span>
        <button
          className={`pixel-btn icon-btn${music ? '' : ' is-off'}`}
          onClick={toggleMusic}
          aria-pressed={music}
          title={music ? 'Turn music off' : 'Turn music on'}
        >
          <PixelIcon name="note" size={16} />
          <span className="btn-label">{music ? 'Music' : 'Music off'}</span>
        </button>
        <button
          className={`pixel-btn icon-btn${sfx ? '' : ' is-off'}`}
          onClick={toggleSfx}
          aria-pressed={sfx}
          title={sfx ? 'Turn click sounds off' : 'Turn click sounds on'}
          aria-label={sfx ? 'Turn click sounds off' : 'Turn click sounds on'}
        >
          <PixelIcon name={sfx ? 'speaker' : 'mute'} size={16} />
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button className="pixel-btn icon-btn" onClick={onToggleHelp} title="Controls (?)" aria-label="Show controls">
          ?
        </button>
        <button className="pixel-btn icon-btn" onClick={onLeave} title="Leave the office">
          <PixelIcon name="door" size={16} />
          <span className="btn-label">Leave</span>
        </button>
      </div>
    </header>
  );
}
