# Lethe — a garden that forgets

**Topic:** 3 · Your Life as a World (Culture & Creativity)
**Live:** https://lethe-nine.vercel.app/?demo · best in desktop Chrome or Edge, 1440 × 900 or larger, sound on

Lethe turns memories into a night garden. You plant a memory: a sentence someone said, a photo, a song or a place. It grows as its own glowing flower. Fog slowly takes every flower along a real forgetting curve. A memory survives only through its connections. When two memories share a person, a place or a feeling, a thread of light joins them, and each thread holds its neighbour up. Over time the garden's shape shows what holds a life together.

**Our answer to the topic's question ("do new connections emerge between the scattered fragments of a life?"):** yes, and they are the core mechanic. The fragments are written separately, as a sentence, a song or a photograph. Lethe finds the people, places and feelings in them and threads them together itself. A song a grandmother played and a sentence she said become connected. That connection is literally what keeps both from being forgotten. **What holds you** then shows which people and places a life's memories lean on, something you may never have said out loud.

## Try it

- **Fastest:** open the link and click **watch a season**. The garden plays its own story in about 85 seconds: connection, tending, planting, two days away, a memory dissolving, its return, and the reveal. Any click or key hands control back.
- **By hand:** follow the 90-second demo in [README.md](README.md#the-90-second-demo): hover → tend → plant → let two weeks pass (<kbd>`</kbd> → slider to +14 → **arrive**) → return a dark seed → **what holds you**.
- **Your own garden:** on the opening screen, click anywhere except "see a garden". Seven prompts start a garden that is kept only in your browser.
- **Locally:** `npm install && npm run dev`. No API key is needed.

## Key design decisions and trade-offs

The full log is in [docs/decisions.md](docs/decisions.md) (D1–D23). The decisions that shaped the project most:

| Decision | Why | Trade-off |
|---|---|---|
| **A real forgetting curve** (D2): vitality R = e^(−t/S), the Ebbinghaus curve. Tending multiplies stability S by 1.8. | The "magic" follows a real rule, so forgetting is honest and predictable, not random. | It needs time to pass. For a short demo, a hidden slider and story mode compress it, and a real return replays it. |
| **Connection is the only defence** (D3): each thread adds stability, **capped at 8 garden days**. | Our simulation (`npm run sim`) showed that without the cap, a well-connected garden was almost immortal: 23 of 25 memories survived with no care. With the cap, a neglected garden loses about half, and the survivors are the connected ones. | A hub memory can still fade, on purpose. |
| **Light is scarce** (D8): 3 per real day, up to 5. Tending and returning cost 1 each. | Tending becomes choosing, not a chore. | — |
| **Time** (D9): 1 real day is 1 garden week, and fog slows to a quarter speed after 14 days away. | Forgetting is felt over real weeks, and a long absence never wipes a garden. | Hard to show live, which is why story mode exists (D20). |
| **Loss is not permanent** (D4, D18): a lost memory leaves a dark seed and keeps its words, and returning costs one light. | "Forgetting is beautiful, not punishing." Nothing is deleted unless you choose to let it go. | Less dramatic than permanent loss, but kinder. |
| **The specifics go first** (D22): as a memory fades, its own people and places, then names and numbers, then other meaningful words drop out of its text; the small words that hold a sentence together go last. | That is how real forgetting works: you keep the gist ("a kitchen, smelling of osmanthus") long after the details. A faded memory still reads as a memory, not as noise. | Seeded per memory, so a memory always loses the same words. Some meaning is gone until it is tended. |
| **Offline-first tagging** (D13): a tagger in the browser (the compromise NLP library, relation words, a feelings word list) tags every memory. An LLM is an optional upgrade. | It works with no key and no network, and planting never waits. Only a memory's words ever leave the device. | Offline tags are less precise. A provider's tags replace them if one answers within 4s. |
| **3D with procedural flowers** (D1), React Three Fiber | Real depth, fog and parallax with a 2D botanical look. Each flower grows from its memory's id, so no two are alike and a memory always grows the same flower. | Heavier than SVG. Quality drops automatically on slow GPUs, and big gardens draw at most 60 threads (D19). |
| **Kept only in the browser** (IndexedDB via Dexie) | Memories are private: no accounts, no server storage. | No sync between devices. |
| **No numbers in the interface** | States are words (vivid, fading, ghost, lost). "What holds you" uses lines of light, not scores. | Less precise, but the garden is about memory, not performance. |
| **Story mode** (D20) | Makes the first pillar visible in 85 seconds, using real garden actions, not a video. | A new mode in a product with no menus, so it is quiet, skippable and only in the demo garden. |

## How AI is used

**In the product (optional):** `/api/tag` asks an LLM to find the people, places and feelings in one memory's words. It uses Claude `claude-haiku-5-5` if `ANTHROPIC_API_KEY` is set, otherwise Groq `openai/gpt-oss-20b` if `GROQ_API_KEY` is set. Keys stay on the server. Only the memory's text and the names of entities already in the garden are sent, and nothing is stored. **With no key, everything works:** the in-browser tagger, which is not an AI model, finds the threads.

**In development:** we used AI coding assistants (Claude Code and Codex) to write code under our direction, following the rules in [CLAUDE.md](CLAUDE.md). The team set the concept, the four pillars, the garden's rules and their tuning (by simulation), the visual language and every decision in docs/decisions.md. We reviewed the result against our screens and specs (docs/look-log).

## Similar projects and how Lethe differs

| Project | What it does | How Lethe differs |
|---|---|---|
| **Apple Photos / Google Photos "Memories"** | Automatically resurfaces photos as slideshows, grouped by date, place or the people detected in them | They only resurface, and only photos. Lethe mixes kinds of memory (sentences, songs, places, photographs) and connects them by the people, places and feelings they share. It makes *forgetting* part of the experience: what nothing holds fades, and what is connected survives. It uses no face recognition and no location history, and nothing leaves the device. |
| **Anki and other spaced-repetition apps** | Use the forgetting curve to schedule flashcard reviews, to memorise facts | Lethe uses the same curve for meaning, not memorisation. Connections between memories hold each other up, which spaced repetition has no notion of. Fading is dusk in a garden, not overdue cards. |

## Simulated data

- The **ten memories in the demo garden** ("see a garden", `?demo`, story mode) are **fictional sample content** (`lethe-design-system/sample-content.md`, `src/data/sample.ts`), written for this project. Their starting states are set on purpose to show every stage.
- `?stress=200` generates a large **synthetic** garden for performance testing (`src/data/stress.ts`).
- Anything a person plants in their own garden is their own input and stays in their browser.

## Safety and privacy

- No accounts, no server storage, no tracking. A person's own garden lives in their browser, and **let the garden go** erases it.
- No facial recognition. Photos are only averaged into one colour for the flower.
- No location history: places are only words the person typed.
- "What holds you" reflects a person's *own* memories back to them. It never rates anyone, and it shows no numbers.
- It is a reflective space and does not replace professional judgment of any kind.

## Open-source credits

Only the team's own code is submitted for judging. These are dependencies:

| Library or asset | Use | License |
|---|---|---|
| [three.js](https://threejs.org) | 3D rendering | MIT |
| [React](https://react.dev), React DOM | Interface | MIT |
| [@react-three/fiber](https://github.com/pmndrs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei), [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) | React renderer for three.js, camera controls, bloom and vignette | MIT |
| [postprocessing](https://github.com/pmndrs/postprocessing) | Post-processing effects | Zlib |
| [zustand](https://github.com/pmndrs/zustand) | State store | MIT |
| [Dexie](https://dexie.org) | IndexedDB storage of a person's own garden | Apache-2.0 |
| [Tone.js](https://tonejs.github.io) | Sound: drone, notes, chimes | MIT |
| [compromise](https://github.com/spencermountain/compromise) | Offline NLP for tagging | MIT |
| [zod](https://zod.dev) | Validating tagging replies | MIT |
| [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) | Optional Claude tagging | MIT |
| [Vite](https://vite.dev), [Vitest](https://vitest.dev), [tsx](https://github.com/privatenumber/tsx), [TypeScript](https://www.typescriptlang.org) | Build and tests | MIT; TypeScript Apache-2.0 |
| [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond), [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts | Type | SIL Open Font License |

Hosting: Vercel.

## Pre-existing work

> **To confirm before submitting.** State here whether anything existed before the competition started, for example the `lethe-design-system/` folder (tokens, DOM components, the 2D Bloom generator, sample content). If everything was made during the competition, write: "All code, design and content were created during the competition."
