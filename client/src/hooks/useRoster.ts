import { useEffect, useState } from 'react';
import type { Session } from '../net/session';

export interface Roster {
  /** Everyone in the office, you included. */
  names: string[];
  /** False while the connection is down (or you're solo). */
  online: boolean;
}

/** Live list of who's in the office, for the top bar. */
export function useRoster(session: Session | null, myName: string): Roster {
  const read = (): Roster => ({
    names: [myName, ...[...(session?.players.values() ?? [])].map((p) => p.name).sort((a, b) => a.localeCompare(b))],
    online: !!session?.online,
  });
  const [roster, setRoster] = useState(read);
  useEffect(() => {
    setRoster(read());
    if (!session) return;
    return session.on((e) => {
      if (e.type === 'joined' || e.type === 'left' || e.type === 'reset' || e.type === 'connection') setRoster(read());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, myName]);
  return roster;
}
