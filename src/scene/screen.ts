// Bridge from the 3D garden to the DOM interface: where is a memory's flower on screen right now?
// The <ScreenProjector/> inside the canvas registers a projector; DOM components (recollections, keyboard
// focus targets, the tend mote) read it every animation frame and move themselves, without React re-renders.

export type ScreenPoint = {
  /** Flower head, in CSS px from the top-left of the page. */
  x: number;
  y: number;
  /** Roughly half the flower's drawn width on screen, in px. */
  r: number;
  /** Where the flower meets the ground, in px. */
  baseY: number;
  /** False when the head is behind the camera or off screen. */
  onScreen: boolean;
};

type Projector = (id: string) => ScreenPoint | null;
let projector: Projector | null = null;

export function setProjector(p: Projector | null) { projector = p; }

export function projectMemory(id: string): ScreenPoint | null {
  return projector ? projector(id) : null;
}
