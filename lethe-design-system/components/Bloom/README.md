# Bloom

A memory drawn as a procedural, glowing flower whose form comes from its kind and whose colour and solidity come from its memory state.

**Provide** `kind`, a stable `seed` (the memory's id), and either `vitality` (0–1, from the forgetting curve) or an explicit `state`. For a **photo**, pass `hue`: the photo's dominant colour as hex (the consumer extracts it). Give `label` (the memory's first words) when the flower is the only way to reach the memory.

The drawing is `size` wide and 1.5 × `size` tall. Position it by its bottom centre, where it meets the ground.

**Forms**

| kind | colour | form |
| --- | --- | --- |
| sentence | `sentence` | tall single stem, a few long petals |
| song | `song` | spiral stem, bell-shaped head |
| place | `place` | low cluster of many small petals |
| photo | the photo's dominant colour | wide cupped bloom on a medium stem |

**States** (from vitality: vivid ≥ 0.6, fading ≥ 0.3, ghost ≥ 0.08, lost below)

- **vivid**: full colour with a soft, breathing glow halo.
- **fading**: colour half-blended toward `fog` (the `*-fading` tokens) with a dimmer glow.
- **ghost**: translucent outline only, at `ghost` opacity, with no fill and no glow.
- **lost**: a faint outline dissolving into drifting `fog` particles.

**Rules**

- The same seed always grows the same flower. Never re-seed a memory.
- Never put a flower inside a box or a list. It stands on the ground.
- Keep at least `space-6` between flower bases.
