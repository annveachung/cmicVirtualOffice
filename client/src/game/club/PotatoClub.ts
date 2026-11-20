import Phaser from 'phaser';
import { POTATO_CLUB, SPOTS, TILE, toTile, type Spot } from '@little-office/shared';
import { DANCE_STYLES, type DanceStyle, type Reaction } from '../assets/textures';
import { bus } from '../bus';
import type { Character, CharacterPose } from '../characters/Character';
import { SpeechBubble } from '../characters/SpeechBubble';
import type { OfficeRenderer } from '../maps/OfficeRenderer';
import type { PlayerController } from '../movement/PlayerController';
import { bump, recordDance, unlock, type AchievementId } from './achievements';
import { randomMascotLine, randomPotatoMessage, randomSnack, randomSongTitle } from './content';

const pickDance = (): DanceStyle => DANCE_STYLES[Math.floor(Math.random() * DANCE_STYLES.length)];

/**
 * Everything that makes The Potato Club playful: dance styles, karaoke song
 * titles, the potato suit, the snack machine, Mr. Potato, reactions, group
 * dances and achievements. The scene just forwards events here.
 *
 * Milestone 2 will broadcast the small bits of state this produces (dance
 * style, singing, costume, reactions) so everyone sees them.
 */
export class PotatoClub {
  private danceStyle: DanceStyle = 'danceGroove';
  private lastPose: CharacterPose = 'idle';
  private singTimer: Phaser.Time.TimerEvent | null = null;
  private inClub = false;
  private readonly mascotBubble: SpeechBubble;
  private readonly unsubscribers: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Character,
    private readonly controller: PlayerController,
    private readonly office: OfficeRenderer,
  ) {
    this.mascotBubble = new SpeechBubble(scene);
    controller.onInstant = (spot) => this.onInstant(spot);
    this.unsubscribers.push(
      bus.on('club:dance', (style) => this.dance(style === 'random' ? pickDance() : style)),
      bus.on('club:react', (kind) => this.react(kind)),
      bus.on('club:group', () => this.groupDance()),
    );
  }

  /** Map the controller's pose to the animation to play ('dance' → the chosen style). */
  animFor(pose: CharacterPose): CharacterPose {
    return pose === 'dance' ? this.danceStyle : pose;
  }

  /** Called every frame with the player's current pose. */
  update(pose: CharacterPose) {
    if (pose !== this.lastPose) {
      if (pose === 'dance') this.onStartDancing();
      if (pose === 'sing') this.onStartSinging();
      if (this.lastPose === 'sing') this.stopSinging();
      this.lastPose = pose;
    }
    const t = toTile({ x: this.player.x, y: this.player.y });
    const inside = t.tx >= POTATO_CLUB.x0 && t.tx <= POTATO_CLUB.x1 && t.ty >= POTATO_CLUB.y0 && t.ty <= POTATO_CLUB.y1;
    if (inside !== this.inClub) {
      this.inClub = inside;
      bus.emit('zone:changed', inside ? 'potato-club' : null);
    }
  }

  setLabelScale(s: number) {
    this.mascotBubble.setScale(s);
  }

  destroy() {
    this.unsubscribers.forEach((u) => u());
    this.singTimer?.remove();
    this.mascotBubble.destroy();
  }

  // ------------------------------------------------------------------ actions

  private dance(style: DanceStyle) {
    this.danceStyle = style;
    if (this.lastPose === 'dance') {
      this.onStartDancing(); // switching style mid-dance still counts
      return;
    }
    // not dancing yet: head to the nearest dance-floor tile
    const here = { x: this.player.x, y: this.player.y };
    const floor = SPOTS.filter((s) => s.action === 'dance').sort(
      (a, b) => Math.hypot(a.pos.x - here.x, a.pos.y - here.y) - Math.hypot(b.pos.x - here.x, b.pos.y - here.y),
    );
    if (floor[0]) this.controller.goUse(here, floor[0]);
  }

  private react(kind: Reaction) {
    this.player.react(kind);
    if (bump('reactions') >= 5) this.achieve('cheerleader');
  }

  private groupDance() {
    const style = pickDance();
    this.dance(style);
    this.mascotDance(8000);
    this.player.say('Group dance! Everybody move! 🥔', 3500);
    this.achieve('groupGroove');
  }

  private onInstant(spot: Spot) {
    switch (spot.action) {
      case 'costume': {
        const on = !this.player.wearingCostume;
        this.player.setCostume(on);
        this.player.say(on ? 'You are now officially a potato.' : 'Back to human. For now.');
        if (on) this.achieve('certifiedPotato');
        break;
      }
      case 'vend': {
        this.player.say(`You got: ${randomSnack()}! 🥔`);
        if (bump('snacks') >= 3) this.achieve('snackAttack');
        break;
      }
      case 'mascot': {
        this.mascotDance(3200);
        this.achieve('mascotFriend');
        break;
      }
    }
  }

  private onStartDancing() {
    if (recordDance(this.danceStyle) >= DANCE_STYLES.length) this.achieve('danceScholar');
    this.achieve('firstDance');
    if (Math.random() < 0.35) this.player.say(randomPotatoMessage());
  }

  private onStartSinging() {
    this.player.say(`♪ Now singing: ${randomSongTitle()}`, 4500);
    this.achieve('micDrop');
    // every few seconds, the potato council weighs in
    this.singTimer = this.scene.time.addEvent({
      delay: 6000,
      loop: true,
      callback: () => this.player.say(Math.random() < 0.5 ? randomPotatoMessage() : `♪ ${randomSongTitle()}`, 4000),
    });
  }

  private stopSinging() {
    this.singTimer?.remove();
    this.singTimer = null;
  }

  /** Mr. Potato hops and wiggles, and says something. */
  private mascotDance(ms: number) {
    const img = this.office.furnitureImage('potato-mascot');
    if (!img) return;
    this.scene.tweens.killTweensOf(img);
    // snap back to the exact tile position first, so repeated dances never drift
    const baseY = Math.round(img.y / TILE) * TILE;
    img.setPosition(Math.round(img.x / TILE) * TILE, baseY);
    this.scene.tweens.add({ targets: img, y: baseY - 5, yoyo: true, repeat: Math.max(1, Math.round(ms / 360) - 1), duration: 180, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: img, x: img.x + 1, yoyo: true, repeat: Math.round(ms / 240), duration: 120 });
    this.mascotBubble.setPosition(img.x + TILE / 2, baseY - 40); // just above the party hat
    this.mascotBubble.say(randomMascotLine());
    this.scene.time.delayedCall(Math.max(ms, 3000), () => this.mascotBubble.hide());
  }

  private achieve(id: AchievementId) {
    const a = unlock(id);
    if (a) bus.emit('achievement', { title: a.title, detail: a.detail });
  }
}
