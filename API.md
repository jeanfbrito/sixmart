# Preset API

For an agent or a script that wants to show a setting of the Sixmart's
built-in effects on `index.html`. The page sets the knobs, draws numbered
callouts next to the real controls, and lists the steps the player must
do. The same reference is in the page at `index.html#api`.

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
sixmart.schema                       // the parameter table above, as data
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
