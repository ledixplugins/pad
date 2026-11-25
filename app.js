/* Aura Pad — pads infinitos, drum pads, metrônomo, setlist e MIDI (Web Audio, sem dependências) */
(function () {
'use strict';

var NOTES = ['C','Cs','D','Ds','E','F','Fs','G','Gs','A','As','B'];
var LABEL = {C:'C',Cs:'C#',D:'D',Ds:'D#',E:'E',F:'F',Fs:'F#',G:'G',Gs:'G#',A:'A',As:'A#',B:'B'};
var DRUM_KEYS = ['Digit1','Digit2','Digit3','Digit4','KeyQ','KeyW','KeyE','KeyR','KeyA','KeyS','KeyD','KeyF','KeyZ','KeyX','KeyC','KeyV'];
var KIT3 = ['kick-kit-3','snare-kit-3','hihat-kit-3','hihat-open-kit-3','tom-1-kit-3','tom-2-kit-3','tom-3-kit-3','crash-kit-3','','','','','','','',''];
var DEFAULT_KIT = KIT3;
var FACTORY_KITS = [
  { name: 'Drum Kit 1', ids: ['kick-1-kit-1','clap-1-kit-1','wood-1-kit-1','tumb-1-kit-1','tom-1-kit-1','tom-2-kit-1','tom-3-kit-1','sub-kick-kit-1','','','','','','','',''], labels: ['Kick 1','Clap 1','Wood 1','Tumb 1','Tom 1','Tom 2','Tom 3','Sub Kick'] },
  { name: 'EFX 1', ids: ['boom-kit-2','fx-tom-kit-2','swell-kit-2','tumb-2-kit-2','tom-1-kit-2','tom-2-kit-2','tom-3-kit-2','2-white-noise-kit-2','','','','','','','',''], labels: ['Boom','FX Tom','Swell','Tumb 2','Tom 1','Tom 2','Tom 3','White Noise 2'] },
  { name: 'Worship Drums', ids: ['kick-kit-3','snare-kit-3','hihat-kit-3','hihat-open-kit-3','tom-1-kit-3','tom-2-kit-3','tom-3-kit-3','crash-kit-3','','','','','','','',''], labels: ['Kick','Snare','Hi-Hat','Hi-Hat Open','Tom 1','Tom 2','Tom 3','Crash'] },
  { name: 'Worship EFX', ids: ['sub-kick-fxkit-4','boom-fxkit-4','perc-fxkit-4','wood-fxkit-4','tumb-fxkit-4','blop-fxkit-4','noise-fxkit-4','swell-fxkit-4','','','','','','','',''], labels: ['Sub Kick FX','Boom FX','Perc FX','Wood FX','Tumb FX','Blop FX','Noise FX','Swell FX'] },
];
var OLD_KIT_NAMES = { 'Kit 1': 'Drum Kit 1', 'Kit 2': 'EFX 1', 'Kit 3': 'Worship Drums', 'Kit 4 (FX)': 'Worship EFX' };
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
  bpm: 72, sig: 4, click: 'classic', metVol: 0.7, accent: true,
  kit: DEFAULT_KIT.slice(), dvol: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], kitSel: 'f:Worship Drums', drumSets: {}, setlist: [], songIdx: -1, midiMap: {}
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
  set(A.padBus.gain, S.padVol);
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

var padBufs = new Map(), padLoading = {};
function getPadBuffer(fam, note) {
  var k = fam + '/' + note;
  if (padBufs.has(k)) { var b = padBufs.get(k); padBufs.delete(k); padBufs.set(k, b); return Promise.resolve(b); }
  if (padLoading[k]) return padLoading[k];
  var url = FAM[fam].files[note];
  padLoading[k] = fetchBuf(url).then(function (buf) {
    delete padLoading[k]; padBufs.set(k, buf);
    while (padBufs.size > 4) padBufs.delete(padBufs.keys().next().value);
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

function Stream(buf, fadeIn, loopX) {
  this.buf = buf;
  this.X = clamp(loopX, 1, buf.duration / 2 - 0.5);
  this.out = ctx.createGain();
  this.out.gain.value = 0;
  this.out.connect(A.padBus);
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

var padOn = false, padNote = null, padStream = null, padReq = 0, padLoadingNote = null;
function padStart() {
  if (!ctx) return;
  var req = ++padReq, fam = S.family, note = S.key;
  padLoadingNote = note; renderKeys();
  prefetchFamily(fam);
  return getPadBuffer(fam, note).then(function (buf) {
    if (req !== padReq) return;
    var old = padStream;
    padStream = new Stream(buf, S.padFade, S.padLoop);
    if (old) old.stop(S.padFade);
    padOn = true; padNote = note; padLoadingNote = null; renderKeys(); renderPadBtn();
  }).catch(function (e) { padLoadingNote = null; renderKeys(); toast('Não consegui carregar o pad'); console.error(e); });
}
function padStop(fade) {
  padReq++; padOn = false; padNote = null; padLoadingNote = null;
  if (padStream) { padStream.stop(fade == null ? S.padFade : fade); padStream = null; }
  renderKeys(); renderPadBtn();
}
function padKeyTap(note) {
  S.key = note; save();
  if (!padOn) padStart();
  else if (note === padNote) padStop();
  else padStart();
  renderKeys();
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
function renderPadBtn() {
  var b = $('#padToggle'); b.textContent = padOn ? '■ Parar' : '▶ Tocar'; b.classList.toggle('on', padOn);
  renderStatus();
}
function renderStatus() {
  var k = $('#stKey'); if (!k) return;
  k.textContent = LABEL[padOn && padNote ? padNote : S.key] || '';
  $('#stPad').textContent = 'Pad: ' + (FAM[S.family] ? FAM[S.family].name : '—');
  $('#stKit').textContent = 'Drum Kit: ' + (S.kitSel ? S.kitSel.slice(2) : 'Personalizado');
  var b = $('#stBtn'); b.textContent = padOn ? '■' : '▶'; b.classList.toggle('playing', padOn);
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
  ['Todos'].concat(cats).forEach(function (c) {
    var b = el('button', (famCat === c || (famCat === 'Todos' && c === 'Todos')) ? 'on' : '', c);
    b.onclick = function () { famCat = c; renderFams(); };
    cb.appendChild(b);
  });
  var fb = $('#fams'); fb.innerHTML = '';
  CAT.pads.filter(function (f) { return famCat === 'Todos' || f.category === famCat; }).sort(byName).forEach(function (f) {
    var b = el('button', 'fam' + (f.id === S.family ? ' on' : ''), f.name);
    b.appendChild(el('small', null, f.category));
    b.onclick = function () { setFamily(f.id); };
    fb.appendChild(b);
  });
}

/* ---------- drum pads ---------- */
var drumBufs = {}, userSamples = {}, drumEditing = false;
function drumMeta(id) { return DRUM[id] || userSamples[id] || null; }
function getDrumBuffer(id) {
  if (drumBufs[id]) return Promise.resolve(drumBufs[id]);
  var p;
  if (DRUM[id]) p = fetchBuf(DRUM[id].file);
  else if (userSamples[id]) p = idbGet(id).then(function (rec) { return decode(rec.data.slice(0)); });
  else return Promise.resolve(null);
  return p.then(function (b) { drumBufs[id] = b; return b; }, function () { return null; });
}
function preloadKit() { S.kit.forEach(function (id) { getDrumBuffer(id); }); }
function trigger(i, buf, vel) {
  var src = ctx.createBufferSource(); src.buffer = buf;
  var g = ctx.createGain(); g.gain.value = clamp(vel, 0.05, 1) * (S.dvol[i] == null ? 1 : S.dvol[i]);
  src.connect(g); g.connect(A.drumBus); src.start();
  var p = $('#drumGrid').children[i];
  if (p) { p.classList.add('hit'); setTimeout(function () { p.classList.remove('hit'); }, 90); }
}
function playDrum(i, vel) {
  if (!ctx) return;
  var id = S.kit[i], v = vel == null ? 1 : vel, b = drumBufs[id];
  if (b) trigger(i, b, v);
  else getDrumBuffer(id).then(function (bb) { if (bb) trigger(i, bb, v); });
}
function renderDrums() {
  var g = $('#drumGrid'); g.innerHTML = '';
  S.kit.forEach(function (id, i) {
    var m = drumMeta(id);
    var p = el('div', 'dpad'); p.dataset.action = 'drum:' + i; p.dataset.fast = '1';
    p.appendChild(el('b', null, String(i + 1)));
    p.appendChild(el('span', null, kitLabel(i) || (m ? m.name : '(vazio)')));
    g.appendChild(p);
  });
  $('#tab-drums').classList.toggle('editing', drumEditing);
  g.classList.toggle('has16', S.kit.slice(8).some(Boolean));
  renderDvols(); renderStatus();
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
function kitLabel(i) {
  var v = S.kitSel, r = null;
  if (v && v[0] === 'f') FACTORY_KITS.forEach(function (k) { if (k.name === v.slice(2) && k.ids[i] === S.kit[i] && k.labels) r = k.labels[i] || null; });
  return r;
}
function renderDvols() {
  var box = $('#dvols'); if (!box) return; box.innerHTML = '';
  S.kit.forEach(function (id, i) {
    if (!id) return;
    var m = drumMeta(id);
    var w = el('div', 'dv');
    var top = el('div', 'dvt'); top.appendChild(el('b', null, kitLabel(i) || (m ? m.name : id)));
    var o = el('output', null, Math.round(S.dvol[i] * 100) + '%'); top.appendChild(o);
    var r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.01; r.value = S.dvol[i];
    r.setAttribute('aria-label', 'Volume ' + (m ? m.name : 'pad ' + (i + 1)));
    r.oninput = function () { S.dvol[i] = parseFloat(r.value); o.textContent = Math.round(S.dvol[i] * 100) + '%'; save(); };
    w.appendChild(top); w.appendChild(r); box.appendChild(w);
  });
  box.classList.toggle('hidden', !box.children.length);
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
    var row = el('div', 'item'); row.appendChild(el('span', 'nm', it.name));
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
  $('#metToggle').textContent = '■ Parar'; $('#metToggle').classList.add('on');
}
function metStop() {
  metOn = false; clearInterval(metTimer); beatQueue = [];
  $$('#beats .beat').forEach(function (d) { d.classList.remove('on'); });
  $('#metToggle').textContent = '▶ Iniciar'; $('#metToggle').classList.remove('on');
}
function setBpm(v) {
  v = clamp(Math.round(v), 30, 260); S.bpm = v;
  $('#bpm').value = v; $('#bpmRange').value = v; save();
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
  setBpm(S.bpm); renderBeats();
}

/* ---------- setlist ---------- */
function songLabel(s) { return LABEL[s.key] + ' · ' + s.bpm + ' bpm · ' + (FAM[s.family] ? FAM[s.family].name : s.family); }
function renderSongNow() {
  var s = S.setlist[S.songIdx];
  $('#songNow').textContent = s ? s.title + ' — ' + songLabel(s) : '—';
}
function renderSongs() {
  var ol = $('#songs'); ol.innerHTML = '';
  if (!S.setlist.length) { ol.appendChild(el('p', 'muted', 'Nenhuma música ainda. Ajuste tom, pad e andamento e use "Salvar estado atual".')); }
  S.setlist.forEach(function (s, i) {
    var li = el('li', 'song' + (i === S.songIdx ? ' cur' : ''));
    var info = el('div', 'info'); info.appendChild(el('div', 't', (i + 1) + '. ' + s.title)); info.appendChild(el('div', 'm', songLabel(s)));
    info.onclick = function () { loadSong(i); };
    var up = el('button', null, '↑'), dn = el('button', null, '↓'), rn = el('button', null, '✎'), rm = el('button', 'danger', '✕');
    up.onclick = function () { moveSong(i, -1); }; dn.onclick = function () { moveSong(i, 1); };
    rn.onclick = function () { var t = prompt('Título da música', s.title); if (t) { s.title = t.slice(0, 60); save(); renderSongs(); renderSongNow(); } };
    rm.onclick = function () { if (confirm('Remover "' + s.title + '"?')) { S.setlist.splice(i, 1); if (S.songIdx >= S.setlist.length) S.songIdx = S.setlist.length - 1; save(); renderSongs(); renderSongNow(); } };
    li.appendChild(info); li.appendChild(up); li.appendChild(dn); li.appendChild(rn); li.appendChild(rm);
    ol.appendChild(li);
  });
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
  if (s.kit && kitList().indexOf(s.kit) >= 0 && s.kit !== S.kitSel) applyKit(s.kit, true);
  setBpm(s.bpm); save();
  renderKeys(); renderFams(); renderSongs(); renderSongNow();
  if (padOn && ctx) padStart();
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
    S.setlist.push({ title: t.slice(0, 60), key: S.key, family: S.family, bpm: S.bpm, kit: S.kitSel });
    $('#songTitle').value = ''; save(); renderSongs(); toast('Música salva');
  };
  $('#slExport').onclick = function () { download('aurapad-setlist.json', JSON.stringify({ setlist: S.setlist }, null, 1)); };
  $('#slImport').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var j = JSON.parse(t); if (!Array.isArray(j.setlist)) throw 0;
      S.setlist = j.setlist.map(function (s) { return { title: String(s.title || '').slice(0, 60), key: NOTES.indexOf(s.key) >= 0 ? s.key : 'C', family: s.family, bpm: clamp(parseInt(s.bpm, 10) || 72, 30, 260), kit: typeof s.kit === 'string' ? s.kit : '' }; });
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
  if (p[0] === 'drum') playDrum(parseInt(p[1], 10), vel);
  else if (p[0] === 'padkey') padKeyTap(p[1]);
  else if (a === 'pad:toggle') padToggle();
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
  return { 'pad:toggle': 'Pad tocar/parar', 'met:toggle': 'Metrônomo iniciar/parar', 'met:tap': 'Tap tempo', 'song:next': 'Próxima música', 'song:prev': 'Música anterior', 'fam:next': 'Próximo pad', 'fam:prev': 'Pad anterior', 'kit:next': 'Próximo kit de bateria', 'kit:prev': 'Kit de bateria anterior' }[a] || a;
}

/* ---------- MIDI ---------- */
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
function renderMidiMap() {
  var box = $('#midiMap'); box.innerHTML = '';
  var m = effMap();
  Object.keys(m).sort(function (a, b) { return actionName(m[a]) < actionName(m[b]) ? -1 : 1; }).forEach(function (k) {
    var row = el('div', 'mm'); var msg = k.split(':');
    row.appendChild(el('span', null, actionName(m[k])));
    var right = el('span', null, (msg[0] === 'note' ? 'Nota ' : 'CC ') + msg[1] + ' ');
    var x = el('button', 'danger', '✕'); x.onclick = function () { S.midiMap[k] = null; save(); renderMidiMap(); };
    right.appendChild(x); row.appendChild(right); box.appendChild(row);
  });
}
function onMidi(e) {
  if (!armed && window.StageLab && StageLab.midi(e)) return;
  var d = e.data, st = d[0] & 0xf0, n = d[1], v = d[2];
  var key = null, on = false;
  if (st === 0x90 && v > 0) { key = 'note:' + n; on = true; }
  else if (st === 0xb0) { key = 'cc:' + n; on = v > 0; }
  else return;
  if (!on) return;
  if (armed) { // modo mapear
    Object.keys(S.midiMap).forEach(function (k) { if (S.midiMap[k] === armed) delete S.midiMap[k]; });
    S.midiMap[key] = armed; save(); renderMidiMap();
    toast(actionName(armed) + ' ← ' + key.replace(':', ' ')); armed = null; $('#midiHint').textContent = 'Mapeado. Toque em outro botão ou desative o modo.';
    return;
  }
  var a = effMap()[key]; if (a) doAction(a, v / 127);
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
    if (e.type === 'pointerdown') { armed = t.dataset.action; $('#midiHint').textContent = 'Aguardando MIDI para: ' + actionName(armed); }
  }
  document.addEventListener('pointerdown', capture, true);
  document.addEventListener('click', capture, true);
}

/* ---------- eventos gerais ---------- */
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
    };
  });
  $$('.stseg.sv').forEach(function (g) {
    g.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      $$('button', g).forEach(function (x) { x.classList.toggle('on', x === b); });
      g.closest('.tab').dataset.sv = b.dataset.sv;
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
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
  loadCatalog().then(function () {
    renderFams(); renderKeys(); renderPadBtn(); bindFx(); renderFx(); bindSets(); bindSetlist(); bindMidi(); renderMidiMap();
    bindMetro(); renderSongs(); renderSongNow(); bindUI();
    loadUserSamples().then(renderDrums);
    renderDrums();
    // áudio pronto desde a abertura (fica suspenso até o primeiro toque, regra do navegador)
    initAudio();
    loadClicks(); preloadKit(); prefetchFamily(S.family); initMidi();
  }).catch(function (e) { toast('Erro ao carregar o catálogo'); console.error(e); });
}
window.AuraPad = { get ctx() { return ctx; }, get A() { return A; }, S: S, save: save, toast: toast };
boot();
})();
