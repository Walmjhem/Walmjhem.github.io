/* StockPilot: motion layer. Pure enhancement; the site works the same without it. */
(() => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const fine = matchMedia('(pointer:fine)').matches;

  // scroll progress + header shadow
  const bar = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'mo-progress' }));
  const header = document.querySelector('.header');
  let queued = false;
  const onScroll = () => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      if (header) header.classList.toggle('is-stuck', scrollY > 12);
      queued = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // reveal big blocks as they enter the viewport (class added by JS, so no JS = nothing hidden)
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('mo-in'); io.unobserve(e.target); }
  }), { threshold: .1 });
  document.querySelectorAll('.panel,.footer,.table-wrap').forEach(el => { el.classList.add('mo-rv'); io.observe(el); });

  // numbers count up to their value when data arrives (keeps prefix/suffix and decimals)
  function countWatch(el) {
    const parse = () => el.textContent.trim().match(/^([^\d-]*)(-?\d[\d,]*)(\.\d+)?(.*)$/);
    let from = 0, busy = false, obs;
    const first = parse(); if (first) from = parseFloat(first[2].replace(/,/g, '') + (first[3] || ''));
    const run = () => {
      if (busy) return;
      const m = parse(); if (!m) return;
      const dec = m[3] ? m[3].length - 1 : 0, to = parseFloat(m[2].replace(/,/g, '') + (m[3] || ''));
      if (to === from) return;
      const start = from, t0 = performance.now(); busy = true;
      (function step(now) {
        const p = Math.min(1, (now - t0) / 800), v = start + (to - start) * (1 - Math.pow(1 - p, 3));
        el.textContent = m[1] + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[4];
        obs.takeRecords();
        if (p < 1) requestAnimationFrame(step); else { from = to; busy = false; }
      })(t0);
    };
    obs = new MutationObserver(run);
    obs.observe(el, { childList: true, characterData: true, subtree: true });
  }
  document.querySelectorAll('#statProducts,#statUnits,.stat b').forEach(countWatch);

  // card tilt (fine pointers only); cards are rendered later, so listen on the document
  if (fine) {
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('.card');
      if (!c) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
      c.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const c = e.target.closest && e.target.closest('.card');
      if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
    });
  }
})();
