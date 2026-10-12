// `sound on/off` (P11.2): one quiet word bottom-right, and the same word in settings. It says what you hear now;
// a click turns it the other way. Remembered in this browser.

import { useSyncExternalStore, type Ref } from 'react';
import { isMuted, onMuteChange, setMuted } from '../sound/sound';
import { Button } from './ds';

export function useMuted() {
  return useSyncExternalStore(onMuteChange, isMuted);
}

export function SoundToggle({ className, ref }: { className?: string; ref?: Ref<HTMLButtonElement> }) {
  const muted = useMuted();
  return (
    <Button ref={ref} className={className} aria-pressed={!muted} aria-label={muted ? 'sound off: turn sound on' : 'sound on: turn sound off'}
      onClick={() => setMuted(!muted)}>
      {muted ? 'sound off' : 'sound on'}
    </Button>
  );
}
