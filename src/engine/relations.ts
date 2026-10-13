// Family and friends named by relation, not by name. Used by entity matching (so "Mom", "mum" and
// "my mother" are one person, whichever tagger produced the name) and by the offline tagger.

export type Relation = {
  /** How the person is shown, e.g. in "what holds you". */
  display: string;
  /** Lowercase words that all mean this person once "my"/"our" is stripped. The first is the canonical key. */
  words: string[];
  /** Recognised even without "my" ("Mom hugged me"); otherwise only as "my sister", "our cousin". */
  bare?: boolean;
};

export const RELATIONS: Relation[] = [
  { display: 'Mom', words: ['mom', 'mum', 'mother', 'mama', 'mommy', 'mummy', 'momma'], bare: true },
  { display: 'Dad', words: ['dad', 'father', 'papa', 'daddy', 'pa'], bare: true },
  { display: 'Grandma', words: ['grandma', 'grandmother', 'granny', 'nana', 'gran', 'grandmom', 'nan'], bare: true },
  { display: 'Grandpa', words: ['grandpa', 'grandfather', 'granddad', 'grandad', 'gramps', 'grampa'], bare: true },
  { display: 'my sister', words: ['sister', 'sis', 'little sister', 'big sister', 'older sister', 'younger sister'] },
  { display: 'my brother', words: ['brother', 'little brother', 'big brother', 'older brother', 'younger brother'] },
  { display: 'my best friend', words: ['best friend', 'bestie', 'best mate'] },
  { display: 'my wife', words: ['wife'] },
  { display: 'my husband', words: ['husband'] },
  { display: 'my partner', words: ['partner'] },
  { display: 'my girlfriend', words: ['girlfriend'] },
  { display: 'my boyfriend', words: ['boyfriend'] },
  { display: 'my son', words: ['son'] },
  { display: 'my daughter', words: ['daughter'] },
  { display: 'my aunt', words: ['aunt', 'auntie', 'aunty'] },
  { display: 'my uncle', words: ['uncle'] },
  { display: 'my cousin', words: ['cousin'] },
  { display: 'my teacher', words: ['teacher'] },
  { display: 'my roommate', words: ['roommate', 'flatmate'] },
];

const BY_WORD = new Map<string, Relation>();
for (const r of RELATIONS) for (const w of r.words) BY_WORD.set(w, r);

/** The relation a normalised name refers to ("mother" → Mom), if any. */
export function relationOf(normalised: string): Relation | undefined {
  return BY_WORD.get(normalised);
}

/** Canonical matching key for a relation ("mother" → "mom"). */
export function relationKey(normalised: string): string {
  const r = BY_WORD.get(normalised);
  return r ? r.words[0] : normalised;
}
