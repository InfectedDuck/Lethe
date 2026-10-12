// Feelings for the offline tagger: common words → one feeling each. A memory gets at most two feelings,
// the ones its words point to most often. Feeling-only threads are faint by design (decisions D6),
// so a rough guess here never ties the whole garden together.

export const FEELING_WORDS: Record<string, string[]> = {
  comfort: ['hug', 'hugged', 'hugs', 'warm', 'warmth', 'blanket', 'safe', 'soft', 'cosy', 'cozy', 'held', 'holding', 'tea', 'soup', 'brave', 'okay', 'alright'],
  solitude: ['alone', 'quiet', 'lonely', 'empty', 'silence', 'silent', 'rooftop', 'myself', 'solitary', 'nobody', 'winter', 'first winter'],
  joy: ['laugh', 'laughed', 'laughing', 'laughter', 'dance', 'danced', 'dancing', 'happy', 'party', 'celebrate', 'celebrated', 'sang', 'singing', 'graduation', 'won', 'birthday'],
  love: ['love', 'loved', 'kiss', 'kissed', 'wedding', 'married', 'darling', 'heart'],
  grief: ['funeral', 'died', 'death', 'passed away', 'grave', 'cried', 'crying', 'tears', 'goodbye', 'last time', 'miss', 'missed'],
  longing: ['left', 'leaving', 'far', 'away', 'apart', 'wish', 'someday', 'airport', 'train', 'night bus', 'letter', 'waiting'],
  calm: ['dawn', 'sea', 'beach', 'waves', 'lake', 'rain', 'snow', 'still', 'slow', 'garden', 'morning', 'breeze'],
  care: ['home safe', 'get home', 'text me', 'call me', 'look after', 'take care', 'worried', 'checked on', 'cooked', 'packed'],
  reassurance: ['figure it out', "it's okay", 'it’s okay', 'you can', 'proud', 'believe', 'failed', 'try again', 'not alone'],
  tenderness: ['played', 'sundays', 'lullaby', 'gentle', 'handwriting', 'card', 'smelled', 'smelling', 'kitchen', 'osmanthus'],
  freedom: ['road trip', 'drove', 'driving', 'ran', 'ocean', 'mountain', 'camping', 'summer', 'swim', 'swam', 'free'],
};

const ENTRIES = Object.entries(FEELING_WORDS).flatMap(([feeling, words]) =>
  words.map((w) => ({ feeling, re: new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}])`, 'giu') })));

/** At most two feelings, strongest first; ties go to the one mentioned first. */
export function feelingsOf(text: string): string[] {
  const score = new Map<string, { n: number; first: number }>();
  for (const { feeling, re } of ENTRIES) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const s = score.get(feeling) ?? { n: 0, first: m.index ?? 0 };
      s.n++; s.first = Math.min(s.first, m.index ?? 0);
      score.set(feeling, s);
    }
  }
  return [...score.entries()].sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first).slice(0, 2).map(([f]) => f);
}
