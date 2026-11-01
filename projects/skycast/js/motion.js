/* Skycast: motion layer. Watches the cards that app.js re-renders and animates what changes. */
(() => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const watch = (el, fn) => el && new MutationObserver(fn).observe(el, { childList: true, subtree: true });
  const tick = el => { el.classList.remove('mo-tick'); void el.offsetWidth; el.classList.add('mo-tick'); };

  // current temperature counts from the previous city's value to the new one
  let prev = null;
  watch(document.getElementById('nowCard'), () => {
    const t = document.querySelector('#nowCard .temp');
    if (!t || t.dataset.mo || !t.firstChild || t.firstChild.nodeType !== 3) return;
    t.dataset.mo = '1';
    const raw = t.firstChild.data, to = parseFloat(raw), dec = (raw.split('.')[1] || '').length;
    if (isNaN(to)) return;
    const from = prev === null ? to - 8 : prev; prev = to;
    const node = t.firstChild, t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / 900);
      node.data = (from + (to - from) * (1 - Math.pow(1 - p, 3))).toFixed(dec);
      if (p < 1) requestAnimationFrame(step); else node.data = raw;
    })(t0);
  });

  // draw the hourly line and the currency sparkline when they appear
  const draw = sel => document.querySelectorAll(sel).forEach(p => {
    if (p.classList.contains('mo-draw')) return;
    p.setAttribute('pathLength', '1'); p.classList.add('mo-draw');
  });
  watch(document.getElementById('hourBody'), () => draw('#hourBody .chart .line'));
  watch(document.getElementById('curCard'), () => draw('#spark path'));

  // currency result flashes when the converted amount changes
  const res = document.getElementById('curResult');
  if (res) { let last = res.textContent; watch(res, () => { if (res.textContent !== last) { last = res.textContent; tick(res); } }); }

  // swap button spins half a turn each click
  const swap = document.getElementById('swapCur'); let deg = 0;
  if (swap) swap.addEventListener('click', () => { deg += 180; swap.style.rotate = deg + 'deg'; });
})();
