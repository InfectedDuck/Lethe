# Systems

The rules of the garden as the engine implements them. Every number lives in [src/engine/constants.ts](../src/engine/constants.ts); this page explains them. Tests in [src/engine/engine.test.ts](../src/engine/engine.test.ts) pin the behaviour.

## Forgetting

```
vitality  v = e^(−t / S_eff)        t = garden days since last tended
S_eff = S + CAP · (1 − e^(−bonus / CAP))     bonus = Σ 5 · weight(thread)  over threads to living memories
```

| constant | value | meaning |
|---|---|---|
| `S_INITIAL` | 7 | S at planting (garden days) |
| `TEND_STABILITY_MULT` | 1.8 | each tend multiplies S |
| `THREAD_STABILITY_BONUS` | 5 | days of S per unit thread weight, before saturation |
| `THREAD_BONUS_CAP` | 8 | most S that threads can add |
| `VIVID_AT / FADING_AT / GHOST_AT` | 0.6 / 0.3 / 0.08 | state thresholds |
| `ABOUT_TO_BE_LOST_BELOW` | 0.12 | ghosts this faint glow once on return |

What this means in real time (1 real day = 7 garden days):

| memory | lost after |
|---|---|
| alone, never tended | ~2.5 real days |
| one strong thread (S_eff ≈ 10.4) | ~3.7 real days |
| hub, many threads (S_eff → 15) | ~5.4 real days |
| tended once (S = 12.6, alone) | ~4.5 real days |
| tended twice + hub (S ≈ 22.7 + 8) | ~11 real days |

**Vitality is derived, never stored.** A new thread raises an old memory's S_eff at once, so its vitality jumps up. This is how "new threads can rescue fading ones" (plan § Return visits). A neighbour being lost lowers S_eff, so loss can cascade gently. Ease every visual change over about 3s so jumps never show.

## Threads

- Two memories that share a **person or place** get a thread. `level` = number shared (1–3).
- A shared **feeling** alone gives a faint thread (`level 0`, weight 0.3), so everything doesn't link through "joy".
- Weight: level 1 → 0.85, 2 → 0.95, 3 → 1.0, feeling-only → 0.3.
- **Brightness on screen** = weight × min(1, √(vA·vB) / 0.9). This reproduces the sample strengths: Mei 1–2 = 0.95, vivid–fading = ~0.6, fading–fading = ~0.43.
- The person can **reject** a suggested thread (it's never suggested again) or **draw** one by hand (`source: 'manual'`, level 1).
- Threads to lost memories disappear (`rebuildThreads`). Returning a memory re-forms them.
- **Entity matching.** Claude gets the known entities and returns their ids when a new name matches ("my mother" → `person:mother`). The engine also normalises names locally: lowercase, strips "my/the", strips possessive `'s`, and keeps aliases.

## Tending and light

- `tend(id)`: −1 light, `t ← 0`, `S ← S × 1.8`, then each living neighbour gets back `30% × weight` of what it has lost (`v ← v + 0.3·w·(1−v)`).
- `returnTo(id)` on a lost memory: −1 light, returns as a ghost at v = 0.2 with S = 7, and its threads re-form.
- `letGo(id)`: free and immediate. The words are kept, so it can be returned to.
- Light: +3 per whole real day since the last grant, capped at 5. No streaks, no notifications.

## Time

- `gardenNow = lastSeenAt + gardenDaysForRealDays(realDaysSince) + debugOffset`.
- After 14 real days away, the extra time counts at 25%.
- `visit()` runs on every load: grant light → `advance()` in 0.25-day steps (so a loss weakens neighbours in order) → summary.
- **Hidden slider:** press <kbd>`</kbd>. Scrubbing previews the future without committing. **arrive** commits it as a real return visit, with its replay.

## Return summary → words

`ReturnSummary { gardenDaysPassed, realDaysPassed, faded[], lost[], aboutToBeLost[] }`, written as one whisper line ([decisions D11](decisions.md)):

1. `"{N} days passed."` Use real days, as a word: "Four days passed." Skip it if under 1 day.
2. If something is about to be lost: `"{name} is about to be lost."` Otherwise, if lost: `"{name} drifted into the fog."` Otherwise, if faded: `"{name} is drifting into fog."`
3. If the faded or about-to-be-lost memory has a holder: `"{holder} still holds it."` (`stillHeldBy`).

Never use counts, "you haven't…", warnings or exclamation marks. Names come from `firstWords(text, 4)` ("The library rooftop", "Gymnopédie No. 1").

## Reveal: "what holds you"

`holders(garden, now)` ranks people and places by Σ vitality of the living memories that mention them. Selecting one dims everything except those memories and the threads between them.

## Tagging contract

`POST /api/tag` with `{ kind, text (≤400), known: [{id, kind, name}] }` returns `{ people: [{name, id|null}], places: [{name, id|null}], feelings: string[] }`.

| status | meaning | client does |
|---|---|---|
| 200 | tags | show as suggested threads |
| 400 | bad body | local fallback |
| 429 | busy | local fallback |
| 502 | API error | local fallback |
| 503 | no key configured | local fallback (the demo works with no key) |

## Sound (Tone.js), mapped to events

| event | sound |
|---|---|
| first click on threshold | start audio context; drone fades in over 4s |
| fog share (fading+ghost / all) | drone filter cutoff falls and a second detuned voice rises in volume |
| hover flower | that flower's note: pentatonic (C D E G A), octave by kind (place low, sentence mid, song high, photo mid), note index = hash(id) % 5 |
| tend | soft chime on the flower's note, then each neighbour's note 120ms apart along threads |
| new thread | the two notes resolve into a chord (play together, 1.5s release) |
| lost | the note bends down a minor third over 2s and fades |
| mute | visible `sound on/off` bottom-right; remembered |

## Tuning targets

Re-run `npm run sim -- daily|lazy|none` after any constant change. Current results (30 planned plantings, 9 real days):

| player | survivors | target |
|---|---|---|
| attentive (daily, spends all light) | 25/25 | almost everything, with fading visible |
| lazy (every 3rd day) | 14/16 | loses a few; the losses feel like choices |
| absent (never tends) | 11/25, avg 4.5 threads each | about half, and the survivors are the connected ones |

If the attentive player never sees a ghost, the garden is too easy. Lower `THREAD_BONUS_CAP`, or raise light scarcity.
