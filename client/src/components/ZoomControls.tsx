import { bus } from '../game/bus';

/**
 * Bottom-right camera controls: just − and +.
 * (Keyboard: + / − to zoom, 0 for the whole office, F to jump to yourself.)
 */
export function ZoomControls() {
  return (
    <div className="zoom-controls pixel-panel" role="group" aria-label="Camera controls">
      <button className="pixel-btn small" onClick={() => bus.emit('camera:zoom', 'out')} aria-label="Zoom out" title="Zoom out (−)">
        −
      </button>
      <button className="pixel-btn small" onClick={() => bus.emit('camera:zoom', 'in')} aria-label="Zoom in" title="Zoom in (+)">
        +
      </button>
    </div>
  );
}
