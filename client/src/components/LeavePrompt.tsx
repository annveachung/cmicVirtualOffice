import { useEffect, useState } from 'react';
import { bus } from '../game/bus';

/** "Done for the day?" — shown when you use the welcome mat at the entrance. */
export function LeavePrompt({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<'closed' | 'asking' | 'bye'>('closed');
  useEffect(() => bus.on('leave:prompt', () => setState('asking')), []);
  useEffect(() => {
    if (state !== 'asking') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setState('closed');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  if (state === 'closed') return null;
  if (state === 'bye')
    return (
      <div className="pantry-prompt pixel-panel" role="status">
        <div className="pantry-title">See you tomorrow! 👋</div>
      </div>
    );
  return (
    <div className="pantry-prompt pixel-panel" role="dialog" aria-label="Done for the day?">
      <div className="pantry-title">Done for the day?</div>
      <div className="pantry-row">
        <button
          className="pixel-btn primary"
          onClick={() => {
            setState('bye');
            window.setTimeout(onLeave, 1200);
          }}
        >
          Yes, head home 👋
        </button>
        <button className="pixel-btn" onClick={() => setState('closed')}>
          Not yet
        </button>
      </div>
    </div>
  );
}
