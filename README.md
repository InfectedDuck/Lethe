# Lethe

*A garden that forgets.* Plant memories as flowers. Fog slowly takes them. Only connected memories survive.

## Run

```
npm install
cp .env.example .env      # optional: add ANTHROPIC_API_KEY for Claude tagging
npm run dev               # http://localhost:5173
```

Press <kbd>`</kbd> in the garden for the hidden time slider.

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
src/tagging/   client for /api/tag + offline fallback
server/, api/  tagging handler (Vercel function; Vite middleware in dev)
scripts/       forgetting simulation
```
