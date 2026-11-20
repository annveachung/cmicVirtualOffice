import type { Theme } from '@little-office/shared';
import { Clock } from './Clock';
import { PixelIcon } from './PixelIcon';
import { ThemeToggle } from './ThemeToggle';
import { useSound } from '../hooks/useSound';

interface Props {
  theme: Theme;
  onlineCount: number;
  onToggleTheme: () => void;
  onToggleHelp: () => void;
  onLeave: () => void;
}

export function TopBar({ theme, onlineCount, onToggleTheme, onToggleHelp, onLeave }: Props) {
  const { sfx, music, toggleSfx, toggleMusic } = useSound();
  return (
    <header className="topbar pixel-panel">
      <div className="brand">
        <span className="logo-mark"><PixelIcon name="house" size={20} /></span>
        <span className="brand-name">The Little Office</span>
      </div>
      <Clock />
      <div className="topbar-actions">
        <span className="online-pill" title="Colleagues online">
          <span className="dot" /> {onlineCount} online
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
