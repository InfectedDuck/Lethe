# PlantField

The one place a memory is written: a choice of kind and a single line in the `memory` style. While in use, it lifts into an overlay surface.

**Provide** `onPlant({kind, text})`. You can optionally control `kind` with `onKindChange`. The photo, song and place pickers are the consumer's, opened as an Overlay once the kind is chosen.

- It sits at the bottom-left, `space-4` in, and wakes when the person presses N or clicks empty ground.
- Keep it to one line. A memory is a sentence, not a journal entry.
- The seed dot takes the kind's colour (`sentence`, `song` or `place`). Photo uses `light` until the photo's own colour is known.
- After planting, the field clears and the new flower grows from the ground over 1.6s. The flower is the confirmation, so no toast is needed.
