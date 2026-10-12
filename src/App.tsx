// App shell: the 3D garden fills the screen; edge interface floats over it.
// Screens still to build (threshold, first plantings, return replay, reveal, settings) are tasks in docs/build-plan.md.

import { useEffect, useState } from 'react';
import { C } from './engine';
import { GardenScene } from './scene/GardenScene';
import { useGarden } from './store/garden';
import { preloadOfflineTagger } from './tagging/offline';
import { Button, LightCounter } from './ui/ds';
import { FlowerTargets } from './ui/FlowerTargets';
import { GardenWhisper } from './ui/GardenWhisper';
import { PlantButton, PlantOverlay } from './ui/PlantOverlay';
import { FocusRecollection, HoverRecollection } from './ui/Recollections';
import { TendMote } from './ui/TendMote';
import { useGardenKeys } from './ui/useGardenKeys';

export function App() {
  // Fetch the offline tagger's NLP library in the background, so the first planting never waits for it.
  useEffect(preloadOfflineTagger, []);
  useGardenKeys();
  return (
    <div className="stage">
      <GardenScene />
      <FlowerTargets />
      <span className="interface-sm edge top-left">lethe</span>
      <Light />
      <HoverRecollection />
      <FocusRecollection />
      <PlantButton />
      <PlantOverlay />
      <GardenWhisper />
      <TendMote />
      <TimeSlider />
    </div>
  );
}

function Light() {
  const light = useGarden((s) => s.garden.light);
  return <LightCounter className="edge top-right light-counter" value={light} max={C.LIGHT_MAX} showLabel />;
}

/** Hidden time slider for testing and demos. Toggle with the ` key. Scrub, then "arrive" to commit the time as a return visit. */
function TimeSlider() {
  const [open, setOpen] = useState(false);
  const offset = useGarden((s) => s.clock.debugOffset);
  const { setDebugOffset, arrive } = useGarden.getState();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === '`') setOpen((o) => !o); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!open) return null;
  return (
    <div className="time-slider interface-sm">
      <label>
        +{offset.toFixed(1)} garden days ({(offset / C.GARDEN_DAYS_PER_REAL_DAY).toFixed(1)} real)
        <input type="range" min={0} max={42} step={0.5} value={offset} onChange={(e) => setDebugOffset(Number(e.target.value))} />
      </label>
      <Button variant="pill" onClick={arrive}>arrive</Button>
    </div>
  );
}
