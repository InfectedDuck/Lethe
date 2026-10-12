# LightCounter

Light, the tending currency, shown as a row of small dots: lit dots glow in `light`, and unlit dots are thin `fog` rings.

**Provide** `value` and `max` (for example 3 of 5). Set `showLabel` to add "3 of 5 light" in `interface-sm` beside the dots. Without it, the count is still announced to assistive tech.

- It sits at the top-right of the canvas, `space-4` in. Like all edge interface, it rests at `ui-idle` and wakes on hover.
- When light is spent on tending, one dot dims slowly (about 0.6s) as a matching mote travels to the flower. When light returns, a dot brightens.
- It is a quiet resource, not a score. Never show it with streaks, plus signs, or celebration.
