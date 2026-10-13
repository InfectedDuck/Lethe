# Thread

A thin arc of `thread` light with a soft glow, drawn between two flowers that share a person, place or feeling. The brighter the thread, the stronger the connection.

**Provide** `from` and `to` (flower heads, in the coordinates of the parent `<svg>`) and `strength` (0–1). Thread renders an SVG `<g>`. Put all threads in one full-canvas `<svg>` layered under the flowers.

- Strength sets the core's opacity and the width of the glow. Above 0.3, small motes travel along the thread.
- Threads arc upward by default. Use `flip` when two arcs would cross.
- Threads are always `thread`, never a flower's colour. There are no arrowheads, nodes, or labels on the line.
- When the pointer rests on a flower, brighten its threads and dim the rest. This shows what holds the memory up.
