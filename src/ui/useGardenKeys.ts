import { useEffect } from 'react';
import { useGarden } from '../store/garden';

const typing = (el: Element | null) =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable);

/**
 * Garden keys (design system PlantField / Overlay):
 *   N    → wake the planting field
 *   Esc  → close an open memory, or put down the planting field
 * Tab moves through the flowers (FlowerTargets); ` opens the hidden time slider (TimeSlider).
 */
export function useGardenKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      if ((e.key === 'n' || e.key === 'N') && !typing(active)) {
        const input = document.querySelector<HTMLInputElement>('.lt-plant-input');
        if (input) { e.preventDefault(); input.focus(); }
        return;
      }
      if (e.key === 'Escape') {
        const { focusedId, focus } = useGarden.getState();
        if (focusedId) {
          focus(null);
          // Return keyboard focus to the flower that was open, so Tab carries on from there.
          document.querySelector<HTMLButtonElement>(`.flower-target[data-id="${CSS.escape(focusedId)}"]`)?.focus();
        } else if (typing(active)) {
          (active as HTMLElement).blur();
        }
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
}
