export type Kind = 'sentence' | 'photo' | 'song' | 'place';
export type MemoryState = 'vivid' | 'fading' | 'ghost' | 'lost';
export type EntityKind = 'person' | 'place' | 'feeling';

/** A garden day is the engine's unit of time. Fractions are fine. */
export type GardenDay = number;

export type Memory = {
  id: string;
  kind: Kind;
  /** The sentence, caption, "title — artist" or place name. Kept even when lost (lost memories can be returned to). */
  text: string;
  /** Blob key in IndexedDB, photo only. */
  photoId?: string;
  /** Photo's dominant colour as hex; other kinds use their token colour. */
  hue?: string;
  /** Approximate, human: "2014", "summer 2019". */
  happenedAt?: string;
  plantedAt: GardenDay;
  lastTendedAt: GardenDay;
  /** S in garden days, before thread bonus. */
  stability: number;
  /** Entity ids. */
  people: string[];
  places: string[];
  feelings: string[];
  lost: boolean;
  lostAt?: GardenDay;
  /** Set when the person chose to let it go (never by the system). */
  letGo?: boolean;
};

export type Entity = {
  id: string;
  kind: EntityKind;
  name: string;
  /** Lowercased alternative names that resolve to this entity ("mom", "my mother"). */
  aliases: string[];
};

export type Thread = {
  a: string;
  b: string;
  /** How many people/places they share, capped at 3. 0 means feeling-only. */
  level: 0 | 1 | 2 | 3;
  source: 'auto' | 'manual';
};

export type Garden = {
  memories: Record<string, Memory>;
  entities: Record<string, Entity>;
  threads: Thread[];
  /** "a|b" keys of auto threads the person rejected, so they are never suggested again. */
  rejected: string[];
  light: number;
  /** Real-time ms when light was last granted. */
  lightGrantedAt: number;
  /** Garden day the person last saw (drives the return replay). */
  lastSeenAt: GardenDay;
  /** Real-time ms of that last visit. */
  lastSeenReal: number;
  plantsToday: number;
  /** Real day index (floor(ms / day)) that plantsToday counts. */
  plantsDay: number;
  firstPlantingsDone: boolean;
};

/** What the renderer needs per memory, derived each frame/tick. Never stored. */
export type MemoryView = {
  id: string;
  vitality: number;
  state: MemoryState;
  effectiveStability: number;
};

export type ReturnSummary = {
  gardenDaysPassed: number;
  realDaysPassed: number;
  /** Memories whose state got worse, in order of how much they fell. */
  faded: string[];
  lost: string[];
  /** Ghosts close to lost; glow once on return. */
  aboutToBeLost: string[];
};
