# Recording kit

Everything for showing Lethe: the 3-minute live demo, setting up the machine, listening once, recording the 90-second film, voicing it, and posting the listing. The demo is the **episode** (D24, D25): a fictional life of 23 memories, one remaining light, one planting, one season. The product is frozen after its deploy (see the end); this file is the only thing that should still change.

**Links** (once the episode is deployed):
- **Play a season:** https://lethe-nine.vercel.app/?demo=play, the fictional garden, playable at once.
- **Watch a season:** https://lethe-nine.vercel.app/?demo=film, an opening screen ("A life becomes a garden."); one click plays the 90-second film.
- **The front door:** https://lethe-nine.vercel.app/, with "play a season", "watch a season", or click anywhere to begin your own garden.
- The original ten-memory garden stays at `?demo` for reference.

## 0. The live demo (3 minutes)

The plan's shape (owner, 13 Oct): **20s** of what Lethe is, the **90s film**, **50s** of a different choice made live, and **20s** holding the ending while you invite people in. The film does the hard part on its own; the live minute proves the choices are real.

### Before you go on stage

1. Chrome on the NVIDIA GPU (§1), on mains power, notifications off, sound through the venue's speakers.
2. **Tab 1:** https://lethe-nine.vercel.app/?demo=film, full screen (<kbd>F11</kbd>), left on its opening screen. Do not click yet.
3. **Tab 2:** https://lethe-nine.vercel.app/?demo=play, opened a minute early so it has grown in. Leave it alone.
4. The recorded film open in a player, one click away, in case the site or the network fails.

### The script

Sentences in *italics* are what you say. Never read the film's captions aloud: the audience is reading them.

| time | do | say |
|---|---|---|
| 0:00 | Tab 1, opening screen: "A life becomes a garden." Hands off the mouse. | *Everything we build promises we'll never forget: every photo, every message, kept forever. But that's not how memory works. We forget, and what we keep says who we are. This is a fictional life, written as a garden.* |
| 0:20 | Click once. **Then don't touch the mouse or keyboard**: any input stops the film. | Speak only in the gaps (§4), and say nothing from 0:53 to 1:06 while the rooftop dissolves and the garden holds still. |
| 1:50 | The film ends on "what you tend gives the garden its shape." Switch to tab 2 (<kbd>Ctrl</kbd>+<kbd>Tab</kbd>). | *Now the same life, a different choice.* |
| 1:55 | Click the library rooftop (lower right), then **tend**. | *I spend the last light on the rooftop instead of on Grandma Mei.* |
| 2:05 | <kbd>Esc</kbd>, then **let a season pass** (bottom, quiet). Let the replay and the reflection play. | *Three weeks pass.* (wait) *This time the rooftop is still here, as a ghost, and Grandma Mei's words have faded further. Nothing was scripted: the same rules, a different choice.* |
| 2:40 | Let the closing lines hold. | *You cannot keep every moment in bloom. What you tend gives the garden its shape. The link plays this season, and lets you begin your own.* |

These outcomes are the engine's own (checked 13 Oct): tending Grandma Mei keeps her sentence fading and loses the rooftop; tending the rooftop keeps it as a ghost and leaves her sentence a ghost; planting the rooftop fragment also keeps it, through a new thread to Leo.

### If something goes wrong

- **The film stopped** (a stray click or key): carry on live in tab 1. The season is still yours to play: open the rooftop or Grandma Mei, **tend**, **let a season pass**.
- **Start again:** **play again** at the end of a season, or reload the tab.
- **No sound:** carry on; it reads without sound. Say *"it has sound, too."*
- **The site or the network fails:** switch to the video and narrate over it with the same lines.
- **"How long does a memory last?"** In a personal garden, one real day away is a week in the garden: a fresh memory nothing holds is lost after about two and a half days, threads stretch that to about five and a half, and every tend makes it last 1.8 times longer. The episode itself is a paused, fictional season. Numbers belong in answers, never on the screen.

## 1. Set up the machine (10 min, once)

1. **Run the browser on the NVIDIA GPU.** This laptop has an AMD Radeon 610M and an NVIDIA GeForce RTX 5060 Laptop GPU, and Windows has no GPU set for Chrome or Edge, so they run on the AMD chip. Every frame rate in `docs/build-plan.md` was measured on the AMD chip, and the RTX is far stronger. In Settings → System → Display → Graphics, add `C:\Program Files\Google\Chrome\Application\chrome.exe`, choose **High performance (NVIDIA)**, and restart Chrome. Check `chrome://gpu`: the renderer line should name the RTX 5060.
2. **Plug in power** and keep the **Performance** power plan (it is on now). On battery, the AMD chip throttles: one page swung from 64 to 11 fps within seconds.
3. **Open a clean 1440 × 900 window** with no tabs or address bar (<kbd>Win</kbd>+<kbd>R</kbd>, paste, Enter):
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=https://lethe-nine.vercel.app/?demo=film --window-size=1440,900 --user-data-dir=%TEMP%\lethe-rec
   ```
   The separate profile keeps extensions such as Grammarly out of the recording, and starts with no kept garden.
4. Close other apps, and turn notifications off (Focus assist).

**Measured on this laptop's AMD chip**, production build, DPR 1.5 (this screen is 2560 × 1600 at 150%): the demo garden averages 72–108 fps, but the slowest 5% of frames take 20–50 ms, which shows as rare small hitches. On the RTX those should disappear. If anything stutters in a take, add `&quality=low` to the link.

## 2. Listen once on real speakers (10 min)

Nobody has heard the garden on speakers yet; the levels were set by measurement only (`docs/build-plan.md` P11.3). The film plays every sound in order, so open `?demo=film`, click once, and listen for:

| when | moment | listen for |
|---|---|---|
| 0–8s | the garden growing in | a soft note as each seed lands, a gentle cascade, never a clatter |
| 0–90s | the drone | low and warm, never a hum you notice after 20s |
| 32–36s | the tea memory's first threads | two to four notes together as the threads light, 1.5s tail |
| 42s | the tend | the one bright sound, a bell, then the neighbours answering, quieter |
| 55–60s | losses | notes bending down a minor third and fading; never a pile-up |
| 61–66s | the quiet hold | the drone drops to about half, then returns for the wide view |

If anything is harsh, too loud, too long or too dull, describe it in words ("the bell is too sharp") and it gets fixed with numbers in `src/sound/sound.ts`. Record with sound on: silent garden videos lose half the atmosphere.

## 3. Record the film (90s) and the narrated version (3 min)

**Tool:** Windows Game Bar records the active window with its sound, no install needed: <kbd>Win</kbd>+<kbd>Alt</kbd>+<kbd>R</kbd> to start and stop. In Settings → Gaming → Captures, choose 60 fps and the highest audio quality, and keep the microphone off (the voice goes on afterwards). Make a 10-second test clip first and check it plays back with sound.

**The 90-second film** is the garden's own: nothing to steer, so the take is about stillness.
1. Open the clean window from §1 (it opens `?demo=film`). Rest the cursor in the empty sky, top right.
2. Start recording, click once where the cursor rests, then **touch nothing**: any click, key or scroll stops the film. Hiding the window pauses it rather than skipping beats.
3. Stop recording about five seconds after "what you tend gives the garden its shape." has appeared.

| film time | beat | caption |
|---|---|---|
| 0–8s | the garden grows in, seed by seed | every flower is a fragment of a life: words, songs, places, photographs. |
| 8–17s | Grandma Mei's sentence, read in full, its threads lit | memories that share someone or somewhere hold each other up. |
| 17–23s | the library rooftop, read while it is vivid | the library rooftop. a place remembered on its own. |
| 23–39s | the tea fragment shows its threads, is planted, grows and joins her | a new memory finds what it shares. · it grows into what holds it. |
| 39–49s | the last light is spent on Grandma Mei; the ripple runs to her memories | one light remains. to tend one memory is to choose it. |
| 49–53s | | three weeks pass in this garden. |
| 53–66s | the season passes; the camera stays on the rooftop while it dissolves, then holds on its seed in silence | — |
| 66–80s | rise to the changed garden; Grandma Mei's memories gently lit and named | — |
| 80–90s | the closing lines over the held composition | you cannot keep every moment in bloom. · what you tend gives the garden its shape. |

**The three-minute narrated version:** record §0 as performed (the film, then the live rooftop choice) and lay the voiceover over it. Editing may shorten navigation and typing, never the outcomes: what survives is what the engine decided.

## 4. Voiceover for the film (about 90s, 120 words)

Speak only in the gaps between captions; leave the dissolve and the closing lines silent.

> **[0:00, seeds falling]** This is a fictional life, written as a garden.
>
> **[0:10, Grandma Mei's words]** A grandmother's words. They grew threads to everything else she is part of.
>
> **[0:18, the rooftop]** And a rooftop at university. Nothing else remembers it.
>
> **[0:26, the tea fragment]** Planting is writing one line. It finds who and where it shares, and joins her.
>
> **[0:41, the tend]** There is one light left. Whatever I tend, I choose over everything else.
>
> **[0:53–1:06]** *(silence: the season passes, the rooftop dissolves)*
>
> **[1:08, the wide view]** Three weeks later. The rooftop is a seed. What was held together still glows.
>
> **[1:20–1:30]** *(silence: let the closing lines be read)*

## 5. The listing

**Stills** (a listing is seen as a thumbnail before anyone clicks), from the current episode:
- **Final composition** (recommended thumbnail): `docs/look-log/20261013-1249-listing-still-final-16x9.png` (1920 × 1080) and `…-final.png` (2880 × 1800).
- **Opening garden:** `docs/look-log/20261013-1249-listing-still-opening-16x9.png` and `…-opening.png`.

**Title:** Lethe — a garden that forgets

**Description:**

> Lethe turns fragments of a life into a living garden. Plant memories, discover their connections, and choose what to tend. As seasons pass, some moments fade—and the garden reveals what holds a life together.

**Links:**
- Play a season: https://lethe-nine.vercel.app/?demo=play
- Watch a season (90s): https://lethe-nine.vercel.app/?demo=film

**Try this:**
- Hover a flower to read it; its threads light. Click it to open it.
- One light remains: **tend** a memory, and see which connected memories it reaches.
- **+ plant** (or <kbd>N</kbd>): choose one of two fragments of this life, or write your own.
- **let a season pass** (bottom): three weeks go by, and the garden shows what your choice kept.
- Then **continue tending**, **play again** with a different choice, or **begin your own** garden.
- Drag to turn, right-drag (or two fingers) to move, scroll to come close or rise above; <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>/arrows glide, <kbd>Q</kbd>/<kbd>E</kbd> turn, <kbd>Esc</kbd> closes or stops.

**Notes:** The example life is fictional. A garden you begin yourself stays in your browser only. Sound starts on your first click (headphones help). Desktop Chrome or Edge, a window 1440 × 900 or larger.

## 6. Fallbacks

- **The live site fails during a showing:** link the recorded video file next to the site link in the listing (upload the Game Bar MP4 to the listing, or to a video host).
- **Browsers checked** (13 Oct, no console errors): the playable season and the film in Chrome and Edge on Windows, muted too, and the whole season by keyboard alone. The episode never calls the network, so it plays offline once loaded. **Not checked: Safari and Firefox.** Safari is the risky one: it is strict about starting audio, so the garden may stay silent there. If the listing asks, say "best in Chrome or Edge".
- **Tagging service down:** planting still works; the offline tagger in the browser finds the threads (checked with no key on a preview deploy).

## 7. Freeze

After the episode's deploy, nothing merges except a fix for a red tree or a broken demo path. No new effects, no look tuning, no geometry merging. Look frozen 13 Oct (`docs/look-log/20261013-1100-look-freeze-garden.png`); the episode's approved frames are `docs/look-log/20261013-1249-episode-*.png`.
