import type { Theme } from '@little-office/shared';
import { PixelIcon } from './PixelIcon';

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'light' ? 'night' : 'day';
  return (
    <button className="pixel-btn icon-btn" onClick={onToggle} title={`Switch to ${next} (T)`} aria-label={`Switch to ${next}`}>
      <PixelIcon name={theme === 'light' ? 'sun' : 'moon'} />
      <span className="btn-label">{theme === 'light' ? 'Day' : 'Night'}</span>
    </button>
  );
}
