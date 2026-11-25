/* StageLab — teclado de palco (referência: teclado do AURA Synth Bass).
   Teclas de marfim/pretas, rodas de Pitch e Mod, oitava, sustain, velocidade pela altura do toque,
   glissando com o dedo e MIDI (notas, pitch bend, CC1 mod, CC64 sustain).
   Timbres sintetizados em Web Audio (sem arquivos); entram no mesmo mix e no mesmo reverb dos pads. */
(function () {
  'use strict';
  var TIMBRES = [
    { id: 'ep',      name: 'Piano elétrico', env: { a: 0.003, s: 1,    r: 0.40 },
      p: [{ t: 'sine', m: 1, g: 1,    pd: 1.6,  ps: 0.35 }, { t: 'sine', m: 2, g: 0.40, pd: 0.35, ps: 0 }, { t: 'sine', m: 4, g: 0.14, pd: 0.12, ps: 0 }, { t: 'sine', m: 0.5, g: 0.30, pd: 2.2, ps: 0.4 }] },
    { id: 'organ',   name: 'Órgão',          env: { a: 0.012, s: 1,   r: 0.08 },
      p: [{ t: 'sine', m: 0.5, g: 0.6 }, { t: 'sine', m: 1, g: 1 }, { t: 'sine', m: 2, g: 0.7 }, { t: 'sine', m: 3, g: 0.45 }, { t: 'sine', m: 4, g: 0.32 }] },
    { id: 'strings', name: 'Cordas',         env: { a: 0.32, s: 1,    r: 0.75 }, lp: { f: 2600, kt: 0.5, q: 0.3 },
      p: [{ t: 'sawtooth', m: 1, g: 0.5, d: -8 }, { t: 'sawtooth', m: 1, g: 0.5, d: 8 }, { t: 'sawtooth', m: 1, g: 0.35, d: 0 }] },
    { id: 'pad',     name: 'Pad suave',      env: { a: 0.8, s: 1,     r: 1.7 }, lp: { f: 1500, kt: 0.4, q: 0.2 },
      p: [{ t: 'triangle', m: 1, g: 0.7, d: -6 }, { t: 'triangle', m: 1, g: 0.7, d: 6 }, { t: 'sine', m: 0.5, g: 0.5 }] },
    { id: 'bell',    name: 'Sino',           env: { a: 0.002, s: 1,  r: 0.7 },
      p: [{ t: 'sine', m: 1, g: 1, pd: 2.6, ps: 0 }, { t: 'sine', m: 2.76, g: 0.45, pd: 1.6, ps: 0 }, { t: 'sine', m: 5.4, g: 0.22, pd: 0.8, ps: 0 }, { t: 'sine', m: 8.9, g: 0.1, pd: 0.4, ps: 0 }] },
    { id: 'synth',   name: 'Synth',          env: { a: 0.01, d: 0.4, s: 0.65, r: 0.28 }, lp: { f: 3200, kt: 0.6, q: 2.2 },
      p: [{ t: 'sawtooth', m: 1, g: 0.55, d: -5 }, { t: 'square', m: 1, g: 0.35, d: 5 }] }
  ];
  /* timbres gravados (extraídos do GeneralUser GS, pasta sf/) */
  var SF = [
    { id: 'sf:piano',   file: 'piano', boost: 4.5,   name: 'Piano' },
    { id: 'sf:rhodes',  file: 'rhodes', boost: 1.4,  name: 'Rhodes' },
    { id: 'sf:organ',   file: 'organ', boost: 2,   name: 'Órgão' },
    { id: 'sf:strings', file: 'strings', boost: 3.5, name: 'Cordas' },
    { id: 'sf:pad',     file: 'pad', boost: 5,     name: 'Pad quente' },
    { id: 'sf:choir',   file: 'choir', boost: 2.2,   name: 'Coro' },
    { id: 'sf:halo',    file: 'halo', boost: 2,    name: 'Halo' },
    { id: 'sf:bells',   file: 'bells', boost: 1.8,   name: 'Sinos' }
  ];
  SF.forEach(function (t) { t.sf = true; });
  var ALL = SF.concat(TIMBRES);
  var NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var NOTAS_PT = ['Dó', 'Dó sustenido', 'Ré', 'Ré sustenido', 'Mi', 'Fá', 'Fá sustenido', 'Sol', 'Sol sustenido', 'Lá', 'Lá sustenido', 'Si'];
  function $(s) { return document.querySelector(s); }
  function isBlack(n) { return [1, 3, 6, 8, 10].indexOf(n % 12) >= 0; }

  var AP = window.AuraPad || {};
  var ST = null;                       // estado salvo em S.stage
  function st() {
    if (ST) return ST;
    var d = { timbre: 'sf:piano', base: 48, vol: 0.7, rev: 0.25 };
    var s = (AP.S && AP.S.stage) || {};
    ST = {};
    Object.keys(d).forEach(function (k) { ST[k] = (s[k] !== undefined) ? s[k] : d[k]; });
    if (!ALL.some(function (t) { return t.id === ST.timbre; })) ST.timbre = 'sf:piano';
    if (!(ST.base >= 12 && ST.base <= 84 && ST.base % 12 === 0)) ST.base = 48;
    AP.S.stage = ST;
    return ST;
  }
  function persist() { try { AP.S.stage = ST; AP.save(); } catch (e) {} }
  function timbre() { var id = st().timbre; for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return ALL[0]; }

  /* ---------- áudio ---------- */
  var ctx = null, bus = null, send = null, lfo = null, lfoG = null;
  var voices = {};                     // nota -> voz
  var held = {};                       // notas seguradas pelo sustain
  var down = {};                       // notas com tecla pressionada
  var sustain = false, bend = 0, mod = 0;
  var order = [];

  function ensure() {
    if (!AP.ctx || !AP.A || !AP.A.mix) return false;
    if (bus) return true;
    ctx = AP.ctx; bus = ctx.createGain(); bus.connect(AP.A.mix);
    send = ctx.createGain(); bus.connect(send); send.connect(AP.A.conv);
    lfo = ctx.createOscillator(); lfo.frequency.value = 5.4;
    lfoG = ctx.createGain(); lfoG.gain.value = 0; lfo.connect(lfoG); lfo.start();
    applyMix();
    return true;
  }
  function applyMix() {
    if (!bus) return;
    var t = ctx.currentTime;
    bus.gain.setTargetAtTime(st().vol * 0.9, t, 0.03);
    send.gain.setTargetAtTime(st().rev * 0.9, t, 0.03);
  }
  function applyMod() { if (lfoG) lfoG.gain.setTargetAtTime(mod * 45, ctx.currentTime, 0.05); }
  function applyBend() {
    var c = bend * 200;
    Object.keys(voices).forEach(function (k) { voices[k].oscs.forEach(function (o) { o.osc.detune.value = o.base + c; }); });
  }

  function noteOn(n, vel) {
    if (!ensure()) return;
    if (ctx.state !== 'running') ctx.resume();
    if (voices[n]) kill(n, true);
    delete held[n];
    var tb = timbre(), t = ctx.currentTime, v = Math.max(0.05, Math.min(1, (vel || 100) / 127));
    if (tb.sf) { noteOnSF(n, vel || 100, tb, t, v); return; }
    var e = tb.env;
    var freq = 440 * Math.pow(2, (n - 69) / 12);
    var out = ctx.createGain(); out.gain.value = Math.pow(v, 1.4) * 0.32;
    var env = ctx.createGain(); env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(1, t + e.a);
    if (e.d) env.gain.setTargetAtTime(e.s, t + e.a, e.d / 3);
    var head = env, filt = null;
    if (tb.lp) {
      filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = tb.lp.q;
      filt.frequency.value = Math.min(16000, tb.lp.f * Math.pow(freq / 261.6, tb.lp.kt) * (0.6 + v * 0.8));
      filt.connect(env); head = filt;
    }
    env.connect(out); out.connect(bus);
    var oscs = [];
    tb.p.forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = p.t; o.frequency.value = freq * p.m;
      var base = p.d || 0; o.detune.value = base + bend * 200;
      lfoG.connect(o.detune);
      g.gain.setValueAtTime(p.g, t);
      if (p.pd) g.gain.setTargetAtTime(p.g * p.ps, t + e.a, p.pd / 3);
      o.connect(g); g.connect(head); o.start(t);
      oscs.push({ osc: o, base: base });
    });
    voices[n] = { oscs: oscs, envs: [env], out: out, r: e.r };
    order.push(n);
    if (order.length > 28) { var old = order.shift(); if (old !== n && voices[old]) kill(old, false); }
  }
  var bank = {};                       // id -> { st:'loading'|'ready'|'error', bufs:[], zones:[], trim }
  function loadBank(tb) {
    var b = bank[tb.id]; if (b) return b.p;
    b = bank[tb.id] = { st: 'loading' };
    b.p = Promise.all([fetch('sf/' + tb.file + '.json').then(function (r) { return r.json(); }), fetch('sf/' + tb.file + '.bin').then(function (r) { return r.arrayBuffer(); })])
      .then(function (a) {
        var j = a[0], pcm = new Int16Array(a[1]);
        b.bufs = j.samples.map(function (sm) {
          var buf = ctx.createBuffer(1, sm[1], sm[2]), d = buf.getChannelData(0), o = sm[0];
          for (var i = 0; i < sm[1]; i++) d[i] = pcm[o + i] / 32768;
          return buf;
        });
        b.zones = j.zones; b.trim = j.trim; b.st = 'ready';
      }).catch(function () { b.st = 'error'; delete bank[tb.id]; });
    return b.p;
  }
  function noteOnSF(n, vel, tb, t, v) {
    var b = bank[tb.id];
    if (!b || b.st !== 'ready') { loadBank(tb); return; }
    var voice = { oscs: [], envs: [], out: null, r: 0.2 }, vc = Math.pow(v, 1.5) * b.trim * 0.55 * (tb.boost || 1);
    var out = ctx.createGain(); out.gain.value = vc; out.connect(bus); voice.out = out;
    b.zones.forEach(function (z) {
      if (n < z[0] || n > z[1] || vel < z[2] || vel > z[3]) return;
      var buf = b.bufs[z[4]], src = ctx.createBufferSource(), env = ctx.createGain(), g = ctx.createGain(), node = g;
      src.buffer = buf;
      src.playbackRate.value = Math.pow(2, ((n - z[5]) * z[7] + z[6]) / 1200);
      src.detune.value = bend * 200;
      lfoG.connect(src.detune);
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
    if (!voice.envs.length) { try { out.disconnect(); } catch (e) {} return; }
    voices[n] = voice; order.push(n);
    if (order.length > 28) { var old = order.shift(); if (old !== n && voices[old]) kill(old, false); }
  }
  function kill(n, fast) {
    var vo = voices[n]; if (!vo) return;
    delete voices[n]; order = order.filter(function (x) { return x !== n; });
    var t = ctx.currentTime, r = fast ? 0.03 : Math.min(vo.r, 4);
    try {
      vo.envs.forEach(function (en) {
        en.gain.cancelScheduledValues(t);
        en.gain.setValueAtTime(en.gain.value, t);
        en.gain.setTargetAtTime(0, t, (fast ? 0.03 : (en._r || vo.r)) / 4);
      });
    } catch (e) {}
    vo.oscs.forEach(function (o) { try { o.osc.stop(t + r * 1.3 + 0.1); } catch (e) {} });
    setTimeout(function () { try { vo.out.disconnect(); } catch (e) {} }, (r * 1.3 + 0.4) * 1000);
  }
  function noteOff(n) { if (!voices[n]) return; if (sustain) { held[n] = true; return; } kill(n, false); }
  function releaseHeld() { Object.keys(held).forEach(function (k) { delete held[k]; if (!down[k]) kill(+k, false); }); }
  function allOff() { Object.keys(voices).forEach(function (k) { kill(+k, true); }); held = {}; down = {}; paintAll(); }

  /* ---------- teclado na tela ---------- */
  var kb, KEYS = [], count = 25;
  function wantCount() { var w = window.innerWidth; return w < 600 ? 13 : (w >= 1000 ? 37 : 25); }
  function build() {
    kb = $('#stKeys'); kb.innerHTML = ''; KEYS = []; count = wantCount();
    var whites = 0, n, i;
    for (n = 0; n < count; n++) if (!isBlack(n)) whites++;
    var w = 100 / whites, wi = 0;
    for (n = 0; n < count; n++) {
      var d = document.createElement('div'); d.dataset.i = n;
      if (!isBlack(n)) { d.className = 'k w'; d.style.left = (wi * w) + '%'; d.style.width = w + '%'; wi++; }
      else { d.className = 'k b'; d.style.left = (wi * w - w * 0.3) + '%'; d.style.width = (w * 0.6) + '%'; }
      if (n % 12 === 0) { var l = document.createElement('span'); l.className = 'kl'; d.appendChild(l); }
      kb.appendChild(d); KEYS[n] = d;
    }
    labelKeys(); paintAll();
  }
  function labelKeys() {
    var b = st().base;
    KEYS.forEach(function (d, i) {
      if (!d) return;
      var m = b + i, l = d.querySelector('.kl');
      if (l) l.textContent = 'C' + (Math.floor(m / 12) - 1);
      d.setAttribute('role', 'button'); d.setAttribute('aria-label', NOTAS_PT[m % 12] + ' ' + (Math.floor(m / 12) - 1));
    });
    $('#stOctV').textContent = 'C' + (Math.floor(b / 12) - 1);
  }
  function paintAll() {
    var b = st().base;
    KEYS.forEach(function (d, i) { if (d) d.classList.toggle('d', !!(down[b + i] || voices[b + i] && sustain && held[b + i])); });
  }
  function mark(n, on) { var d = KEYS[n - st().base]; if (d) d.classList.toggle('d', on); }
  function setBase(b) {
    b = Math.max(12, Math.min(84, b)); if (b === st().base) return;
    allOff(); st().base = b; labelKeys(); persist();
  }
  function follow(n) { var b = st().base; while (n < b) b -= 12; while (n > b + count - 1) b += 12; if (b !== st().base) setBase(b); }

  var active = {};                     // pointerId -> nota
  function keyAt(x, y) { var el = document.elementFromPoint(x, y); return (el && el.dataset && el.dataset.i !== undefined && el.parentNode === kb) ? st().base + parseInt(el.dataset.i, 10) : null; }
  function touchVel(n, y) { var k = KEYS[n - st().base]; if (!k) return 100; var r = k.getBoundingClientRect(); return Math.round(35 + 92 * Math.min(1, Math.max(0, (y - r.top) / r.height))); }
  function press(n, y) { down[n] = true; mark(n, true); noteOn(n, touchVel(n, y)); }
  function lift(n) { delete down[n]; mark(n, false); noteOff(n); if (sustain && voices[n]) mark(n, true); }
  function bindKeys() {
    kb.addEventListener('pointerdown', function (e) {
      var n = keyAt(e.clientX, e.clientY); if (n == null) return;
      kb.setPointerCapture(e.pointerId); active[e.pointerId] = n; press(n, e.clientY); e.preventDefault();
    });
    kb.addEventListener('pointermove', function (e) {
      if (active[e.pointerId] === undefined) return;
      var n = keyAt(e.clientX, e.clientY), cur = active[e.pointerId];
      if (n != null && n !== cur) { press(n, e.clientY); lift(cur); active[e.pointerId] = n; }
    });
    var up = function (e) { if (active[e.pointerId] === undefined) return; var n = active[e.pointerId]; delete active[e.pointerId]; lift(n); };
    kb.addEventListener('pointerup', up); kb.addEventListener('pointercancel', up);
  }

  /* ---------- rodas de pitch e modulação ---------- */
  function drawWheels() {
    var wp = $('#whPitch'), wm = $('#whMod');
    wp.querySelector('.notch').style.top = (50 - bend * 40) + '%'; wp.querySelector('.roll').style.setProperty('--off', (-bend * 18) + 'px');
    wm.querySelector('.notch').style.top = (90 - mod * 80) + '%'; wm.querySelector('.roll').style.setProperty('--off', (-mod * 36) + 'px');
  }
  function setBend(v, spring) {
    bend = Math.max(-1, Math.min(1, v));
    $('#whPitch').querySelector('.notch').classList.toggle('spring', !!spring);
    if (ensure()) applyBend(); drawWheels();
  }
  function setMod(v) { mod = Math.max(0, Math.min(1, v)); if (ensure()) applyMod(); drawWheels(); }
  function wheel(el, fn, end) {
    var on = false;
    el.addEventListener('pointerdown', function (e) { on = true; el.setPointerCapture(e.pointerId); fn(e.clientY, el.getBoundingClientRect()); e.preventDefault(); });
    el.addEventListener('pointermove', function (e) { if (on) fn(e.clientY, el.getBoundingClientRect()); });
    function stop() { if (on) { on = false; if (end) end(); } }
    el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop);
  }

  /* ---------- controles ---------- */
  function setTimbre(id, quiet) {
    st().timbre = id; $('#stTimbre').value = id; $('#stName').textContent = timbre().name; persist();
    allOff();
    var tb = timbre();
    if (tb.sf && ensure()) {
      var b = bank[tb.id];
      if (!b || b.st !== 'ready') {
        $('#stName').textContent = 'Carregando…';
        loadBank(tb).then(function () { if (st().timbre === tb.id) $('#stName').textContent = bank[tb.id] && bank[tb.id].st === 'ready' ? tb.name : 'Sem conexão'; });
      }
    }
  }
  function stepTimbre(d) {
    var i = ALL.map(function (t) { return t.id; }).indexOf(st().timbre);
    setTimbre(ALL[(i + d + ALL.length) % ALL.length].id);
  }
  function setSustain(on) {
    sustain = on; $('#stSus').classList.toggle('on', on);
    if (!on) { releaseHeld(); paintAll(); }
  }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function bindControls() {
    var sel = $('#stTimbre');
    [['Sons gravados', SF], ['Sintetizados', TIMBRES]].forEach(function (g) {
      var og = document.createElement('optgroup'); og.label = g[0];
      g[1].forEach(function (t) { var o = document.createElement('option'); o.value = t.id; o.textContent = t.name; og.appendChild(o); });
      sel.appendChild(og);
    });
    sel.onchange = function () { setTimbre(sel.value); };
    $('#stPrev').onclick = function () { stepTimbre(-1); };
    $('#stNext').onclick = function () { stepTimbre(1); };
    $('#stOctDn').onclick = function () { setBase(st().base - 12); };
    $('#stOctUp').onclick = function () { setBase(st().base + 12); };
    $('#stSus').onclick = function () { setSustain(!sustain); };
    var v = $('#stVol'), r = $('#stRev');
    v.value = st().vol; r.value = st().rev; $('#stVolO').textContent = pct(st().vol); $('#stRevO').textContent = pct(st().rev);
    v.oninput = function () { st().vol = parseFloat(v.value); $('#stVolO').textContent = pct(st().vol); applyMix(); persist(); };
    r.oninput = function () { st().rev = parseFloat(r.value); $('#stRevO').textContent = pct(st().rev); applyMix(); persist(); };
    wheel($('#whPitch'), function (y, rc) { setBend(((rc.top + rc.height / 2) - y) / (rc.height * 0.4)); }, function () { setBend(0, true); });
    wheel($('#whMod'), function (y, rc) { setMod((rc.bottom - rc.height * 0.1 - y) / (rc.height * 0.8)); });
    $$('#stSeg button').forEach(function (b) {
      b.onclick = function () {
        $$('#stSeg button').forEach(function (x) { x.classList.toggle('on', x === b); });
        $('#stKb').hidden = b.dataset.sv !== 'kb'; $('#stFx').hidden = b.dataset.sv !== 'fx';
        if (b.dataset.sv !== 'kb') allOff();
      };
    });
  }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  /* ---------- MIDI: só quando o teclado do StageLab está na tela ---------- */
  function visible() { var t = $('#tab-fx'); return !!(t && t.classList.contains('on') && !$('#stKb').hidden); }
  function midi(e) {
    if (!visible()) return false;
    var d = e.data, s = d[0] & 0xf0, a = d[1], b = d[2];
    if (s === 0x90 && b > 0) { follow(a); down[a] = true; mark(a, true); noteOn(a, b); return true; }
    if (s === 0x80 || (s === 0x90 && b === 0)) { lift(a); return true; }
    if (s === 0xe0) { setBend((((b << 7) | a) - 8192) / 8192, true); return true; }
    if (s === 0xb0 && a === 1) { setMod(b / 127); return true; }
    if (s === 0xb0 && a === 64) { setSustain(b >= 64); return true; }
    return false;
  }

  function init() {
    if (!$('#stKeys')) return;
    st(); bindControls(); build(); bindKeys(); drawWheels();
    setTimbre(st().timbre, true);
    var w = window.innerWidth;
    window.addEventListener('resize', function () { var c = wantCount(); if (c !== count) { allOff(); build(); } });
    document.addEventListener('visibilitychange', function () { if (document.hidden) allOff(); });
    $$('#tabs button').forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.tab !== 'fx') allOff(); else setTimbre(st().timbre, true); }); });
    window.StageLab = { midi: midi, allOff: allOff };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
