// SKELETON app shell: the 3D garden fills the screen; edge interface floats over it.
// Screens still to build (threshold, first plantings, return, reveal, settings) are tasks in docs/build-plan.md.

import { useEffect, useState } from 'react';
import { preloadOfflineTagger } from './tagging/offline';
import { C, firstWords, stillHeldBy } from './engine';
import { DEFAULT_WHISPER } from './data/sample';
import { GardenScene } from './scene/GardenScene';
import { useGarden } from './store/garden';
import { Button, LightCounter, PlantField, Recollection, Whisper } from './ui/ds';

export function App() {
  // Fetch the offline tagger's NLP library in the background, so the first planting never waits for it.
  useEffect(preloadOfflineTagger, []);
  return (
    <div className="stage">
      <GardenScene />
      <span className="interface-sm edge top-left">lethe</span>
      <Light />
      <HoverRecollection />
      <FocusRecollection />
      <Planting />
      <GardenWhisper />
      <TimeSlider />
    </div>
  );
}

function Light() {
  const light = useGarden((s) => s.garden.light);
  return <LightCounter className="edge top-right" value={light} max={C.LIGHT_MAX} showLabel />;
}

const heldByNames = (id: string) => {
  const { garden } = useGarden.getState();
  const m = garden.memories[id];
  return [...m.people, ...m.places].map((e) => garden.entities[e]?.name).filter(Boolean).concat(m.happenedAt ? [m.happenedAt] : []);
};

function HoverRecollection() {
  const hoveredId = useGarden((s) => s.hoveredId);
  const focusedId = useGarden((s) => s.focusedId);
  const views = useGarden((s) => s.views);
  const m = useGarden((s) => (hoveredId ? s.garden.memories[hoveredId] : null));
  if (!m || focusedId) return null;
  // TODO P5: float beside the flower (project head to screen, space-3 away, on the side with more open ground).
  return (
    <div className="hover-recollection">
      <Recollection text={m.text} seed={m.id} kind={m.kind} vitality={views[m.id].vitality} state={views[m.id].state} heldBy={heldByNames(m.id)} />
    </div>
  );
}

function FocusRecollection() {
  const focusedId = useGarden((s) => s.focusedId);
  const views = useGarden((s) => s.views);
  const light = useGarden((s) => s.garden.light);
  const m = useGarden((s) => (focusedId ? s.garden.memories[focusedId] : null));
  const { tendMemory, letGoMemory, returnToMemory, focus } = useGarden.getState();
  if (!m) return null;
  const v = views[m.id];
  return (
    <div className="focus-recollection">
      <Recollection size="lg" text={m.text} seed={m.id} kind={m.kind} vitality={v.vitality} state={v.state} heldBy={heldByNames(m.id)}
        actions={v.state === 'lost'
          ? <><Button variant="pill" disabled={light < C.RETURN_COST} onClick={() => returnToMemory(m.id)}>return</Button>
              <Button onClick={() => focus(null)}>back to the garden</Button></>
          : <><Button variant="pill" disabled={light < C.TEND_COST} onClick={() => tendMemory(m.id)}>tend</Button>
              <Button onClick={() => letGoMemory(m.id)}>let go</Button>
              <Button onClick={() => focus(null)}>back to the garden</Button></>} />
    </div>
  );
}

function Planting() {
  const plantMemory = useGarden((s) => s.plantMemory);
  const [busy, setBusy] = useState(false);
  return (
    <PlantField className="edge bottom-left" disabled={busy}
      onPlant={async ({ kind, text }) => { setBusy(true); try { await plantMemory(kind, text); } finally { setBusy(false); } }} />
  );
}

/** One whisper at a time; hides after 6s or on the next pointer movement. */
function GardenWhisper() {
  const [visible, setVisible] = useState(true);
  const views = useGarden((s) => s.views);
  const garden = useGarden((s) => s.garden);
  const faintest = Object.values(views).filter((v) => v.state === 'ghost' || v.state === 'fading').sort((a, b) => a.vitality - b.vitality)[0];
  let line = DEFAULT_WHISPER;
  if (faintest && garden.memories[faintest.id]) {
    const holder = stillHeldBy(garden, faintest.id, useGarden.getState().now());
    line = `${firstWords(garden.memories[faintest.id].text, 4)} is drifting into fog.${holder ? ` ${holder} still holds it.` : ''}`;
  }
  useEffect(() => {
    setVisible(true);
    const hide = () => setVisible(false);
    const t = setTimeout(hide, 6000);
    const onMove = () => { setTimeout(hide, 800); window.removeEventListener('pointermove', onMove); };
    const arm = setTimeout(() => window.addEventListener('pointermove', onMove), 1500);
    return () => { clearTimeout(t); clearTimeout(arm); window.removeEventListener('pointermove', onMove); };
  }, [line]);
  return <Whisper className="edge bottom-center" visible={visible}>{line}</Whisper>;
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
