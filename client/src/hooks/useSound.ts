import { useEffect, useState } from 'react';
import { sound } from '../audio/sound';

/** React view of the sound engine's on/off switches. */
export function useSound() {
  const [prefs, setPrefs] = useState(sound.settings);
  useEffect(() => sound.subscribe(setPrefs), []);
  return {
    sfx: prefs.sfx,
    music: prefs.music,
    toggleSfx: () => sound.setSfx(!prefs.sfx),
    toggleMusic: () => sound.setMusic(!prefs.music),
  };
}
