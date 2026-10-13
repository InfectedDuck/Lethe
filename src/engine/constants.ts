// Every tunable number in the garden lives here. Change values, not formulas.
// Source of truth: design system v2 (see docs/decisions.md). Tune with `npm run sim`.

/** Stability S of a newly planted memory, in garden days. */
export const S_INITIAL = 7;

/** Each tend multiplies S by this. */
export const TEND_STABILITY_MULT = 1.8;

/** Each thread adds THREAD_STABILITY_BONUS × thread weight to effective S (only while the neighbour is not lost). */
export const THREAD_STABILITY_BONUS = 5;

/** The thread bonus saturates at this many garden days, so a hub memory can't become immortal. Found by npm run sim. */
export const THREAD_BONUS_CAP = 8;

/** A thread draws at full brightness once its two ends' combined vitality √(vA·vB) reaches this. */
export const THREAD_FULL_AT = 0.9;

/** advance() checks for losses this often (garden days), so a loss weakens its neighbours in order. */
export const ADVANCE_STEP_DAYS = 0.25;

/** Tending a memory gives each neighbour back this share × thread weight of what it has lost. */
export const TEND_NEIGHBOUR_SHARE = 0.3;

/** Vitality thresholds (lower bounds). Below GHOST the memory is lost. */
export const VIVID_AT = 0.6;
export const FADING_AT = 0.3;
export const GHOST_AT = 0.08;

/** A ghost below this glows once on return so it can be saved before it is lost. */
export const ABOUT_TO_BE_LOST_BELOW = 0.12;

/** Returning a lost memory brings it back as a ghost at this vitality, with fresh stability. */
export const RETURN_VITALITY = 0.2;

/** Light: granted per real day, carried over up to the cap. */
export const LIGHT_PER_REAL_DAY = 3;
export const LIGHT_MAX = 5;
export const TEND_COST = 1;
export const RETURN_COST = 1;

/** Time: one real day is one garden week. */
export const GARDEN_DAYS_PER_REAL_DAY = 7;
export const MS_PER_REAL_DAY = 86_400_000;

/** After this many real days away, fog slows (open question; suggested answer). */
export const SLOW_FOG_AFTER_REAL_DAYS = 14;
export const SLOW_FOG_FACTOR = 0.25;

/** Thread weight by how many people/places two memories share (1, 2, 3+). Feeling-only threads are faint. */
export const THREAD_WEIGHT: Record<1 | 2 | 3, number> = { 1: 0.85, 2: 0.95, 3: 1 };
export const FEELING_ONLY_WEIGHT = 0.3;

/** Planting budget after the first plantings (open question; suggested answer). */
export const PLANTS_PER_REAL_DAY = 3;
export const FIRST_PLANTINGS = 7;
