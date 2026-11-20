import { useEffect, useState } from 'react';

export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="clock" aria-label="Local time">
      <strong>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong>
      <span>{now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</span>
    </div>
  );
}
