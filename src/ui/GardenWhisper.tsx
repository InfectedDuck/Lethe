// One whisper at a time, centred at the bottom (design system Whisper). After a return visit it tells what
// happened while the person was away; otherwise it names the faintest memory and what still holds it.
// It fades in, then out after 6s or on the next pointer movement.

import { useEffect, useState } from 'react';
import { useGarden } from '../store/garden';
import { Whisper } from './ds';
import { idleWhisper, returnWhisper } from './whispers';

const SHOW_MS = 6000;
/** Ignore pointer movement for a moment, so the whisper can be read before a twitch of the mouse hides it. */
const ARM_MS = 1500;

export function GardenWhisper() {
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const summary = useGarden((s) => s.returnSummary);
  const override = useGarden((s) => s.whisperOverride);
  const phase = useGarden((s) => s.phase);
  const line = override ?? ((summary && returnWhisper(garden, views, summary)) || idleWhisper(garden, views));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const hide = () => setVisible(false);
    const t = setTimeout(hide, SHOW_MS);
    const onMove = () => hide();
    const arm = setTimeout(() => addEventListener('pointermove', onMove, { once: true }), ARM_MS);
    return () => { clearTimeout(t); clearTimeout(arm); removeEventListener('pointermove', onMove); };
  }, [line]);

  if (!line || phase !== 'garden') return null;
  return <Whisper className="edge bottom-center whisper" visible={visible}>{line}</Whisper>;
}
