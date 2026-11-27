import { useCallback, useState } from 'react';
import type { Appearance } from '@little-office/shared';
import { useTheme } from './hooks/useTheme';
import { LoginPage } from './pages/LoginPage';
import { OfficePage } from './pages/OfficePage';
import { joinOffice, type Session } from './net/session';

export interface Profile {
  name: string;
  appearance: Appearance;
}

const REFUSED: Record<string, (name: string) => string> = {
  'name-taken': (n) => `Someone called “${n}” is already in the office. Try another name!`,
  'bad-name': () => '1–12 letters, numbers, spaces, _ or -',
  full: () => 'The office is full right now. Try again in a bit!',
};

export function App() {
  const { theme, toggle } = useTheme();
  // No accounts: just a name. Real accounts (PIN + invite code) arrive in Milestone 3.
  const [profile, setProfile] = useState<Profile | null>(null);
  /** The live connection to the shared office; null = playing solo (server unreachable). */
  const [session, setSession] = useState<Session | null>(null);

  /** Walk in: join the shared office. Returns an error message to show, or null. */
  const enter = useCallback(async (p: Profile): Promise<string | null> => {
    const res = await joinOffice(p.name, p.appearance);
    if (res.kind === 'refused') return REFUSED[res.error](p.name);
    setSession(res.kind === 'joined' ? res.session : null);
    setProfile(res.kind === 'joined' ? { ...p, name: res.session.you.name } : p);
    return null;
  }, []);

  const leave = useCallback(() => {
    session?.close();
    setSession(null);
    setProfile(null);
  }, [session]);

  return profile ? (
    <OfficePage profile={profile} session={session} theme={theme} onToggleTheme={toggle} onLeave={leave} />
  ) : (
    <LoginPage theme={theme} onToggleTheme={toggle} onEnter={enter} />
  );
}
