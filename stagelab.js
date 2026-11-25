/* StageLab — mixer de instrumentos em camadas + teclado de palco.
   - 8 instrumentos (sons gravados do GeneralUser GS + 1 synth), cada um com fader; todos tocam juntos.
   - 8 efeitos globais com knob e botão liga/desliga: Cutoff, Release, Comp, Reverb, Delay, Low, Mid, High.
   - Transpor, Oitava, Sets (fábrica + do usuário) com Salvar/Sobrescrever/Excluir.
   - Vínculo MIDI: toque num controle e mexa no controlador; o vínculo fica salvo.
   - Teclado na tela (referência: AURA Synth Bass) com rodas de Pitch/Mod, sustain, velocidade e glissando. */
(function () {
  'use strict';
  var AP = window.AuraPad || {};
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function isBlack(n) { return [1, 3, 6, 8, 10].indexOf(n % 12) >= 0; }
  var NOTAS_PT = ['Dó', 'Dó sustenido', 'Ré', 'Ré sustenido', 'Mi', 'Fá', 'Fá sustenido', 'Sol', 'Sol sustenido', 'Lá', 'Lá sustenido', 'Si'];

  /* ---------- instrumentos ---------- */
  var SYNTH = { id: 'synth', name: 'Synth', env: { a: 0.01, d: 0.4, s: 0.65, r: 0.28 }, lp: { f: 3200, kt: 0.6, q: 2.2 },
    p: [{ t: 'sawtooth', m: 1, g: 0.55, d: -5 }, { t: 'square', m: 1, g: 0.35, d: 5 }], gain: 0.32 };
  var CH = [
    { id: 'sf:piano',   name: 'Piano',  file: 'piano',   boost: 4.5, sf: true },
    { id: 'sf:rhodes',  name: 'Rhodes', file: 'rhodes',  boost: 1.4, sf: true },
    { id: 'sf:organ',   name: 'Órgão',  file: 'organ',   boost: 2,   sf: true },
    { id: 'sf:strings', name: 'Cordas', file: 'strings', boost: 3.5, sf: true },
    { id: 'sf:pad',     name: 'Pad',    file: 'pad',     boost: 5,   sf: true },
    { id: 'sf:choir',   name: 'Coro',   file: 'choir',   boost: 2.2, sf: true },
    SYNTH,
    { id: 'sf:bells',   name: 'Sinos',  file: 'bells',   boost: 1.8, sf: true }
  ];
  /* ---------- efeitos globais ---------- */
  var FXD = [
    { id: 'cut',  name: 'Cutoff',  v: 1,    on: true },
    { id: 'rel',  name: 'Release', v: 0.5,  on: true },
    { id: 'comp', name: 'Comp',    v: 0.4,  on: true },
    { id: 'rev',  name: 'Reverb',  v: 0.25, on: true },
    { id: 'dly',  name: 'Delay',   v: 0.25, on: false },
    { id: 'low',  name: 'Low',     v: 0.5,  on: true },
    { id: 'mid',  name: 'Mid',     v: 0.5,  on: true },
    { id: 'high', name: 'High',    v: 0.5,  on: true }
  ];
  var FXNAME = {}; FXD.forEach(function (f) { FXNAME[f.id] = f.name; });

  /* ---------- sets ---------- */
  function mk(f, fx) { return { f: f, m: [0, 0, 0, 0, 0, 0, 0, 0], fx: fx || {}, tr: 0, oc: 0 }; }
  var FACTORY = {
    'Worship Piano + Pad': mk([0.85, 0, 0, 0.25, 0.6, 0, 0, 0], { rev: { v: 0.4, on: true } }),
    'Piano solo':          mk([0.9, 0, 0, 0, 0, 0, 0, 0], { rev: { v: 0.2, on: true } }),
    'Ambiente':            mk([0, 0, 0, 0.55, 0.7, 0.35, 0, 0.3], { rev: { v: 0.6, on: true }, cut: { v: 0.8, on: true } }),
    'Rhodes + Cordas':     mk([0, 0.8, 0, 0.5, 0, 0, 0, 0], { rev: { v: 0.3, on: true }, dly: { v: 0.2, on: true } }),
    'Órgão':               mk([0, 0, 0.8, 0, 0.3, 0, 0, 0], { rev: { v: 0.3, on: true } })
  };

  /* ---------- estado salvo (S.stage) ---------- */
  var ST = null;
  function fxOf(c, id) { var d = FXD.filter(function (x) { return x.id === id; })[0]; var o = c.fx[id] || {}; return { v: o.v !== undefined ? o.v : d.v, on: o.on !== undefined ? o.on : d.on }; }
  function st() {
    if (ST) return ST;
    var s = (AP.S && AP.S.stage) || {};
    ST = { sets: s.sets || {}, set: s.set || 'Worship Piano + Pad', cur: null, map: s.map || {} };
    var c = s.cur && s.cur.f ? s.cur : null;
    ST.cur = c ? JSON.parse(JSON.stringify(c)) : JSON.parse(JSON.stringify(FACTORY['Worship Piano + Pad']));
    ST.cur.f = (ST.cur.f || []).slice(0, 8); while (ST.cur.f.length < 8) ST.cur.f.push(0);
    ST.cur.m = (ST.cur.m || []).slice(0, 8); while (ST.cur.m.length < 8) ST.cur.m.push(0);
    ST.cur.fx = ST.cur.fx || {}; ST.cur.tr = ST.cur.tr | 0; ST.cur.oc = ST.cur.oc | 0;
    AP.S.stage = ST;
    return ST;
  }
  function persist() { try { AP.S.stage = ST; AP.save(); } catch (e) {} }
  function toast(m) { if (AP.toast) AP.toast(m); }
  function allSets() { var o = {}; Object.keys(FACTORY).forEach(function (k) { o[k] = FACTORY[k]; }); Object.keys(st().sets).forEach(function (k) { o[k] = st().sets[k]; }); return o; }
  function setNames() { return Object.keys(FACTORY).concat(Object.keys(st().sets)); }

  /* ---------- áudio ---------- */
  var ctx = null, ready = false, N = {};
  var voices = {};                     // nota tocada -> [vozes]
  var held = {}, down = {};
  var sustain = false, bend = 0, mod = 0, relScale = 1;
  var order = [];
  var bank = {};

  function ensure() {
    if (!AP.ctx || !AP.A || !AP.A.mix) return false;
    if (ready) return true;
    ctx = AP.ctx; ready = true;
    N.in = ctx.createGain();
    N.low = ctx.createBiquadFilter(); N.low.type = 'lowshelf'; N.low.frequency.value = 200;
    N.mid = ctx.createBiquadFilter(); N.mid.type = 'peaking'; N.mid.frequency.value = 1000; N.mid.Q.value = 0.8;
    N.high = ctx.createBiquadFilter(); N.high.type = 'highshelf'; N.high.frequency.value = 4000;
    N.lp = ctx.createBiquadFilter(); N.lp.type = 'lowpass'; N.lp.Q.value = 0.7; N.lp.frequency.value = 20000;
    N.comp = ctx.createDynamicsCompressor();
    N.out = ctx.createGain(); N.out.gain.value = 0.9;
    N.in.connect(N.low); N.low.connect(N.mid); N.mid.connect(N.high); N.high.connect(N.lp); N.lp.connect(N.comp); N.comp.connect(N.out); N.out.connect(AP.A.mix);
    N.rv = ctx.createGain(); N.comp.connect(N.rv); N.rv.connect(AP.A.conv);
    N.dl = ctx.createDelay(1.5); N.dl.delayTime.value = 0.375;
    N.fb = ctx.createGain(); N.fb.gain.value = 0.38;
    N.dw = ctx.createGain(); N.dw.gain.value = 0;
    N.dfl = ctx.createBiquadFilter(); N.dfl.type = 'lowpass'; N.dfl.frequency.value = 3200;
    N.comp.connect(N.dl); N.dl.connect(N.dfl); N.dfl.connect(N.fb); N.fb.connect(N.dl); N.dfl.connect(N.dw); N.dw.connect(N.out);
    N.ch = CH.map(function () { var g = ctx.createGain(); g.gain.value = 0; g.connect(N.in); return g; });
    N.lfo = ctx.createOscillator(); N.lfo.frequency.value = 5.4;
    N.lfoG = ctx.createGain(); N.lfoG.gain.value = 0; N.lfo.connect(N.lfoG); N.lfo.start();
    applyAll();
    CH.forEach(function (c) { if (c.sf) loadBank(c); });
    return true;
  }
  function T(p, v) { if (ctx) p.setTargetAtTime(v, ctx.currentTime, 0.03); }
  function applyFx() {
    if (!ready) return;
    var c = st().cur;
    var f = fxOf(c, 'cut'); T(N.lp.frequency, f.on ? 120 * Math.pow(150, f.v) : 20000);
    f = fxOf(c, 'rel'); relScale = f.on ? 0.3 * Math.pow(13.3, f.v) : 1;
    f = fxOf(c, 'comp'); T(N.comp.threshold, f.on ? -6 - f.v * 44 : 0); T(N.comp.ratio, f.on ? 2 + f.v * 8 : 1);
    f = fxOf(c, 'rev'); T(N.rv.gain, f.on ? f.v * 0.9 : 0);
    f = fxOf(c, 'dly'); T(N.dw.gain, f.on ? f.v * 0.8 : 0);
    ['low', 'mid', 'high'].forEach(function (k) { var x = fxOf(c, k); T(N[k].gain, x.on ? (x.v - 0.5) * 24 : 0); });
  }
  function applyFaders() {
    if (!ready) return;
    var c = st().cur;
    CH.forEach(function (ch, i) { T(N.ch[i].gain, c.m[i] ? 0 : Math.pow(c.f[i], 1.6)); });
  }
  function applyAll() { applyFx(); applyFaders(); }
  function applyMod() { if (ready) T(N.lfoG.gain, mod * 45); }
  function applyBend() {
    var c = bend * 200;
    Object.keys(voices).forEach(function (k) { voices[k].forEach(function (vo) { vo.oscs.forEach(function (o) { o.osc.detune.value = o.base + c; }); }); });
  }

  /* gravados */
  function loadBank(c) {
    var b = bank[c.id]; if (b) return b.p;
    b = bank[c.id] = { st: 'loading' };
    b.p = Promise.all([fetch('sf/' + c.file + '.json').then(function (r) { return r.json(); }), fetch('sf/' + c.file + '.bin').then(function (r) { return r.arrayBuffer(); })])
      .then(function (a) {
        var j = a[0], pcm = new Int16Array(a[1]);
        b.bufs = j.samples.map(function (sm) {
          var buf = ctx.createBuffer(1, sm[1], sm[2]), d = buf.getChannelData(0), o = sm[0];
          for (var i = 0; i < sm[1]; i++) d[i] = pcm[o + i] / 32768;
          return buf;
        });
        b.zones = j.zones; b.trim = j.trim; b.st = 'ready'; paintLoading();
      }).catch(function () { b.st = 'error'; delete bank[c.id]; paintLoading(); });
    return b.p;
  }
  function sfVoice(c, n, vel, t, v, dest) {
    var b = bank[c.id];
    if (!b || b.st !== 'ready') { loadBank(c); return null; }
    var voice = { oscs: [], envs: [], out: null, r: 0.2 }, vc = Math.pow(v, 1.5) * b.trim * 0.55 * (c.boost || 1);
    var out = ctx.createGain(); out.gain.value = vc; out.connect(dest); voice.out = out;
    b.zones.forEach(function (z) {
      if (n < z[0] || n > z[1] || vel < z[2] || vel > z[3]) return;
      var buf = b.bufs[z[4]], src = ctx.createBufferSource(), env = ctx.createGain(), g = ctx.createGain(), node = g;
      src.buffer = buf;
      src.playbackRate.value = Math.pow(2, ((n - z[5]) * z[7] + z[6]) / 1200);
      src.detune.value = bend * 200;
      N.lfoG.connect(src.detune);
      if ((z[8] === 1 || z[8] === 3) && z[10] > z[9] + 8) { src.loop = true; src.loopStart = z[9] / buf.sampleRate; src.loopEnd = z[10] / buf.sampleRate; }
      g.gain.value = z[16];
      var att = Math.max(0.002, z[11]), sus = z[14], dec = z[13], sdb = sus > 0 ? -20 * Math.log10(sus) : 100;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(1, t + att);
      var t1 = t + att + z[12];
      env.gain.setValueAtTime(1, t1);
      env.gain.setTargetAtTime(sus, t1, Math.max(0.01, dec * Math.min(1, sdb / 100)) / 3);
      env._r = z[15]; if (z[15] > voice.r) voice.r = z[15];
      if (ctx.createStereoPanner && z[17]) { var pn = ctx.createStereoPanner(); pn.pan.value = z[17]; g.connect(pn); node = pn; }
      src.connect(g); node.connect(env); env.connect(out);
      src.start(t);
      voice.oscs.push({ osc: src, base: 0 }); voice.envs.push(env);
    });
    if (!voice.envs.length) { try { out.disconnect(); } catch (e) {} return null; }
    return voice;
  }
  /* sintetizado */
  function synthVoice(tb, n, v, t, dest) {
    var e = tb.env, freq = 440 * Math.pow(2, (n - 69) / 12);
    var out = ctx.createGain(); out.gain.value = Math.pow(v, 1.4) * tb.gain;
    var env = ctx.createGain(); env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(1, t + e.a);
    if (e.d) env.gain.setTargetAtTime(e.s, t + e.a, e.d / 3);
    var head = env;
    if (tb.lp) {
      var filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = tb.lp.q;
      filt.frequency.value = Math.min(16000, tb.lp.f * Math.pow(freq / 261.6, tb.lp.kt) * (0.6 + v * 0.8));
      filt.connect(env); head = filt;
    }
    env.connect(out); out.connect(dest);
    var oscs = [];
    tb.p.forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = p.t; o.frequency.value = freq * p.m;
      var base = p.d || 0; o.detune.value = base + bend * 200;
      N.lfoG.connect(o.detune);
      g.gain.setValueAtTime(p.g, t);
      o.connect(g); g.connect(head); o.start(t);
      oscs.push({ osc: o, base: base });
    });
    env._r = e.r;
    return { oscs: oscs, envs: [env], out: out, r: e.r };
  }

  function activeChannels() { var c = st().cur, a = []; CH.forEach(function (ch, i) { if (!c.m[i] && c.f[i] > 0.01) a.push(i); }); return a; }
  function pitch(n) { return clamp(n + st().cur.tr + st().cur.oc * 12, 0, 127); }

  function noteOn(n, vel) {
    if (!ensure()) return;
    if (ctx.state !== 'running') ctx.resume();
    if (voices[n]) kill(n, true);
    delete held[n];
    var t = ctx.currentTime, v = clamp((vel || 100) / 127, 0.05, 1), pn = pitch(n), list = [];
    activeChannels().forEach(function (i) {
      var c = CH[i], vo = c.sf ? sfVoice(c, pn, Math.round(vel || 100), t, v, N.ch[i]) : synthVoice(c, pn, v, t, N.ch[i]);
      if (vo) { list.push(vo); flash(i, v); }
    });
    if (!list.length) return;
    voices[n] = list; order.push(n);
    if (order.length > 20) { var old = order.shift(); if (old !== n && voices[old]) kill(old, false); }
  }
  function kill(n, fast) {
    var list = voices[n]; if (!list) return;
    delete voices[n]; order = order.filter(function (x) { return x !== n; });
    var t = ctx.currentTime;
    list.forEach(function (vo) {
      var r = fast ? 0.03 : Math.min(vo.r * relScale, 6);
      try {
        vo.envs.forEach(function (en) {
          en.gain.cancelScheduledValues(t);
          en.gain.setValueAtTime(en.gain.value, t);
          en.gain.setTargetAtTime(0, t, (fast ? 0.03 : Math.min((en._r || vo.r) * relScale, 6)) / 4);
        });
      } catch (e) {}
      vo.oscs.forEach(function (o) { try { o.osc.stop(t + r * 1.3 + 0.1); } catch (e) {} });
      setTimeout(function () { try { vo.out.disconnect(); } catch (e) {} }, (r * 1.3 + 0.4) * 1000);
    });
  }
  function noteOff(n) { if (!voices[n]) return; if (sustain) { held[n] = true; return; } kill(n, false); }
  function releaseHeld() { Object.keys(held).forEach(function (k) { delete held[k]; if (!down[k]) kill(+k, false); }); }
  function allOff() { Object.keys(voices).forEach(function (k) { kill(+k, true); }); held = {}; down = {}; paintKeys(); }

  /* ---------- teclado na tela ---------- */
  var kb, KEYS = [], count = 25, BASE = 48;
  function wantCount() { var w = window.innerWidth; return w < 600 ? 13 : (w >= 1000 ? 37 : 25); }
  function buildKeys() {
    kb = $('#stKeys'); kb.innerHTML = ''; KEYS = []; count = wantCount();
    var whites = 0, n;
    for (n = 0; n < count; n++) if (!isBlack(n)) whites++;
    var w = 100 / whites, wi = 0;
    for (n = 0; n < count; n++) {
      var d = document.createElement('div'); d.dataset.i = n;
      if (!isBlack(n)) { d.className = 'k w'; d.style.left = (wi * w) + '%'; d.style.width = w + '%'; wi++; }
      else { d.className = 'k b'; d.style.left = (wi * w - w * 0.3) + '%'; d.style.width = (w * 0.6) + '%'; }
      if (n % 12 === 0) { var l = el('span', 'kl', 'C' + (Math.floor((BASE + n) / 12) - 1)); d.appendChild(l); }
      var m = BASE + n; d.setAttribute('role', 'button'); d.setAttribute('aria-label', NOTAS_PT[m % 12] + ' ' + (Math.floor(m / 12) - 1));
      kb.appendChild(d); KEYS[n] = d;
    }
    paintKeys();
  }
  function paintKeys() { KEYS.forEach(function (d, i) { if (d) d.classList.toggle('d', !!(down[BASE + i] || held[BASE + i])); }); }
  function mark(n, on) { var d = KEYS[n - BASE]; if (d) d.classList.toggle('d', on); }
  var active = {};
  function keyAt(x, y) { var e = document.elementFromPoint(x, y); return (e && e.dataset && e.dataset.i !== undefined && e.parentNode === kb) ? BASE + parseInt(e.dataset.i, 10) : null; }
  function touchVel(n, y) { var k = KEYS[n - BASE]; if (!k) return 100; var r = k.getBoundingClientRect(); return Math.round(35 + 92 * clamp((y - r.top) / r.height, 0, 1)); }
  function press(n, y) { down[n] = true; mark(n, true); noteOn(n, touchVel(n, y)); }
  function lift(n) { delete down[n]; mark(n, false); noteOff(n); if (sustain && voices[n]) mark(n, true); }
  function bindKeys() {
    kb.addEventListener('pointerdown', function (e) { var n = keyAt(e.clientX, e.clientY); if (n == null) return; kb.setPointerCapture(e.pointerId); active[e.pointerId] = n; press(n, e.clientY); e.preventDefault(); });
    kb.addEventListener('pointermove', function (e) { if (active[e.pointerId] === undefined) return; var n = keyAt(e.clientX, e.clientY), cur = active[e.pointerId]; if (n != null && n !== cur) { press(n, e.clientY); lift(cur); active[e.pointerId] = n; } });
    var up = function (e) { if (active[e.pointerId] === undefined) return; var n = active[e.pointerId]; delete active[e.pointerId]; lift(n); };
    kb.addEventListener('pointerup', up); kb.addEventListener('pointercancel', up);
  }
  function drawWheels() {
    var wp = $('#whPitch'), wm = $('#whMod');
    wp.querySelector('.notch').style.top = (50 - bend * 40) + '%'; wp.querySelector('.roll').style.setProperty('--off', (-bend * 18) + 'px');
    wm.querySelector('.notch').style.top = (90 - mod * 80) + '%'; wm.querySelector('.roll').style.setProperty('--off', (-mod * 36) + 'px');
  }
  function setBend(v, spring) { bend = clamp(v, -1, 1); $('#whPitch').querySelector('.notch').classList.toggle('spring', !!spring); if (ensure()) applyBend(); drawWheels(); }
  function setMod(v) { mod = clamp(v, 0, 1); if (ensure()) applyMod(); drawWheels(); }
  function wheel(e0, fn, end) {
    var on = false;
    e0.addEventListener('pointerdown', function (e) { on = true; e0.setPointerCapture(e.pointerId); fn(e.clientY, e0.getBoundingClientRect()); e.preventDefault(); });
    e0.addEventListener('pointermove', function (e) { if (on) fn(e.clientY, e0.getBoundingClientRect()); });
    function stop() { if (on) { on = false; if (end) end(); } }
    e0.addEventListener('pointerup', stop); e0.addEventListener('pointercancel', stop);
  }

  /* ---------- mixer: faders e knobs ---------- */
  var UI = { fader: [], name: [], meter: [], knob: {}, pow: {} };
  function drawFader(i) { var f = UI.fader[i]; f.style.setProperty('--v', st().cur.f[i]); f.setAttribute('aria-valuenow', Math.round(st().cur.f[i] * 100)); UI.name[i].classList.toggle('off', !!st().cur.m[i]); }
  function drawKnob(id) {
    var f = fxOf(st().cur, id), k = UI.knob[id];
    k.style.setProperty('--a', (-135 + f.v * 270) + 'deg'); k.setAttribute('aria-valuenow', Math.round(f.v * 100));
    k.parentNode.classList.toggle('off', !f.on); UI.pow[id].classList.toggle('on', f.on);
  }
  function setFader(i, v) { st().cur.f[i] = clamp(v, 0, 1); drawFader(i); applyFaders(); persist(); }
  function toggleMute(i) { st().cur.m[i] = st().cur.m[i] ? 0 : 1; drawFader(i); applyFaders(); persist(); }
  function setKnob(id, v) { var f = fxOf(st().cur, id), o = st().cur.fx[id] = st().cur.fx[id] || {}; o.v = clamp(v, 0, 1); o.on = f.on; drawKnob(id); applyFx(); persist(); }
  function togglePow(id) { var f = fxOf(st().cur, id), o = st().cur.fx[id] = st().cur.fx[id] || {}; o.v = f.v; o.on = !f.on; drawKnob(id); applyFx(); persist(); }
  function flash(i, v) {
    var m = UI.meter[i]; if (!m) return;
    m.style.transition = 'none'; m.style.setProperty('--m', Math.min(1, v * st().cur.f[i] * 1.2)); void m.offsetWidth;
    m.style.transition = ''; m.style.setProperty('--m', 0);
  }
  function paintLoading() {
    CH.forEach(function (c, i) { if (UI.name[i]) UI.name[i].classList.toggle('loading', !!c.sf && !(bank[c.id] && bank[c.id].st === 'ready')); });
  }
  function buildMixer() {
    var box = $('#stMixer'); box.innerHTML = '';
    CH.forEach(function (c, i) {
      var fx = FXD[i], col = el('div', 'mcol');
      var kw = el('div', 'kw');
      var knob = el('div', 'knob'); knob.dataset.id = 'knob:' + fx.id; knob.setAttribute('role', 'slider'); knob.setAttribute('aria-label', fx.name); knob.setAttribute('aria-valuemin', 0); knob.setAttribute('aria-valuemax', 100); knob.tabIndex = 0;
      knob.appendChild(el('i'));
      var lab = el('small', null, fx.name);
      var pow = el('button', 'pow'); pow.dataset.id = 'pow:' + fx.id; pow.setAttribute('aria-label', fx.name + ' ligar ou desligar');
      pow.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/></svg>';
      kw.appendChild(knob); kw.appendChild(lab);
      var fd = el('div', 'fader'); fd.dataset.id = 'fader:' + i; fd.setAttribute('role', 'slider'); fd.setAttribute('aria-label', 'Volume ' + c.name); fd.setAttribute('aria-valuemin', 0); fd.setAttribute('aria-valuemax', 100); fd.tabIndex = 0;
      var track = el('div', 'trk'); track.appendChild(el('div', 'fill')); fd.appendChild(track); fd.appendChild(el('div', 'thumb'));
      var meter = el('div', 'meter'); meter.appendChild(el('i'));
      var wrap = el('div', 'fw'); wrap.appendChild(fd); wrap.appendChild(meter);
      var nm = el('button', 'cname', c.name); nm.dataset.id = 'mute:' + i;
      col.appendChild(kw); col.appendChild(pow); col.appendChild(wrap); col.appendChild(nm);
      box.appendChild(col);
      UI.fader[i] = fd; UI.name[i] = nm; UI.meter[i] = meter; UI.knob[fx.id] = knob; UI.pow[fx.id] = pow;
      var fdOn = false;
      function fy(e) { var r = track.getBoundingClientRect(); setFader(i, 1 - (e.clientY - r.top) / r.height); }
      fd.addEventListener('pointerdown', function (e) { fdOn = true; fd.setPointerCapture(e.pointerId); fy(e); e.preventDefault(); });
      fd.addEventListener('pointermove', function (e) { if (fdOn) fy(e); });
      fd.addEventListener('pointerup', function () { fdOn = false; }); fd.addEventListener('pointercancel', function () { fdOn = false; });
      fd.addEventListener('keydown', function (e) { var d = (e.key === 'ArrowUp' || e.key === 'ArrowRight') ? 0.05 : (e.key === 'ArrowDown' || e.key === 'ArrowLeft') ? -0.05 : 0; if (d) { e.preventDefault(); setFader(i, st().cur.f[i] + d); } });
      var y0 = 0, v0 = 0, kOn = false;
      knob.addEventListener('pointerdown', function (e) { kOn = true; y0 = e.clientY; v0 = fxOf(st().cur, fx.id).v; knob.setPointerCapture(e.pointerId); e.preventDefault(); });
      knob.addEventListener('pointermove', function (e) { if (kOn) setKnob(fx.id, v0 + (y0 - e.clientY) / 160); });
      knob.addEventListener('pointerup', function () { kOn = false; }); knob.addEventListener('pointercancel', function () { kOn = false; });
      knob.addEventListener('dblclick', function () { setKnob(fx.id, fx.v); });
      knob.addEventListener('keydown', function (e) { var d = (e.key === 'ArrowUp' || e.key === 'ArrowRight') ? 0.05 : (e.key === 'ArrowDown' || e.key === 'ArrowLeft') ? -0.05 : 0; if (d) { e.preventDefault(); setKnob(fx.id, fxOf(st().cur, fx.id).v + d); } });
      pow.onclick = function () { togglePow(fx.id); };
      nm.onclick = function () { toggleMute(i); };
    });
  }
  function drawAll() {
    CH.forEach(function (c, i) { drawFader(i); }); FXD.forEach(function (f) { drawKnob(f.id); });
    $('#stTrV').textContent = (st().cur.tr > 0 ? '+' : '') + st().cur.tr; $('#stOcV').textContent = (st().cur.oc > 0 ? '+' : '') + st().cur.oc;
    $('#stSus').classList.toggle('on', sustain);
    var sel = $('#stSet'); sel.innerHTML = '';
    setNames().forEach(function (n) { var o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); });
    sel.value = st().set;
    $('#stDel').disabled = !st().sets[st().set];
    paintMapped(); paintLoading();
  }

  /* ---------- sets ---------- */
  function loadSet(name, quiet) {
    var s = allSets()[name]; if (!s) return;
    var c = JSON.parse(JSON.stringify(s));
    ST.cur = { f: c.f, m: c.m || [0, 0, 0, 0, 0, 0, 0, 0], fx: c.fx || {}, tr: c.tr | 0, oc: c.oc | 0 };
    ST.set = name; allOff(); drawAll(); applyAll(); persist();
    if (!quiet) toast('Set: ' + name);
  }
  function stepSet(d) { var n = setNames(), i = n.indexOf(st().set); loadSet(n[(i + d + n.length) % n.length]); }
  function snapshot() { return JSON.parse(JSON.stringify(st().cur)); }
  function saveNew() {
    var base = 'Set ', i = 1; while (allSets()[base + i]) i++;
    var name = prompt('Nome do novo set:', base + i); if (!name) return; name = name.trim().slice(0, 30); if (!name) return;
    if (FACTORY[name]) { toast('Esse nome é de um set de fábrica'); return; }
    st().sets[name] = snapshot(); st().set = name; drawAll(); persist(); toast('Salvo: ' + name);
  }
  function overwrite() {
    var n = st().set;
    if (!st().sets[n]) { saveNew(); return; }
    st().sets[n] = snapshot(); persist(); toast('Sobrescrito: ' + n);
  }
  function delSet() {
    var n = st().set; if (!st().sets[n]) return;
    if (!confirm('Excluir o set "' + n + '"?')) return;
    delete st().sets[n]; st().set = Object.keys(FACTORY)[0]; loadSet(st().set, true); toast('Excluído: ' + n);
  }

  /* ---------- ações (botões e MIDI) ---------- */
  function idName(id) {
    var p = id.split(':'), a = p[0], b = p[1];
    if (a === 'fader') return 'Fader ' + CH[+b].name;
    if (a === 'knob') return 'Knob ' + FXNAME[b];
    if (a === 'pow') return FXNAME[b] + ' liga/desliga';
    if (a === 'mute') return CH[+b].name + ' liga/desliga';
    return { 'trans:-': 'Transpor −', 'trans:+': 'Transpor +', 'oct:-': 'Oitava −', 'oct:+': 'Oitava +', 'set:-': 'Set anterior', 'set:+': 'Próximo set', save: 'Salvar set', over: 'Sobrescrever set', sus: 'Sustain' }[id] || id;
  }
  function isCont(id) { return id.indexOf('fader:') === 0 || id.indexOf('knob:') === 0; }
  function act(id, val) {
    var p = id.split(':'), a = p[0], b = p[1];
    if (a === 'fader') { if (val != null) setFader(+b, val); return; }
    if (a === 'knob') { if (val != null) setKnob(b, val); return; }
    if (val != null) return;
    if (a === 'pow') togglePow(b);
    else if (a === 'mute') toggleMute(+b);
    else if (id === 'trans:+') setTrans(1); else if (id === 'trans:-') setTrans(-1);
    else if (id === 'oct:+') setOct(1); else if (id === 'oct:-') setOct(-1);
    else if (id === 'set:+') stepSet(1); else if (id === 'set:-') stepSet(-1);
    else if (id === 'save') saveNew(); else if (id === 'over') overwrite();
    else if (id === 'sus') setSustain(!sustain);
  }
  function setTrans(d) { allOff(); st().cur.tr = clamp(st().cur.tr + d, -12, 12); drawAll(); persist(); }
  function setOct(d) { allOff(); st().cur.oc = clamp(st().cur.oc + d, -3, 3); drawAll(); persist(); }
  function setSustain(on) { sustain = on; $('#stSus').classList.toggle('on', on); if (!on) { releaseHeld(); paintKeys(); } }

  /* ---------- vínculo MIDI ---------- */
  var learn = false, armed = null, ccState = {};
  function paintMapped() {
    $$('#tab-fx [data-id]').forEach(function (e) { e.classList.remove('mapped'); e.removeAttribute('data-cc'); });
    var m = st().map;
    Object.keys(m).forEach(function (k) {
      var e = document.querySelector('#tab-fx [data-id="' + m[k] + '"]');
      if (e) { e.classList.add('mapped'); e.setAttribute('data-cc', k.replace('cc:', 'CC').replace('note:', 'N')); }
    });
  }
  function bindMap(key, id) {
    Object.keys(st().map).forEach(function (k) { if (st().map[k] === id || k === key) delete st().map[k]; });
    st().map[key] = id; persist(); paintMapped();
    toast(idName(id) + ' ← ' + key.replace('cc:', 'CC ').replace('note:', 'Nota '));
    armed = null; $$('#tab-fx .armed').forEach(function (e) { e.classList.remove('armed'); });
  }
  function setLearn(on) {
    learn = on; armed = null; $('#stLearn').classList.toggle('on', on); $('#tab-fx').classList.toggle('learning', on);
    $$('#tab-fx .armed').forEach(function (e) { e.classList.remove('armed'); });
    if (on) toast('Toque num controle e mexa no controlador');
  }
  function bindLearn() {
    $('#stLearn').onclick = function () { setLearn(!learn); };
    $('#stUnmap').onclick = function () { st().map = {}; persist(); paintMapped(); toast('Vínculos MIDI removidos'); };
    var t = $('#tab-fx');
    function cap(e) {
      if (!learn) return;
      var x = e.target.closest && e.target.closest('[data-id]'); if (!x) return;
      e.preventDefault(); e.stopPropagation();
      if (e.type === 'pointerdown') {
        $$('#tab-fx .armed').forEach(function (z) { z.classList.remove('armed'); });
        armed = x.dataset.id; x.classList.add('armed'); toast(idName(armed) + ': mexa no controlador');
      }
    }
    ['pointerdown', 'click', 'dblclick'].forEach(function (ev) { t.addEventListener(ev, cap, true); });
  }

  /* ---------- MIDI ---------- */
  function visible() { var t = $('#tab-fx'); return !!(t && t.classList.contains('on') && t.dataset.sv !== 'fx'); }
  function midi(e) {
    if (!visible()) return false;
    var d = e.data, s = d[0] & 0xf0, a = d[1], b = d[2];
    if (s === 0x90 && b > 0) {
      if (learn) { if (armed) bindMap('note:' + a, armed); return true; }
      var id = st().map['note:' + a]; if (id) { act(id, null); return true; }
      down[a] = true; mark(a, true); noteOn(a, b); return true;
    }
    if (s === 0x80 || (s === 0x90 && b === 0)) { if (learn || st().map['note:' + a]) return true; lift(a); return true; }
    if (s === 0xe0) { if (!learn) setBend((((b << 7) | a) - 8192) / 8192, true); return true; }
    if (s === 0xb0) {
      if (learn) { if (armed) bindMap('cc:' + a, armed); return true; }
      var m = st().map['cc:' + a];
      if (m) {
        if (isCont(m)) act(m, b / 127);
        else { var was = ccState[a] || 0; ccState[a] = b; if (b >= 64 && was < 64) act(m, null); }
        return true;
      }
      if (a === 1) { setMod(b / 127); return true; }
      if (a === 64) { setSustain(b >= 64); return true; }
    }
    return false;
  }

  /* ---------- abas e inicialização ---------- */
  function setView(v) {
    $('#tab-fx').dataset.sv = v;
    $$('#stSeg button').forEach(function (x) { x.classList.toggle('on', x.dataset.sv === v); });
    $('#stMix').hidden = v !== 'mix'; $('#stKb').hidden = v !== 'kb'; $('#stFx').hidden = v !== 'fx';
    if (v === 'fx') { allOff(); if (learn) setLearn(false); }
  }
  function init() {
    if (!$('#stMixer')) return;
    st(); buildMixer(); buildKeys(); bindKeys(); bindLearn();
    $$('#stSeg button').forEach(function (b) { b.onclick = function () { setView(b.dataset.sv); }; });
    $('#stTrDn').onclick = function () { setTrans(-1); }; $('#stTrUp').onclick = function () { setTrans(1); };
    $('#stOcDn').onclick = function () { setOct(-1); }; $('#stOcUp').onclick = function () { setOct(1); };
    $('#stSetPrev').onclick = function () { stepSet(-1); }; $('#stSetNext').onclick = function () { stepSet(1); };
    $('#stSet').onchange = function () { loadSet($('#stSet').value); };
    $('#stSave').onclick = saveNew; $('#stOver').onclick = overwrite; $('#stDel').onclick = delSet;
    $('#stSus').onclick = function () { setSustain(!sustain); };
    wheel($('#whPitch'), function (y, rc) { setBend(((rc.top + rc.height / 2) - y) / (rc.height * 0.4)); }, function () { setBend(0, true); });
    wheel($('#whMod'), function (y, rc) { setMod((rc.bottom - rc.height * 0.1 - y) / (rc.height * 0.8)); });
    drawAll(); drawWheels();
    window.addEventListener('resize', function () { var c = wantCount(); if (c !== count) { allOff(); buildKeys(); } });
    document.addEventListener('visibilitychange', function () { if (document.hidden) allOff(); });
    $$('#tabs button').forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.tab !== 'fx') { allOff(); if (learn) setLearn(false); } else if (ensure()) { applyAll(); paintLoading(); } }); });
    window.StageLab = { midi: midi, allOff: allOff };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
