import { bus } from '../game/bus';
import type { DanceStyle, Reaction } from '../game/assets/textures';

const DANCES: { style: DanceStyle; label: string }[] = [
  { style: 'danceGroove', label: 'Groove' },
  { style: 'danceShuffle', label: 'Shuffle' },
  { style: 'danceHop', label: 'Hop' },
  { style: 'danceSpin', label: 'Spin' },
];

const REACTIONS: { kind: Reaction; label: string; emoji: string }[] = [
  { kind: 'clap', label: 'Applause', emoji: '👏' },
  { kind: 'heart', label: 'Heart', emoji: '❤️' },
  { kind: 'laugh', label: 'Laugh', emoji: '😂' },
];

/**
 * Shown only while you're inside The Potato Club. Buttons talk to the game
 * through the event bus; the game decides what actually happens.
 */
export function ClubPanel() {
  return (
    <section className="club-panel pixel-panel" aria-label="The Potato Club controls">
      <div className="club-title">🥔 The Potato Club</div>
      <div className="club-row">
        <span className="club-label">Dance</span>
        {DANCES.map((d) => (
          <button key={d.style} className="pixel-btn small" onClick={() => bus.emit('club:dance', d.style)}>
            {d.label}
          </button>
        ))}
        <button className="pixel-btn small primary" onClick={() => bus.emit('club:dance', 'random')}>
          🎲 Random
        </button>
        <button className="pixel-btn small" onClick={() => bus.emit('club:group')}>
          Group dance
        </button>
      </div>
      <div className="club-row">
        <span className="club-label">React</span>
        {REACTIONS.map((r) => (
          <button key={r.kind} className="pixel-btn small" onClick={() => bus.emit('club:react', r.kind)} aria-label={r.label} title={r.label}>
            {r.emoji}
          </button>
        ))}
        <span className="club-hint">Mic = sing · rack = potato suit · machine = snacks · click Mr. Potato!</span>
      </div>
    </section>
  );
}
