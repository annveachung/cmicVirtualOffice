import { useState } from 'react';
import type { Appearance } from '@little-office/shared';
import { useTheme } from './hooks/useTheme';
import { LoginPage } from './pages/LoginPage';
import { OfficePage } from './pages/OfficePage';

export interface Profile {
  name: string;
  appearance: Appearance;
}

export function App() {
  const { theme, toggle } = useTheme();
  // Milestone 1: the profile lives only in memory. Real accounts arrive in Milestone 3.
  const [profile, setProfile] = useState<Profile | null>(null);

  return profile ? (
    <OfficePage profile={profile} theme={theme} onToggleTheme={toggle} onLeave={() => setProfile(null)} />
  ) : (
    <LoginPage theme={theme} onToggleTheme={toggle} onEnter={setProfile} />
  );
}
