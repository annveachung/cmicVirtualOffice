import Phaser from 'phaser';
import { MAP_H, MAP_W, TILE } from '@little-office/shared';
import { bus } from '../bus';
import { DEFAULT_ZOOM_BOOST, MAX_ZOOM, TOP_BAR_PX } from '../constants';

const WORLD_W = MAP_W * TILE;
const WORLD_H = MAP_H * TILE;
/** How far (screen px) the pointer must move before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 6;

interface Hooks {
  /** Things that should stay the same size ON SCREEN (name tags, hints, bubbles): called with 1/zoom. */
  screenScale: (s: number) => void;
  /** Things that belong to the building (room tags): called with a fixed world scale. */
  worldScale: (s: number) => void;
  /** A click that wasn't a drag — walk there / use the thing. */
  onTap: (worldX: number, worldY: number) => void;
}

/**
 * Map-app style camera:
 *  - "zoom factor" is relative to the zoom where the office fills the window (100%).
 *  - Drag with the mouse to look around; scroll/pinch zooms towards the cursor.
 *  - Looking around pauses following; walking (keys or a click-to-go) resumes it.
 *  - React's zoom buttons talk to it through the event bus.
 */
export class CameraRig {
  private factor = 1;
  private following = true;
  private lastZoom = 0;
  private drag: { x: number; y: number; scrollX: number; scrollY: number; moved: boolean } | null = null;
  private introRunning = false;
  private readonly cam: Phaser.Cameras.Scene2D.Camera;
  private readonly unsubscribers: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly target: Phaser.GameObjects.Sprite,
    private readonly hooks: Hooks,
  ) {
    this.cam = scene.cameras.main;
    this.cam.setRoundPixels(true);

    const input = scene.input;
    input.on('pointerdown', this.onDown, this);
    input.on('pointermove', this.onMove, this);
    input.on('pointerup', this.onUp, this);
    input.on('wheel', this.onWheel, this);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);

    this.unsubscribers.push(
      bus.on('camera:zoom', (cmd) => {
        this.skipIntro();
        const { width, height } = scene.scale;
        const centre = { x: width / 2, y: (height + TOP_BAR_PX) / 2 };
        if (cmd === 'in') this.setFactor(this.factor * 1.25, centre);
        if (cmd === 'out') this.setFactor(this.factor / 1.25, centre);
        if (cmd === 'fit') {
          this.setFactor(1);
          this.follow();
        }
      }),
      bus.on('camera:recenter', () => {
        this.skipIntro();
        this.follow();
      }),
    );
    this.onResize();
  }

  // --------------------------------------------------------------- public API

  /** Arrival shot: start close on the player, then zoom out to the whole office. */
  playIntro() {
    this.introRunning = true;
    this.setFactor(DEFAULT_ZOOM_BOOST);
    this.follow();
    this.scene.time.delayedCall(1400, () => {
      if (!this.introRunning) return;
      this.cam.zoomTo(this.cover(), 1800, 'Sine.easeInOut', false, (_c: unknown, p: number) => {
        if (p >= 1) this.endIntro();
      });
    });
    this.scene.input.keyboard!.once('keydown', () => this.skipIntro());
  }

  /** Re-attach the camera to the player (after looking around). */
  follow() {
    this.following = true;
    this.cam.startFollow(this.target, true, 0.12, 0.12);
    this.emitState();
  }

  /** Call every frame: keeps bounds + label scales in step during zoom animations. */
  update() {
    const zoom = this.cam.zoom;
    if (zoom === this.lastZoom) return;
    this.lastZoom = zoom;
    // bounds include a strip above the map for the top bar, so it never covers the office
    this.cam.setBounds(0, -TOP_BAR_PX / zoom, WORLD_W, WORLD_H + TOP_BAR_PX / zoom);
    this.hooks.screenScale(1 / zoom);
    if (!this.introRunning) this.factor = zoom / this.cover();
    this.emitState();
  }

  destroy() {
    const input = this.scene.input;
    input.off('pointerdown', this.onDown, this);
    input.off('pointermove', this.onMove, this);
    input.off('pointerup', this.onUp, this);
    input.off('wheel', this.onWheel, this);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.unsubscribers.forEach((u) => u());
  }

  // ---------------------------------------------------------------- internals

  /** Zoom at which the office fills the window under the top bar (= 100%). */
  private cover() {
    const { width, height } = this.scene.scale;
    return Math.max(width / WORLD_W, (height - TOP_BAR_PX) / WORLD_H);
  }

  /** Zoom at which the ENTIRE office is visible (lowest you can zoom out). */
  private contain() {
    const { width, height } = this.scene.scale;
    return Math.min(width / WORLD_W, (height - TOP_BAR_PX) / WORLD_H);
  }

  /**
   * Change zoom. With an anchor (screen point) and the camera not following,
   * the world point under the anchor stays put — "zoom towards the cursor".
   */
  private setFactor(f: number, anchor?: { x: number; y: number }) {
    const cover = this.cover();
    this.factor = Phaser.Math.Clamp(f, this.contain() / cover, MAX_ZOOM / cover);
    const oldZoom = this.cam.zoom;
    const newZoom = cover * this.factor;
    if (anchor && !this.following) {
      const { width, height } = this.scene.scale;
      // Phaser camera maths (origin 0.5): world = scroll + w/2 + (screen - w/2) / zoom
      const wx = this.cam.scrollX + width / 2 + (anchor.x - width / 2) / oldZoom;
      const wy = this.cam.scrollY + height / 2 + (anchor.y - height / 2) / oldZoom;
      this.cam.setZoom(newZoom);
      this.cam.setScroll(wx - width / 2 - (anchor.x - width / 2) / newZoom, wy - height / 2 - (anchor.y - height / 2) / newZoom);
    } else {
      this.cam.setZoom(newZoom);
    }
    this.update();
  }

  private stopFollowing() {
    if (!this.following) return;
    this.following = false;
    this.cam.stopFollow();
    this.emitState();
  }

  private skipIntro() {
    if (!this.introRunning) return;
    this.cam.zoomEffect.reset();
    this.endIntro();
  }

  private endIntro() {
    this.introRunning = false;
    this.setFactor(1);
  }

  private emitState() {
    bus.emit('camera:state', { percent: Math.round(this.factor * 100), following: this.following });
  }

  private onResize() {
    // room tags keep a fixed size relative to the building: readable at 100%, scale with zoom
    this.hooks.worldScale(1 / this.cover());
    this.setFactor(this.factor);
  }

  private onDown(p: Phaser.Input.Pointer) {
    this.skipIntro();
    if (!p.leftButtonDown()) return;
    this.drag = { x: p.x, y: p.y, scrollX: this.cam.scrollX, scrollY: this.cam.scrollY, moved: false };
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (!this.drag || !p.isDown) return;
    const dx = p.x - this.drag.x;
    const dy = p.y - this.drag.y;
    if (!this.drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!this.drag.moved) {
      this.drag.moved = true;
      this.stopFollowing();
      this.drag.scrollX = this.cam.scrollX; // follow may have been lerping; start from where we are
      this.drag.scrollY = this.cam.scrollY;
      this.drag.x = p.x;
      this.drag.y = p.y;
      return;
    }
    this.cam.setScroll(this.drag.scrollX - dx / this.cam.zoom, this.drag.scrollY - dy / this.cam.zoom);
  }

  private onUp(p: Phaser.Input.Pointer) {
    const d = this.drag;
    this.drag = null;
    if (!d || d.moved || p.button !== 0) return;
    this.hooks.onTap(p.worldX, p.worldY);
  }

  private onWheel(p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) {
    this.skipIntro();
    const ev = p.event as WheelEvent | undefined;
    const lines = ev?.deltaMode === 1 ? 16 : 1; // some mice report lines, not pixels
    const step = Phaser.Math.Clamp(dy * lines, -120, 120); // tame big mouse-wheel jumps
    this.stopFollowing(); // zoom towards the cursor, not the player
    this.setFactor(this.factor * Math.exp(-step * 0.0018), { x: p.x, y: p.y });
  }
}
