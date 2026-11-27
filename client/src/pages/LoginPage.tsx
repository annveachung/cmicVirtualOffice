import { useState, type FormEvent } from 'react';
import { DEFAULT_APPEARANCE, isValidName, type Appearance, type Theme } from '@little-office/shared';
import type { Profile } from '../App';
import { CharacterCreator } from '../components/CharacterCreator';
import { PixelIcon } from '../components/PixelIcon';
import { ThemeToggle } from '../components/ThemeToggle';

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  /** Join the office; resolves to an error message to show (e.g. name taken), or null. */
  onEnter: (p: Profile) => Promise<string | null>;
}

/**
 * Entry screen: pick a name and build a character, then walk into the shared
 * office. No password — names just have to be unique among the people online.
 * Username + PIN + invitation code (real accounts) replace this in Milestone 3.
 */
export function LoginPage({ theme, onToggleTheme, onEnter }: Props) {
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  // Only complain after the user tries to enter, or types something invalid —
  // never just because they clicked the character options first.
  const [attempted, setAttempted] = useState(false);
  const [joining, setJoining] = useState(false);
  /** Error from the server (e.g. that name is already in the office). */
  const [serverError, setServerError] = useState<string | null>(null);
  const trimmed = name.trim();
  const valid = isValidName(trimmed);
  const showError = !valid && (attempted || trimmed.length > 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!valid || joining) return;
    setJoining(true);
    setServerError(null);
    const err = await onEnter({ name: trimmed, appearance });
    // on success this page is gone; only touch state if we're still here
    if (err) {
      setServerError(err);
      setJoining(false);
    }
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
            <h1>CMiCity</h1>
            <p className="muted">A cozy corner for the team.</p>
          </div>
        </header>

        <label className="field">
          <span>Your name</span>
          <input
            className="pixel-input"
            value={name}
            maxLength={12}
            autoFocus
            autoComplete="off"
            placeholder="e.g. Mochi"
            onChange={(e) => {
              setName(e.target.value);
              setServerError(null);
            }}
            aria-invalid={showError || !!serverError}
          />
          {showError && <small className="field-error">1–12 letters, numbers, spaces, _ or -</small>}
          {!showError && serverError && <small className="field-error">{serverError}</small>}
        </label>

        <CharacterCreator value={appearance} onChange={setAppearance} />

        <button className="pixel-btn primary block" type="submit" disabled={joining}>
          <PixelIcon name="door" size={16} /> {joining ? 'Walking in…' : 'Enter the office'}
        </button>
        <p className="footnote">No password needed · just pick a name nobody in the office is using</p>
      </form>
    </main>
  );
}
