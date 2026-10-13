# Overlay

A floating surface for the few moments that need more than the garden, such as opening a memory in full, choosing a photo, song or place to plant, or seeing what holds a memory.

**Provide** children, plus an optional `title` (the `title` style), `actions` (Buttons) and `width`. The consumer positions it, opens it, and closes it on Escape or a click on the garden.

- Fill is `overlay-fill` (Deep night at 80%) with a 16px backdrop blur, a 1px `overlay-border` (white at 8%), `radius-overlay` and `space-4` padding. The garden should glow through it.
- Show one overlay at a time, opened only by the person, never by the system. It floats near what it is about, not docked to an edge.
- An overlay is not a panel, sidebar or dashboard. If it starts to collect lists, stats or tabs, it is the wrong thing.
