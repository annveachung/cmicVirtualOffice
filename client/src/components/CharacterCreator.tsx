import { useState } from 'react';
import { HAIR_COLORS, HAIR_STYLES, OUTFITS, SKIN_TONES, type Appearance, type Direction } from '@little-office/shared';
import { CharacterPreview } from './CharacterPreview';

const TURN: Direction[] = ['down', 'left', 'up', 'right'];

interface Props {
  value: Appearance;
  onChange: (a: Appearance) => void;
}

function Swatches({ label, colors, selected, onPick }: { label: string; colors: readonly string[]; selected: number; onPick: (i: number) => void }) {
  return (
    <div className="creator-row">
      <span className="creator-label">{label}</span>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {colors.map((c, i) => (
          <button
            key={c + i}
            type="button"
            role="radio"
            aria-checked={i === selected}
            aria-label={`${label} ${i + 1}`}
            className={`swatch${i === selected ? ' selected' : ''}`}
            style={{ background: c }}
            onClick={() => onPick(i)}
          />
        ))}
      </div>
    </div>
  );
}

export function CharacterCreator({ value, onChange }: Props) {
  const [turn, setTurn] = useState(0);
  const set = (patch: Partial<Appearance>) => onChange({ ...value, ...patch });
  const cycleStyle = (d: number) => set({ hairStyle: (value.hairStyle + d + HAIR_STYLES.length) % HAIR_STYLES.length });

  return (
    <div className="creator">
      <div className="creator-stage">
        <CharacterPreview appearance={value} dir={TURN[turn]} />
        <button type="button" className="pixel-btn small" onClick={() => setTurn((t) => (t + 1) % TURN.length)}>
          Turn ↻
        </button>
      </div>
      <div className="creator-options">
        <div className="creator-row">
          <span className="creator-label">Hair</span>
          <div className="stepper">
            <button type="button" className="pixel-btn small" aria-label="Previous hair style" onClick={() => cycleStyle(-1)}>‹</button>
            <span className="stepper-value">{HAIR_STYLES[value.hairStyle]}</span>
            <button type="button" className="pixel-btn small" aria-label="Next hair style" onClick={() => cycleStyle(1)}>›</button>
          </div>
        </div>
        <Swatches label="Hair colour" colors={HAIR_COLORS} selected={value.hairColor} onPick={(hairColor) => set({ hairColor })} />
        <Swatches label="Skin" colors={SKIN_TONES} selected={value.skin} onPick={(skin) => set({ skin })} />
        <Swatches label="Outfit" colors={OUTFITS.map((o) => o.top)} selected={value.outfit} onPick={(outfit) => set({ outfit })} />
      </div>
    </div>
  );
}
