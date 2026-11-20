import { useEffect, useState } from 'react';
import { bus } from '../game/bus';

/**
 * Bottom-right camera controls: − / zoom % / + / Find me.
 * 100% = the whole office fits in the window (the default, static view).
 * "Find me" centres the view on you once — useful when zoomed in.
 */
export function ZoomControls() {
  const [state, setState] = useState({ percent: 100, following: true });
  useEffect(() => bus.on('camera:state', setState), []);

  return (
    <div className="zoom-controls pixel-panel" role="group" aria-label="Camera controls">
      <button className="pixel-btn small" onClick={() => bus.emit('camera:zoom', 'out')} aria-label="Zoom out" title="Zoom out (−)">
        −
      </button>
      <button className="zoom-percent" onClick={() => bus.emit('camera:zoom', 'fit')} title="Show the whole office (0)">
        {state.percent}%
      </button>
      <button className="pixel-btn small" onClick={() => bus.emit('camera:zoom', 'in')} aria-label="Zoom in" title="Zoom in (+)">
        +
      </button>
      <button
        className="pixel-btn small"
        onClick={() => bus.emit('camera:recenter')}
        title="Find me (F)"
      >
        ◎ Find me
      </button>
    </div>
  );
}
