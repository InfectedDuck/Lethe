# Sample content

Use these ten memories in every Lethe mockup and screen. Do not invent others, and keep the words exactly as written. Threads connect memories that share a person or a place. Nothing else is threaded.

## Memories

| # | kind | words | held by | state |
| --- | --- | --- | --- | --- |
| 1 | sentence | "You don't have to be brave all the time." | Grandma Mei, Hangzhou · 2014 | vivid |
| 2 | place | Grandma Mei's kitchen in Hangzhou, smelling of osmanthus | Grandma Mei, Hangzhou | vivid |
| 3 | song | Clair de Lune, Debussy. She played it on Sundays. | Grandma Mei | vivid |
| 4 | photo | Leo and me on the night bus after graduation, 2022 | Leo | vivid |
| 5 | sentence | "Text me when you get home." | Leo | vivid |
| 6 | place | Kamakura beach at dawn, with Leo | Leo, Kamakura | fading |
| 7 | sentence | "We'll figure it out." The day I failed the exam. | Dad | fading |
| 8 | photo | Dad's handwriting on a birthday card | Dad | fading |
| 9 | song | Gymnopédie No. 1, Satie. My first winter in Tokyo. | Tokyo | fading |
| 10 | place | The library rooftop at university | university | ghost, almost lost |

- Sentences 1, 5 and 7 are quoted speech. Keep the quotation marks so `Recollection` sets them in italic.
- Photo hues stand in for the colour the app will extract from each photo. Use #e8a87c (streetlight amber) for 4 and #d9c7a8 (card paper) for 8.
- Suggested vitality values: 0.9 for vivid, 0.45 for fading, and 0.1 for "ghost, almost lost". These put 10 just above lost.

## Threads

| between | shared | strength |
| --- | --- | --- |
| 1 – 2 | Grandma Mei, Hangzhou | 0.95 |
| 1 – 3 | Grandma Mei | 0.85 |
| 2 – 3 | Grandma Mei | 0.85 |
| 4 – 5 | Leo | 0.9 |
| 4 – 6 | Leo | 0.55 |
| 5 – 6 | Leo | 0.55 |
| 7 – 8 | Dad | 0.45 |
| 9 – 10 | faint | 0.15 |

Thread strength is my reading of the brief, set by the two memories it joins: 0.85–0.95 between two vivid memories (0.95 for a shared person and place), 0.55 between vivid and fading, 0.45 between two fading memories, and 0.15 for the faint thread. There are no threads between clusters.

## The four groups

- **Grandma Mei** (1–3) is a vivid cluster held by a person and a place. It is the brightest part of the garden.
- **Leo** (4–6) is a vivid cluster. The Kamakura beach is starting to fade but is still held by the other two.
- **Dad** (7–8) is a fading pair, warm but dimming.
- **Alone** (9–10) has weak or no threads. They sit in the thickest fog: Gymnopédie fading, the rooftop a ghost about to be lost.

## Layout at 1440 × 900

Use this as the default arrangement. x and y give the point where each flower meets the ground.

| # | x | y | size |
| --- | --- | --- | --- |
| 1 | 430 | 520 | 160 |
| 2 | 280 | 610 | 170 |
| 3 | 560 | 720 | 140 |
| 4 | 1000 | 600 | 150 |
| 5 | 1180 | 500 | 150 |
| 6 | 1060 | 780 | 160 |
| 7 | 150 | 380 | 130 |
| 8 | 320 | 330 | 120 |
| 9 | 1320 | 300 | 130 |
| 10 | 1330 | 690 | 140 |

- Fog is thickest over 9 and 10.
- When a memory is recalled, use 1 and float its recollection to the right of the Mei cluster.
- The default whisper is: "The library rooftop is drifting into fog. A faint thread to Satie still holds it."

## As data

```json
{
  "memories": [
    { "id": 1, "kind": "sentence", "text": "\"You don't have to be brave all the time.\"", "heldBy": ["Grandma Mei", "Hangzhou", "2014"], "state": "vivid", "vitality": 0.9 },
    { "id": 2, "kind": "place", "text": "Grandma Mei's kitchen in Hangzhou, smelling of osmanthus", "heldBy": ["Grandma Mei", "Hangzhou"], "state": "vivid", "vitality": 0.9 },
    { "id": 3, "kind": "song", "text": "Clair de Lune, Debussy. She played it on Sundays.", "heldBy": ["Grandma Mei"], "state": "vivid", "vitality": 0.9 },
    { "id": 4, "kind": "photo", "text": "Leo and me on the night bus after graduation, 2022", "heldBy": ["Leo"], "state": "vivid", "vitality": 0.9, "hue": "#e8a87c" },
    { "id": 5, "kind": "sentence", "text": "\"Text me when you get home.\"", "heldBy": ["Leo"], "state": "vivid", "vitality": 0.9 },
    { "id": 6, "kind": "place", "text": "Kamakura beach at dawn, with Leo", "heldBy": ["Leo", "Kamakura"], "state": "fading", "vitality": 0.45 },
    { "id": 7, "kind": "sentence", "text": "\"We'll figure it out.\" The day I failed the exam.", "heldBy": ["Dad"], "state": "fading", "vitality": 0.45 },
    { "id": 8, "kind": "photo", "text": "Dad's handwriting on a birthday card", "heldBy": ["Dad"], "state": "fading", "vitality": 0.45, "hue": "#d9c7a8" },
    { "id": 9, "kind": "song", "text": "Gymnopédie No. 1, Satie. My first winter in Tokyo.", "heldBy": ["Tokyo"], "state": "fading", "vitality": 0.45 },
    { "id": 10, "kind": "place", "text": "The library rooftop at university", "heldBy": ["university"], "state": "ghost", "vitality": 0.1 }
  ],
  "threads": [
    [1, 2, 0.95], [1, 3, 0.85], [2, 3, 0.85],
    [4, 5, 0.9], [4, 6, 0.55], [5, 6, 0.55],
    [7, 8, 0.45], [9, 10, 0.15]
  ]
}
```
