# Agents

Codex and other agents: read and follow [CLAUDE.md](CLAUDE.md). It is the single source of instructions for this repo (pillars, rules, the "never" list, commands). Then pick the next unchecked task in [docs/build-plan.md](docs/build-plan.md).

When reviewing work done by another tool, check it against `docs/decisions.md`, `docs/scene-spec.md` and the "Never" list in CLAUDE.md, and report mismatches with file:line.

## Two-agent protocol (Claude builds, Spark verifies + commits)

- **Ownership:** Claude owns implementation and the primary test for each behavior. Spark owns edge/regression tests in *separate* files, green-keeping (`npm test`, `npm run typecheck`, `npm run sim`), docs, and all commits.
- **Handoff signal:** a ticked checkbox in `docs/build-plan.md` means the step is done and the tree is left green. Spark then re-verifies, reviews, and commits. Unticked work is still being thought through — Spark does not touch those files.
- **Never commit a red tree.** Before any commit: tests + typecheck green. A commit message follows repo style (`feat:`, `fix:`, `test:`, `docs:`, `style:`), one working step per commit.
