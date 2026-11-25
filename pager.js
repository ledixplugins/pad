/* Aura Pad — regra de ouro: nada rola. Listas que não cabem na tela viram páginas (‹ 1/2 ›),
   com deslize lateral. Cada lista calcula quantos itens cabem e se refaz ao girar ou redimensionar. */
(function () {
  'use strict';
  var RESERVE = 40;
  function Pager(cont) {
    var page = 0, pages = 1, queued = false;
    var bar = document.createElement('div'); bar.className = 'pager'; bar.hidden = true;
    var prev = document.createElement('button'), next = document.createElement('button'), lab = document.createElement('span');
    prev.textContent = '‹'; next.textContent = '›'; prev.setAttribute('aria-label', 'Página anterior'); next.setAttribute('aria-label', 'Próxima página');
    bar.appendChild(prev); bar.appendChild(lab); bar.appendChild(next);
    function items() { return Array.prototype.filter.call(cont.children, function (e) { return e !== bar; }); }
    function show() {
      items().forEach(function (e) { e.classList.toggle('pg-off', (+e.dataset.pg || 0) !== page); });
      lab.textContent = (page + 1) + ' / ' + pages; bar.hidden = pages < 2;
    }
    function go(d) { var p = Math.max(0, Math.min(pages - 1, page + d)); if (p !== page) { page = p; show(); } }
    function layout() {
      queued = false;
      if (!cont.clientHeight) return;
      if (bar.parentNode !== cont) cont.appendChild(bar);
      var its = items(); its.forEach(function (e) { e.classList.remove('pg-off'); });
      function split(limit) {
        var pg = 0, base = 0, n = 0;
        its.forEach(function (e, i) {
          var top = e.offsetTop, bottom = top + e.offsetHeight;
          if (i > 0 && bottom - base > limit && top > base) { pg++; base = top; }
          e.dataset.pg = pg; n = pg + 1;
        });
        return n;
      }
      var n = split(cont.clientHeight);
      if (n > 1) n = split(cont.clientHeight - RESERVE);
      pages = Math.max(1, n); if (page > pages - 1) page = pages - 1;
      show();
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(layout); } }
    prev.onclick = function (e) { e.stopPropagation(); go(-1); };
    next.onclick = function (e) { e.stopPropagation(); go(1); };
    var sx = null;
    cont.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    cont.addEventListener('pointerup', function (e) { if (sx === null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1); });
    new MutationObserver(queue).observe(cont, { childList: true });
    if (window.ResizeObserver) new ResizeObserver(queue).observe(cont);
    window.addEventListener('resize', queue);
    queue();
    cont._pager = { queue: queue, reset: function () { page = 0; queue(); } };
  }
  function init() { ['#fams', '#songs', '#midiMap', '#dvols', '#modalList'].forEach(function (s) { var c = document.querySelector(s); if (c) Pager(c); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
