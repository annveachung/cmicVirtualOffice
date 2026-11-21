import { useEffect, useState } from 'react';
import { bus, type PantryItem } from '../game/bus';

const DRINKS: { item: PantryItem; label: string }[] = [
  { item: 'coffee', label: '☕ Coffee' },
  { item: 'tea', label: '🍵 Tea' },
  { item: 'water', label: '💧 Water' },
];
const FOOD: { item: PantryItem; label: string }[] = [
  { item: 'fruit', label: '🍎 Fruit' },
  { item: 'pastry', label: '🥐 Pastry' },
  { item: 'sandwich', label: '🥪 Sandwich' },
];

/** "What would you like?" — shown at the pantry's left-wall counters: a drink, and/or something to eat. */
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
  const row = (title: string, options: typeof DRINKS) => (
    <div className="pantry-row">
      <span className="pantry-label">{title}</span>
      {options.map((o) => (
        <button key={o.item} className="pixel-btn" onClick={() => choose(o.item)}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="pantry-prompt pixel-panel" role="dialog" aria-label="Pantry: choose food or a drink">
      <div className="pantry-title">What would you like?</div>
      {row('Drinks', DRINKS)}
      {row('Food', FOOD)}
      <button className="pantry-cancel" onClick={() => setOpen(false)}>
        No thanks
      </button>
    </div>
  );
}
