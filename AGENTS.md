# AGENTS.md

Guidance for coding agents that work in this repository.

## What this is

`index.html` is a single-file web page about one guitar: the owner's Tagima
Sixmart, an HSS Strat-style guitar with built-in effects. The page draws the
guitar in SVG at real scale. With it, the reader can do these tasks:

- Pan and zoom to any part. Read its specs, setup values and setup
  diagrams. Turn the drawing horizontal, as the guitar hangs when the
  player wears it.
- Set the effects controls by hand and save each setting with a name.
  Export or import the saved settings as a JSON file.
- Open a preset that an agent or a script made. The page sets the knobs,
  draws numbered callouts next to the controls and lists the steps.
- Learn a riff. A link, a script or a pasted tab puts a dot on each fret
  that the riff uses. The page draws the tab and steps through the notes.

The page has no build step, no server and no JavaScript dependency. The only
external resource is the Yellowtail web font from Google Fonts, for the
headstock logo. Without a network, the logo uses a system script font.

| File | Content |
| --- | --- |
| `index.html` | The whole page: CSS, SVG construction, data and interaction |
| `API.md` | The preset and riff API and the saved-preset file format, for agents and scripts |
| `AGENTS.md` | This file |
| `README.md` | The project page on GitHub, with screenshots and live links |
| `tools/shots.mjs` | Makes the README images in `docs/img` with headless Chrome |
| `docs/img/` | The README images. Do not edit them by hand |

## Run and check

The repository has no test suite. Check each change in headless Chrome.

```bash
open index.html                      # run it

C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Screenshot a view. The hash selects it: a part key, api, or a preset link.
"$C" --headless=new --disable-gpu --window-size=1400,1000 --virtual-time-budget=3000 \
  --screenshot=/tmp/out.png "file://$PWD/index.html#bridge"

# Catch a JS error. Headless Chrome does not print console errors, so write the error to the title.
sed 's#<head>#<head><script>window.onerror=(m,s,l,c)=>{document.title="ERR "+m+" @"+l+":"+c}</script>#' index.html > /tmp/t.html
"$C" --headless=new --disable-gpu --virtual-time-budget=3000 --dump-dom file:///tmp/t.html | grep -o '<title>[^<]*</title>'
```

- A change that renders nothing usually means that a JS error stopped the
  script partway. The panel is then empty.
- Prove a visual change with a screenshot. Check both themes: in a copy, add
  `data-theme="light"` or `data-theme="dark"` to `<html>`.
- Phone width: `--window-size=390,844` is not enough. Headless Chrome keeps
  the viewport at least 500 px wide. It crops the screenshot to 390 px, so
  the right side of the panel looks cut. Use the Chrome DevTools protocol:
  send `Emulation.setDeviceMetricsOverride` with width 390, then check
  that `innerWidth` is 390. The panel clips horizontal overflow, so the
  page width does not show a row that is too wide. Measure the element
  rectangles.
- Interaction: in a copy, put a test script before the last `</script>`.
  The script drives the real buttons and inputs (`click()`, or set `value`
  and dispatch `input`), collects the results and writes them to
  `document.title`. Read the title with `--dump-dom`. With
  `--virtual-time-budget`, timers run faster than real I/O such as a file
  read. Poll for a result. Do not wait a fixed time.
- Downloads (Export JSON) need the Chrome DevTools protocol. Start Chrome
  with `--remote-debugging-port`, send `Browser.setDownloadBehavior` with a
  download folder, click the button, then read the file.
- README images: after a change that a README image shows, run
  `node tools/shots.mjs` (all images) or `node tools/shots.mjs <name>`.
  Each entry in `SHOTS` sets the window size, theme, rotation, open
  sections and stored data, so a run gives the same images. Look at each
  new image before you commit it. A README fact (a count, a value, a riff
  title) comes from the page data. Check it there after a change.

## Page structure

JavaScript builds the SVG at load time. Named sections divide the script
(`/* ---------- name ---------- */`). Read them in this order.

- **geometry.** One unit is 648/820 mm. The nut is at `y = NUT = 250`, the
  neck centerline at `x = CX = 300`, and the scale length is `SCALE = 820`
  units (25.5" = 648 mm). `fretY(n)` gives fret positions (12th root of 2).
  `nutX`, `sadX` and `strX` give string positions, and `POST(i)` gives the
  tuner posts. All coordinates in the file use this system, so a millimetre
  measurement converts directly: `units = mm * 820/648`.
- **Outlines.** `BODY`, `GUARD` and `HEAD` are long path strings. A script
  traced them from flat product photos. The method: silhouette against the
  white background, contour follow, smoothing, Catmull-Rom curves, and scale
  from the photo's fret spacing. Do not edit them by hand. The tracing
  script and the photos are not in this repository, so a new shape needs a
  new trace. Use this calibration to place a part from those photos.
  Full-guitar photo: 1.0988 px/mm, nut at y = 260 px, centerline at
  x = 193.5 px. Thus `x_units = 300 + (x_px - 193.5) * 1.1517` and
  `y_units = 250 + (y_px - 260) * 1.1517`. Headstock photo: 3.49 px/mm, nut
  at y = 705 px, center at x = 200 px, factor 0.3626.
  Measured sizes: body 319 × 466 mm, pickguard 218 × 273 mm, headstock
  90 × 185 mm from the nut.
- **Parts.** `part(key)` makes a `<g class="part" data-part="key">`. Draw
  order is z-order. `#guardClip` clips the control plate to the pickguard,
  and `#headClip` clips the headstock grain to the headstock. The page has 26
  parts. The tremolo arm (`arm`) is a part apart from the bridge.
- **control plate.** The constants `VOL, TONE, DR, TOG, LED, SEL, RJ, PJ`
  set where each knob, switch and jack is. They come before the plate block,
  because the plate uses them. The plate has its own frame. `pl(u, v)` maps
  plate coordinates to drawing units. The origin is at `VOL`, `u` goes along
  the plate toward the delay knob, and `v` goes across it. The outline `PPTS` and
  all printed labels use this frame. A label reads `ALONG` (51°) or `ACROSS`
  (−39°) the plate, as on the real print. `pu(P)` converts a control
  constant to the plate frame, so the labels follow their control. The
  outline follows `VOL` only. If you move another control, make sure that
  the control stays on the plate.
- **content.** `PARTS` has one entry per part key: `name`, `group`, `what`,
  `specs`, `setup`, and optional `ctl` (the control shown in the panel),
  `adjust` (diagram keys) and `tuning`. A spec row is
  `[label, value, tag, note?]`. The tag gives the source. `spec` (shown as
  LISTING) is the retailer listing. `photo` is seen or measured on the
  owner's photos. `ref` (shown as REFERENCE) is a general Strat setup value.
  `inferred` is worked out but not checked on the guitar. Keep the tags honest. The panel
  footer explains them. A drawn part with no `PARTS` entry breaks hover and
  select.
- **electronics state.** `ST` holds `sel`, `pulled`, `mode`, `vol`, `tone`,
  `delay` and `reverb`, with defaults in `DEF`. `applyState()` turns the
  knobs and moves the toggle lever and the selector tip. It also lights the
  LED. The knob angle is `ang(v) = -150 + 30·v` degrees, so 0 is 7 o'clock
  and 10 is 5 o'clock.
- **adjustment diagrams.** `ADJ` has one entry per setup task: `title`,
  `value` (the target), `steps` and `svg()`. Each diagram is SVG text in a
  320 × 150 viewBox, made with the `DG` helpers. It uses CSS classes
  (`.wood`, `.metal`, `.acc` and others) from the stylesheet, so it works in
  both themes. `SETUP_ORDER` rows are `[part, label, ADJ key, value?]` and
  make the Setup list of the overview.
- **panel.** `renderOverview()`, `renderPart(key)` and `showApi()` write the
  side panel. Each section is a `<details>` that `sec(id, title, hint, body,
  openByDefault)` makes. The hint is the one-line summary that a closed
  section shows. The overview order is Tuning, Riffs, Setup, Effects &
  sound, Presets, Parts, Specs. An active riff card and an active preset
  card are above them, in that order. A
  part panel has Setting, Adjustments, Standard tuning, Setup notes and
  Specs. Each adjustment is its own card,
  `<details class="adj" data-adj="<key>">`. A capture-phase `toggle`
  listener on `#panel` keeps the open state, because `toggle` does not
  bubble. A button with `data-go` and `data-open-adj` selects a part and
  opens one card. One click listener on the panel handles all buttons by
  their data attributes.
- **pan / zoom.** The view is the SVG `viewBox` (`setVB`, `animateTo`,
  `boxView`). Selecting a part zooms to its `getBBox()` and sets the hash to
  its key. Clicks use `elementFromPoint` on pointer-up, so pointer capture
  during a drag does not break selection. The callouts are in
  `#presetLayer` and the riff dots are in `#riffLayer`. Both are outside
  `#world`, so "fit" ignores them. `setVB` hides the built-in fret numbers
  (`.fretnum`) while a riff is active, because the riff draws its own.
- **rotation.** `#rot` holds `#world`, both overlay layers and the hover
  and select boxes. `setRot` sets its `rotate(ROT)`: 0 is upright, and 90
  is horizontal as worn (headstock on the right, low E on top, controls at
  the bottom). The page does not draw the parts again. Drawing
  coordinates stay the same, and the `viewBox` is in view space. Give a
  box in drawing units to `boxView`, because `boxView` turns it with
  `rbox`. An overlay label reads level because `upright(x, y)` turns it
  back around its visual center. The riff dots, fret numbers, string
  names, the step label, the callout labels and `.fretnum`
  (`placeFretNums`) use it. A new overlay label must use it too.
  `drawCallouts` and `drawRiff` choose the side of each label from its
  position in view space (`rot2`). `toggleRot` fits the selected part,
  the riff or the preset again. With none, it keeps the center and the
  zoom. Do not fit the old view box again: its width and height swap, so
  each press zooms out by the aspect ratio of the stage. The rotate
  button and the R key call `toggleRot`.
- **presets API.** `applyConfig(cfg)` normalizes a config with `normalize`
  (keys and aliases in `SCHEMA`). Then it sets `ST`, makes the steps
  (`stepsFor`), draws the callouts (`drawCallouts`, placed by `ANCHOR`) and
  shows the preset card. Entry points: the URL, `window.sixmart` and
  `postMessage`. `API.md` describes them.
- **hand tuning, saved presets, JSON files.** The Effects & sound section
  has every control (`tunerHTML`). It uses the same `data-sel`, `data-pull`
  and `data-mode` buttons and the same `cVol`, `cTone`, `cDelay` and `cRev`
  sliders as the part panels. Each control change goes through
  `controlsChanged(key, rerender)`. It saves `ST`, turns the knobs, and calls
  `syncPreset`, so the callouts and steps of an active preset follow the
  knobs. A click renders the panel again. A slider drag changes the panel
  in place, because a new render would stop the drag. `SAVED` holds the
  saved presets as API configs. `DRAFT` keeps the name and note that are not
  saved yet, so a new render does not lose them. Export and Import use the
  `sixmart-presets` JSON format (`API.md`, section 6).
- **riffs.** `riffNormalize` reads a config (keys in `RSCHEMA`). It gives
  `riff` text to `parseCompact` (`6/3`, `[5/2 4/4]`, `|`, `5/5h7`) and
  `tab` text to `parseTab`. Both make the same event list. An event is
  `{notes:[{s, f, tech?, bend?, vib?, ghost?, mute?}], bar, w}`. `s` is the
  string number (1 = high e, 6 = low E), and the drawing index is `6 - s`. `parseTab` groups numbers whose columns overlap into one event,
  and the column gap `w` sets the timing of Play. `applyRiff` sets `RIFF`,
  draws the layer (`drawRiff`), shows the card (`riffHTML`, `tabSVG`) and
  zooms (`riffView`, `riffBox`). `notePos` puts a fretted note at 60% of
  its fret space and an open string above the nut. Dot size follows the
  string spacing (`strGap`). `riffStep` changes the step in place, without
  a new render. A link keeps the tab text when the riff came from a tab,
  and otherwise the compact form. Sound keys in a riff config make a
  suggested sound. **Set this sound** calls `applyConfig` with
  `url:false`, so the address keeps the riff. `RIFFS` holds the examples,
  and `RIFF_GROUPS` sorts them into the groups of the Riffs list. A new
  example needs a place in a group. `[G: 6/3 …]` gives a chord its name
  (`e.name`), which the tab, the label and the step text show. On a chord
  step, the class `chordstep` fades the dots of the other chords. Check
  the notes of a new example against its scale, chord or melody with
  `sixmart.parseRiff(...).events`, which gives each note name.
  Keep each `source` honest: a song riff is a learning version that was
  not checked against the recording. `route` sends a URL config to
  `applyRiff` when it has `riff` or `tab`, and to `applyConfig` when it
  does not.
- **Start.** The last lines call `applyState()`, fit the view, render the
  overview and route the URL.

## Browser storage and URLs

| `localStorage` key | Holds |
| --- | --- |
| `sixmart.state` | `ST`, the current control setting |
| `sixmart.open` | Which panel sections and diagram cards are open (ids `ov.*`, `part.*`, `api.*`, `adj.<key>`) |
| `sixmart.presets` | The saved presets |
| `sixmart.view` | The rotation of the drawing (`{"rot":0}` or `{"rot":90}`) |

The data stays in the reader's browser only. Each read and write is in a
`try`/`catch`, so the page works without storage.

| URL | Opens |
| --- | --- |
| `index.html#<part key>` | That part, zoomed, with its panel |
| `index.html#api` | The preset API reference |
| `index.html#key=value&…` or `?key=value&…` | A preset (see `API.md`) |
| `index.html#riff=…` or `#tab=…`, with optional sound keys | A riff on the fretboard (see `API.md`, section 7) |

## Rules

- Do not add a `CLAUDE.md`. Claude Code (v2.1.277 or later) reads this
  file directly only when no `CLAUDE.md` or `CLAUDE.local.md` is in the
  repository or a folder above it. If a `CLAUDE.md` becomes necessary, make
  `@AGENTS.md` its first line, so Claude still reads this file.
- `API.md` and the in-page reference (`showApi`) describe the same API.
  Change them together.
- Keep the source tags honest.
- Do not edit the traced outlines by hand.
- A new name for a section id or a storage key loses the reader's stored
  state for it.
