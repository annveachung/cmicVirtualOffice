import { useEffect, useRef } from 'react';
import type { Appearance, Direction } from '@little-office/shared';
import { FRAME_H, FRAME_W, drawCharacterFrame, type Pose } from '../game/assets/characterArt';

const WALK: Pose[] = ['walkA', 'idle', 'walkB', 'idle'];

/**
 * Renders the same pixel character the game uses, but on a plain <canvas>
 * outside Phaser — possible because the art code is pure Canvas 2D.
 */
export function CharacterPreview({ appearance, dir, scale = 6 }: { appearance: Appearance; dir: Direction; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      ctx.fillStyle = 'rgba(42, 30, 26, 0.22)';
      ctx.fillRect(3, FRAME_H - 3, 10, 2);
      drawCharacterFrame(ctx, 0, 0, appearance, dir, WALK[frame % WALK.length]);
      frame++;
    };
    draw();
    const id = window.setInterval(draw, 160);
    return () => window.clearInterval(id);
  }, [appearance, dir]);

  return (
    <canvas
      ref={ref}
      width={FRAME_W}
      height={FRAME_H}
      className="pixelated"
      style={{ width: FRAME_W * scale, height: FRAME_H * scale }}
      aria-label="Character preview"
    />
  );
}
