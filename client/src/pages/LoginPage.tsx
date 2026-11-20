import { useState, type FormEvent } from 'react';
import { DEFAULT_APPEARANCE, type Appearance, type Theme } from '@little-office/shared';
import type { Profile } from '../App';
import { CharacterCreator } from '../components/CharacterCreator';
import { PixelIcon } from '../components/PixelIcon';
import { ThemeToggle } from '../components/ThemeToggle';

const NAME_RE = /^[A-Za-z0-9 _-]{2,16}$/;

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  onEnter: (p: Profile) => void;
}

/**
 * Milestone 1 entry screen: pick a name and build a character.
 * Username + PIN + invitation code (real accounts) replace this in Milestone 3.
 */
export function LoginPage({ theme, onToggleTheme, onEnter }: Props) {
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [touched, setTouched] = useState(false);
  const trimmed = name.trim();
  const valid = NAME_RE.test(trimmed);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (valid) onEnter({ name: trimmed, appearance });
  };

  return (
    <main className="login-screen">
      <div className="login-theme">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <form className="pixel-panel login-card" onSubmit={submit} noValidate>
        <header className="login-header">
          <span className="logo-mark"><PixelIcon name="house" size={28} /></span>
          <div>
            <h1>The Little Office</h1>
            <p className="muted">A cozy corner for the team.</p>
          </div>
        </header>

        <label className="field">
          <span>Your name</span>
          <input
            className="pixel-input"
            value={name}
            maxLength={16}
            autoFocus
            autoComplete="off"
            placeholder="e.g. Mochi"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !valid}
          />
          {touched && !valid && <small className="field-error">2–16 letters, numbers, spaces, _ or -</small>}
        </label>

        <CharacterCreator value={appearance} onChange={setAppearance} />

        <button className="pixel-btn primary block" type="submit">
          <PixelIcon name="door" size={16} /> Enter the office
        </button>
        <p className="footnote">Prototype build · team accounts with a PIN arrive in Milestone 3</p>
      </form>
    </main>
  );
}
