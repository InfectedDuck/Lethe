Lethe is a garden that forgets. People plant memories (a sentence, a photo, a song, a place) as glowing flowers in a night garden. Fog slowly takes them along a real forgetting curve, and a memory survives only through its connections: two memories that share a person, place or feeling are joined by a thread of light, and tending one keeps the other alive. Over time the threads show which people and places hold a life together.

The mood is a night garden in fog, lit only by the memories themselves. It is quiet and tender, a little melancholy, never gloomy. Think of long-exposure photographs of fireflies in a forest, bioluminescent plankton on a dark shore, ink dropped into water, and old botanical plates. The canvas is a 1440 × 900 desktop browser, and the app is dark only.

## Principles

1. **Forgetting is beautiful, not punishing.** Fading should feel like dusk and never like an error. Never use red, warnings, broken states, countdowns, or guilt.
2. **The garden fills the screen.** Interface is small, low-contrast, and appears only when needed. No panels, dashboards, badges, or streaks.
3. **Colour is life.** Vivid colour means remembered. Anything fading drifts toward `fog`.
4. **Every flower is unique and organic.** Flowers are grown from a seed by `Bloom`. They are never icons or clip art.

## Voice

- Interface words are lowercase and few. Use verbs from the garden: *plant, tend, let go, return*. Never use *delete, save, submit, sync, streak, score*.
- The garden talks about memories ("The lake house is drifting into fog."), never about the product or the person's performance.
- A memory's state is a word (*vivid, fading, ghost, lost*), never a percentage or a bar.
- Dates are human and lowercase ("planted 3 january 2011"). The separator is ` · `.
- No emoji and no exclamation marks.

## Colour

- **Ground.** The whole canvas is `night`.
- **Fog.** `fog` is fog itself: large shapes blurred 60px or more, drifting over the ground at `fog-thin`, and at `fog-thick` in front of ghost and lost memories. It is also the colour of faded flowers and of secondary and interface text (6.3:1 on `night`).
- **Text.** Memory text and anything that must be read first is `text-primary` (15.5:1).
- **Flowers.** Each kind of memory has one colour when vivid: `sentence` (pale gold), `song` (violet), `place` (teal). A photo flower is tinted from the photo's dominant colour, which the consumer extracts and passes to `Bloom` as `hue`. Flower colours never colour text or interface.
- **Threads.** Threads are always `thread`. Brighter means a stronger connection.
- **Light.** `light` is the tending currency. It appears only in the light counter and at the warm centre of a vivid flower.
- **Overlays.** Use `overlay-fill` (Deep night `deep-night` at 80%) with a 16px backdrop blur, a 1px `overlay-border` (white at 8%), and `radius-overlay`. Never use `deep-night` solid.
- **Focus.** A 1.5px solid `focus` ring with a 3px offset on every focusable element.

## Memory states

Every memory is in one of four states, shown on its flower and in its text. They come from vitality on the forgetting curve: vivid at 0.6 and above, fading from 0.3, ghost from 0.08, and lost below that.

| state | flower | text |
| --- | --- | --- |
| vivid | full colour with a soft glow halo | `text-primary`, all words |
| fading | colour half-blended toward `fog` (`*-fading` tokens), dimmer glow | `text-primary`, all words |
| ghost | translucent outline only, at `ghost` opacity | `fog`, about 40% of words missing |
| lost | dissolving into drifting `fog` particles | `fog`, only a few words left |

When state changes between visits, ease from the old look to the new over about 3s, like dusk falling.

## Type

- **Cormorant Garamond** is for memories and the rare title. Use `memory-lg` (32px) when a memory is recalled and `memory` (24px) on hover and while writing. Quoted speech inside a memory is italic (`speech`). `title` (40px Light) titles an overlay, and `title-lg` (56px Light) is for the name on the first-run screen only.
- **Inter** is for the interface: `interface` (14px) for buttons, kinds and whispers, and `interface-sm` (13px) for labels. Both have slightly wide letter-spacing and are usually `fog`.
- Do not use other faces or bold. Emphasis comes from light and colour, not weight.
- `components/bundle.css` loads both fonts from Google Fonts.

## Space and layout

- The garden is the whole viewport. Edge interface sits `space-4` in from the edges: the name at top-left in `interface-sm`, the light counter at top-right, the planting field at bottom-left, and whispers centred at the bottom.
- Flowers stand on the ground. Position each by its base, with at least `space-6` between bases.
- A recollection floats `space-3` from its flower, on the side with more open ground, with `space-5` of clear ground around it.
- Edge interface rests at `ui-idle`, sleeps at `ui-asleep` after 4s of stillness, and wakes to full on hover or focus. Text contrast is measured awake.
- Radii: `radius-overlay` for overlays and the open planting field, `radius-pill` for pill buttons and every point of light, and `radius-hair` for a photo's image.

## Light, depth and motion

- There are no shadows, only glows: `glow-text` on recalled words and `glow-light` on lit light dots. Flowers draw their own halo.
- Fog creates depth. Fainter memories sit behind thicker fog.
- Everything moves slowly and nothing bounces. A flower grows from the ground over 1.6s. Interface wakes in 0.4s. A whisper fades over 2.4s. Halos breathe on a 7s cycle. Thread motes and lost particles drift over 7–13s. Fog drifts on 40–90s loops.
- Honour `prefers-reduced-motion`: keep every state's look but stop drift, breathing and motes.

## The forgetting curve and light

- Vitality follows the Ebbinghaus curve: `v = e^(−t / S)`, where *t* is days since the memory was last tended and *S* is its stability (7 days at planting).
- Tending spends one light. It sets *t* to 0 and multiplies *S* by about 1.8, so each tending lasts longer.
- Tending also passes a share of the boost to every threaded neighbour, scaled by the thread's strength. This is how connections keep memories alive.
- A lost memory can always be returned to. Letting go is the person's choice, never a deletion the system imposes.

## Components

- `Bloom` is the memory itself, in four forms and four states.
- `Thread` draws arcs of light between memories.
- `Recollection` shows a memory's words beside its flower.
- `Button` is text-only or a 1px outline pill, never filled.
- `LightCounter` shows light as glowing dots.
- `Overlay` is the one floating surface.
- `PlantField` is where memories are written.
- `Whisper` is how the garden speaks.

Every mockup and screen uses the ten memories, threads and layout in **Sample content**, with their exact words. Never use filler memories. `Garden` is a page that shows them all together at full canvas. Do not add sidebars, cards, tabs, menus, toasts, progress bars or badges. If something seems to need one, it belongs in the garden as light or fog, or briefly in an overlay.

## Iconography and identity

- Lethe has no icons. Actions are words, kinds are coloured seed dots, light is a dot, and memories are flowers.
- There is no logo yet. Set the name in Cormorant Garamond Light (`title-lg`), or in lowercase `lethe` in `interface-sm`.
