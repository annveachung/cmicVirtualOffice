import type { Theme } from '@little-office/shared';
import { Clock } from './Clock';
import { PixelIcon } from './PixelIcon';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  theme: Theme;
  onlineCount: number;
  onToggleTheme: () => void;
  onLeave: () => void;
}

export function TopBar({ theme, onlineCount, onToggleTheme, onLeave }: Props) {
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
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button className="pixel-btn icon-btn" onClick={onLeave} title="Leave the office">
          <PixelIcon name="door" size={16} />
          <span className="btn-label">Leave</span>
        </button>
      </div>
    </header>
  );
}
