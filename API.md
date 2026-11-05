# Preset and riff API

For an agent or a script that wants to show a setting of the Sixmart's
built-in effects on `index.html`. The page sets the knobs, draws numbered
callouts next to the real controls, and lists the steps the player must
do. A riff link shows where to play a short tab on the fretboard
(section 7). The same reference is in the page at `index.html#api`.

## 1 · Build a link

Put the controls in the hash of the page as `key=value` pairs. A `?query`
works too. Open the link: the page applies the setting and shows the steps.

```
index.html#pickup=5&effects=on&mode=clean&volume=8&tone=7&delay=4&reverb=7&title=Ambient+clean&note=Neck+pickup+with+room+for+arpeggios
```

- Give all seven controls for a complete preset. A control you leave out
  keeps its current setting and gets no step.
- The preset card reports unknown keys and bad values. They do not stop
  the other controls.
- Text values are URL-encoded (`+` or `%20` for a space).

## 2 · Parameters

| Key (aliases) | Values | Control on the guitar |
| --- | --- | --- |
| `pickup` (`sel`, `pu`, `selector`) | `1`–`5`, or `bridge`, `bridge+middle`, `middle`, `middle+neck`, `neck` | 5-way selector. 1 = bridge humbucker, 5 = neck pickup |
| `effects` (`fx`, `pull`) | `on`, `off` | Push-pull on the VOLUME knob. Pulled up = effects on, LED lit |
| `mode` | `dist`, `clean`, `over` | Mini toggle: DIST = distortion, CLEAN = no drive, OVER = overdrive |
| `volume` (`vol`) | `0`–`10`, steps of 0.5 | VOLUME knob. No printed scale: 0 = pointer at 7 o'clock, 5 = 12 o'clock, 10 = 5 o'clock |
| `tone` | `0`–`10` | TONE knob, same clock scale |
| `delay` | `0`–`10` | DELAY: the big lower ring of the stacked knob |
| `reverb` | `0`–`10` | REVERB ON TOP: the small cap on the stacked knob |
| `title` (`name`) | text, up to 120 characters | Name of the preset, shown as the heading |
| `note` (`desc`, `why`) | text, up to 120 characters | One line on when to use it |

The page lists the steps in this order: pickup, effects, mode, volume, tone,
delay, reverb. That is the order a player does them.

## 3 · What the user sees

- Numbered callouts on the drawing, one per control, with the target value.
- The same steps in the panel. Knob values come with the pointer position
  as a clock time, because the knobs have no printed numbers.
- The knobs turned to the values, the toggle in its row, the LED on or off.
- A "Copy link" button, so the setting can be shared again.
- A click on a step zooms to that control and pulses its ring.
- If the player then moves a control by hand, the steps and the callouts
  follow it, and the card shows "edited". **Save** keeps the result as a
  saved preset (section 6).

## 4 · JavaScript

With the page open (for example from a browser automation tool), use
`window.sixmart`:

```js
sixmart.apply({pickup:5, effects:'on', mode:'clean', volume:8, tone:7, delay:4, reverb:7, title:'Ambient clean'})
// → {ok, config, warnings, steps: [...text], link}

sixmart.steps({volume:8, delay:4})   // text of the steps, no UI change
sixmart.link({...})                  // shareable URL for a config
sixmart.get()                        // current setting as a config object
sixmart.clear()                      // remove the preset card and callouts
sixmart.save({...config, title})     // add to the player's saved presets → {ok, stored, count, warnings}
sixmart.saved()                      // the saved presets, as an array of configs
sixmart.importPresets(data)          // same as Import JSON → {added, updated, skipped, stored}
sixmart.exportPresets()              // the Export JSON content, as an object
sixmart.schema                       // the parameter table above, as data
sixmart.order                        // the step order
sixmart.examples                     // four example presets
```

From another window or an iframe:

```js
frame.contentWindow.postMessage({type:'sixmart:apply', config:{...}}, '*');
// answer: {type:'sixmart:state', ok, config, warnings, steps, link}
frame.contentWindow.postMessage({type:'sixmart:get'}, '*');
```

The page answers with target origin `*`. The data is a guitar setting. It
holds no secrets.

## 5 · How to write a preset (for agents)

1. Ask what sound or song the player wants, and whether the player uses
   an amp or headphones.
2. Choose the pickup: `1` (bridge humbucker) for drive and bite, `3` or
   `5` for warm cleans, `2` and `4` for the hollow in-between sounds.
3. Set `effects`. Use `off` for the plain guitar. Use `on` for the drive
   modes, delay and reverb. With effects on, pick the `mode`: `clean`, `over`
   (overdrive) or `dist` (distortion).
4. Give `volume`, `tone`, `delay` and `reverb` from 0 to 10. Start near
   7 / 7 / 3 / 4 and move from there. The levels are not calibrated. Say
   in the note what to listen for.
5. Add a short `title` and a `note`. Send the link. Also paste the step
   text (from `sixmart.steps` or the panel), so the player has it without
   the page.

Source of the control facts: the printed plate and the owner's photos. The
effects need a battery. The guitar's manual was not checked.

## 6 · Saved presets and files

The player can set the controls by hand in **Effects & sound** and save the
setting with a name. **Export JSON** and **Import JSON** are in **Presets**.
The saved list stays in this browser only. The export file is the way to
move it or keep a copy.

```json
{"format":"sixmart-presets","version":1,"presets":[
 {"title":"Ambient clean","note":"Neck pickup with room for arpeggios","pickup":5,"effects":"on","mode":"clean","volume":8,"tone":7,"delay":4,"reverb":7}]}
```

- Import also accepts a plain array of configs, or one config object.
- Each config uses the keys of section 2.
- A preset with the same title replaces the old one.
- Import skips an item that sets no control, and reads at most 200 items
  from a file of at most 1 MB.
- An agent can write this file for the player to import.

## 7 · Riffs: where to play

A riff link shows a short tab on the drawing. The page puts a dot on each
fret that the riff uses, draws the tab in the panel and steps through the
notes in order. The **Riffs** section of the overview lists the examples
in groups and has a box to paste a tab.

```
index.html#riff=5/7+5/7+5/10+5/7+5/5+5/3+5/2&title=Seven+Nation+Army&bpm=100
```

| Key (aliases) | Values | What it does |
| --- | --- | --- |
| `riff` (`notes`) | Notes in the notation below | The notes in play order |
| `tab` (`ascii`) | ASCII tab text, URL-encoded | A guitar tab as text. Give `riff` or `tab` |
| `title` (`name`) | text, up to 120 characters | Name of the riff |
| `note` (`desc`, `why`, `artist`) | text, up to 120 characters | One line: who plays it, what to listen for |
| `source` (`src`) | text, up to 120 characters | How exact the notes are |
| `bpm` (`tempo`) | `30`–`240`, default `90` | Speed of **Play**. One beat is the usual gap between two notes |
| `pickup`, `effects`, `mode`, `volume`, `tone`, `delay`, `reverb` | As in section 2 | A suggested sound. The card shows it with a **Set this sound** button |

Notation for `riff`:

| Write | Meaning |
| --- | --- |
| `6/3` | String 6, fret 3. Strings go from 1 (high e, the thinnest) to 6 (low E, the thickest). Fret 0 is the open string. Frets go to 22 |
| `E/3`, `e/0` | String letters also work: `e B G D A E`. Lowercase `e` is the high e string, uppercase `E` is the low E string |
| `[5/2 4/4]` | Notes played together: a chord or a power chord |
| `[G: 6/3 5/2 4/0 3/0 2/0 1/3]` | A chord with a name. Put a colon after the name and a space before the notes. The name shows above the tab column, beside the neck and in the step |
| `\|` | Bar line |
| `5/5h7`, `5/7p5` | Hammer-on, pull-off |
| `5/5s7` | Slide. In a tab, `/` and `\` also work |
| `3/7b9` | Bend fret 7 up to the pitch of fret 9 |
| `5/7~` | Vibrato |
| `6/x` | Muted string (a chug) |
| `(5/7)` | Ghost note: play it softly |

Separate the notes with spaces or commas. In a URL, a space is `+` or
`%20`.

Tab text (`tab`):

- Six lines, high e on top and low E at the bottom, as in most tabs. A
  block with fewer lines needs the string name at the start of each line.
- Play the numbers that start in the same column together.
- The spacing between the numbers sets the timing of **Play**.
- The page reads only the tab lines, so chord names, lyrics and other
  text can stay.
- Standard tuning only (E A D G B E). A line that names another tuning
  gives a warning, and the frets show as written.
- Limits: 8000 characters, 400 steps, frets 0–22.

What the player sees:

- A dot on each fret that the riff uses, with the fret number in it. An
  open string has a dot above the nut.
- The current note is solid and pulses. The next note has a dashed ring,
  and a dashed line goes to it.
- A label beside the neck names the string and the fret of the current
  step, or the chord name. On a chord step, the dots of the other chords
  fade. Fret numbers run along the neck, and the string names are at the
  nut.
- The panel shows the tab and the step in words with the note name. It
  also has **Prev**, **Play** and **Next**, a speed slider, the suggested
  sound and a link. A click on a tab column goes to that step. The arrow
  keys also step.
- The page makes no sound.

JavaScript:

```js
sixmart.riff({riff:'5/7 5/7 5/10 5/7 5/5 5/3 5/2', title:'Seven Nation Army', bpm:100})
// → {ok, title, events: [[{string, fret, note}]], steps: [...text], warnings, link}
sixmart.parseRiff({tab:'e|---…'})   // the same data, no UI change
sixmart.riffStep(3)                  // go to step 3 (counting from 1) → {step, of, text}
sixmart.clearRiff()                  // remove the riff
sixmart.riffs                        // the 14 example riffs
sixmart.riffGroups                   // the groups of the Riffs list: [[name, [keys]]]
sixmart.riffSchema                   // the riff keys above, as data
```

From another window or an iframe:

```js
frame.contentWindow.postMessage({type:'sixmart:riff', riff:{riff:'6/0 6/3 6/5', title:'Test'}}, '*');
// answer: {type:'sixmart:riffstate', ok, title, events, steps, warnings, link}
```

How to write a riff (for agents):

1. Keep it short: one riff or one exercise, not a whole song.
2. Use standard tuning. If the song uses another tuning, move the notes to
   standard tuning and say so in `source`.
3. For a beginner, use the easiest position: open strings and the first
   five frets when possible, and single notes before chords.
4. Check each note. The open strings are E A D G B E from string 6 to
   string 1, and each fret is one semitone higher.
5. Say how exact the notes are in `source`, for example "simplified, one
   string". Do not call a riff a transcription if you did not check it
   against the recording.
6. Add a suggested sound with the keys of section 2 when the riff needs
   drive or a clean sound.

The page has 14 examples in five groups:

- First steps: open strings, and a chromatic warm-up.
- Scales: E minor pentatonic, A minor pentatonic and C major.
- Chords: seven open chords, and the progression G, D, Em, C.
- Melodies: Twinkle, Twinkle, Little Star, Ode to Joy and Happy Birthday.
- Song riffs: Smoke on the Water, Seven Nation Army, Iron Man and Smells
  Like Teen Spirit.

The exercises, the chord shapes and the melodies are exact: each note
matches its scale, chord or melody. The song riffs are common learning
versions that were not checked note for note against the recordings.
