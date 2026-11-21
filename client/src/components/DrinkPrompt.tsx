import { useEffect, useState } from 'react';
import { bus, type Drink } from '../game/bus';

const OPTIONS: { drink: Drink; label: string }[] = [
  { drink: 'coffee', label: '☕ Coffee' },
  { drink: 'tea', label: '🍵 Tea' },
  { drink: 'water', label: '💧 Water' },
];

/** "What would you like?" — shown when you use the pantry's drinks station. */
export function DrinkPrompt() {
  const [open, setOpen] = useState(false);
  useEffect(() => bus.on('drink:prompt', () => setOpen(true)), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === '1' || e.key === '2' || e.key === '3') choose(OPTIONS[Number(e.key) - 1].drink);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const choose = (drink: Drink) => {
    bus.emit('drink:choose', drink);
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="drink-prompt pixel-panel" role="dialog" aria-label="Choose a drink">
      <div className="drink-title">What would you like?</div>
      <div className="drink-options">
        {OPTIONS.map((o, i) => (
          <button key={o.drink} className="pixel-btn" onClick={() => choose(o.drink)} title={`${o.label} (${i + 1})`}>
            {o.label}
          </button>
        ))}
      </div>
      <button className="drink-cancel" onClick={() => setOpen(false)}>
        No thanks
      </button>
    </div>
  );
}
