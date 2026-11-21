import type { StatusId } from '@little-office/shared';
import { STATUS_ICON_SIZE, statusPixels } from '../ui/statusIcons';

/** The pixel status dot as crisp SVG (each <rect> is one pixel). */
export function StatusIcon({ status, size = 14 }: { status: StatusId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${STATUS_ICON_SIZE} ${STATUS_ICON_SIZE}`} shapeRendering="crispEdges" aria-hidden>
      {statusPixels(status).map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={1} height={1} fill={p.color} />
      ))}
    </svg>
  );
}
