/* © 2026 Thiago R. Galvão. Todos os direitos reservados. ID: AURA-PD-TRG-2026
   Aura Pad — knobs giratórios no estilo do AURA Synth Bass.
   Transforma <input type="range" data-knob="Rótulo"> num knob; o input continua sendo a fonte do valor
   (os eventos input/change são disparados normalmente), então o resto do app não muda. */
(function () {
  'use strict';
  var proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  var FMT = {
    padVol: pct, metVol: pct, loopVol: pct, drumVol: pct, mix2: pct, fxRev: pct, pulseDepth: pct,
    fxPan: function (v) { return Math.abs(v) < 0.02 ? 'Centro' : (v < 0 ? 'E ' : 'D ') + Math.round(Math.abs(v) * 100); },
    fxCut: function (v) { if (v >= 0.999) return 'Aberto'; var f = 200 * Math.pow(100, v); return f >= 1000 ? (f / 1000).toFixed(1) + ' kHz' : Math.round(f) + ' Hz'; },
    fxLow: db, fxHigh: db, fxTh: function (v) { return Math.round(v) + ' dB'; }, fxRa: function (v) { return (+v).toFixed(1).replace('.0', '') + ':1'; },
    padFade: secs, padLoop: secs
  };
  function pct(v) { return Math.round(v * 100) + '%'; }
  function db(v) { v = +v; return (v > 0 ? '+' : '') + v + ' dB'; }
  function secs(v) { return String(+v).replace('.', ',') + ' s'; }

  function make(inp) {
    if (inp._knob) return;
    var min = +inp.min || 0, max = inp.max === '' ? 100 : +inp.max, step = +inp.step || 0.01;
    var box = document.createElement('div'); box.className = 'knob-w';
    var k = document.createElement('div'); k.className = 'knob'; k.tabIndex = 0; k.setAttribute('role', 'slider');
    k.setAttribute('aria-label', inp.dataset.knob);
    k.innerHTML = '<i class="cap"><i class="ind"></i></i>';
    var lab = document.createElement('small'); lab.textContent = inp.dataset.knob;
    var val = document.createElement('b'); val.className = 'kv';
    inp.parentNode.insertBefore(box, inp); box.appendChild(k); box.appendChild(lab); box.appendChild(val); box.appendChild(inp);
    inp.classList.add('knob-src');
    function draw() {
      var v = +proto.get.call(inp), f = (v - min) / (max - min);
      k.style.setProperty('--a', (-135 + f * 270) + 'deg');
      k.setAttribute('aria-valuenow', v);
      val.textContent = (FMT[inp.id] || pct)(v);
      box.classList.toggle('dis', inp.disabled);
    }
    Object.defineProperty(inp, 'value', { get: function () { return proto.get.call(inp); }, set: function (v) { proto.set.call(inp, v); draw(); }, configurable: true });
    var dd = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'disabled');
    Object.defineProperty(inp, 'disabled', { get: function () { return dd.get.call(inp); }, set: function (v) { dd.set.call(inp, v); draw(); }, configurable: true });
    function setV(v) {
      v = Math.min(max, Math.max(min, Math.round(v / step) * step));
      if (Math.abs(v - +proto.get.call(inp)) < step / 2) return;
      proto.set.call(inp, v); draw();
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    var y0 = 0, v0 = 0, on = false;
    k.addEventListener('pointerdown', function (e) {
      if (inp.disabled) return;
      on = true; y0 = e.clientY; v0 = +proto.get.call(inp); k.setPointerCapture(e.pointerId); k.classList.add('drag'); e.preventDefault();
    });
    k.addEventListener('pointermove', function (e) { if (on) setV(v0 + (y0 - e.clientY) / 180 * (max - min)); });
    function end() { if (!on) return; on = false; k.classList.remove('drag'); inp.dispatchEvent(new Event('change', { bubbles: true })); }
    k.addEventListener('pointerup', end); k.addEventListener('pointercancel', end);
    k.addEventListener('dblclick', function () { if (!inp.disabled) setV(inp.dataset.center ? (min + max) / 2 : +inp.defaultValue); });
    k.addEventListener('wheel', function (e) { if (inp.disabled) return; e.preventDefault(); setV(+proto.get.call(inp) - Math.sign(e.deltaY) * (max - min) / 50); }, { passive: false });
    k.addEventListener('keydown', function (e) {
      var d = (e.key === 'ArrowUp' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowDown' || e.key === 'ArrowLeft') ? -1 : 0;
      if (d && !inp.disabled) { e.preventDefault(); setV(+proto.get.call(inp) + d * (max - min) / 40); }
    });
    inp._knob = { draw: draw };
    draw();
  }
  function init() { Array.prototype.forEach.call(document.querySelectorAll('input[type=range][data-knob]'), make); syncSteps(); setInterval(syncSteps, 300); }
  /* visores dos seletores (pad, kit, set, setlist): mostram o nome da opção escolhida */
  function syncSteps() {
    Array.prototype.forEach.call(document.querySelectorAll('.stepname'), function (w) {
      var s = w.querySelector('select'); if (!s) return;
      var o = s.options[s.selectedIndex], t = o ? o.textContent : '—';
      if (w.getAttribute('data-v') !== t) w.setAttribute('data-v', t);
    });
  }
  document.addEventListener('change', function (e) { if (e.target.tagName === 'SELECT') syncSteps(); });
  window.AuraKnob = { make: make, init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
