# Build plan

**Deadline:** Tuesday 13 October, evening. **Start:** Monday 12 October, about 13:30. That's roughly 18 working hours across two days, in 3D.

The plan is ordered so that **a demoable garden exists at every point after Monday evening**. Each phase ends with a gate: a screenshot or a check. If a gate fails, fix it before moving on, or cut scope below the line. Never carry a broken look into the next phase.

> If "Tuesday" means **20 October**, keep the same order, double every time box, and move the cut line to include all *should* phases plus sound.

## Status

| | Phase | Tier | Box | Status |
|---|---|---|---|---|
| P0 | Setup: repo, deps, docs, CLAUDE.md | must | — | ✅ done |
| P1 | Garden engine + tests + simulation | must | — | ✅ done (16 tests, sim tuned) |
| P2 | Scene look: fog, ground, camera, post | must | 1.5h | 🟨 done except P2.1 deploy (needs your Vercel login) |
| P3 | **Flowers**: procedural Bloom in 3D, 4 kinds × 4 states | must | 3.5h | ✅ done (ghost petals falling → P7) |
| P4 | Threads: arcs, pulse, motes, hover | must | 1h | ✅ done |
| P5 | Interaction: hover, focus, tend, ripple, whispers | must | 2h | ✅ done |
| P6 | Planting: overlay, tagging, suggested threads, **the bloom** | must | 2.5h | ✅ done |
| P7 | Time: return replay, **the dissolve**, dark seed, return | must | 2h | ✅ built (not committed; commits and tests by autocode) |
| — | **cut line: below here is optional if behind** | | | |
| P8 | Threshold + first plantings + "a season passes" | should | 1h | ✅ built (handoff to Spark) |
| P9 | Reveal: "what holds you" | should | 1h | ✅ built (handoff to Spark) |
| P10 | Persistence (Dexie) + settings (export, let the garden go) | should | 1h | ✅ built (handoff to Spark) |
| P11 | Sound (Tone.js) | could | 1h | ✅ built (mix by measurement, needs a listen) |
| P12 | Ship: perf, deploy, demo script, look log | must | 1.5h | ⬜ (deploy early in P2) |

```mermaid
gantt
  title Lethe · two-day build
  dateFormat YYYY-MM-DD HH:mm
  axisFormat %a %H:%M
  section Monday
  P2 scene look + first deploy   :p2, 2026-10-12 13:30, 90m
  P3 flowers (hero)             :crit, p3, after p2, 210m
  P4 threads                    :p4, after p3, 60m
  P5 interaction                :p5, after p4, 120m
  section Tuesday
  P6 planting + bloom           :crit, p6, 2026-10-13 08:30, 150m
  P7 time + dissolve            :crit, p7, after p6, 120m
  P8 threshold + first plantings:p8, after p7, 60m
  P9 reveal                     :p9, after p8, 60m
  P10 persistence + settings    :p10, after p9, 60m
  P11 sound                     :p11, after p10, 60m
  P12 ship                      :crit, p12, after p11, 90m
```

## How to work each task

1. Open a fresh Claude Code or Codex session. Paste the phase prompt, then tick the tasks one at a time.
2. **One task per session or commit.** `git commit` after every working step, so a bad change is one revert away.
3. Visual tasks: run `npm run dev`, take a screenshot, compare it to the named screen, and save approved looks to `docs/look-log/YYYYMMDD-HHMM-<what>.png`.
4. After a phase, have the *other* tool review it against `docs/scene-spec.md` and `docs/decisions.md`.
5. Keep `npm test` and `npm run typecheck` green. The engine has no rendering, so test it, don't eyeball it.

---

## P2 · Scene look (1.5h, must)

**Goal:** the empty stage already feels like the screens: night, fog and depth. *Look ref:* screens p3 (garden, no UI) and p14 (empty garden).

- [ ] **P2.1 Deploy first (20m).** `npx vercel` → link → (optional) set `GROQ_API_KEY` in project env → deploy. Check that `/api/tag` returns 200 in production. *Done when:* you have a live URL. (De-risks P12.)
- [x] **P2.2 Fog banks (40m).** `src/scene/fog/FogBanks.tsx`: 8 camera-facing planes with an fbm noise `ShaderMaterial` in `fog`, opacity 0.06, drifting on 40–90s loops; extra banks at opacity 0.14 in front of ghost flowers. Uniform `uDensity` from the share of faded memories. *Done when:* fog visibly drifts and is thicker over m9 and m10.
- [x] **P2.3 Ground + camera (20m).** Soft radial lighten under each cluster (one shader plane). drei `OrbitControls` with the limits in scene-spec (azimuth ±25°, polar 55–85°, distance 4–16, no pan), damping on, and the drift resuming after 5s idle. Scroll out → overview.
- [x] **P2.4 Post + quality (10m).** Wrap the composer in drei `PerformanceMonitor`; on decline, drop to low quality (scene-spec § Post-processing).
- **Gate:** screenshot vs screen p3. Is it dark enough, the fog soft, nothing grey or "Three.js demo"? Save it to the look log.

> **Prompt:** "Read CLAUDE.md, docs/scene-spec.md (World, Fog, Post-processing) and src/scene/GardenScene.tsx. Do task P2.2 from docs/build-plan.md: create src/scene/fog/FogBanks.tsx and mount it in GardenScene. Use only colours from src/engine/color.ts TOKENS. Show me how to check it visually."

## P3 · Flowers, the hero (3.5h, must)

**Goal:** the four flower families, in four states, look like the design system's Bloom page, standing in 3D. *Look ref:* design-system p12 (Bloom grid), screens p2 (focus flower).

- [x] **P3.1 Generator port (60m).** `src/scene/flower/generator.ts`: port `Bloom` from `lethe-design-system/components/bundle.js` into a pure function `generateFlower(kind, seed, size) → { stems: Vec2[][], petals: {path: Vec2[], at, angle, back}[], leaves, florets, head, anchors }` in a flower-local 2D plane (y up, units = px/100). Reuse `rng` from `src/ui/ds.tsx` (move it to `src/engine/rng.ts`). Add a unit test that the same seed gives the same output. *Done when:* the test passes and the output count matches the SVG (petal count, etc.).
- [x] **P3.2 Geometry + materials (75m).** `src/scene/flower/geometry.ts` builds merged BufferGeometries: stem tubes, cupped petal shapes, outlines, place florets (instanced), and the centre. `src/scene/flower/Flower.tsx` renders them with the per-flower uniforms table, Y-billboarded toward the camera. Replace `PlaceholderFlower` in GardenScene.
- [x] **P3.3 States (40m).** Drive `uColor/uFill/uLine/uGlow/uDroop` from `views` with a 3s lerp. Ghost: outline only. Lost: faint outline plus drifting particles from `anchors` (points, 7–13s drift).
- [x] **P3.4 Halo + sway + breathing (25m).** Halo quad, breathing 7s; seeded sway; centre dot feeds bloom.
- [x] **P3.5 Flower sandbox (20m).** `?sandbox=flowers` renders the 4×4 grid (kinds × states) with a seed input and sliders (size, cup, glow) via `leva` (`npm i leva`). Tune by eye. *Built without leva:* `?sandbox=flowers&seed=m1&size=160`, plus a size slider.
- **Gate:** sandbox screenshot next to design-system p12, and garden screenshot next to screens p3. Each flower should be recognisably its family, and no two alike. Save both.

> **Prompt:** "Read CLAUDE.md, docs/scene-spec.md § Flowers, and the Bloom function in lethe-design-system/components/bundle.js. Do P3.1: port the generator to src/scene/flower/generator.ts as pure data (no SVG, no React) and add a determinism test. Keep the exact rng call order so flowers match their 2D twins."

## P4 · Threads (1h, must)

*Look ref:* screens p1/p3, design-system p13.

- [x] **P4.1 Thread shader (30m).** `src/scene/thread/ThreadArc.tsx`: core + glow lines as in scene-spec; a pulse via a custom line material (or a moving sprite along the curve), period seeded 4–7s; motes when s > 0.3.
- [x] **P4.2 Hover + flicker + suggested style (30m).** Brighten or dim on hover (already in the skeleton), flicker to ghost ends, and a dashed variant for suggested threads (used in P6).
- **Gate:** hover Grandma Mei's sentence → its threads glow and the rest dim. The faint 9–10 thread is barely there. *Passed:* the sentence's two threads light; kitchen–Clair de Lune dims with the rest, since it isn't the hovered flower's thread (design system: "brighten its threads"). Sandbox: `?sandbox=threads`.

## P5 · Interaction (2h, must)

*Look ref:* screens p1 (hover), p2 (focus).

- [x] **P5.1 Recollection beside the flower (40m).** Project the flower head to the screen each frame (`vector.project(camera)`). Place the Recollection `space-3` away on the side with more open ground, with `space-5` clear. Hover uses `memory` (24px); focus uses `size="lg"` (32px) on the right half (screen p2).
- [x] **P5.2 Tend feedback (40m).** On `tend` events: a light mote travels from the LightCounter to the flower (0.6s), the counter dot dims, the flower brightens over 1.2s, and a ripple runs along each thread to neighbours (pulse at 2× brightness).
- [x] **P5.3 Whispers (20m).** Move the whisper logic out of App into `src/ui/whispers.ts` following systems.md § Return summary → words. One at a time, hide after 6s or on pointer move.
- [x] **P5.4 Keyboard + a11y (20m).** <kbd>N</kbd> opens planting, <kbd>Esc</kbd> closes focus, <kbd>Tab</kbd> cycles flowers (hidden buttons with `aria-label` = first words), focus ring per design system, and `prefers-reduced-motion`.
- **Gate:** hover, focus, tend, ripple and let go, end to end, with nothing jumping. *Passed in screenshots* (look log 20261012-1730-*). While a memory is open, the rest of the garden recedes to 30% and all threads dim, so no light crosses its words (screen p2). Keyboard focus was verified from the DOM, because headless Edge drops focus when it captures.

## P6 · Planting + the bloom (2.5h, must)

*Look ref:* screens p4, p5, p6, and the bloom storyboard p17.

- [x] **P6.1 Plant overlay (40m).** `+ plant` (bottom centre, as in the screens) or <kbd>N</kbd> → Overlay "What kind of memory?" with four seed dots (screen p4) → the field (p5). Photo: a file input; extract the dominant colour with a 32×32 canvas average, ignoring near-black and near-white; store the blob in P10.
- [x] **P6.2 Live tagging + suggested threads (40m).** Debounce 600ms while typing → offline tags at once, then `apiTag()` (it already backs off after 503/429) → show "threads it could join" chips with × to reject (p6) → dashed suggested threads in the scene from a ghost seed hovering where the flower will grow. Abort stale requests.
- [x] **P6.3 The bloom (50m).** `src/scene/fx/BloomGrowth.tsx`: the 6 beats from scene-spec § The bloom, driven by the `bloom` event. Sandbox at `?sandbox=bloom` with a replay button.
- [x] **P6.4 The first thread (20m).** If the new memory's first thread forms, run the light pulse from it to the neighbour before the thread fades in. Sound hook (P11).
- **Gate:** plant "Osmanthus tea with Grandma Mei on her balcony in Hangzhou." It should grow, thread to m1 and m2, and the Mei cluster should brighten. Works with no API key too (local tags). *Passed with offline tags:* it threads to m1 (level 2), m2 (level 2) and m3 (level 1), and m1's vitality rises 0.900 → 0.908. Found on the way: the demo garden had used up today's planting budget, so planting had silently done nothing since P0 (fixed, with a test). Positions of planted memories live in the store (`positions`) until P10 persists them. "+ plant" sits bottom-left ([D17](decisions.md)). Sandbox: `?sandbox=bloom` (storyboard frames plus live replay).

## P7 · Time, return, dissolve (2h, must)

*Look ref:* screens p11 (return), p16 (neglected), dissolve storyboard p18.

- [x] **P7.1 Return replay (45m).** On `arrive()`, render `states.before`, then ease each flower to `states.after` over 3s, staggered, while fog density rises. The whisper line comes from the summary. About-to-be-lost ghosts glow once (a 1.5s halo pulse) to invite a tend.
- [x] **P7.2 The dissolve (45m).** `src/scene/fx/Dissolve.tsx`: the 6 beats from scene-spec. It ends in a **dark seed** (small dark ellipse + faint ring) that stays clickable and opens focus with `return`.
- [x] **P7.3 Slider polish (15m).** The hidden slider (<kbd>`</kbd>) previews smoothly; "arrive" plays the replay. Add a "reset demo garden" button in the slider panel.
- [x] **P7.4 Neglected-garden check (15m).** Slide +28 days → the garden should look like screen p16: mostly outlines and fog, with a few connected memories still glowing.
- **Gate:** the demo story works: open → hover → tend Leo → slide 2 weeks → arrive → the rooftop dissolves → return it. *Checked in screenshots* (look log 20261012-2000-*): after 21 days the Dad pair, the rooftop and Satie dissolve to seeds and particles and their threads go out; letting go of one memory dissolves it and its thread; +28 days previews a garden like p16. Sandbox: `?sandbox=dissolve`. Not committed and no tests written for P7, as asked: autocode handles both.

---

## ✂ Cut line. Everything above makes a complete demo.

## P8 · Threshold + first plantings (1h, should)

*Look ref:* screens p7, p8–p10, p14.

- [x] **P8.1 Threshold (20m).** A dark screen, a glowing seed, "Plant something you don't want to lose." (`title-lg`), and "Click anywhere to enter · sound on". The first click starts sound and opens either the first plantings (no garden) or the demo garden ("see a garden" link, for judges).
- [x] **P8.2 Prompt cards (25m).** 7 prompts (`FIRST_PROMPTS` in `src/data/sample.ts`), with a dot progress row, skip and plant. Flowers grow below the card as you go (p9, p10), and threads appear between them.
- [x] **P8.3 "A season passes" (15m).** After the last card: one fast-forward of +10 garden days with the return replay, so the player sees fog arrive and learns the rule.
- *Built:* the threshold opens first unless the link has `?demo` (or `?days`, `?sandbox`), so demo and judge links should use `https://lethe-nine.vercel.app/?demo`. "click anywhere to enter" leaves out "· sound on" until P11 adds sound. The first plantings grow at fixed spots low in the frame (`FIRST_PLANTING_PLACES`), so the card never hides them. Photo prompts plant with or without a photo. Skipping all seven opens an empty garden with one glowing seed (p14). The season line is "A season passes.", then the return whisper. Look log: 20261012-2100-p8-*. Note: Spark's P7 commit already contained the P8 store code (`phase`, `beginOwn`, `plantPrompt`, `skipPrompt`, the season), because it shares `src/store/garden.ts`.

## P9 · Reveal (1h, should)

*Look ref:* screens p12.

- [x] **P9.1 View (40m).** "What holds your garden" (`title`), ranked from `holders()`, each with a thin light line whose length is proportional to weight (plain, no numbers, no percentages). Selecting one runs scene-spec § The reveal.
- [x] **P9.2 Entry (20m).** Enter via a quiet `what holds you` word near the top-left name, or by scrolling out to the overview. `back to the garden` returns.
- *Built:* `src/ui/Reveal.tsx` (list, lines of light, labels) and `RevealEntry` beside "lethe". The store has `reveal`, `openReveal` (picks the strongest holder), `selectHolder`, `closeReveal`, and `heldBy`/`useRevealHeld`. The camera rises to a reveal pose with the garden right of the list. Unheld flowers sit at 15%, their threads at 5%, the held threads at ×1.6. Esc or "back to the garden" closes it; "+ plant" hides while it is open. Counts are words ("three memories"), never digits. **Not built:** entering by scrolling out, because zooming out already rises over the garden, and switching screens on a scroll would take control away mid-gesture. Found and fixed: a label running off the right edge blanked the 3D canvas after a few seconds (Leo's flowers stand at the edge); labels now flip to the flower's left and the label layer clips. Look log: 20261012-2200-p9-*. **For Spark:** added `vitest.config.ts` (testTimeout 15s, also in tsconfig `include`). The first tagging test in a file loads compromise cold (~3.5s here), which pushed two unchanged tagging tests past the 5s default. No test file was touched.

## P10 · Persistence + settings (1h, should)

*Look ref:* screens p13.

- [x] **P10.1 Dexie (35m).** `src/store/persist.ts`: tables `garden` (one row: the Garden + layout + version), `photos` (blob by id). Save debounced 500ms after any action; load on start → `visit()`. Add `layout` to the stored garden so positions never move.
- *Built (P10.1):* `src/store/persist.ts` keeps one row (`garden`, `layout` = the store's `positions`, `promptIndex`, `version` 1) and photo blobs (each written once). Only your own garden is kept (`owner: 'own'` in the store); the demo garden and `?demo`/`?days`/`?sandbox` links never read or write it. The store writes 500ms after the last change to the garden, the layout or the prompt index, and again on `pagehide`/hidden. Clicking the threshold now calls `enterOwn()`: with a kept garden it opens it as it was left (or resumes the first plantings at the same prompt), then `arrive()` plays the time away as the return replay; without one it is `beginOwn()` as before. No IndexedDB (tests, some private windows) means the garden lives for the visit only. *Checked in headless Edge over CDP:* two plantings → reload → resumes at prompt 3 of 7; skip the rest → season → reload → the garden opens at the same spots, ghosts after the season, `lastSeenAt` advanced; a `?demo` visit leaves the kept row untouched. Photos are written by the same path but were not exercised in the browser check. No tests written (Spark).
- [x] **P10.2 Settings overlay (25m).** Opens from `lethe` top-left: sound toggle; **export my garden** (a JSON download including photos as base64); **let the garden go** → confirm step "This deletes every memory from this browser." ([D12](decisions.md)); and the privacy note, adapted from p13 because tagging is no longer "done by Claude": "Your memories stay in this browser. Connections are found here, on your device. If this garden has a tagging service, only a memory's words are sent to it, and nothing is stored."
- *Built (P10.2):* `src/ui/Settings.tsx`. "lethe" top-left is now a button that opens the overlay "Your garden": the privacy note as written above, **export my garden** and **let the garden go**, and "back to the garden". Esc closes it, and "+ plant" hides while it is open. Opening settings closes planting, focus and the reveal, and opening those closes settings, so only one overlay is open at a time. Export (`exportFile` in `persist.ts`) downloads `lethe-garden-YYYY-MM-DD.json` (local date) with `{ lethe: 1, exportedAt, garden, layout, photos }`. The layout includes the sample spots, and photos are base64 data URLs. It exports whichever garden is on screen, demo included. The confirm step is "Let the garden go?" with "This deletes every memory from this browser." (D12). Focus lands on "keep the garden", and the pill "let the garden go" clears both Dexie tables, cancels any pending write and returns to the threshold, so a click begins the first plantings afresh. **Sound toggle not built:** it joins this overlay with P11, as the threshold's "· sound on" waits for P11 (`Button` in `ds.tsx` now takes `ref`). *Checked in headless Edge:* export file downloaded with both memories; after letting go the DB was empty, the threshold showed, and a reload began at prompt 1 of 7. Look log: 20261013-0045-p10-*. **Seen, not fixed:** the return whisper read "One day passed. You don't have is drifting into fog.", because `firstWords` cuts the sentence mid-clause (`src/ui/whispers.ts`, outside P10).

## P11 · Sound (1h, could)

- [x] **P11.1 Engine (35m).** `src/sound/sound.ts`: start on first click; a drone (two detuned sines → lowpass) whose cutoff follows the fog share; per-flower pentatonic notes on hover; a tend chime + neighbour ripple; a new-thread chord; a lost-note bend down. Mapping in systems.md § Sound.
- *Built (P11.1):* `src/sound/sound.ts`, which follows the store only. **Start:** the first click or key press anywhere (`listenForFirstGesture` in App), so `?demo` links get sound too. Tone.js makes its audio context the moment it is imported, so it is imported inside that gesture, then `Tone.start()`. Imported earlier, the browser refuses the context and warns in the console. **Drone:** C2 + C2 detuned 11 cents + G2 → 24 dB lowpass → reverb, fading in over 4s. The fog share (fading + ghost of `shown`) moves the cutoff 900 → 220 Hz and the detuned voice −40 → −8 dB over 3s. **Notes:** `noteOf(id, kind)` = C D E G A by `hashSeed(id) % 5`, octave 3 for place, 4 for sentence and photo, 5 for song. Hover plays a soft triangle note, at most one per 140ms. A `tend` event plays an FM bell, and the `ripple` ids follow it 120ms apart. A `bloom` event (planting or return) sounds its note with its neighbours' (up to 4) when the first-thread pulse lands (`BLOOM_MS.settle + RIPPLE_TRAVEL_MS`), with a 1.5s release. A `dissolve` event bends the note down a minor third over 2s while it fades, at the event's own (staggered) time. A provider retag that adds a thread later stays silent. Levels are a first guess for P11.3 (drone −26, hover −20, chime −10, ripple −18, chord −17, lost −19 dB). The threshold hint now reads "click anywhere to enter · sound on". *Checked in headless Edge* by tapping the output with an analyser, under the normal autoplay policy: one audio context, running after the click; drone ≈ −35 dB RMS; a tend lifts it to ≈ −26 dB; `?days=21` → arrive with several dissolves stacked peaks at ≈ −19 dB (watch this in P11.3). No new console errors.
- [x] **P11.2 Mute (10m).** `sound on/off` bottom-right, remembered in localStorage.
- *Built (P11.2):* `src/ui/SoundToggle.tsx` shows one word, "sound on" or "sound off" (what you hear now; a click turns it the other way, `aria-pressed`). It sits bottom-right (`.bottom-right`, the same edge style as "+ plant") in the first plantings and the garden, and also first in settings, where it takes focus when settings opens. `setMuted`/`isMuted`/`onMuteChange` live in `sound.ts`, and the choice is remembered in localStorage `lethe.sound` (`on`/`off`, inside try/catch). The master is a linear `Tone.Gain`, faded over 0.6s, because Tone ramps decibels exponentially and they never reach silence. Sound remembered as off still starts the context on the first gesture, silent, so turning it on later just works. The threshold hint drops "· sound on" when sound is off. *Checked in headless Edge with the output analyser:* drone ≈ −34 dB → off → −67 dB after ~0.7s → silent from ~1.4s on; reload → "sound off", silent after the click; on again in settings → ≈ −35 dB. Look log: 20261013-0100-p11-sound-off.
- [x] **P11.3 Mix pass (15m).** Everything quiet. Nothing above −12 dB except the chime.
- *Built (P11.3), by measurement, not by ear:* peaks at the output (analyser tap, headless Edge), before → after, in dB: drone −30 → −28 (−30 in deep fog), hover −19 → −23, **tend chime + ripple −19 → −12** (the FM bell came out ~9 dB under its velocity, so the chime was quieter than a hover; `BELL_GAIN` +9), **planting chord −8 → −17** (the notes summed; the chord's level now drops by 20·log10(n/2) for n notes), **21-day return with stacked losses −11 → −17** (at most `LOST_VOICES` = 3 notes bend at once, the rest of that moment's losses stay silent, and the lost level is −24). Levels: hover −25, chime −10, ripple −22, chord −20, lost −24, drone −26. A `Tone.Limiter(−6)` sits on the master as a safety net only; nothing reaches it. **Still needs a listen on real speakers** (timbre, reverb 7s / wet 0.38, and whether the drone is too present), which a measurement can't judge.

## P12 · Ship (1.5h, must)

- [ ] **P12.1 Perf (30m).** Seed 200 flowers (`?stress=200`) → 60fps on a laptop? If not: merge geometries, cut halo quads for faraway flowers, use low quality.
- [ ] **P12.2 Demo script (20m).** Write the 90-second judge path in README (below) and rehearse it twice.
- [ ] **P12.3 Final deploy + check (20m).** Check production: tagging works, the no-key fallback works, there are no console errors, and fonts load.
- [ ] **P12.4 Look log + README screenshots (20m).**

### The 90-second demo path

1. Threshold → click (sound starts) → "see a garden".
2. Hover "You don't have to be brave all the time." → Grandma Mei's threads light up.
3. Click it → **tend** → a light mote flies, the ripple runs to the kitchen and Clair de Lune.
4. **plant** "Osmanthus tea with Grandma Mei on her balcony in Hangzhou." → suggested threads → bloom → first thread.
5. <kbd>`</kbd> → slide two weeks → **arrive** → fog rolls in, the library rooftop dissolves into a dark seed. The whisper names what still holds the rest.
6. Click the dark seed → **return**.
7. **what holds you** → Grandma Mei → the garden dims except her threads.

## Stretch (only if everything above is done)

- Draw a thread by hand (drag from flower to flower) and reject an existing thread from focus.
- d3-force drift: flowers settle into clusters along their threads.
- Seasons: the light colour shifts through the year.
- A "share a still" export of the canvas.

## Risk watch (check at each gate)

| risk | sign | response |
|---|---|---|
| P3 runs long | at 3.5h, flowers still look like spheres | ship the SVG flowers as textures on camera-facing planes (render each `Bloom` SVG to a canvas texture), keep the 3D fog, threads and camera. That's still 3D, and it's an hour's work. |
| Generic look | anything grey, bright or busy | compare with the look log; lower bloom, darken the ground, more fog |
| Tagging slow/down | > 2s or errors | already falls back locally; show suggestions only when they arrive, never block plant |
| Perf | < 45fps | quality tier down, fewer fog banks, merge |
| Overtime | behind at Tuesday 13:00 | stop at the cut line, go straight to P12 |
