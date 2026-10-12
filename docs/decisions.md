# Decisions

Where the project plan, the screens and the design system disagreed, this file says which one wins. Newest at the top. If you change a decision, edit it here first, then the code.

| # | Topic | Decision | Why | Overrides |
|---|---|---|---|---|
| D1 | Rendering | **3D: Three.js through React Three Fiber, drei and postprocessing.** Flowers are procedural meshes that turn to face the camera around their own vertical axis (Y-billboard), so they read like the 2D screens while living in real depth, fog and parallax. DOM interface floats over the canvas. | Chosen by the owner. The Y-billboard keeps the 2D botanical look of the screens and the design-system `Bloom` generator, so it can be ported rather than reinvented. | Design system's SVG `Bloom`/`Thread` (kept as the reference look, not used at runtime) |
| D2 | Forgetting numbers | **Design system v2:** S₀ = 7 garden days, tend multiplies S by 1.8, states vivid ≥ 0.6, fading ≥ 0.3, ghost ≥ 0.08, lost below. | Newer, and the components already use these thresholds. | Plan (S=10, ×1.5, 0.7/0.4/0.15) |
| D3 | Thread bonus | Each thread adds 5 × weight to S, **saturating at 8 days** (`THREAD_BONUS_CAP`). | `npm run sim` showed uncapped bonuses make a well-connected garden almost immortal (23 of 25 survived with no tending). With the cap, a neglected garden loses about half, and the survivors are the connected ones. | Plan ("each thread adds 5") |
| D4 | Is loss permanent? | **No. A lost memory leaves a small dark seed and keeps its words.** Returning costs 1 light and brings it back as a ghost (vitality 0.2, fresh stability). Its threads re-form. | The design system says "a lost memory can always be returned to", and so does the dissolve storyboard's last frame. Gentler loss fits pillar 1. | Plan's suggested answer ("text is gone") |
| D5 | Letting go | `let go` is the person's choice: the memory drifts to lost immediately, with no confirmation and no red. Same return rule as D4. | Design system Button rules. | — |
| D6 | Thread weight | Shared people + places: 1 → 0.85, 2 → 0.95, 3+ → 1.0. Feeling-only → 0.3. On screen, brightness = weight × √(vitalityA × vitalityB) / 0.9, capped at 1. | Reproduces the sample-content strengths (0.95, 0.85, 0.55, 0.45, faint) from rules, not hand-set numbers. | Plan's 3 integer levels (kept as `level`) |
| D7 | Tend spill-over | Each neighbour regains 30% × thread weight of what it has lost. | Plan's 30%, scaled by strength as the design system asks. | — |
| D8 | Light | 3 per real day, carry over up to 5, tend costs 1, return costs 1. | Plan. | — |
| D9 | Time | 1 real day = 1 garden week. After 14 real days away, fog runs at 25% speed (never stops). Hidden slider: press <kbd>`</kbd>. | Plan, plus its suggested answer for long absences. | — |
| D10 | Planting limit | Free during the first 7 plantings, then 3 per real day. | Plan's suggested answer. | — |
| D11 | Return line | Name memories, don't count them. "Four days passed. The library rooftop is about to be lost." rather than "3 memories faded." | The design-system Whisper forbids counts; screen 11 used them. Names make fading an invitation. | Screen 11 copy |
| D12 | Settings wording | Use "let the garden go" for delete-all, but the confirm step says plainly "This deletes every memory from this browser." | Voice rules forbid "delete", but privacy controls must be unambiguous. This is the one place plain words win. | Screen 13 copy, partly |
| D13 | Tagging model | `claude-opus-5-5` at `effort: "low"` with structured outputs (`output_config.format`). On refusal or failure, the result is "no tags", and the client falls back to matching known names locally. | Guaranteed-valid JSON; low effort keeps it fast. Planting never blocks on the network. | Plan said "tool use or structured output" |
| D14 | Hosting | Vercel: static Vite build plus one function, `/api/tag`. The dev server serves the same handler. | One deploy, same origin, no CORS, and the key stays server-side. | Plan offered Cloudflare or Vercel |
| D15 | Layout | Sample memories use the design-system layout (1440 × 900 canvas) mapped to world space. New memories are placed on a golden-angle spiral with ≥ 96px between bases. d3-force clustering is a stretch goal. | Deadline. The fixed layout already matches the screens. | Plan (d3-force) |
| D16 | Copy casing | Interface words are lowercase everywhere (`plant`, `tend`), including buttons the screens show capitalised. | Design system voice. | Screens 4–6 |

## Still open (decide when you reach them)

- **Ending.** Suggested: none, the garden is ongoing. No code is needed either way.
- **Photo storage size.** Suggested: downscale to 1024px JPEG before storing in IndexedDB.
- **First-run demo vs empty garden.** For the contest demo, start with the sample garden and offer "begin your own" on the threshold. For real use, start empty and run the first plantings.
