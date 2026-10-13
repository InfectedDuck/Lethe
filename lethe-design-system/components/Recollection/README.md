# Recollection

The words of a memory surfacing beside its flower, set in Cormorant Garamond with quoted speech in italic and small Inter labels underneath.

**Provide** `text` and, when known, `kind`, `planted` (a lowercase human date, e.g. "3 january 2011"), `vitality` or `state`, `heldBy` (the people, places and feelings that thread it), and `actions` (Buttons). For a photo memory, pass the `<img>` as children.

- Text in “curly” or "straight" quotes renders italic automatically. Everything else is upright.
- `size="lg"` (32px) when recalled. The default (24px) is for hover.
- **Ghost** memories lose about 40% of their words, shown as faint dotted gaps. **Lost** memories keep only a few words. The same memory always loses the same words. Ghost and lost text is `fog`; vivid and fading text is `text-primary`.
- The state appears as a word in the labels (vivid, fading, ghost, lost), never as a number or a bar.
- It floats on the ground `space-3` from its flower, with no panel behind it. Use an Overlay only when the person opens the memory in full.
