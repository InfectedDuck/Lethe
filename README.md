# Lethe

*A garden that forgets.* Plant memories as flowers. Fog slowly takes them. Only connected memories survive.

## Run

```
npm install
npm run dev               # http://localhost:5173
```

Press <kbd>`</kbd> in the garden for the hidden time slider.

## Tagging

Each memory is tagged with the people, places and feelings it mentions, and memories that share them are threaded together. **No key is needed:** an offline tagger runs in the browser (the [compromise](https://github.com/spencermountain/compromise) NLP library, relation words like "Mom" and "my sister", and a small feelings word list).

A tagging service is an optional upgrade, set server-side only (`.env` locally, Environment Variables on Vercel):

| key | provider | notes |
|---|---|---|
| `GROQ_API_KEY` | Groq, `openai/gpt-oss-20b` | free tier, from [console.groq.com/keys](https://console.groq.com/keys) |
| `ANTHROPIC_API_KEY` | Claude, `claude-haiku-5-5` | used instead of Groq when both are set |

Planting never waits for the service: the flower grows with offline tags, and better tags replace them if the service answers within 2.5s. After a "no key" reply the app stops asking; after a rate limit it waits a few minutes.

```
cp .env.example .env      # optional: add GROQ_API_KEY or ANTHROPIC_API_KEY
```

## Docs

| | |
|---|---|
| [docs/build-plan.md](docs/build-plan.md) | phases, mini-tasks, schedule, cut line, demo path |
| [docs/decisions.md](docs/decisions.md) | resolved conflicts between plan, screens and design system |
| [docs/architecture.md](docs/architecture.md) | diagrams: system, modules, states, data model, flows |
| [docs/systems.md](docs/systems.md) | forgetting, threads, tending, time, tagging, sound |
| [docs/scene-spec.md](docs/scene-spec.md) | the 3D look in numbers, hero moment timings |
| [CLAUDE.md](CLAUDE.md) | rules for Claude and Codex ([AGENTS.md](AGENTS.md) points here) |
| [lethe-design-system/](lethe-design-system/README.md) | tokens, type, DOM components, sample content |

## Layout

```
src/engine/    pure garden rules + tests (no rendering, time passed in)
src/data/      the ten sample memories and first-planting prompts
src/store/     Zustand store: the only caller of the engine
src/scene/     React Three Fiber garden (flowers, threads, fog, fx)
src/ui/        design-system DOM components and screens
src/tagging/   offline tagger (default) + client for /api/tag with back-off
server/, api/  tagging handler (Vercel function; Vite middleware in dev)
scripts/       forgetting simulation
```
