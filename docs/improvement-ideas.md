# Improvement ideas

Two gaps found while demoing: the garden's rules are invisible until you have lived with it for weeks.
Proposals only — nothing here is planned or built. When one is accepted, move it into `docs/build-plan.md`
(P8 touch-ups for understanding, P12.2 for the demo) and follow `docs/decisions.md` over anything below.

## 1. Unconnected memories: the rule is never taught

Threads only grow from *named* shared people, places and feelings (offline tagger at planting).
The planting overlay teaches this live ("threads it could join" chips + dashed preview threads, P6.2),
but the first-plantings cards don't (`src/ui/FirstPlantings.tsx` is a field plus plant/skip). A new person
can write seven disconnected memories, see no threads, and leave never knowing the rule. The reveal
(`src/ui/Reveal.tsx`) teaches it retroactively, but only if threads exist.

### Options

- **A. Live thread preview in the first-plantings card (recommended).** Reuse the P6.2 machinery
  (`previewThreads` + ghost seed + chips) inside the prompt card, debounced off the offline tagger while
  typing. When ≥1 thread would form, grow it dashed below the card; when none would, one quiet line under
  the field, e.g. `name someone already here and a thread will grow`. Teaches the rule at the writing
  moment, with real threads only. ~1h, no new UI surface.
- **B. First-visit rule whisper (cheap companion).** When the garden first opens, one idle line in
  `src/ui/whispers.ts` stating the rule as the system phrases it, e.g.
  `memories that share someone hold each other up`. Zero UI, lowercase voice, no "you haven't". ~10 minutes.
- **C. Same no-match hint in the free-plant overlay.** `src/ui/PlantOverlay.tsx` shows chips when matches
  exist; add the quiet hint from A when they don't. ~20 minutes.

### Do not

- Prompt cards that auto-suggest entities ("with Leo again?"): dishonest threads break pillar 4
  (the garden reveals you); threads must be real.
- Counting threads anywhere ("3 threads"): forbidden voice, teaches score-thinking.

The prompts themselves are fine (`FIRST_PROMPTS` in `src/data/sample.ts` is already person/place-heavy).
What's missing is feedback, and A supplies it.

## 2. Dying can't be seen in a 3-minute demo

S₀ = 7 garden days and 1 real day = 1 garden week (D2, D9), so reaching a dissolve honestly takes
~3 garden weeks. But the mechanism already exists: `?days=21` + `arrive()` plays the return replay
(staggered 3s eases, fog rise, 4.5s dissolve), step 5 of the 90-second demo path in `docs/build-plan.md`.
This is packaging, not a missing feature.

### Options

- **A. Shot-list links (works today, no code).** The video needs three links, not one take: `?demo`
  (fresh garden) → slide/`?days=21` + arrive (the dissolve, caught live — the most cinematic 10s in the
  product) → `?days=28` (the neglected garden, screen p16). The P8.3 season pass (+10 days,
  "A season passes.") already gives every new user the fog-arriving moment. Write this up as the video
  shot list inside P12.2. Numbers and timelines live in the voiceover, never in the UI.
- **B. One-click story mode (only if the video needs a single take).** A quiet `watch a season` word
  near the top-left (same pattern as `RevealEntry`) that autoplays the demo path on the demo garden —
  arrive replay → dissolve → return → reveal — with caption whispers, Esc exits any time. ~1–2h. Risk: a
  new mode in a product with no menus or dashboards; it must stay invitational and skippable.
- **C. Longer first season (optional lever).** 10 → 14 days (`SEASON_DAYS` in `src/store/garden.ts`).
  At S₀ = 7, +14d takes fresh 0.9 memories to ~0.14 — visibly ghosted with the whisper naming them.
  Costs no waiting (days pass as instant replay); needs a store-side test update.

### Do not

- A visible day-scrubber or countdown: reads as progress/streak machinery, breaks the Never list in
  `CLAUDE.md` and the time rules (D9).
- An accelerated in-product clock: breaks pillar 1 — forgetting must feel like dusk, not a timer.

## Suggested order

1. A for the video now (P12.2 shot list, no code).
2. 1A–1C for onboarding (they fix the real product, not just the demo).
3. 2B only if the video edit proves it needs one continuous take.
