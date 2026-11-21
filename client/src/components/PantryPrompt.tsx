import { useEffect, useState } from 'react';
import { bus, type PantryItem } from '../game/bus';

const OPTIONS: { item: PantryItem; label: string }[] = [
  { item: 'coffee', label: '☕ Coffee' },
  { item: 'tea', label: '🍵 Tea' },
];

/** Coffee or tea? — shown when you use the pantry's coffee & tea machine. */
export function PantryPrompt() {
  const [open, setOpen] = useState(false);
  useEffect(() => bus.on('pantry:prompt', () => setOpen(true)), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  const choose = (item: PantryItem) => {
    bus.emit('pantry:choose', item);
    setOpen(false);
  };
  return (
    <div className="pantry-prompt pixel-panel" role="dialog" aria-label="Coffee or tea?">
      <div className="pantry-title">Coffee or tea?</div>
      <div className="pantry-row">
        {OPTIONS.map((o) => (
          <button key={o.item} className="pixel-btn" onClick={() => choose(o.item)}>
            {o.label}
          </button>
        ))}
      </div>
      <button className="pantry-cancel" onClick={() => setOpen(false)}>
        No thanks
      </button>
    </div>
  );
}
