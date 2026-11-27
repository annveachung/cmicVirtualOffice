import type Phaser from 'phaser';
import { TILE, WALK_SPEED, type Motion, type PlayerSnapshot, type Spot, type Theme, type Vec2 } from '@little-office/shared';
import { ANIMS, REACTION_KEYS, type AnimName, type Reaction } from '../assets/textures';
import { Character } from '../characters/Character';
import type { Session } from '../../net/session';

interface Remote {
  char: Character;
  /** Latest state from the server; the character glides towards it. */
  target: Motion;
}

/** Further than this from where they should be (a teleport, a lag spike)? Just snap there. */
const SNAP_DISTANCE = TILE * 3;
/** Catch up a little faster than walking pace, so remote players never fall behind. */
const CATCH_UP_SPEED = WALK_SPEED * 1.25;
/** Poses where you stand still in place, so they're instant (sitting, lifting, dancing…). */
const MOVING: ReadonlySet<string> = new Set(['walk', 'idle']);

/**
 * Your colleagues' characters.
 *
 * Positions arrive ~10 times a second, which would look jerky if drawn as-is.
 * Each frame every character walks smoothly towards its latest known position
 * instead ("interpolation"), playing the walk cycle until it gets there.
 */
export class RemotePlayers {
  private readonly remotes = new Map<string, Remote>();
  private readonly off: () => void;
  private theme: Theme;
  private labelScale = 1;
  /** Someone knocked on a private-office door. */
  onKnock: (doorId: string) => void = () => {};

  constructor(
    private readonly scene: Phaser.Scene,
    session: Session,
    theme: Theme,
  ) {
    this.theme = theme;
    for (const p of session.players.values()) this.add(p, false);
    this.off = session.on((e) => {
      switch (e.type) {
        case 'joined':
          this.add(e.player, true);
          break;
        case 'left':
          this.remove(e.player.id);
          break;
        case 'moved': {
          const r = this.remotes.get(e.id);
          if (r) r.target = e.motion;
          break;
        }
        case 'status':
          this.remotes.get(e.id)?.char.setStatus(e.status);
          break;
        case 'costume':
          this.remotes.get(e.id)?.char.setCostume(e.on);
          break;
        case 'said':
          this.remotes.get(e.id)?.char.say(e.text);
          break;
        case 'reacted':
          if (e.kind in REACTION_KEYS) this.remotes.get(e.id)?.char.react(e.kind as Reaction);
          break;
        case 'knock':
          this.onKnock(e.doorId);
          break;
        case 'reset':
          for (const id of [...this.remotes.keys()]) this.remove(id);
          for (const p of session.players.values()) this.add(p, false);
          break;
      }
    });
  }

  update(dtMs: number) {
    const step = (CATCH_UP_SPEED * Math.min(dtMs, 100)) / 1000;
    for (const { char, target } of this.remotes.values()) {
      const dx = target.x - char.x;
      const dy = target.y - char.y;
      const dist = Math.hypot(dx, dy);
      const still = !MOVING.has(target.anim);
      if (dist > SNAP_DISTANCE || still || dist <= step) char.setPosition(target.x, target.y);
      else char.setPosition(char.x + (dx / dist) * step, char.y + (dy / dist) * step);
      const arrived = still || dist <= step;
      // still gliding towards where they stopped? keep the feet moving
      char.setMotion(target.dir, arrived ? safeAnim(target.anim) : 'walk');
    }
  }

  /** Where everyone is (so you, the NPCs and the doors can treat them as solid people). */
  positions(): Vec2[] {
    return [...this.remotes.values()].map(({ char }) => ({ x: char.x, y: char.y }));
  }

  /** The name of whoever is using this seat / machine right now, if anyone. */
  usingSpot(spot: Spot): string | null {
    for (const { char, target } of this.remotes.values()) {
      if (MOVING.has(target.anim)) continue;
      if (Math.hypot(target.x - spot.pos.x, target.y - spot.pos.y) < 2) return char.name;
    }
    return null;
  }

  setTheme(t: Theme) {
    this.theme = t;
    for (const { char } of this.remotes.values()) char.setTheme(t);
  }

  setLabelScale(sc: number) {
    this.labelScale = sc;
    for (const { char } of this.remotes.values()) char.setLabelScale(sc);
  }

  destroy() {
    this.off();
    for (const id of [...this.remotes.keys()]) this.remove(id);
  }

  private add(p: PlayerSnapshot, justArrived: boolean) {
    if (this.remotes.has(p.id)) return;
    const char = new Character(this.scene, p.appearance, p.name, { isLocal: false });
    char.setPosition(p.x, p.y);
    char.setMotion(p.dir, safeAnim(p.anim));
    char.setTheme(this.theme);
    char.setStatus(p.status);
    char.setCostume(p.costume);
    char.setLabelScale(this.labelScale);
    this.remotes.set(p.id, { char, target: { x: p.x, y: p.y, dir: p.dir, anim: p.anim } });
    if (justArrived) char.say('👋 hi!', 2500);
  }

  private remove(id: string) {
    this.remotes.get(id)?.char.destroy();
    this.remotes.delete(id);
  }
}

/** Only play animations this version of the game knows about. */
function safeAnim(name: string): AnimName {
  return name in ANIMS ? (name as AnimName) : 'idle';
}
