/**
 * Arrival title card, in the spirit of a game announcing a new world: a
 * semi-transparent band sweeps across the screen, big pixel letters pop in one
 * by one, a greeting line follows, then it all fades away. Purely decorative —
 * clicks pass straight through it.
 */
export function WelcomeBanner({ name }: { name: string }) {
  const title = 'WELCOME TO CMICITY';
  const day = new Date().toLocaleDateString([], { weekday: 'long' });
  return (
    <div className="welcome-banner" aria-live="polite">
      <div className="welcome-band">
        <div className="welcome-title" aria-label={title}>
          {[...title].map((ch, i) => (
            <span key={i} style={{ animationDelay: `${0.35 + i * 0.045}s` }} aria-hidden>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </div>
        <div className="welcome-sub">
          ★ Have a cozy {day}, {name}! ★
        </div>
      </div>
    </div>
  );
}
