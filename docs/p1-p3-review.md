# P1–P3 review

Audit of the three done phases (engine, scene look, flowers) against `decisions.md`, `scene-spec.md`, `systems.md` and the Never list in `CLAUDE.md`. Health at review time: tests 62/62 green, `npm run typecheck` clean, `npm run sim -- lazy` 14/16 survive. The numeric core of all three phases is right — every forgetting number, thread formula, fog value and petal count checks out.

Mistakes are ordered by urgency. Depth ideas are ordered by which phase owns their hook — do each *with* its phase, not after.

## Must fix — these will bite the next phases

**Camera (P2.3) — 4 mismatches, blocks P5 focus work.** `src/scene/camera/CameraRig.tsx:87` allows polar 35°, spec floor is 55° — users can go near-top-down and see past the ground fade. `:23` FAR maxPolar 50° vs spec 55°. `:91-99` has no 5s-idle gate, drift resumes instantly. The focus pose polar is ~84.8° against an 83° clamp (`:68-71` vs `:22`) — the lerp fights OrbitControls every focused frame. "Scroll out → overview" is ticked done but nothing glides to `(0,9,6)` — untick or build.

**Store commits previewed time.** `tendMemory`/`plantMemory` use `get().now()` including the hidden-slider offset, so acting while slid forward writes future timestamps — but `systems.md:55` promises scrubbing "previews without committing". Block actions while offset ≠ 0, or document the commit. Do before P7.3 slider polish.

**`aboutToBeLost` re-fires.** `src/engine/garden.ts:172-173` reports every ghost below 0.12, including ones already below last visit — but systems says they "glow once". Filter to newly-below-threshold.

**Manual threads die forever.** `src/engine/threads.ts:53,64` drops hand-drawn threads touching lost memories, and `returnTo` (`garden.ts:136-144`) only rebuilds auto ones — contradicting D4 "its threads re-form". Include manual edges in re-formation or amend D4.

**Halo isn't additive.** `src/scene/flower/materials.ts:154,162` lacks `blending: THREE.AdditiveBlending` (threads have it). Formula is right, but Normal blending reads as veil, not glow — likely bug, one line, check in sandbox.

**Numbers outside `constants.ts`.** `advance` step `0.25` (`garden.ts:152`), brightness `/0.9` (`threads.ts:121`), `STATE_COLOR_SHARE` (`color.ts:24`), guards (`forgetting.ts:10,15`) — violates `CLAUDE.md:26`. Move or scope the rule to tuning numbers.

## Should fix soon — spec drift, no behaviour risk

- **Flower uniforms vs spec table:** `uGlow` 1.0/0.45 vs 1.6/0.8, `uDroop` values plus a unit confusion (spec says rad, code is shear share), sway table contradicts the spec's own Glow paragraph (code's choice looks right — table is stale), `CUP 0.35` vs spec 0.15, stem-tube and sphere-centre rows describe geometry that no longer exists. Tune-or-document each; don't touch code blind.
- **D6 wording:** code does `weight·min(1,√…/0.9)` matching systems + test — decisions reads `min(1, weight·…/0.9)`. One parenthesis in docs, not a code change.
- **Two holder implementations:** systems cites `stillHeldBy` (`garden.ts:213-226`, untested, no caller) but whispers use `holderOf`. Delete one.
- **"Only the store calls engine actions"** is violated by `sample.ts:42-46` — harmless, reword the rule to include factories.
- **Post nits:** `onIncline` restores high tier (yo-yo on marginal machines — latch low), `antialias:true` is dead behind `multisampling={0}` (P12 budget).

## Traps to plan now, not in P12

- **Perf:** 200 flowers ≈ 1000 draws (no shared materials, no halo cull, motes submitted when `uMotes=0`), fog banks O(N), no `renderOrder` anywhere (transparent pop while orbiting), `?stress=200` doesn't exist yet.
- **P6 bloom has no hooks:** 6-beat storyboard needs per-petal id, stem `drawRange`, growth uniform — today's merged fill mesh can't do any of it. Plan the attribute with P6, or it becomes a rewrite. Same for P7 dissolve (per-petal velocity, dark-seed component; ghost→lost currently pops `droop 0.07→0.05`).
- **P7 vs fog:** replay wants "fog rolls in" but fog lags views ~4–5s through chained damps — needs the missing `uDensity`-style boost handle. Memory banks sit at 0.14 over the dark seed forever, veiling the very thing P7 needs legible.
- **P5 camera:** `flowerHead()` rebuilds generator+geometry per frame while focused (memo on focus change); dragging while focused then unfocusing jumps (update `rest` on every `onEnd`).
- **Test gaps, biggest first:** action guards (tend/return at 0 light, let-go-of-lost), planting budget (7-free, 3/day — zero tests), bonus-cap shape + lost-neighbour cascade, spill exactness, return specifics (0.2, S=7, −1 light, re-form), rejected/manual/suggested threads, `visit()` end-to-end, holders vote-summing + lost-exclusion.

## Depth ideas — fun but philosophical, pillar-fitting

1. **Fog remembers what left** (with P7 dissolve): dissolved threads linger as afterimages at 0.05 decaying over 30s; tending a neighbour rekindles to 0.15. The garden keeps a map of every connection it held — pillar 1 made visible.
2. **The lean** (with P6 bloom planning): a tended flower leans toward its strongest thread-neighbour for a day. Connection becomes posture; choosing whom to tend reshapes the skyline — pillars 2+3.
3. **Reunion bloom** (engine, anytime): returned memories' re-formed threads carry +0.1 weight for 7 days. Coming back brightens the cluster — the garden reveals what *mends* a life, not just what holds it.
4. **Kept petal** (with P6/P7): each fallen ghost petal leaves one faint ring at the base, max three, cleared only by tending. Neglect becomes countable absence; return feels like gathering.
5. **Mourning slows the cascade** (engine, one line + test): neighbours of a lost memory decay at 90% for one garden day. Loss cradles instead of punishing twice.
6. **First-petal blush** (with P7 return): a returned flower reopens one vivid petal for a day while the rest stay pale. Being brought back is gradual.
7. **Sleeping-garden tide** (P5 idle path): after 30s no input, drift widens, fog +0.01, halos to 85% — the garden exhales unwatched; first touch wakes it over 2s.

## Suggested order for Claude

Camera 4 fixes → halo line → preview-commit guard → `aboutToBeLost` + manual re-form (with tests) → constants/D6/docs hygiene → then ideas 1–3 with their phases. Nothing here blocks P5 starting; ideas 1, 2, 6 want their hooks planned before P6/P7 code lands.
