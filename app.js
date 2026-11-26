/* Aura Pad — pads infinitos, drum pads, metrônomo, setlist e MIDI (Web Audio, sem dependências)
   © 2026 Thiago R. Galvão. Todos os direitos reservados. ID: AURA-PD-TRG-2026 */
(function () {
'use strict';
var AURA_AUTOR = 'Thiago R. Galvão', AURA_ANO = 2026, AURA_ID = 'AURA-PD-TRG-2026';
try { console.log('%cAURA PAD%c © 2026 ' + AURA_AUTOR + ' — todos os direitos reservados', 'font-weight:700;color:#ffab2e', ''); } catch (e) { console.warn(e); }

var NOTES = ['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];
var LABEL = {C:'C',Cs:'C#',D:'D',Ds:'D#',E:'E',F:'F',Fs:'F#',G:'G',Gs:'G#',A:'A',As:'A#',B:'B'};
var DRUM_KEYS = ['Digit1','Digit2','Digit3','Digit4','KeyQ','KeyW','KeyE','KeyR','KeyA','KeyS','KeyD','KeyF','KeyZ','KeyX','KeyC','KeyV'];
var KIT3 = ['kick-kit-3','snare-kit-3','hihat-kit-3','hihat-open-kit-3','tom-1-kit-3','tom-2-kit-3','tom-3-kit-3','crash-kit-3','','','','','','','',''];
var DEFAULT_KIT = KIT3;
var FACTORY_KITS = [
  { name: 'Standard Kit', ids: ['kick-1-kit-1','clap-1-kit-1','wood-1-kit-1','tumb-1-kit-1','tom-1-kit-1','tom-2-kit-1','tom-3-kit-1','sub-kick-kit-1','','','','','','','',''], labels: ['Kick 1','Clap 1','Wood 1','Tumb 1','Tom 1','Tom 2','Tom 3','Sub Kick'] },
  { name: 'Effects Kit', ids: ['boom-kit-2','fx-tom-kit-2','swell-kit-2','tumb-2-kit-2','tom-1-kit-2','tom-2-kit-2','tom-3-kit-2','2-white-noise-kit-2','','','','','','','',''], labels: ['Boom','FX Tom','Swell','Tumb 2','Tom 1','Tom 2','Tom 3','White Noise 2'] },
  { name: 'Worship Kit', ids: ['kick-kit-3','snare-kit-3','hihat-kit-3','hihat-open-kit-3','tom-1-kit-3','tom-2-kit-3','tom-3-kit-3','crash-kit-3','','','','','','','',''], labels: ['Kick','Snare','Hi-Hat','Hi-Hat Open','Tom 1','Tom 2','Tom 3','Crash'] },
  { name: 'Worship FX Kit', ids: ['sub-kick-fxkit-4','boom-fxkit-4','perc-fxkit-4','wood-fxkit-4','tumb-fxkit-4','blop-fxkit-4','noise-fxkit-4','swell-fxkit-4','','','','','','','',''], labels: ['Sub Kick FX','Boom FX','Perc FX','Wood FX','Tumb FX','Blop FX','Noise FX','Swell FX'] },
];
var OLD_KIT_NAMES = { 'Standard Drum Kit': 'Standard Kit', 'Effects Drum Kit': 'Effects Kit', 'Worship Standard Drum Kit': 'Worship Kit', 'Worship Effects Drum Kit': 'Worship FX Kit', 'Kit 1': 'Standard Kit', 'Kit 2': 'Effects Kit', 'Kit 3': 'Worship Kit', 'Kit 4 (FX)': 'Worship FX Kit',
  'Drum Kit 1': 'Standard Kit', 'EFX 1': 'Effects Kit', 'Worship Drums': 'Worship Kit', 'Worship EFX': 'Worship FX Kit' };
function fixKitRef(v) { return (typeof v === 'string' && v.slice(0, 2) === 'f:' && OLD_KIT_NAMES[v.slice(2)]) ? 'f:' + OLD_KIT_NAMES[v.slice(2)] : v; }
var STORE = 'aurapad.v1';

function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

/* ---------- estado ---------- */
var DEF = {
  family: 'shimmer', key: 'C', padVol: 0.8, padFade: 4, padLoop: 5, drumVol: 0.9, masterVol: 0.9,
  fx: { cut: 1, pan: 0, low: 0, high: 0, rev: 0.25, comp: false, th: -24, ra: 4 },
  family2: '', mix2: 0.5, pulse: 0, pulseDepth: 0.5, swell: 0, loop: '', loopVol: 0.8, lists: {}, listName: 'Setlist 1',
  bpm: 72, sig: 4, click: 'classic', metVol: 0.7, accent: true,
  kit: DEFAULT_KIT.slice(), dvol: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], kitSel: 'f:Worship Kit', drumSets: {}, setlist: [], songIdx: -1, midiMap: {}
};
var S = (function () {
  var s = {};
  try { s = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { s = {}; }
  var out = JSON.parse(JSON.stringify(DEF));
  Object.keys(s).forEach(function (k) {
    if (k === 'fx' && s.fx) { Object.keys(s.fx).forEach(function (j) { out.fx[j] = s.fx[j]; }); }
    else out[k] = s[k];
  });
  if (!Array.isArray(out.kit) || out.kit.length !== 16) out.kit = DEFAULT_KIT.slice();
  out.kitSel = fixKitRef(out.kitSel);
  out.setlist = (out.setlist || []).map(function (x) { if (x && x.kit) x.kit = fixKitRef(x.kit); return x; });
  Object.keys(out.lists || {}).forEach(function (k) { (out.lists[k] || []).forEach(function (x) { if (x && x.kit) x.kit = fixKitRef(x.kit); }); });
  if (!Array.isArray(out.dvol) || out.dvol.length !== 16) out.dvol = DEF.dvol.slice();
  return out;
})();
var saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} }, 150); }

var toastT = null;
function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }

/* ---------- catálogo ---------- */
var CAT = null, FAM = {}, DRUM = {}, CLICK = {};
function loadCatalog() {
  return fetch('catalog.json').then(function (r) { return r.json(); }).then(function (c) {
    CAT = c;
    c.pads.forEach(function (f) { FAM[f.id] = f; });
    c.drums.forEach(function (d) { DRUM[d.id] = d; });
    c.clicks.forEach(function (k) { CLICK[k.id] = k; });
    if (!FAM[S.family]) S.family = c.pads[0].id;
  });
}

/* ---------- áudio ---------- */
var ctx = null, A = {};
function initAudio() {
  var AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC({ latencyHint: 'interactive' });
  A.master = ctx.createGain();
  A.lim = ctx.createDynamicsCompressor();
  A.lim.threshold.value = -3; A.lim.knee.value = 0; A.lim.ratio.value = 20; A.lim.attack.value = 0.003; A.lim.release.value = 0.1;
  A.mix = ctx.createGain();
  A.mix.connect(A.lim); A.lim.connect(A.master); A.master.connect(ctx.destination);

  A.padBus = ctx.createGain();
  A.l1 = ctx.createGain(); A.l2 = ctx.createGain(); A.pulse = ctx.createGain(); A.l1.connect(A.pulse); A.l2.connect(A.pulse); A.pulse.connect(A.padBus);
  A.pLfo = ctx.createOscillator(); A.pLfo.type = 'sine'; A.pLfo.frequency.value = 1; A.pLfoG = ctx.createGain(); A.pLfoG.gain.value = 0; A.pLfo.connect(A.pLfoG); A.pLfoG.connect(A.pulse.gain); A.pLfo.start();
  A.lp = ctx.createBiquadFilter(); A.lp.type = 'lowpass'; A.lp.Q.value = 0.7;
  A.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  A.low = ctx.createBiquadFilter(); A.low.type = 'lowshelf'; A.low.frequency.value = 200;
  A.high = ctx.createBiquadFilter(); A.high.type = 'highshelf'; A.high.frequency.value = 3200;
  A.comp = ctx.createDynamicsCompressor();
  A.padOut = ctx.createGain();
  A.padBus.connect(A.lp); A.lp.connect(A.pan); A.pan.connect(A.low); A.low.connect(A.high); A.high.connect(A.comp); A.comp.connect(A.padOut);
  A.dry = ctx.createGain(); A.wet = ctx.createGain();
  A.conv = ctx.createConvolver(); A.conv.buffer = makeIR(3.4, 2.6);
  A.padOut.connect(A.dry); A.dry.connect(A.mix);
  A.padOut.connect(A.conv); A.conv.connect(A.wet); A.wet.connect(A.mix);

  A.drumBus = ctx.createGain(); A.drumBus.connect(A.mix);
  A.metBus = ctx.createGain(); A.metBus.connect(A.master);
  ctx.onstatechange = function () { if (ctx.state !== 'running' && ctx.state !== 'closed') { ctx.resume().catch(function () {}); if (!document.hidden) toast('Áudio pausado pelo sistema. Toque na tela para retomar.'); } };
  applyAll();
}
function makeIR(sec, decay) {
  var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (var c = 0; c < 2; c++) {
    var d = b.getChannelData(c);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}
function set(param, v, tc) { param.setTargetAtTime(v, ctx.currentTime, tc || 0.03); }
function applyAll() {
  if (!ctx) return;
  set(A.master.gain, S.masterVol);
  set(A.padBus.gain, duckOn ? S.padVol * 0.18 : S.padVol, duckOn ? 0.12 : 0.4);
  applyPulse();
  var m2 = S.family2 ? clamp(S.mix2, 0, 1) : 0;
  set(A.l1.gain, Math.cos(m2 * Math.PI / 2)); set(A.l2.gain, Math.sin(m2 * Math.PI / 2));
  set(A.drumBus.gain, S.drumVol);
  set(A.metBus.gain, S.metVol);
  var f = S.fx;
  set(A.lp.frequency, 200 * Math.pow(100, f.cut));
  if (A.pan.pan) set(A.pan.pan, f.pan);
  set(A.low.gain, f.low); set(A.high.gain, f.high);
  set(A.wet.gain, f.rev * 1.2); set(A.dry.gain, 1 - f.rev * 0.35);
  if (f.comp) { set(A.comp.threshold, f.th); set(A.comp.ratio, f.ra); A.comp.knee.value = 12; A.comp.attack.value = 0.01; A.comp.release.value = 0.25; }
  else { set(A.comp.threshold, 0); set(A.comp.ratio, 1); }
}
function decode(ab) {
  return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); });
}
function fetchBuf(url) {
  return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); }).then(decode);
}

/* ---------- pads infinitos ---------- */
var CURVE_N = 96, CURVE_IN = new Float32Array(CURVE_N), CURVE_OUT = new Float32Array(CURVE_N);
for (var ci = 0; ci < CURVE_N; ci++) { var ph = ci / (CURVE_N - 1) * Math.PI / 2; CURVE_IN[ci] = Math.sin(ph); CURVE_OUT[ci] = Math.cos(ph); }

var duckOn = false;
var padBufs = new Map(), padLoading = {};
function getPadBuffer(fam, note) {
  var k = fam + '/' + note;
  if (padBufs.has(k)) { var b = padBufs.get(k); padBufs.delete(k); padBufs.set(k, b); return Promise.resolve(b); }
  if (padLoading[k]) return padLoading[k];
  var url = FAM[fam].files[note];
  padLoading[k] = fetchBuf(url).then(function (buf) {
    delete padLoading[k]; padBufs.set(k, buf);
    while (padBufs.size > 8) padBufs.delete(padBufs.keys().next().value);
    return buf;
  }, function (e) { delete padLoading[k]; throw e; });
  return padLoading[k];
}
var prefetched = {};
function prefetchFamily(fam) {
  if (prefetched[fam] || !FAM[fam]) return;
  prefetched[fam] = true;
  var list = NOTES.map(function (n) { return FAM[fam].files[n]; }).filter(Boolean);
  (function next(i) { if (i >= list.length) return; fetch(list[i]).then(function (r) { return r.arrayBuffer(); }).catch(function () {}).then(function () { next(i + 1); }); })(0);
}

function Stream(buf, fadeIn, loopX, dest) {
  this.buf = buf;
  this.X = clamp(loopX, 1, buf.duration / 2 - 0.5);
  this.out = ctx.createGain();
  this.out.gain.value = 0;
  this.out.connect(dest || A.l1);
  this.insts = []; this.timer = null; this.dead = false;
  var t = ctx.currentTime + 0.03;
  this.out.gain.setValueAtTime(0, t);
  this.out.gain.linearRampToValueAtTime(1, t + Math.max(0.05, fadeIn));
  this.spawn(t, true);
  this.sched();
}
Stream.prototype.spawn = function (when, first) {
  var src = ctx.createBufferSource(); src.buffer = this.buf;
  var g = ctx.createGain(); src.connect(g); g.connect(this.out);
  if (first) { g.gain.value = 1; }
  else {
    g.gain.setValueAtTime(0, when);
    g.gain.setValueCurveAtTime(CURVE_IN, when, this.X);
    var prev = this.insts[this.insts.length - 1];
    if (prev) {
      prev.g.gain.setValueAtTime(1, when);
      prev.g.gain.setValueCurveAtTime(CURVE_OUT, when, this.X);
      try { prev.src.stop(when + this.X + 0.05); } catch (e) {}
    }
  }
  src.start(when);
  this.insts.push({ src: src, g: g });
  if (this.insts.length > 3) this.insts.shift();
  this.next = when + this.buf.duration - this.X;
};
Stream.prototype.sched = function () {
  var self = this;
  var delay = (this.next - 6 - ctx.currentTime) * 1000;
  this.timer = setTimeout(function () { if (self.dead) return; self.spawn(self.next, false); self.sched(); }, Math.max(0, delay));
};
Stream.prototype.stop = function (fadeOut) {
  var self = this; if (this.dead) return; this.dead = true; clearTimeout(this.timer);
  var t = ctx.currentTime, g = this.out.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + Math.max(0.05, fadeOut));
  setTimeout(function () {
    self.insts.forEach(function (i) { try { i.src.stop(); } catch (e) {} });
    try { self.out.disconnect(); } catch (e) {}
  }, fadeOut * 1000 + 300);
};

var padOn = false, padNote = null, padStream = null, padStream2 = null, padReq = 0, padLoadingNote = null;
function padStart() {
  if (!ctx) return;
  var req = ++padReq, fam = S.family, fam2 = FAM[S.family2] ? S.family2 : '', note = S.key;
  padLoadingNote = note; renderKeys();
  prefetchFamily(fam); if (fam2) prefetchFamily(fam2);
  return Promise.all([getPadBuffer(fam, note), fam2 ? getPadBuffer(fam2, note) : null]).then(function (b) {
    if (req !== padReq) return;
    var old = padStream, old2 = padStream2, fi = (!old && !old2 && swellSecs()) ? swellSecs() : S.padFade;
    padStream = new Stream(b[0], fi, S.padLoop, A.l1);
    padStream2 = b[1] ? new Stream(b[1], fi, S.padLoop, A.l2) : null;
    if (old) old.stop(S.padFade); if (old2) old2.stop(S.padFade);
    padOn = true; padNote = note; padLoadingNote = null; renderKeys(); renderPadBtn();
  }).catch(function (e) { padLoadingNote = null; renderKeys(); toast('Não consegui carregar o pad'); console.error(e); });
}
function padStop(fade) {
  padReq++; padOn = false; padNote = null; padLoadingNote = null;
  var f = fade == null ? S.padFade : fade;
  if (padStream) { padStream.stop(f); padStream = null; }
  if (padStream2) { padStream2.stop(f); padStream2 = null; }
  renderKeys(); renderPadBtn();
}
function padKeyTap(note) {
  S.key = note; save();
  if (!padOn) padStart();
  else if (note === padNote) padStop();
  else padStart();
  renderKeys();
}
function keyShift(d) {
  var i = NOTES.indexOf(S.key); S.key = NOTES[(i + d + 12 * 4) % 12]; save();
  if (padOn) padStart(); renderKeys(); toast('Tom: ' + LABEL[S.key]);
}
function duckToggle() { duckOn = !duckOn; $$('[data-action="pad:duck"]').forEach(function (b) { b.classList.toggle('on', duckOn); }); applyAll(); }
function setLayer2(id) { S.family2 = id || ''; save(); renderLayer(); renderFams(); applyAll(); if (padOn) padStart(); }
function renderLayer() {
  var s = $('#fam2Sel'); if (!s) return;
  if (s.options.length < 2) { var o0 = el('option', null, 'Sem camada 2'); o0.value = ''; s.appendChild(o0); famList().forEach(function (f) { var o = el('option', null, f.name); o.value = f.id; s.appendChild(o); }); }
  s.value = S.family2 || ''; $('#mix2').value = S.mix2; $('#mix2').disabled = !S.family2;
  $('#mix2O').textContent = S.family2 ? Math.round(S.mix2 * 100) + '%' : '—';
}
function padToggle() { if (padOn) padStop(); else padStart(); }
function setFamily(id) {
  S.family = id; save(); renderFams();
  prefetchFamily(id);
  if (padOn) padStart();
}

function renderKeys() {
  var box = $('#keys');
  if (!box.children.length) {
    NOTES.forEach(function (n) {
      var b = el('button', 'key' + (n.length > 1 ? ' sharp' : ''), LABEL[n]);
      b.dataset.note = n; b.dataset.action = 'padkey:' + n;
      box.appendChild(b);
    });
  }
  $$('.key', box).forEach(function (b) {
    var n = b.dataset.note;
    b.classList.toggle('sel', n === S.key);
    b.classList.toggle('live', padOn && n === padNote);
    b.classList.toggle('loading', n === padLoadingNote);
  });
  renderStatus();
}
function renderPadBtn() { renderStatus(); }
function svgUse(id) { return '<svg><use href="#' + id + '"/></svg>'; }
var lastPlayIcon = null;
function renderStatus() {
  var k = $('#stKey'); if (!k) return;
  var key = LABEL[padOn && padNote ? padNote : S.key] || '', fam = FAM[S.family] ? FAM[S.family].name : '—';
  k.textContent = key;
  $('#stPad').textContent = fam + (FAM[S.family2] ? ' + ' + FAM[S.family2].name : '');
  var b = $('#stBtn'), ic = padOn ? 'i-stop' : 'i-play';
  if (lastPlayIcon !== ic) { b.innerHTML = svgUse(ic); lastPlayIcon = ic; }
  b.classList.toggle('playing', padOn);
  $('#status').classList.toggle('playing', padOn);
  renderOled();
}
function renderOled() {
  var m = $('#oledMain'); if (!m || !CAT) return;
  var key = LABEL[padOn && padNote ? padNote : S.key] || '', fam = FAM[S.family] ? FAM[S.family].name : '';
  m.textContent = 'TOM ' + key + ' · ' + fam.toUpperCase();
  var s = S.setlist[S.songIdx];
  $('#oledSub').textContent = (s ? (S.songIdx + 1) + '. ' + s.title + ' · ' : '') + S.bpm + ' BPM' + (padOn ? ' · tocando' : padLoadingNote ? ' · carregando…' : '');
  $('#oledLed').className = 'led' + (padOn ? ' on' : padLoadingNote ? ' wait' : '');
}
function famList() { return CAT.pads.slice().sort(byName); }
function famStep(d) {
  var l = famList(), i = l.findIndex(function (f) { return f.id === S.family; });
  setFamily(l[(i + d + l.length) % l.length].id);
}
var famCat = null;
var byName = function (a, b) { return String(a.name || a).localeCompare(String(b.name || b), 'pt-BR', { numeric: true, sensitivity: 'base' }); };
function renderFams() {
  var fs = $('#famSel');
  if (fs) {
    if (!fs.options.length) famList().forEach(function (f) { var o = el('option', null, f.name); o.value = f.id; fs.appendChild(o); });
    fs.value = S.family;
  }
  renderStatus();
  var cats = []; CAT.pads.forEach(function (f) { if (cats.indexOf(f.category) < 0) cats.push(f.category); });
  cats.sort(byName);
  if (!famCat) famCat = FAM[S.family] ? FAM[S.family].category : cats[0];
  var cb = $('#famCats'); cb.innerHTML = '';
  if (famCat !== 'Todos' && cats.indexOf(famCat) < 0) famCat = 'Todos';
  ['Todos'].concat(cats).forEach(function (c) {
    var b = el('button', (famCat === c || (famCat === 'Todos' && c === 'Todos')) ? 'on' : '', c);
    b.onclick = function () { famCat = c; renderFams(); };
    cb.appendChild(b);
  });
  var fb = $('#fams'); fb.innerHTML = '';
  CAT.pads.filter(function (f) { return famCat === 'Todos' || f.category === famCat; }).sort(byName).forEach(function (f) {
    var b = el('button', 'fam' + (f.id === S.family ? ' on' : '') + (f.id === S.family2 ? ' l2' : ''));
    b.appendChild(el('span', 'nm', f.name)); b.appendChild(el('small', null, f.category));
    b.onclick = function () { setFamily(f.id); };
    fb.appendChild(b);
  });
  fitGrid(fb, 128, 40);
}
/* grade que sempre cabe: escolhe colunas e linhas para o espaço disponível (nada rola) */
function fitGrid(box, minW, minH, wide) {
  if (!box) return;
  var n = box.children.length, w = box.clientWidth, h = box.clientHeight, gap = 6;
  if (!n || !w || !h) { box._fit = [minW, minH, wide]; return; }
  var best = null;
  if (wide) {  // o maior número de colunas que ainda deixa cada célula com o tamanho mínimo
    for (var cc = n; cc >= 1; cc--) {
      var rr = Math.ceil(n / cc), cw0 = (w - gap * (cc - 1)) / cc, ch0 = (h - gap * (rr - 1)) / rr;
      if (cw0 >= minW && ch0 >= minH) { best = { c: cc, r: rr }; break; }
    }
  }
  if (!best) for (var c = 1; c <= n; c++) {
    var r = Math.ceil(n / c), cw = (w - gap * (c - 1)) / c, ch = (h - gap * (r - 1)) / r;
    if (cw < minW && c > 1) break;
    best = { c: c, r: r }; if (ch >= minH) break;
  }
  box.style.gridTemplateColumns = 'repeat(' + best.c + ',minmax(0,1fr))';
  box.style.gridTemplateRows = 'repeat(' + best.r + ',minmax(0,1fr))';
  box._fit = [minW, minH, wide];
}
if (window.ResizeObserver) {
  var fitRO = new ResizeObserver(function (es) { es.forEach(function (e) { var b = e.target; if (b._fit) fitGrid(b, b._fit[0], b._fit[1], b._fit[2]); }); });
  window.addEventListener('DOMContentLoaded', function () { ['#fams', '#dvols'].forEach(function (s) { var b = $(s); if (b) fitRO.observe(b); }); });
}

/* ---------- drum pads ---------- */
var drumBufs = {}, drumLoading = {}, userSamples = {}, drumEditing = false;
var padGain = [], padVoices = [], padEls = [];
function drumMeta(id) { return DRUM[id] || userSamples[id] || null; }
function getDrumBuffer(id) {
  if (drumBufs[id]) return Promise.resolve(drumBufs[id]);
  if (drumLoading[id]) return drumLoading[id];
  if (!ctx) return Promise.resolve(null);
  var p;
  if (DRUM[id]) p = fetchBuf(DRUM[id].file);
  else if (userSamples[id]) p = idbGet(id).then(function (rec) { return decode(rec.data.slice(0)); });
  else return Promise.resolve(null);
  drumLoading[id] = p.then(function (b) { var m = DRUM[id]; if (b && m) { b._g = m.g || 1; b._o = m.o || 0; } drumBufs[id] = b; delete drumLoading[id]; return b; }, function () { delete drumLoading[id]; return null; });
  return drumLoading[id];
}
function preloadKit() { S.kit.forEach(function (id) { getDrumBuffer(id); }); }
function padOut(i) {
  if (!padGain[i]) { padGain[i] = ctx.createGain(); padGain[i].connect(A.drumBus); }
  padGain[i].gain.value = S.dvol[i] == null ? 1 : S.dvol[i];
  return padGain[i];
}
function trigger(i, buf, vel, when) {
  var t = when || ctx.currentTime;
  var src = ctx.createBufferSource(); src.buffer = buf;
  var g = ctx.createGain(); g.gain.value = clamp(vel, 0.05, 1) * (buf._g || 1);
  src.connect(g); g.connect(padOut(i)); src.start(t, buf._o || 0);
  // no máximo 3 vozes por pad: a mais antiga some rápido (evita acúmulo em pratos e repiques)
  var vs = padVoices[i] || (padVoices[i] = []);
  vs.push({ s: src, g: g });
  src.onended = function () { var k = vs.indexOf(this._v); if (k >= 0) vs.splice(k, 1); try { g.disconnect(); } catch (e) {} };
  src._v = vs[vs.length - 1];
  while (vs.length > 3) { var o = vs.shift(); try { o.g.gain.setTargetAtTime(0, t, 0.015); o.s.stop(t + 0.08); } catch (e) {} }
  if (!when) flashPad(i);
}
function flashPad(i) {
  var p = padEls[i]; if (!p) return;
  p.classList.remove('hit'); void p.offsetWidth; p.classList.add('hit');
}
function playDrum(i, vel) {
  if (!ctx) return;
  var id = S.kit[i], v = vel == null ? 1 : vel, b = drumBufs[id];
  if (v < 1) v = 0.35 + 0.65 * Math.pow(v, 0.7);   // toque leve no controlador ainda soa
  if (b) trigger(i, b, v);
  else getDrumBuffer(id).then(function (bb) { if (bb) trigger(i, bb, v); });
}
var kitSelKey = null;
function renderDrums() {
  var g = $('#drumGrid');
  if (!padEls.length) {
    for (var n = 0; n < 16; n++) {
      var p = el('div', 'dpad'); p.dataset.action = 'drum:' + n; p.dataset.fast = '1';
      var top = el('div', 'dtop'); top.appendChild(el('b', null, String(n + 1))); top.appendChild(el('i', 'dic'));
      p.appendChild(top); p.appendChild(el('span'));
      p.addEventListener('animationend', function () { this.classList.remove('hit'); });
      g.appendChild(p); padEls.push(p);
    }
  }
  S.kit.forEach(function (id, i) {
    var p = padEls[i], ic = padIcon(i);
    p.lastChild.textContent = padName(i);
    p.querySelector('.dic').innerHTML = ic ? '<svg><use href="#d-' + ic + '"/></svg>' : '';
    p.classList.toggle('empty', !id);
  });
  $('#tab-drums').classList.toggle('editing', drumEditing);
  g.classList.toggle('has16', S.kit.slice(8).some(Boolean));
  renderDvols(); renderStatus();
  var key = kitList().join('|') + '#' + S.kitSel;
  if (key === kitSelKey) return; kitSelKey = key;
  var sel = $('#kitSel'); sel.innerHTML = '';
  var g1 = document.createElement('optgroup'); g1.label = 'Kits prontos';
  FACTORY_KITS.forEach(function (k) { var o = el('option', null, k.name); o.value = 'f:' + k.name; g1.appendChild(o); });
  sel.appendChild(g1);
  var us = Object.keys(S.drumSets);
  if (us.length) {
    var g2 = document.createElement('optgroup'); g2.label = 'Meus kits';
    us.forEach(function (n) { var o = el('option', null, n); o.value = 'u:' + n; g2.appendChild(o); });
    sel.appendChild(g2);
  }
  var cur = kitList().indexOf(S.kitSel) >= 0 ? S.kitSel : '';
  sel.value = cur;
  if (!cur) { var o0 = el('option', null, 'Personalizado'); o0.value = ''; sel.insertBefore(o0, sel.firstChild); sel.value = ''; }
}
/* nome limpo da peça: sem "(kit 3)" e sem número, a não ser que haja outra peça igual no kit (Tom 1, Tom 2...) */
function cleanName(n) {
  var s = String(n || '').replace(/\s*\(\s*kit\s*\d+\s*\)/ig, '').replace(/_/g, ' ');
  var num = null;
  s = s.split(/\s+/).filter(function (t) { if (/^\d{1,2}$/.test(t)) { if (num === null) num = t; return false; } return !!t; }).join(' ');
  s = s.replace(/\bfx\b/ig, 'FX').replace(/\befx\b/ig, 'EFX');
  return { base: s ? s.charAt(0).toUpperCase() + s.slice(1) : '', num: num };
}
function rawName(i) { var m = drumMeta(S.kit[i]); return kitLabel(i) || (m ? m.name : ''); }
function padName(i) {
  if (!S.kit[i]) return 'Vazio';
  var me = cleanName(rawName(i)), same = [];
  S.kit.forEach(function (id, j) { if (id && cleanName(rawName(j)).base.toLowerCase() === me.base.toLowerCase()) same.push(j); });
  if (same.length < 2) return me.base;
  return me.base + ' ' + (me.num || String(same.indexOf(i) + 1));
}
/* ícone pelo tipo de som */
function padIcon(i) {
  var m = drumMeta(S.kit[i]); if (!m) return '';
  var n = (rawName(i) + ' ' + (m.name || '')).toLowerCase(), c = (m.category || '').toLowerCase();
  var rules = [[/clap/, 'clap'], [/snap/, 'snap'], [/hi-?hat/, 'hihat'], [/crash|cymbal|symbal|prato/, 'crash'], [/sub/, 'sub'], [/kick|bumbo/, 'kick'],
    [/snare|caixa/, 'snare'], [/tom|tumb/, 'tom'], [/shaker|egg/, 'shaker'], [/tamb/, 'tamb'], [/wood|perc|blop|stick|block/, 'wood'],
    [/boom|impact|explos|pressure/, 'boom'], [/swell|rise|reverse|whoosh/, 'rise'], [/noise|laser|lazer/, 'noise'], [/bell|chime/, 'bell']];
  for (var k = 0; k < rules.length; k++) if (rules[k][0].test(n)) return rules[k][1];
  var byCat = { kicks: 'kick', snares: 'snare', toms: 'tom', claps: 'clap', snaps: 'snap', shakers: 'shaker', tambs: 'tamb', woods: 'wood', sub: 'sub', 'hi-hats e pratos': 'hihat' };
  return byCat[c] || 'fx';
}
function kitLabel(i) {
  var v = S.kitSel, r = null;
  if (v && v[0] === 'f') FACTORY_KITS.forEach(function (k) { if (k.name === v.slice(2) && k.ids[i] === S.kit[i] && k.labels) r = k.labels[i] || null; });
  return r;
}
/* mixer da bateria: um fader vertical por peça, todos na mesma tela */
function renderDvols() {
  var box = $('#dvols'); if (!box) return; box.innerHTML = '';
  S.kit.forEach(function (id, i) {
    if (!id) return;
    var name = padName(i), ic = padIcon(i);
    var col = el('div', 'vcol');
    var o = el('b', 'vv', Math.round(S.dvol[i] * 100) + '');
    var f = el('div', 'vf'); f.tabIndex = 0; f.setAttribute('role', 'slider'); f.setAttribute('aria-label', 'Volume ' + name);
    f.innerHTML = '<i class="trk"><i class="fill"></i></i><i class="thumb"></i>';
    var nm = el('button', 'vname'); nm.innerHTML = (ic ? '<svg><use href="#d-' + ic + '"/></svg>' : ''); nm.appendChild(el('span', null, name)); nm.title = 'Tocar ' + name; nm.dataset.action = 'drum:' + i; nm.dataset.fast = '1';
    col.appendChild(o); col.appendChild(f); col.appendChild(nm); box.appendChild(col);
    function draw() { f.style.setProperty('--v', S.dvol[i]); o.textContent = Math.round(S.dvol[i] * 100); }
    function setv(v) { S.dvol[i] = clamp(v, 0, 1); draw(); if (padGain[i]) padGain[i].gain.value = S.dvol[i]; save(); }
    var on = false, trk = f.firstChild;
    function fy(e) { var r = trk.getBoundingClientRect(); setv(1 - (e.clientY - r.top) / r.height); }
    f.addEventListener('pointerdown', function (e) { on = true; f.setPointerCapture(e.pointerId); fy(e); e.preventDefault(); });
    f.addEventListener('pointermove', function (e) { if (on) fy(e); });
    f.addEventListener('pointerup', function () { on = false; }); f.addEventListener('pointercancel', function () { on = false; });
    f.addEventListener('keydown', function (e) { var d = e.key === 'ArrowUp' ? 0.05 : e.key === 'ArrowDown' ? -0.05 : 0; if (d) { e.preventDefault(); setv(S.dvol[i] + d); } });
    draw();
  });
  fitGrid(box, 46, 120, true);
}
function kitList() {
  return FACTORY_KITS.map(function (k) { return 'f:' + k.name; }).concat(Object.keys(S.drumSets).map(function (n) { return 'u:' + n; }));
}
function kitIds(v) {
  var n = v.slice(2), arr = null;
  if (v[0] === 'f') FACTORY_KITS.forEach(function (k) { if (k.name === n) arr = k.ids; });
  else arr = S.drumSets[n];
  return arr ? arr.map(function (id, i) { return !id || drumMeta(id) ? id : DEFAULT_KIT[i]; }) : null;
}
function applyKit(v, quiet) {
  var ids = kitIds(v); if (!ids || ids.length !== 16) return;
  S.kit = ids.slice(); S.kitSel = v; save(); renderDrums(); preloadKit();
  if (!quiet) toast(v.slice(2));
}
function kitStep(d) {
  var l = kitList(), i = l.indexOf(S.kitSel); if (i < 0) i = d > 0 ? -1 : l.length;
  applyKit(l[(i + d + l.length) % l.length]);
}

/* seletor de samples */
var pickCat = 'Kicks', pickTarget = null, pickPreviewSrc = null;
function openPicker(i) {
  pickTarget = i; $('#modalTitle').textContent = 'Pad ' + (i + 1) + ' — escolher som';
  $('#modal').classList.remove('hidden'); renderPicker();
}
function renderPicker() {
  var cats = []; CAT.drums.forEach(function (d) { if (cats.indexOf(d.category) < 0) cats.push(d.category); });
  cats.push('Meus samples');
  var cb = $('#modalCats'); cb.innerHTML = '';
  cats.forEach(function (c) { var b = el('button', c === pickCat ? 'on' : '', c); b.onclick = function () { pickCat = c; renderPicker(); }; cb.appendChild(b); });
  var list = $('#modalList'); list.innerHTML = '';
  var items = pickCat === 'Meus samples' ? Object.keys(userSamples).map(function (k) { return userSamples[k]; }) : CAT.drums.filter(function (d) { return d.category === pickCat; }).sort(byName);
  if (!items.length) list.appendChild(el('p', 'muted', pickCat === 'Meus samples' ? 'Nenhum sample importado ainda. Use "Importar samples" na aba Drums.' : 'Vazio.'));
  items.forEach(function (it) {
    var row = el('div', 'item'); row.appendChild(el('span', 'nm', String(it.name).replace(/\s*\(\s*kit\s*\d+\s*\)/ig, '')));
    var pv = el('button', null, '▶'); pv.onclick = function () { preview(it.id); };
    var use = el('button', 'primary', 'Usar'); use.onclick = function () {
      S.kit[pickTarget] = it.id; S.kitSel = ''; save(); getDrumBuffer(it.id); renderDrums(); $('#modal').classList.add('hidden');
    };
    row.appendChild(pv); row.appendChild(use);
    if (pickCat === 'Meus samples') { var del = el('button', 'danger', '🗑'); del.onclick = function () { removeUserSample(it.id); }; row.appendChild(del); }
    list.appendChild(row);
  });
}
function preview(id) {
  getDrumBuffer(id).then(function (b) {
    if (!b) return;
    if (pickPreviewSrc) { try { pickPreviewSrc.stop(); } catch (e) {} }
    var s = ctx.createBufferSource(); s.buffer = b; s.connect(A.drumBus); s.start(); pickPreviewSrc = s;
  });
}

/* samples do usuário (IndexedDB) */
function idb() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open('aurapad', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('samples', { keyPath: 'id' }); };
    r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
  });
}
function idbTx(mode, fn) {
  return idb().then(function (db) { return new Promise(function (res, rej) {
    var tx = db.transaction('samples', mode), st = tx.objectStore('samples'), rq = fn(st);
    tx.oncomplete = function () { res(rq && rq.result); }; tx.onerror = function () { rej(tx.error); };
  }); });
}
function idbGet(id) { return idbTx('readonly', function (s) { return s.get(id); }); }
function idbPut(rec) { return idbTx('readwrite', function (s) { return s.put(rec); }); }
function idbDel(id) { return idbTx('readwrite', function (s) { return s.delete(id); }); }
function idbList() { return idbTx('readonly', function (s) { return s.getAll(); }); }
function loadUserSamples() {
  return idbList().then(function (all) { (all || []).forEach(function (r) { userSamples[r.id] = { id: r.id, name: r.name, category: 'Meus samples' }; }); }).catch(function () {});
}
function importSamples(files) {
  var n = 0, fail = 0;
  var chain = Promise.resolve();
  Array.prototype.forEach.call(files, function (f) {
    chain = chain.then(function () { return f.arrayBuffer(); }).then(function (ab) {
      return decode(ab.slice(0)).then(function () {
        var id = 'user/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        var name = f.name.replace(/\.[^.]+$/, '');
        return idbPut({ id: id, name: name, data: ab }).then(function () { userSamples[id] = { id: id, name: name, category: 'Meus samples' }; n++; });
      });
    }).catch(function () { fail++; });
  });
  return chain.then(function () { $('#drumMsg').textContent = n + ' importado(s)' + (fail ? ', ' + fail + ' com erro' : ''); toast(n + ' sample(s) importado(s)'); });
}
function removeUserSample(id) {
  idbDel(id).then(function () {
    delete userSamples[id]; delete drumBufs[id];
    S.kit = S.kit.map(function (k, i) { return k === id ? DEFAULT_KIT[i] : k; });
    save(); renderDrums(); renderPicker();
  });
}

/* ---------- FX ---------- */
function fmtHz(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + ' kHz' : Math.round(v) + ' Hz'; }
function renderFx() {
  var f = S.fx;
  $('#fxCut').value = f.cut; $('#fxCutO').textContent = f.cut >= 0.999 ? 'aberto' : fmtHz(200 * Math.pow(100, f.cut));
  $('#fxPan').value = f.pan; $('#fxPanO').textContent = Math.abs(f.pan) < 0.02 ? 'centro' : (f.pan < 0 ? 'E ' : 'D ') + Math.round(Math.abs(f.pan) * 100) + '%';
  $('#fxLow').value = f.low; $('#fxLowO').textContent = (f.low > 0 ? '+' : '') + f.low + ' dB';
  $('#fxHigh').value = f.high; $('#fxHighO').textContent = (f.high > 0 ? '+' : '') + f.high + ' dB';
  $('#fxRev').value = f.rev; $('#fxRevO').textContent = Math.round(f.rev * 100) + '%';
  $('#fxTh').value = f.th; $('#fxThO').textContent = f.th + ' dB';
  $('#fxRa').value = f.ra; $('#fxRaO').textContent = f.ra + ':1';
  $('#fxComp').classList.toggle('on', !!f.comp);
}
function bindFx() {
  var map = { fxCut: 'cut', fxPan: 'pan', fxLow: 'low', fxHigh: 'high', fxRev: 'rev', fxTh: 'th', fxRa: 'ra' };
  Object.keys(map).forEach(function (id) {
    $('#' + id).addEventListener('input', function (e) { S.fx[map[id]] = parseFloat(e.target.value); renderFx(); applyAll(); save(); });
  });
  $('#fxComp').onclick = function () { S.fx.comp = !S.fx.comp; renderFx(); applyAll(); save(); };
  $('#fxReset').onclick = function () { S.fx = JSON.parse(JSON.stringify(DEF.fx)); renderFx(); applyAll(); save(); };
}

/* ---------- metrônomo ---------- */
/* padrões de bateria: 16 passos (semicolcheias) por compasso 4/4; dígito = força (0 a 9)
   slots do kit: 0 kick, 1 caixa, 2 hi-hat, 3 hi-hat aberto, 7 crash */
var LOOPS = [
  { id: 'balada', name: 'Balada suave',
    p: { 0: '9000000000900000', 1: '0000900000009000', 2: '6050605060506050' },
    p3: { 0: '900000000000', 1: '000050005000', 2: '505050505050' },
    p6: { 0: '900000000000', 1: '000000500000', 2: '505050505050' } },
  { id: 'worship', name: 'Worship médio',
    p: { 0: '9000000090000000', 1: '0000900000009000', 2: '7060706070607060', 3: '0000000000000010' },
    p3: { 0: '900000000000', 1: '000080008000', 2: '707070707070' },
    p6: { 0: '900000009000', 1: '000000900000', 2: '707070707070' } },
  { id: 'pop', name: 'Pop 4 tempos',
    p: { 0: '9000900090009000', 1: '0000900000009000', 2: '6060606060606060' },
    p3: { 0: '900000000000', 1: '000090009000', 2: '606060606060' },
    p6: { 0: '900000009000', 1: '000000900000', 2: '606060606060' } },
  { id: 'rock', name: 'Rock',
    p: { 0: '9000009090000000', 1: '0000900000009000', 2: '8070807080708070' },
    p3: { 0: '900000900000', 1: '000090009000', 2: '807080708070' },
    p6: { 0: '900000009000', 1: '000000900000', 2: '807080708070' } },
  { id: 'cresc', name: 'Hi-hat 16 + kick',
    p: { 0: '9000000000100000', 1: '0000900000009000', 2: '5343534353435343' },
    p3: { 0: '900000000000', 1: '000090009000', 2: '534353435343' },
    p6: { 0: '900000000000', 1: '000000900000', 2: '534353435343' } },
  { id: 'pulso', name: 'Só pulso (kick)',
    p: { 0: '8000800080008000' }, p3: { 0: '800080008000' }, p6: { 0: '900000900000' } }
];
function loopPat(L) {
  if (S.sig === 3) return L.p3;
  if (S.sig === 6) return L.p6;
  if (S.sig === 2) { var o = {}; Object.keys(L.p).forEach(function (k) { o[k] = L.p[k].slice(0, 8); }); return o; }
  return L.p;
}
var LOOPBY = {}; LOOPS.forEach(function (l) { LOOPBY[l.id] = l; });
var lastLoop = 'worship', metByLoop = false;
function loopSteps(beatT, beat, spb) {
  var L = LOOPBY[S.loop]; if (!L) return;
  var P = loopPat(L), per = S.sig === 6 ? 2 : 4;
  for (var k = 0; k < per; k++) {
    var t = beatT + k * spb / per;
    Object.keys(P).forEach(function (slot) {
      var c = P[slot].charAt((beat * per + k) % P[slot].length), v = parseInt(c, 10); if (!v) return;
      var buf = drumBufs[S.kit[slot]]; if (!buf) { getDrumBuffer(S.kit[slot]); return; }
      var hum = 1 + (Math.random() - 0.5) * (slot === '2' ? 0.16 : 0.06);
      trigger(+slot, buf, clamp(v / 9 * hum, 0.05, 1) * S.loopVol, t);
    });
  }
}
function loopSet(id) {
  S.loop = LOOPBY[id] ? id : ''; if (S.loop) lastLoop = S.loop; save(); renderLoop();
  if (S.loop) S.kit.slice(0, 8).forEach(function (k) { getDrumBuffer(k); });
}
function renderLoop() {
  var s = $('#loopSel'); if (!s) return;
  if (s.options.length < 2) { var o0 = el('option', null, 'Desligada'); o0.value = ''; s.appendChild(o0); LOOPS.forEach(function (l) { var o = el('option', null, l.name); o.value = l.id; s.appendChild(o); }); }
  s.value = S.loop; $('#loopVol').value = S.loopVol; $('#loopVol').disabled = !S.loop;
  $$('[data-action="loop:toggle"]').forEach(function (b) { b.classList.toggle('on', !!S.loop); });
}
var clickBufs = {}, metOn = false, metTimer = null, metNext = 0, metBeat = 0, beatQueue = [];
function loadClicks() {
  var jobs = [];
  CAT.clicks.forEach(function (k) {
    ['normal', 'accent'].forEach(function (t) {
      if (k[t]) jobs.push(fetchBuf(k[t]).then(function (b) { clickBufs[k.id + ':' + t] = b; }).catch(function () {}));
    });
  });
  return Promise.all(jobs);
}
function renderBeats() {
  var b = $('#beats'); b.innerHTML = '';
  for (var i = 0; i < S.sig; i++) b.appendChild(el('div', 'beat' + (i === 0 ? ' first' : '')));
}
function metTick() {
  while (metNext < ctx.currentTime + 0.12) {
    var accent = S.accent && metBeat === 0;
    var buf = clickBufs[S.click + ':' + (accent ? 'accent' : 'normal')] || clickBufs[S.click + ':normal'];
    if (buf) { var s = ctx.createBufferSource(); s.buffer = buf; s.connect(A.metBus); s.start(metNext); }
    if (S.loop) loopSteps(metNext, metBeat, 60 / S.bpm);
    beatQueue.push({ t: metNext, b: metBeat });
    metNext += 60 / S.bpm; metBeat = (metBeat + 1) % S.sig;
  }
}
function beatDraw() {
  if (!metOn) return;
  while (beatQueue.length && beatQueue[0].t <= ctx.currentTime) {
    var q = beatQueue.shift(), dots = $('#beats').children;
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === q.b);
  }
  requestAnimationFrame(beatDraw);
}
function metStart() {
  if (!ctx || metOn) return;
  metOn = true; metBeat = 0; metNext = ctx.currentTime + 0.08; beatQueue = [];
  metTick(); metTimer = setInterval(metTick, 25); requestAnimationFrame(beatDraw);
  $('#metToggle').innerHTML = svgUse('i-stop') + '<span>Parar</span>'; $('#metToggle').classList.add('playing');
}
function metStop() {
  metOn = false; clearInterval(metTimer); beatQueue = [];
  $$('#beats .beat').forEach(function (d) { d.classList.remove('on'); });
  $('#metToggle').innerHTML = svgUse('i-play') + '<span>Iniciar</span>'; $('#metToggle').classList.remove('playing');
}
function applyPulse() {
  if (!ctx || !A.pLfo) return;
  var on = S.pulse > 0, d = on ? clamp(S.pulseDepth, 0, 1) : 0;
  set(A.pulse.gain, 1 - d / 2, 0.1); set(A.pLfoG.gain, d / 2, 0.1);
  if (on) A.pLfo.frequency.setTargetAtTime(S.bpm / 60 / S.pulse, ctx.currentTime, 0.05);
}
function swellSecs() { return S.swell > 0 ? S.swell * 4 * 60 / S.bpm : 0; }
function setBpm(v) {
  v = clamp(Math.round(v), 30, 260); S.bpm = v;
  $('#bpm').value = v; $('#bpmRange').value = v; save(); applyPulse(); renderOled();
}
var taps = [];
function tapTempo() {
  var now = performance.now();
  if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
  taps.push(now); if (taps.length > 6) taps.shift();
  if (taps.length >= 2) {
    var sum = 0; for (var i = 1; i < taps.length; i++) sum += taps[i] - taps[i - 1];
    setBpm(60000 / (sum / (taps.length - 1)));
  }
}
function bindMetro() {
  var sel = $('#metSound'); sel.innerHTML = '';
  CAT.clicks.forEach(function (k) { var o = el('option', null, k.name); o.value = k.id; sel.appendChild(o); });
  if (!CLICK[S.click]) S.click = CAT.clicks[0].id;
  sel.value = S.click; sel.onchange = function () { S.click = sel.value; save(); };
  $('#metSig').value = String(S.sig);
  $('#metSig').onchange = function (e) { S.sig = parseInt(e.target.value, 10); metBeat = 0; renderBeats(); save(); };
  $('#metVol').value = S.metVol; $('#metVol').oninput = function (e) { S.metVol = parseFloat(e.target.value); applyAll(); save(); };
  $('#metAccent').checked = S.accent; $('#metAccent').onchange = function (e) { S.accent = e.target.checked; save(); };
  $('#bpm').onchange = function (e) { setBpm(parseFloat(e.target.value) || S.bpm); };
  $('#bpmRange').oninput = function (e) { setBpm(parseFloat(e.target.value)); };
  $('#bpmMinus').onclick = function () { setBpm(S.bpm - 1); };
  $('#bpmPlus').onclick = function () { setBpm(S.bpm + 1); };
  renderLoop();
  $('#loopSel').onchange = function () { loopSet(this.value); };
  $('#loopVol').oninput = function () { S.loopVol = parseFloat(this.value); save(); };
  setBpm(S.bpm); renderBeats();
}

/* ---------- setlist ---------- */
function songLabel(s) { return LABEL[s.key] + ' · ' + s.bpm + ' bpm · ' + (FAM[s.family] ? FAM[s.family].name : s.family); }
function renderSongNow() { renderOled(); }
function renderSongs() {
  var ol = $('#songs'); ol.innerHTML = '';
  if (!S.setlist.length) { ol.appendChild(el('p', 'muted', 'Nenhuma música ainda. Ajuste tom, pad e andamento e use "Salvar estado atual".')); }
  S.setlist.forEach(function (s, i) {
    var li = el('li', 'song' + (i === S.songIdx ? ' cur' : ''));
    var info = el('div', 'info'); info.appendChild(el('div', 't', (i + 1) + '. ' + s.title)); info.appendChild(el('div', 'm', songLabel(s)));
    info.onclick = function () { loadSong(i); };
    var nt = el('button', null, s.notes ? '📝' : '＋'); nt.title = 'Notas, letra e fade desta música';
    nt.onclick = function () { editSong(s); };
    var up = el('button', null, '↑'), dn = el('button', null, '↓'), rn = el('button', null, '✎'), rm = el('button', 'danger', '✕');
    up.onclick = function () { moveSong(i, -1); }; dn.onclick = function () { moveSong(i, 1); };
    rn.onclick = function () { var t = prompt('Título da música', s.title); if (t) { s.title = t.slice(0, 60); save(); renderSongs(); renderSongNow(); } };
    rm.onclick = function () { if (confirm('Remover "' + s.title + '"?')) { S.setlist.splice(i, 1); if (S.songIdx >= S.setlist.length) S.songIdx = S.setlist.length - 1; save(); renderSongs(); renderSongNow(); } };
    li.appendChild(info); li.appendChild(nt); li.appendChild(up); li.appendChild(dn); li.appendChild(rn); li.appendChild(rm);
    ol.appendChild(li);
  });
}
function editSong(s) {
  var t = prompt('Notas ou letra desta música (aparecem ao tocar no nome da música, no topo):', s.notes || '');
  if (t === null) return; s.notes = t.slice(0, 4000);
  var f = prompt('Tempo de fade do pad nesta música, em segundos (1 a 12). Deixe vazio para usar o padrão:', s.fade != null ? s.fade : '');
  if (f !== null) { f = parseFloat(String(f).replace(',', '.')); if (isFinite(f)) s.fade = clamp(f, 1, 12); else delete s.fade; }
  save(); renderSongs(); toast('Música atualizada');
}
function showNotes() {
  var s = S.setlist[S.songIdx]; if (!s) return;
  $('#notesTitle').textContent = s.title; $('#notesText').textContent = s.notes || 'Sem notas. Use o botão ＋ na lista de músicas para adicionar letra ou anotações.';
  $('#notesBox').classList.remove('hidden');
}
function moveSong(i, d) {
  var j = i + d; if (j < 0 || j >= S.setlist.length) return;
  var t = S.setlist[i]; S.setlist[i] = S.setlist[j]; S.setlist[j] = t;
  if (S.songIdx === i) S.songIdx = j; else if (S.songIdx === j) S.songIdx = i;
  save(); renderSongs();
}
function loadSong(i) {
  var s = S.setlist[i]; if (!s) return;
  S.songIdx = i; S.key = s.key; if (FAM[s.family]) S.family = s.family;
  if (s.fade != null) { if (S.baseFade == null) S.baseFade = S.padFade; S.padFade = s.fade; } else if (S.baseFade != null) { S.padFade = S.baseFade; S.baseFade = null; }
  if (s.kit && kitList().indexOf(s.kit) >= 0 && s.kit !== S.kitSel) applyKit(s.kit, true);
  if (s.fx) { S.fx = Object.assign(JSON.parse(JSON.stringify(DEF.fx)), s.fx); renderFx(); }
  if (s.family2 !== undefined) { S.family2 = FAM[s.family2] ? s.family2 : ''; if (s.mix2 != null) S.mix2 = s.mix2; renderLayer(); }
  if (s.loop !== undefined) { S.loop = LOOPBY[s.loop] ? s.loop : ''; if (S.loop) lastLoop = S.loop; renderLoop(); }
  applyAll(); setBpm(s.bpm); save();
  renderKeys(); renderFams(); renderSongs(); renderSongNow();
  if (padOn && ctx) padStart();
  var nx = S.setlist[i + 1]; if (nx && FAM[nx.family] && ctx) prefetchFamily(nx.family);
  toast(s.title);
}
function songStep(d) {
  if (!S.setlist.length) return;
  var i = S.songIdx < 0 ? (d > 0 ? 0 : S.setlist.length - 1) : clamp(S.songIdx + d, 0, S.setlist.length - 1);
  loadSong(i);
}
function bindSetlist() {
  $('#songAdd').onclick = function () {
    var t = $('#songTitle').value.trim() || ('Música ' + (S.setlist.length + 1));
    S.setlist.push({ title: t.slice(0, 60), key: S.key, family: S.family, bpm: S.bpm, kit: S.kitSel, fx: JSON.parse(JSON.stringify(S.fx)), family2: S.family2, mix2: S.mix2, loop: S.loop });
    $('#songTitle').value = ''; save(); renderSongs(); toast('Música salva');
  };
  $('#slExport').onclick = function () { download('aurapad-setlist.json', JSON.stringify({ origem: AURA_ID + ' © ' + AURA_ANO + ' ' + AURA_AUTOR, setlist: S.setlist }, null, 1)); };
  $('#slImport').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var j = JSON.parse(t); if (!Array.isArray(j.setlist)) throw 0;
      S.setlist = j.setlist.map(function (s) { return { title: String(s.title || '').slice(0, 60), key: NOTES.indexOf(s.key) >= 0 ? s.key : 'C', family: s.family, bpm: clamp(parseInt(s.bpm, 10) || 72, 30, 260), kit: typeof s.kit === 'string' ? s.kit : '', notes: typeof s.notes === 'string' ? s.notes.slice(0, 4000) : '', fade: isFinite(s.fade) ? clamp(+s.fade, 1, 12) : undefined, fx: s.fx && typeof s.fx === 'object' ? s.fx : undefined, family2: typeof s.family2 === 'string' ? s.family2 : undefined, mix2: isFinite(s.mix2) ? clamp(+s.mix2, 0, 1) : undefined, loop: typeof s.loop === 'string' ? s.loop : undefined }; });
      S.songIdx = -1; save(); renderSongs(); renderSongNow(); toast('Setlist importada');
    }).catch(function () { toast('Arquivo inválido'); }); e.target.value = '';
  };
}
function download(name, text) {
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- sets de drum ---------- */
function bindSets() {
  $('#setSave').onclick = function () {
    var n = $('#setName').value.trim(); if (!n) { toast('Dê um nome ao kit'); return; }
    S.drumSets[n] = S.kit.slice(); S.kitSel = 'u:' + n; save(); renderDrums(); $('#setName').value = ''; toast('Kit salvo');
  };
  $('#famSel').onchange = function () { setFamily(this.value); };
  $('#kitSel').onchange = function () { if (this.value) applyKit(this.value); };
  $('#setDel').onclick = function () {
    var v = S.kitSel; if (!v || v[0] !== 'u') { toast('Selecione um kit seu para excluir'); return; }
    var n = v.slice(2); if (confirm('Excluir o kit "' + n + '"?')) { delete S.drumSets[n]; S.kitSel = ''; save(); renderDrums(); }
  };
  $('#setExport').onclick = function () { download('aurapad-sets.json', JSON.stringify({ drumSets: S.drumSets }, null, 1)); };
  $('#setImport').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var j = JSON.parse(t); if (!j.drumSets) throw 0;
      Object.keys(j.drumSets).forEach(function (k) { if (Array.isArray(j.drumSets[k]) && j.drumSets[k].length === 16) S.drumSets[k] = j.drumSets[k]; });
      save(); renderDrums(); toast('Sets importados');
    }).catch(function () { toast('Arquivo inválido'); }); e.target.value = '';
  };
  $('#sampleFiles').onchange = function (e) { importSamples(e.target.files); e.target.value = ''; };
  $('#drumEdit').onclick = function () { drumEditing = !drumEditing; $('#drumEdit').classList.toggle('on', drumEditing); renderDrums(); };
  $('#modalClose').onclick = function () { $('#modal').classList.add('hidden'); };
}

/* ---------- ações (UI + MIDI) ---------- */
function doAction(a, vel) {
  var p = a.split(':');
  if (p[0] === 'vol') return;                      // volumes são controles contínuos (fader/knob): ver setVol
  if (p[0] === 'drum') playDrum(parseInt(p[1], 10), vel);
  else if (p[0] === 'padkey') padKeyTap(p[1]);
  else if (a === 'pad:toggle') padToggle();
  else if (a === 'pad:duck') duckToggle();
  else if (a === 'loop:toggle') {
    if (S.loop) { loopSet(''); if (metByLoop) { metStop(); metByLoop = false; } }
    else { loopSet(lastLoop); if (!metOn) { metStart(); metByLoop = true; } }
  }
  else if (a === 'loop:next') { var i = LOOPS.findIndex(function (l) { return l.id === S.loop; }); loopSet(LOOPS[(i + 1) % LOOPS.length].id); }
  else if (p[0] === 'key') keyShift(parseInt(p[1], 10));
  else if (a === 'met:toggle') { if (metOn) metStop(); else metStart(); }
  else if (a === 'met:tap') tapTempo();
  else if (a === 'song:next') songStep(1);
  else if (a === 'song:prev') songStep(-1);
  else if (a === 'fam:next') famStep(1);
  else if (a === 'fam:prev') famStep(-1);
  else if (a === 'kit:next') kitStep(1);
  else if (a === 'kit:prev') kitStep(-1);
}
function actionName(a) {
  var p = a.split(':');
  if (p[0] === 'drum') return 'Drum pad ' + (parseInt(p[1], 10) + 1);
  if (p[0] === 'padkey') return 'Pad tom ' + LABEL[p[1]];
  return { 'pad:toggle': 'Pad tocar/parar', 'pad:duck': 'Pad abaixar (voz)', 'loop:toggle': 'Bateria em loop ligar/desligar', 'loop:next': 'Próximo ritmo de bateria', 'key:1': 'Subir 1 semitom', 'key:-1': 'Descer 1 semitom', 'key:2': 'Subir 1 tom', 'key:-2': 'Descer 1 tom', 'met:toggle': 'Metrônomo iniciar/parar', 'met:tap': 'Tap tempo', 'song:next': 'Próxima música', 'song:prev': 'Música anterior', 'fam:next': 'Próximo pad', 'fam:prev': 'Pad anterior', 'kit:next': 'Próximo kit de bateria', 'kit:prev': 'Kit de bateria anterior', 'vol:master': 'Volume master (fader ou knob)', 'vol:pad': 'Volume do pad (fader ou knob)', 'vol:drum': 'Volume da bateria (fader ou knob)' }[a] || a;
}

/* ---------- MIDI ---------- */
// Controles contínuos: um CC (fader ou knob do controlador) move o volume. Aplica no máximo uma vez por quadro, para não sobrecarregar.
var VOLS = { 'vol:master': 'masterVol', 'vol:pad': 'padVol', 'vol:drum': 'drumVol' }, volPend = {}, volRaf = 0;
function setVol(a, x) {
  volPend[a] = x;
  if (volRaf) return;
  volRaf = requestAnimationFrame(function () {
    volRaf = 0;
    Object.keys(volPend).forEach(function (k) {
      var i = $('#' + VOLS[k]); if (!i) return;
      i.value = Math.max(0, Math.min(1, volPend[k])); i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    volPend = {};
  });
}
var learn = false, armed = null, midiAccess = null;
function defaultMap() {
  var m = {};
  for (var i = 0; i < 16; i++) m['note:' + (36 + i)] = 'drum:' + i;
  for (var k = 0; k < 12; k++) m['note:' + (60 + k)] = 'padkey:' + NOTES[k];
  return m;
}
function effMap() {
  var m = defaultMap(), u = S.midiMap;
  Object.keys(u).forEach(function (k) { if (u[k] === null) delete m[k]; else m[k] = u[k]; });
  return m;
}
// Procura a ação de uma mensagem. Mapeamentos novos guardam o canal ('note:60@10'): o pad do controlador (canal 10) e as teclas (canal 1)
// podem usar a mesma nota sem se confundir. Mapeamentos sem canal (padrão e antigos) valem em qualquer canal, exceto que
// no canal 10 (bateria, por convenção) as notas nunca trocam o tom do pad.
function lookupAction(key, ch) {
  var m = effMap();
  if (key.indexOf('note:') !== 0) return m[key];
  var a = m[key + '@' + ch]; if (a) return a;
  a = m[key];
  if (a && a.indexOf('padkey:') === 0 && ch === 10) return null;
  return a;
}
function midiLabel(k) {
  var m = k.split(':'), r = m[1].split('@');
  return (m[0] === 'note' ? 'Nota ' : 'CC ') + r[0] + (r[1] ? ' · canal ' + r[1] : '');
}
function renderMidiMap() {
  var box = $('#midiMap'); box.innerHTML = '';
  var m = effMap();
  Object.keys(m).sort(function (a, b) { return actionName(m[a]) < actionName(m[b]) ? -1 : 1; }).forEach(function (k) {
    var row = el('div', 'mm'); var msg = k.split(':');
    row.appendChild(el('span', null, actionName(m[k])));
    var right = el('span', null, midiLabel(k) + ' ');
    var x = el('button', 'danger', '✕'); x.onclick = function () { S.midiMap[k] = null; save(); renderMidiMap(); };
    right.appendChild(x); row.appendChild(right); box.appendChild(row);
  });
}
function onMidi(e) {
  if (!armed && window.StageLab && StageLab.midi(e)) return;
  var d = e.data, st = d[0] & 0xf0, n = d[1], v = d[2];
  var ml = $('#midiLast'); if (ml && d[0] < 0xf0) ml.textContent = 'Última mensagem: ' + ({ 0x90: 'Nota ligada', 0x80: 'Nota desligada', 0xb0: 'CC', 0xc0: 'Program Change', 0xe0: 'Pitch bend', 0xd0: 'Aftertouch', 0xa0: 'Aftertouch de tecla' }[st] || 'MIDI') + ' ' + n + (d.length > 2 ? ' · valor ' + v : '') + ' · canal ' + ((d[0] & 15) + 1);
  if (st === 0xc0 && !armed) { if (S.setlist[n]) loadSong(n); return; }   // Program Change N = música N+1
  var key = null, on = false, ch = (d[0] & 15) + 1;
  if (st === 0x90 && v > 0) { key = 'note:' + n; on = true; }
  else if (st === 0xb0) { key = 'cc:' + n; on = v > 0; }
  else return;
  if (armed && armed.indexOf('vol:') === 0 && st !== 0xb0) return;     // volume só aceita CC (fader ou knob)
  if (!armed && st === 0xb0) { var av = effMap()[key]; if (av && av.indexOf('vol:') === 0) { setVol(av, v / 127); return; } }   // vale também com o fader em 0
  if (!on) return;
  if (armed) { // modo mapear
    if (armed.indexOf('drum:') === 0 && st !== 0x90) return;      // pad da bateria só aprende NOTA (alguns pads mandam também um CC, que não deve ser gravado)
    if (key.indexOf('note:') === 0) key += '@' + ch;              // notas guardam o canal; CC vale em qualquer canal
    Object.keys(S.midiMap).forEach(function (k) { if (S.midiMap[k] === armed) delete S.midiMap[k]; });
    S.midiMap[key] = armed; save(); renderMidiMap();
    toast(actionName(armed) + ' ← ' + midiLabel(key)); armed = null; $('#midiHint').textContent = 'Mapeado. Toque em outro botão ou desative o modo.';
    return;
  }
  var a = lookupAction(key, ch); if (a) doAction(a, v / 127);
}
function connectInputs() {
  if (!midiAccess) return;
  var names = [];
  midiAccess.inputs.forEach(function (inp) { inp.onmidimessage = onMidi; names.push(inp.name); });
  $('#midiStatus').textContent = names.length ? 'Conectado: ' + names.join(', ') : 'Web MIDI disponível, mas nenhum controlador encontrado. Conecte por cabo ou Bluetooth.';
}
function initMidi() {
  if (!navigator.requestMIDIAccess) { $('#midiStatus').textContent = 'Este navegador não oferece Web MIDI. Use Chrome ou Edge (computador/Android).'; return; }
  navigator.requestMIDIAccess().then(function (a) { midiAccess = a; a.onstatechange = connectInputs; connectInputs(); },
    function () { $('#midiStatus').textContent = 'Permissão de MIDI negada.'; });
}
function bindMidi() {
  $('#midiLearn').onclick = function () {
    learn = !learn; armed = null; document.body.classList.toggle('learn', learn); $('#midiLearn').classList.toggle('on', learn);
    $('#midiHint').textContent = learn ? 'Toque num botão do app (pad, tom, metrônomo…) e depois no controlador.' : 'Ative, toque num botão do app e depois numa tecla/pad do controlador.';
  };
  $('#midiReset').onclick = function () { S.midiMap = {}; save(); renderMidiMap(); toast('Mapeamento padrão restaurado'); };
  function capture(e) {
    if (!learn) return;
    var t = e.target.closest && e.target.closest('[data-action]');
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'pointerdown') { armed = t.dataset.action; $('#midiHint').textContent = (armed.indexOf('vol:') === 0 ? 'Mova o fader ou o knob do controlador para: ' : 'Aguardando MIDI para: ') + actionName(armed); }
  }
  document.addEventListener('pointerdown', capture, true);
  document.addEventListener('click', capture, true);
}



/* ---------- palco: camada 2, duck, tom ---------- */
function bindLive() {
  renderLayer();
  $('#fam2Sel').onchange = function () { setLayer2(this.value); };
  $('#mix2').addEventListener('input', function (e) { S.mix2 = parseFloat(e.target.value); renderLayer(); applyAll(); save(); });
}
/* ---------- várias setlists ---------- */
function renderLists() {
  var s = $('#listSel'); s.innerHTML = '';
  Object.keys(S.lists).forEach(function (n) { var o = el('option', null, n); o.value = n; s.appendChild(o); });
  s.value = S.listName;
}
function switchList(name) {
  if (!S.lists[name]) return;
  S.lists[S.listName] = S.setlist; S.listName = name; S.setlist = S.lists[name]; S.songIdx = -1;
  save(); renderLists(); renderSongs(); renderSongNow();
}
function bindLists() {
  if (!S.lists[S.listName]) S.lists[S.listName] = S.setlist; else S.setlist = S.lists[S.listName];
  renderLists();
  $('#listSel').onchange = function () { switchList(this.value); };
  $('#listNew').onclick = function () {
    var n = prompt('Nome da nova setlist (por exemplo, Culto de domingo):', 'Setlist ' + (Object.keys(S.lists).length + 1)); if (!n) return; n = n.trim().slice(0, 40); if (!n || S.lists[n]) { toast('Nome inválido ou já existe'); return; }
    S.lists[S.listName] = S.setlist; S.lists[n] = []; switchList(n);
  };
  $('#listRen').onclick = function () {
    var n = prompt('Novo nome:', S.listName); if (!n) return; n = n.trim().slice(0, 40); if (!n || (n !== S.listName && S.lists[n])) { toast('Nome inválido ou já existe'); return; }
    S.lists[S.listName] = S.setlist; S.lists[n] = S.setlist; if (n !== S.listName) delete S.lists[S.listName]; S.listName = n; save(); renderLists();
  };
  $('#listDel').onclick = function () {
    var ks = Object.keys(S.lists); if (ks.length < 2) { toast('Mantenha ao menos uma setlist'); return; }
    if (!confirm('Excluir a setlist "' + S.listName + '" e suas músicas?')) return;
    delete S.lists[S.listName]; var n = Object.keys(S.lists)[0]; S.listName = n; S.setlist = S.lists[n]; S.songIdx = -1; save(); renderLists(); renderSongs(); renderSongNow();
  };
}

/* ---------- backup, tela ligada, travar toques ---------- */
function bindSafety() {
  $('#bkExport').onclick = function () {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    download('aurapad-backup-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.json', JSON.stringify({ aurapad: 1, origem: AURA_ID + ' © ' + AURA_ANO + ' ' + AURA_AUTOR, state: S }, null, 1));
    toast('Backup salvo (setlist, kits, StageLab e vínculos MIDI)');
  };
  $('#bkImport').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var j = JSON.parse(t); if (!j || j.aurapad !== 1 || typeof j.state !== 'object') throw 0;
      if (!confirm('Restaurar o backup? Isso substitui os dados atuais deste aparelho (os sons importados não são afetados).')) return;
      localStorage.setItem(STORE, JSON.stringify(j.state)); location.reload();
    }).catch(function () { toast('Arquivo de backup inválido'); }); e.target.value = '';
  };
  $('#songNow').onclick = showNotes; $('#notesClose').onclick = function () { $('#notesBox').classList.add('hidden'); };
  // pede armazenamento persistente (evita que o Safari/Chrome apaguem os dados)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  // desbloqueio de áudio em celulares: sessão "playback" (ignora o botão de silêncio do iPhone) + toque mudo
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  var unlocked = false;
  function unlock() {
    if (!ctx) return;
    if (ctx.state !== 'running') ctx.resume().catch(function () {});
    if (unlocked) return; unlocked = true;
    try { var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
    try {
      // meio segundo de silêncio de verdade, tocado uma vez (iPhone: libera o som mesmo no modo silencioso)
      var sr = 8000, len = 4000, buf = new ArrayBuffer(44 + len * 2), dv = new DataView(buf);
      function w(o, s) { for (var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
      w(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, len * 2, true);
      var au = document.createElement('audio'); au.setAttribute('playsinline', ''); au.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
      var pr = au.play(); if (pr && pr.catch) pr.catch(function () {});
      au.onended = function () { URL.revokeObjectURL(au.src); au.removeAttribute('src'); };
    } catch (e) {}
    setTimeout(function () { if (ctx.state !== 'running') { unlocked = false; toast('Sem som? Toque de novo na tela e verifique o volume e o modo silencioso do celular.'); } }, 1200);
  }
  ['pointerdown', 'touchend', 'click'].forEach(function (ev) { document.addEventListener(ev, unlock, true); });
  // horizontal: em celular e tablet o app usa a tela deitada; no Android trava a rotação (tela cheia)
  var touch = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  var canLock = !!(screen.orientation && screen.orientation.lock && document.documentElement.requestFullscreen);
  function lockLandscape() {
    if (!touch || !canLock) return;
    var go = function () { return screen.orientation.lock('landscape').catch(function () {}); };
    if (document.fullscreenElement || matchMedia('(display-mode: standalone)').matches) go();
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(go, function () {});
  }
  if (canLock && touch) { $('#rotLock').hidden = false; $('#rotHint').hidden = true; }
  $('#rotLock').onclick = lockLandscape;
  if (touch && canLock) document.addEventListener('pointerdown', function first() { document.removeEventListener('pointerdown', first, true); lockLandscape(); }, true);
  // tela sempre ligada enquanto o app está aberto
  var wl = null;
  var wlBusy = false;
  function wake() { try { if (navigator.wakeLock && !document.hidden && !wl && !wlBusy) { wlBusy = true; navigator.wakeLock.request('screen').then(function (l) { wl = l; wlBusy = false; l.addEventListener('release', function () { wl = null; }); }, function () { setTimeout(function () { wlBusy = false; }, 5000); }); } } catch (e) {} }
  document.addEventListener('visibilitychange', wake); document.addEventListener('pointerdown', wake, true); wake();
  // travar toques: segurar 1,5 s para destravar
  var lk = $('#lockLayer'), tm = null, hold = $('#lockHold');
  $('#btnLock').onclick = function () { lk.classList.remove('hidden'); toast('Tela travada'); };
  function un() { clearTimeout(tm); tm = null; hold.classList.remove('go'); }
  hold.addEventListener('pointerdown', function (e) { e.preventDefault(); hold.classList.add('go'); tm = setTimeout(function () { un(); lk.classList.add('hidden'); toast('Tela destravada'); }, 1500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { hold.addEventListener(ev, un); });
  lk.addEventListener('contextmenu', function (e) { e.preventDefault(); });
}

/* ---------- eventos gerais ---------- */
function refit() { requestAnimationFrame(function () { fitGrid($('#fams'), 128, 40); fitGrid($('#dvols'), 46, 120, true); }); }
function bindUI() {
  // abas
  $$('#tabs button').forEach(function (b) {
    b.onclick = function () {
      $$('#tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      var live = b.dataset.tab === 'live';
      document.body.classList.toggle('live', live);
      document.body.classList.toggle('stage', !live);
      $$('.tab').forEach(function (t) {
        t.classList.toggle('on', live ? (t.id === 'tab-pads' || t.id === 'tab-drums') : t.id === 'tab-' + b.dataset.tab);
      });
      refit();
    };
  });
  $$('.seg.sv').forEach(function (g) {
    g.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', g).forEach(function (x) { x.classList.toggle('on', x === b); });
      g.closest('.tab').dataset.sv = b.dataset.sv;
      refit();
    };
  });
  (function () { var b = $('#tabs button.on'); if (b) b.onclick(); })();
  // ações: pointerdown para os rápidos (drum pads, tap), click para o resto
  document.addEventListener('pointerdown', function (e) {
    if (ctx && ctx.state !== 'running') ctx.resume();
    var t = e.target.closest && e.target.closest('[data-action]');
    if (!t || !t.dataset.fast || learn) return;
    e.preventDefault();
    var a = t.dataset.action;
    if (a.indexOf('drum:') === 0 && drumEditing) openPicker(parseInt(a.split(':')[1], 10));
    else doAction(a, 1);
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-action]');
    if (!t || t.dataset.fast || learn) return;
    doAction(t.dataset.action, 1);
  });
  $('#tap').dataset.fast = '1';
  // volumes
  $('#padVol').value = S.padVol; $('#padVol').oninput = function (e) { S.padVol = parseFloat(e.target.value); applyAll(); save(); };
  $('#drumVol').value = S.drumVol; $('#drumVol').oninput = function (e) { S.drumVol = parseFloat(e.target.value); applyAll(); save(); };
  $('#masterVol').value = S.masterVol; $('#masterVol').oninput = function (e) { S.masterVol = parseFloat(e.target.value); applyAll(); save(); };
  $('#padFade').value = S.padFade; $('#padFadeO').textContent = S.padFade + ' s';
  $('#padFade').oninput = function (e) { S.padFade = parseFloat(e.target.value); $('#padFadeO').textContent = S.padFade + ' s'; save(); };
  $('#padLoop').value = S.padLoop; $('#padLoopO').textContent = S.padLoop + ' s';
  var ps = $('#pulseSel'), pd = $('#pulseDepth'), sw = $('#swellSel');
  ps.value = S.pulse; pd.value = S.pulseDepth; sw.value = S.swell; pd.disabled = !S.pulse;
  ps.onchange = function () { S.pulse = parseFloat(ps.value); pd.disabled = !S.pulse; applyPulse(); save(); };
  pd.oninput = function () { S.pulseDepth = parseFloat(pd.value); applyPulse(); save(); };
  sw.onchange = function () { S.swell = parseFloat(sw.value); save(); };
  $('#padLoop').oninput = function (e) { S.padLoop = parseFloat(e.target.value); $('#padLoopO').textContent = S.padLoop + ' s'; save(); };
  $('#btnPanic').onclick = function () { padStop(0.4); metStop(); toast('Tudo parado'); };
  // teclado do computador
  document.addEventListener('keydown', function (e) {
    if (e.repeat || /INPUT|SELECT|TEXTAREA/.test((e.target.tagName || ''))) return;
    var i = DRUM_KEYS.indexOf(e.code);
    if ($('#tab-drums').classList.contains('on') && i >= 0 && !drumEditing) { playDrum(i, 1); return; }
    if (e.code === 'Space' && $('#tab-pads').classList.contains('on')) { e.preventDefault(); padToggle(); }
  });
  // offline
  $('#btnOffline').onclick = downloadAll;
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (ctx && ctx.state !== 'running') ctx.resume(); }, true);
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume(); });
}

function downloadAll() {
  var urls = [];
  CAT.pads.forEach(function (f) { NOTES.forEach(function (n) { if (f.files[n]) urls.push(f.files[n]); }); });
  CAT.drums.forEach(function (d) { urls.push(d.file); });
  CAT.clicks.forEach(function (k) { if (k.normal) urls.push(k.normal); if (k.accent) urls.push(k.accent); });
  ['piano','rhodes','organ','strings','pad','choir','halo','bells'].forEach(function (id) { urls.push('sf/' + id + '.json'); urls.push('sf/' + id + '.bin'); });
  var done = 0, prog = $('#offProg'), msg = $('#offMsg'), btn = $('#btnOffline');
  prog.hidden = false; prog.max = urls.length; prog.value = 0; btn.disabled = true; msg.textContent = '';
  var i = 0, fails = 0;
  function worker() {
    if (i >= urls.length) return Promise.resolve();
    var u = urls[i++];
    return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).catch(function () { fails++; }).then(function () { prog.value = ++done; msg.textContent = done + '/' + urls.length; return worker(); });
  }
  Promise.all([worker(), worker(), worker()]).then(function () {
    btn.disabled = false; msg.textContent = fails ? 'Concluído com ' + fails + ' falha(s)' : 'Pronto: funciona offline';
  });
}

/* ---------- início ---------- */
function boot() {
  if ('serviceWorker' in navigator && !window.auraDesktop) navigator.serviceWorker.register('sw.js').catch(function () {});
  loadCatalog().then(function () {
    renderFams(); renderKeys(); renderPadBtn(); bindFx(); renderFx(); bindSets(); bindSetlist(); bindMidi(); renderMidiMap();
    bindMetro(); bindLive(); bindLists(); renderSongs(); renderSongNow(); bindUI(); bindSafety();
    loadUserSamples().then(renderDrums);
    renderDrums();
    // áudio pronto desde a abertura (fica suspenso até o primeiro toque, regra do navegador)
    initAudio();
    loadClicks(); preloadKit(); prefetchFamily(S.family); initMidi(); refit();
  }).catch(function (e) { toast('Erro ao carregar o catálogo'); console.error(e); });
}
window.AuraPad = { get ctx() { return ctx; }, get A() { return A; }, S: S, save: save, toast: toast,
  panic: function () { try { padStop(0.3); metStop(); if (window.StageLab) StageLab.allOff(); } catch (e) {} } };
boot();
})();
