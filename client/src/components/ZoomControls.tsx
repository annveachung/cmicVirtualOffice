import { useEffect, useState } from 'react';
import { bus } from '../game/bus';

/**
 * Bottom-right camera controls: − / zoom % / + / Fit / Find me.
 * 100% = the office fills the window. "Find me" lights up when the camera
 * isn't following you (because you dragged the view somewhere).
 */
export function ZoomControls() {
  const [state, setState] = useState({ percent: 100, following: true });
  useEffect(() => bus.on('camera:state', setState), []);

  return (
    <div className="zoom-controls pixel-panel" role="group" aria-label="Camera controls">
      <button className="pixel-btn small" onClick={() => bus.emit('camera:zoom', 'out')} aria-label="Zoom out" title="Zoom out (−)">
        −
      </button>
      <button className="zoom-percent" onClick={() => bus.emit('camera:zoom', 'fit')} title="Fit the office to the window (0)">
        {state.percent}%
      </button>
      <button className="pixel-btn small" onClick={() => bus.emit('camera:zoom', 'in')} aria-label="Zoom in" title="Zoom in (+)">
        +
      </button>
      <button
        className={`pixel-btn small${state.following ? '' : ' primary'}`}
        onClick={() => bus.emit('camera:recenter')}
        title="Find me (F)"
      >
        ◎ Find me
      </button>
    </div>
  );
}
