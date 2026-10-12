import { describe, expect, it } from 'vitest';
import { emptyGarden, plant, type Kind } from '../engine';
import { sampleGarden } from '../data/sample';
import { feelingsOf } from './feelings';
import { offlineTag } from './offline';

const REAL = 1_700_000_000_000;
const names = (tags: { name: string }[]) => tags.map((t) => t.name);
const tagFresh = (kind: Kind, text: string) => offlineTag(emptyGarden(REAL), kind, text);

describe('offline tagger: people and places in a fresh garden', () => {
  it('finds a named relative and a city', async () => {
    const t = await tagFresh('place', 'Grandma Mei’s kitchen in Hangzhou, smelling of osmanthus');
    expect(names(t.people)).toEqual(['Grandma Mei']);
    expect(names(t.places)).toEqual(['Hangzhou']);
  });

  it('finds first names compromise does not know', async () => {
    expect(names((await tagFresh('photo', 'Leo and me on the night bus after graduation, 2022')).people)).toEqual(['Leo']);
    expect(names((await tagFresh('place', 'Kamakura beach at dawn, with Leo')).people)).toEqual(['Leo']);
  });

  it('recognises family by relation, with or without "my"', async () => {
    expect(names((await tagFresh('photo', 'Dad’s handwriting on a birthday card')).people)).toEqual(['Dad']);
    const t = await tagFresh('sentence', 'Camping with my sister and Priya near Lake Tahoe');
    expect(names(t.people).sort()).toEqual(['Priya', 'my sister']);
    expect(names(t.places)).toEqual(['Lake Tahoe']);
  });

  it('never mistakes a relation for a place: "a postcard from Dad in Lisbon"', async () => {
    const t = await tagFresh('photo', 'A postcard from Dad in Lisbon');
    expect(names(t.people)).toEqual(['Dad']);
    expect(names(t.places)).toEqual(['Lisbon']);
  });

  it('takes the name after a relation: "my best friend Sam" is Sam', async () => {
    expect(names((await tagFresh('sentence', 'My best friend Sam laughed so hard at the Ueno Park picnic')).people)).toEqual(['Sam']);
  });

  it('keeps everyday places like university', async () => {
    expect(names((await tagFresh('place', 'The library rooftop at university')).places)).toEqual(['university']);
  });

  it('does not tag a song’s title or artist as people', async () => {
    const debussy = await tagFresh('song', 'Clair de Lune, Debussy. She played it on Sundays.');
    expect(debussy.people).toEqual([]);
    const satie = await tagFresh('song', 'Gymnopédie No. 1, Satie. My first winter in Tokyo.');
    expect(satie.people).toEqual([]);
    expect(names(satie.places)).toEqual(['Tokyo']);
  });

  it('finds nothing in a sentence with no names', async () => {
    const t = await tagFresh('sentence', '“You don’t have to be brave all the time.”');
    expect(t.people).toEqual([]);
    expect(t.places).toEqual([]);
  });
});

describe('offline tagger: feelings', () => {
  it('maps common words to at most two feelings', () => {
    expect(feelingsOf('Mom hugged me, warm and safe, at the airport before I left')).toEqual(['comfort', 'longing']);
    expect(feelingsOf('Alone on a quiet rooftop')).toEqual(['solitude']);
    expect(feelingsOf('we laughed and danced and cried at the wedding').length).toBeLessThanOrEqual(2);
  });
});

describe('offline tagger in the garden', () => {
  it('reuses known entities by id', async () => {
    const g = sampleGarden(100, REAL);
    const t = await offlineTag(g, 'sentence', 'Osmanthus tea with Grandma Mei on her balcony in Hangzhou.');
    expect(t.people).toEqual([{ name: 'Grandma Mei', id: 'person:grandma-mei' }]);
    expect(t.places).toEqual([{ name: 'Hangzhou', id: 'place:hangzhou' }]);
  });

  it('a new memory about Mom threads to an old one about "my mother"', async () => {
    const g = emptyGarden(REAL);
    const a = await offlineTag(g, 'sentence', 'My mother taught me to swim');
    plant(g, { id: 'a', kind: 'sentence', text: 'My mother taught me to swim', ...a }, 0, REAL);
    const b = await offlineTag(g, 'sentence', 'Mom hugged me at the airport in Paris');
    plant(g, { id: 'b', kind: 'sentence', text: 'Mom hugged me at the airport in Paris', ...b }, 0, REAL);
    expect(g.threads.map((t) => t.level)).toEqual([1]);
    expect(Object.values(g.entities).filter((e) => e.kind === 'person').map((e) => e.name)).toEqual(['Mom']);
  });
});
