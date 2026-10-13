# Contest kit

Everything for the audition: the 3-minute live demo, setting up the machine, listening once, recording the 90-second path, voicing it, and posting the listing. The product is frozen (see the end); this file is the only thing that should still change.

## 0. The live demo (3 minutes)

The garden's real timescale is weeks, and a new garden starts with seven prompts. On stage you show neither: you open the ready-made garden of ten memories, and the hidden slider turns two weeks into a few seconds. All the clicking takes about **60 seconds** (timed on the live site, 13 Oct). The other two minutes are for saying the idea and letting each moment finish. Do not add more features to fill the time; let the garden breathe.

The talk follows the four pillars, one beat each: **connection** (hover, plant), **choice** (tend), **forgetting** (time), **what holds you** (reveal).

### Before you go on stage

1. Chrome on the NVIDIA GPU (§1), on mains power, notifications off.
2. Open https://lethe-nine.vercel.app/ (no `?demo`: the opening screen is your first image) one minute early, and press <kbd>F11</kbd> for full screen. Leave it on the opening screen. **Only ever click "see a garden" there.** Clicking anywhere else starts your own garden with seven prompts, the long path. If that happens, press <kbd>F5</kbd> and you are back on the opening screen.
3. Check the sound through the venue's speakers (the first click starts it).
4. Rest the mouse in the empty sky at the top right.
5. Have the recorded video open in a player, one click away, in case the site or the network fails.

### The script

Speak slowly. Sentences in *italics* are what you say; the rest is what you do. Times are where you should be, not deadlines.

| time | do | say |
|---|---|---|
| 0:00 | Opening screen: "Plant something you don’t want to lose." Hands off the mouse. | *Everything we build today promises that we will never forget. Every photo, every message, kept forever. But that is not how memory works. We forget, and what we keep says who we are. Lethe is a garden that forgets.* |
| 0:25 | Click **see a garden** (bottom). Keep the mouse still: the rule appears at the bottom. | *Every flower here is one memory: a sentence someone said, a song, a place, a photograph. And there is only one rule.* (read it with the screen) *Memories that share someone, or somewhere, hold each other up.* |
| 0:50 | Glide onto the yellow star on the left and rest. | *This is something a grandmother said: "You don’t have to be brave all the time." These lines of light are threads. Nobody drew them: they grew because three memories share Grandma Mei. Threads are what keep a memory from fading.* |
| 1:15 | Click the star, then **tend**. | *Everything here fades with time. You can tend a memory, but you only get three lights a day. So tending is choosing.* (the ripple runs) *And look: the light doesn’t stay. It runs along the threads, to everything connected.* |
| 1:40 | <kbd>Esc</kbd> → **+ plant** (bottom left) → **sentence** → type *Tea with Grandma Mei in Hangzhou.* → **plant**. Move the cursor to empty ground. | *Planting is writing one line. As I type, the garden notices who and where, Grandma Mei and Hangzhou, and offers the threads it could join.* (plant) *It grows... and it joins her.* |
| 2:05 | Press <kbd>`</kbd>, drag the slider to **+14**, click **arrive**, press <kbd>`</kbd> again. **Then do not touch the mouse** (any movement hides the whisper). | *Now let’s leave for two days. In the garden, every day away counts as a week.* (arrive: **say nothing for five seconds** while the fog rolls in and the whisper is read) *Nothing is deleted. Memories fade like dusk: first their colour, then their words. And the ones that nothing held... dissolve.* |
| 2:35 | *(cut this beat if you are behind)* Click the library rooftop’s dark seed (far right, on the ground), then **return**. | *But a lost memory leaves a seed. You can always come back for it.* |
| 2:45 | <kbd>Esc</kbd> → **what holds you** (top left). Let it settle. | *After a while, the garden shows something you might never have said out loud: what your life leans on. Here, it is Grandma Mei.* (pause) *Lethe is a garden that forgets. Connection is the only defence.* |

About 330 words: at a calm pace that is 2:30 of speech plus the silences. Rehearse three times with a timer, and cut the return beat (2:35) first if you run long.

### Option B: let the garden tell it (lower risk)

On the opening screen, click **watch a season** instead of "see a garden". The garden then plays its own story in about 85 seconds, with one caption at a time at the bottom, including the philosophy said once, plainly: *"A garden that kept everything would have no shape. Forgetting is how it keeps what matters."* Nothing can be mis-clicked, and every moment finishes on its own. You speak only around it; never read the captions aloud, the audience is reading them.

| time | do | say |
|---|---|---|
| 0:00 | Opening screen, hands off the mouse. | The same opening as above (*Everything we build today promises that we will never forget...*). |
| 0:25 | Click **watch a season**. Then let go of the mouse: any click or key stops the story. | Almost nothing. One sentence while the flowers settle: *I’ll let the garden show you.* |
| ~1:05 | (the camera glides to the library rooftop as it dissolves) | Stay silent. This is the moment. |
| ~1:50 | The story ends on "What holds your garden". | *Nothing here was scripted by hand: every one of those moments is the real garden doing what it does. Lethe is a garden that forgets. Connection is the only defence.* |
| 2:10 | Optional, if time allows: <kbd>Esc</kbd>, hover a flower or two, plant a line of your own. | Invite the judges to try it: *the link opens straight into this garden.* |

### If something goes wrong

- **Something looks stuck:** keep talking and carry on; every beat works on its own. To restart the garden: <kbd>`</kbd> → **reset demo garden**.
- **No sound:** carry on; the garden reads without it. Say *"it has sound, too"* and move on.
- **The site or the network fails:** switch to the video and narrate over it with the same script.
- **A judge asks how long a memory lasts:** one real day away is a week in the garden. A fresh memory that nothing holds starts fading within a day away and is lost after about two and a half days. Threads stretch that to about five and a half days at most, and every tend makes a memory last 1.8 times longer. After two weeks away, the fog slows to a quarter speed, so a long absence never wipes a garden. Numbers belong in your answers, never on the screen.

## 1. Set up the machine (10 min, once)

1. **Run the browser on the NVIDIA GPU.** This laptop has an AMD Radeon 610M and an NVIDIA GeForce RTX 5060 Laptop GPU, and Windows has no GPU set for Chrome or Edge, so they run on the AMD chip. Every frame rate in `docs/build-plan.md` was measured on the AMD chip, and the RTX is far stronger. In Settings → System → Display → Graphics, add `C:\Program Files\Google\Chrome\Application\chrome.exe`, choose **High performance (NVIDIA)**, and restart Chrome. Check `chrome://gpu`: the renderer line should name the RTX 5060.
2. **Plug in power** and keep the **Performance** power plan (it is on now). On battery, the AMD chip throttles: one page swung from 64 to 11 fps within seconds.
3. **Open a clean 1440 × 900 window** with no tabs or address bar (<kbd>Win</kbd>+<kbd>R</kbd>, paste, Enter):
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=https://lethe-nine.vercel.app/?demo --window-size=1440,900 --user-data-dir=%TEMP%\lethe-rec
   ```
   The separate profile keeps extensions such as Grammarly out of the recording, and starts with no kept garden.
4. Close other apps, and turn notifications off (Focus assist).

**Measured on this laptop's AMD chip**, production build, DPR 1.5 (this screen is 2560 × 1600 at 150%): the demo garden averages 72–108 fps, but the slowest 5% of frames take 20–50 ms, which shows as rare small hitches. On the RTX those should disappear. If anything stutters in a take, add `&quality=low` to the link.

## 2. Listen once on real speakers (10 min)

Nobody has heard the garden on speakers yet; the levels were set by measurement only (`docs/build-plan.md` P11.3). Open `?demo`, click once, and listen for:

| moment | how to trigger | listen for |
|---|---|---|
| drone | click anywhere, wait 5s | low and warm, never a hum you notice after 20s |
| hover notes | move across several flowers | soft, no click at the start |
| tend chime | open a flower → **tend** | the one bright sound; a bell, not a beep |
| ripple | right after the chime | neighbours answering, quieter than the chime |
| new-thread chord | plant the osmanthus sentence | two to four notes together as the thread lights, 1.5s tail |
| losses | <kbd>`</kbd> → slider to 21 → **arrive** | notes bending down a minor third and fading; never a pile-up |

If anything is harsh, too loud, too long or too dull, describe it in words ("the bell is too sharp") and it gets fixed with numbers in `src/sound/sound.ts`. Then record with sound on: silent garden videos lose half the atmosphere.

## 3. Record the 90-second path

**Tool:** Windows Game Bar records the active window with its sound, no install needed: <kbd>Win</kbd>+<kbd>Alt</kbd>+<kbd>R</kbd> to start and stop. In Settings → Gaming → Captures, choose 60 fps and the highest audio quality, and keep the microphone off (the voice goes on afterwards). Make a 10-second test clip first and check it plays back with sound.

**Rules:** every click is deliberate. Move the cursor slowly, rest it before each click, and let each beat finish before the next. The four money beats have their own timing; do not cut into them.

| beat | how long it needs |
|---|---|
| the bloom | 2.2s to grow, then its first threads light about 2.5s after planting |
| the tend ripple | 0.4s swell, 0.9s along each thread, neighbours answering 120ms apart |
| the return replay | about 7s: flowers ease one after another while the fog rises |
| the dissolve | 4.5s from ghost to particles and a dark seed |

**Shot list.** The rule whisper shows for 7 seconds from page load, so every take starts with a reload: rest the cursor in the empty sky at the top right, start recording, press <kbd>F5</kbd>, and click once where the cursor rests as soon as the garden appears (that click starts the sound without moving the mouse).

| time | cursor | wait for |
|---|---|---|
| 0:00 | <kbd>F5</kbd>, then one click in place, top right. Keep the mouse still. | The drone fading in, and the rule whisper at the bottom: "Memories that share someone or somewhere hold each other up." Any mouse movement hides it, so wait until it has been read. |
| 0:08 | Glide onto the yellow star on the left ("You don’t have to be brave all the time."). | Its note, its words beside it, its two threads brightening while the rest dims. Hold 3s. |
| 0:15 | Click it. Rest, then click **tend**. | The light mote, the bell, the ripple reaching Grandma Mei’s kitchen and Clair de Lune. Hold 3s, then press <kbd>Esc</kbd>. |
| 0:25 | **+ plant** (bottom left) → **sentence** → type *Tea with Grandma Mei in Hangzhou.* at an even pace (shorter than the osmanthus sentence, the same threads, and no extra balcony place in the reveal). | "threads it could join" filling in, and the dashed threads reaching out from the waiting seed. |
| 0:40 | **plant**. Move the cursor away to empty ground. | The full bloom and the first threads lighting with their chord. Hold 4s. |
| 0:48 | Press <kbd>`</kbd>. Drag the slider slowly to **+14**. Click **arrive**. Press <kbd>`</kbd> again to hide the slider. Do not move the mouse until the whisper has gone (6s): any movement hides it. | The whole replay: fog rising, flowers fading one by one, the library rooftop and Satie dissolving into seeds, then the whisper: "Two days passed. “We’ll figure it out” is about to be lost. A faint thread to Dad’s handwriting still holds it." Hold until it has been read. |
| 1:08 | Glide to the library rooftop’s dark seed (far right, near the ground). Click it, then **return**. | It comes back as a ghost. Hold 2s, then <kbd>Esc</kbd>. |
| 1:18 | **what holds you** (top left). | Grandma Mei lit across the dimmed garden. Hold 5s. That is the last frame. |

Rehearse the path twice before the take that counts (`docs/build-plan.md` P12.2). To start again: <kbd>`</kbd> → **reset demo garden**, or reload the link.

**Other shots (optional, for cutaways):**
- `?days=21`, then <kbd>`</kbd> → **arrive**: the dissolve, caught live; the most cinematic 10 seconds in the product.
- `?days=28`: the neglected garden (screen p16), mostly outlines and fog with a few connected memories still glowing.
- Scroll out to rise over the whole garden.

## 4. Voiceover (about 90s, 180 words)

Numbers are allowed here, never in the interface. Speak slowly; leave the quiet beats quiet.

> **[threshold, first click]** Lethe is a garden that forgets. You plant memories as flowers, and fog slowly takes them.
>
> **[hover the yellow star]** This one is a sentence Grandma Mei once said. The threads are what it shares with other memories: the same person, the same city. They hold it up.
>
> **[tend]** Light is scarce. Three a day. Tending a memory spends one, and the light runs along its threads to every neighbour. Tending is choosing.
>
> **[plant]** When I plant something new, the garden finds who and where it shares, as I write. It grows, and its first threads light.
>
> **[two days away]** Then I leave for two days. In the garden, every day away counts as a week. Forgetting here is dusk, not failure: memories fade to outlines, and the ones that nothing holds dissolve.
>
> **[return]** A lost memory leaves a seed. You can always return to it, for a little light.
>
> **[reveal]** Connection is the only defence. And over time, the garden shows you what holds a life together.

## 5. The listing

**Killer still** (voted on before anyone clicks): the reveal on Grandma Mei, her threads lit across the dimmed garden.
- 16:9, 1920 × 1080: `docs/look-log/20261013-1130-killer-still-reveal-mei-16x9.png`
- 16:10, 2880 × 1800: `docs/look-log/20261013-1130-killer-still-reveal-mei.png`

**Title:** Lethe — a garden that forgets

**Hook:** Plant memories as flowers. Fog slowly takes them. Only connected memories survive.

**Description:**

> Lethe is a 3D garden of memories. Each one you plant grows into its own flower: sentences, songs, places, photographs. Memories that share a person or a place are joined by threads of light, and those threads are the only thing that holds them up as fog rolls in. Light is scarce, so tending one memory means choosing it over another. Lost memories leave a dark seed you can return to. Over weeks, the shape of the garden shows what holds a life together.

**Link:** https://lethe-nine.vercel.app/?demo (opens straight into a garden of ten memories)

**Try this:**
- Short on time? Click **watch a season** (top left) and the garden plays its own story in about 85 seconds.
- Hover a flower to hear its note and see what holds it. Click it to open it, then **tend**.
- **+ plant** (or <kbd>N</kbd>): write a memory that names someone already there, such as Grandma Mei or Leo.
- Press <kbd>`</kbd> for the time slider: slide two weeks, then **arrive**, and watch the fog take what nothing holds.
- **what holds you** (top left) shows the people and places your garden leans on.
- Scroll to rise over the garden. <kbd>Esc</kbd> closes anything open.

**Notes:** Sound starts on your first click (headphones help). Desktop Chrome or Edge, a window 1440 × 900 or larger. Your own garden (click anywhere on the opening screen without `?demo`) stays in your browser only.

## 6. Fallbacks

- **The live site fails mid-judging:** link the recorded video file next to the site link in the listing (upload the Game Bar MP4 to the listing, or to a video host).
- **Browsers checked** (13 Oct, the full demo path with no console errors): Edge and Chrome on Windows. **Not checked: Safari and Firefox.** Safari is the risky one: it is strict about starting audio, so the garden may stay silent there. If the listing asks, say "best in Chrome or Edge".
- **Tagging service down:** planting still works; the offline tagger in the browser finds the threads (checked with no key on a preview deploy).

## 7. Freeze

After the final deploy, nothing merges except a fix for a red tree or a broken demo path. No new effects, no look tuning, no geometry merging. Look frozen 13 Oct: `docs/look-log/20261013-1100-look-freeze-garden.png`.
