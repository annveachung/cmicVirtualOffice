import { useEffect, useState } from 'react';
import { bus } from '../game/bus';

interface Toast {
  id: number;
  title: string;
  detail: string;
}

/** Little "🏆 Achievement unlocked" pop-ups that slide in and fade out. */
export function AchievementToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let n = 0;
    return bus.on('achievement', ({ title, detail }) => {
      const id = ++n;
      setToasts((t) => [...t, { id, title, detail }]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
    });
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast pixel-panel">
          <strong>🏆 {t.title}</strong>
          <span>{t.detail}</span>
        </div>
      ))}
    </div>
  );
}
