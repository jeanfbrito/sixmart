#!/usr/bin/env node
// Makes the README images in docs/img from index.html with headless Chrome.
//
//   node tools/shots.mjs              all images
//   node tools/shots.mjs riff part    only these names
//
// Needs Node 22 or later (global fetch and WebSocket) and Google Chrome.
// CHROME=/path/to/chrome sets another browser. pngquant makes the PNG files
// smaller and ffmpeg makes the GIF, when they are on the PATH.
// Each shot sets its own window size, color scheme, rotation, open panel
// sections and stored presets, so a run gives the same images each time.
// Reduced motion is on, so no pulse animation is in the images.
import {spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'img');
const PAGE = 'file://' + path.join(ROOT, 'index.html');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9341;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const has = cmd => spawnSync('sh', ['-c', `command -v ${cmd}`]).status === 0;

const SAVED = [
  {title: 'Blues overdrive', note: 'Light crunch on the bridge humbucker.', pickup: 1, effects: 'on', mode: 'over', volume: 7, tone: 6, delay: 2, reverb: 3},
  {title: 'Ambient clean', note: 'Neck pickup with room for arpeggios.', pickup: 5, effects: 'on', mode: 'clean', volume: 8, tone: 7, delay: 4, reverb: 7},
];
const AMBIENT = 'pickup=5&effects=on&mode=clean&volume=8&tone=7&delay=4&reverb=7&title=Ambient+clean&note=Neck+pickup+with+room+for+arpeggios';

// One entry per image. w and h are CSS pixels, dpr is the device pixel ratio.
// bare: hide the panel and the buttons. clip: 'panel' keeps only the side panel.
// run: JavaScript to run after load. gif: one frame per riff step.
const SHOTS = [
  {name: 'hero-dark', w: 1600, h: 600, dpr: 1.25, theme: 'dark', rot: 90, bare: true},
  {name: 'hero-light', w: 1600, h: 600, dpr: 1.25, theme: 'light', rot: 90, bare: true},
  {name: 'overview', w: 1280, h: 800, theme: 'dark'},
  {name: 'part', w: 1280, h: 800, theme: 'dark', hash: 'bridge', open: {'adj.action': 1}},
  {name: 'setup', w: 1280, h: 800, theme: 'light', hash: 'neck', open: {'adj.truss': 1, 'adj.relief': 0}},
  {name: 'tuner', w: 1280, h: 900, theme: 'light', open: {'ov.riffs': 0, 'ov.fx': 1, 'ov.presets': 1},
   state: {sel: 1, pulled: true, mode: 'over', vol: 7, tone: 6, delay: 2, reverb: 3}, presets: SAVED,
   run: `setVB(partView('ctlplate'));document.querySelector('[data-sec="ov.fx"]').scrollIntoView({block:'start'})`},
  {name: 'preset', w: 1280, h: 800, theme: 'dark', hash: AMBIENT},
  {name: 'riff', w: 1280, h: 800, theme: 'dark', run: `sixmart.riff(RIFFS['four-chords'])`},
  {name: 'phone-upright', w: 390, h: 844, dpr: 2, mobile: true, theme: 'dark', run: `sixmart.riff(RIFFS['em-pentatonic'])`},
  {name: 'phone-worn', w: 390, h: 844, dpr: 2, mobile: true, theme: 'dark', rot: 90, run: `sixmart.riff(RIFFS['em-pentatonic'])`},
  {name: 'riff-play', w: 1280, h: 720, dpr: 1, theme: 'dark', rot: 90, run: `sixmart.riff(RIFFS.smoke)`, gif: {ms: 650, width: 960}},
];

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.onmessage = m => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    };
    ws.onerror = reject;
    ws.onopen = () => resolve({
      close: () => ws.close(),
      send: (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({id: i, method, params})); }),
    });
  });
}

async function evaluate(page, expression) {
  const r = await page.send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || expression);
  return r.result && r.result.result ? r.result.result.value : undefined;
}

async function capture(page, file, clip) {
  const params = {format: 'png'};
  if (clip) params.clip = {...clip, scale: 1};
  const r = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
}

function squeeze(file) {
  if (!has('pngquant')) return;
  const tmp = file + '.q.png';
  const r = spawnSync('pngquant', ['--quality=70-92', '--speed=1', '--strip', '--force', '--output', tmp, file]);
  if (r.status === 0 && fs.existsSync(tmp)) fs.renameSync(tmp, file);
  else if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
}

async function load(page, s) {
  await page.send('Emulation.setDeviceMetricsOverride', {width: s.w, height: s.h, deviceScaleFactor: s.dpr || 1.5, mobile: !!s.mobile});
  await page.send('Emulation.setEmulatedMedia', {features: [
    {name: 'prefers-color-scheme', value: s.theme || 'dark'},
    {name: 'prefers-reduced-motion', value: 'reduce'},
  ]});
  const store = {'sixmart.view': {rot: s.rot || 0}};
  if (s.open) store['sixmart.open'] = s.open;
  if (s.state) store['sixmart.state'] = s.state;
  if (s.presets) store['sixmart.presets'] = s.presets;
  const init = await page.send('Page.addScriptToEvaluateOnNewDocument', {source:
    `(()=>{if(location.protocol!=='file:')return;try{localStorage.clear();const S=${JSON.stringify(store)};for(const k in S)localStorage.setItem(k,JSON.stringify(S[k]));}catch(e){}})();`});
  // about:blank first, so a change of hash only still loads the page again
  await page.send('Page.navigate', {url: 'about:blank'});
  await sleep(150);
  await page.send('Page.navigate', {url: PAGE + (s.hash ? '#' + s.hash : '')});
  for (let i = 0; i < 100; i++) { await sleep(100); if (await evaluate(page, 'document.readyState') === 'complete') break; }
  await evaluate(page, 'document.fonts.ready.then(()=>true)');
  await page.send('Page.removeScriptToEvaluateOnNewDocument', {identifier: init.result.identifier});
  const err = await evaluate(page, 'window.__err||""');
  if (err) throw new Error('page error: ' + err);
  if (s.bare) {
    await evaluate(page, `new Promise(r=>{const st=document.createElement('style');
      st.textContent='.panel,.toolbar,.crumb,.hint,.gh,.tip{display:none!important}.app{grid-template-columns:1fr!important}';
      document.head.appendChild(st);requestAnimationFrame(()=>requestAnimationFrame(()=>{setVB(boxView(full(),14));r(true);}));})`);
  }
  if (s.run) await evaluate(page, s.run);
  await sleep(900);
}

async function shoot(page, s) {
  await load(page, s);
  if (s.gif) return gif(page, s);
  const file = path.join(OUT, s.name + '.png');
  let clip = null;
  if (s.clip === 'panel') clip = await evaluate(page, `(()=>{const r=document.getElementById('panel').getBoundingClientRect();return {x:r.left,y:r.top,width:r.width,height:r.height};})()`);
  await capture(page, file, clip);
  squeeze(file);
  return file;
}

async function gif(page, s) {
  const file = path.join(OUT, s.name + '.gif');
  if (!has('ffmpeg')) { console.log(`skip ${s.name}: ffmpeg is not on the PATH`); return null; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sixmart-gif-'));
  const n = await evaluate(page, 'RIFF.events.length');
  for (let i = 0; i < n; i++) {
    await evaluate(page, `sixmart.riffStep(${i + 1})`);
    await sleep(200);
    await capture(page, path.join(dir, `f${String(i).padStart(3, '0')}.png`));
  }
  const fps = (1000 / s.gif.ms).toFixed(3);
  const vf = `scale=${s.gif.width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', fps, '-i', path.join(dir, 'f%03d.png'), '-vf', vf, '-loop', '0', file]);
  fs.rmSync(dir, {recursive: true, force: true});
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr.toString());
  return file;
}

const want = process.argv.slice(2);
const list = want.length ? SHOTS.filter(s => want.includes(s.name)) : SHOTS;
if (!list.length) { console.error('No shot has that name. Names: ' + SHOTS.map(s => s.name).join(', ')); process.exit(2); }
if (!fs.existsSync(CHROME)) { console.error('Chrome is not at ' + CHROME + '. Set CHROME=/path/to/chrome.'); process.exit(2); }
fs.mkdirSync(OUT, {recursive: true});

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sixmart-shots-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
let code = 0;
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) { await sleep(200); }
  }
  if (!target) throw new Error('Chrome did not start its DevTools port ' + PORT);
  const page = await connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  // keep the first page error, so a broken page fails the run
  await page.send('Page.addScriptToEvaluateOnNewDocument', {source: `window.addEventListener('error',e=>{window.__err=window.__err||e.message;});`});
  for (const s of list) {
    const file = await shoot(page, s);
    if (file) console.log(`${path.relative(ROOT, file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
  page.close();
} catch (e) {
  console.error(e.message);
  code = 1;
} finally {
  chrome.kill();
  await sleep(300);
  fs.rmSync(profile, {recursive: true, force: true});
}
process.exit(code);
