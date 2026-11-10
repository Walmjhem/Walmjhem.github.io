/* Crumb & Co.: motion layer. Works on both the shop and the owner admin page. */
(() => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  // scroll progress + top bar shadow
  const bar = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'mo-progress' }));
  const top = document.querySelector('.topbar');
  let queued = false;
  const onScroll = () => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      if (top) top.classList.toggle('is-stuck', scrollY > 10);
      queued = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // a handful of crumbs drifting up around the hero pastry
  const hero = document.querySelector('.hero');
  if (hero) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 12; i++) {
      const c = document.createElement('i');
      c.className = 'mo-crumb';
      c.style.cssText = `left:${rnd(52, 94)}%;top:${rnd(55, 92)}%;--s:${rnd(5, 11).toFixed(1)}px;` +
        `--dx:${rnd(-50, 50).toFixed(0)}px;--dy:${rnd(-170, -70).toFixed(0)}px;--rot:${rnd(-200, 200).toFixed(0)}deg;` +
        `--t:${rnd(4, 7).toFixed(1)}s;--w:${rnd(0, 6).toFixed(1)}s`;
      hero.appendChild(c);
    }
  }

  // flash numbers when their text changes (basket total, cart count)
  const tick = el => { el.classList.remove('mo-tick'); void el.offsetWidth; el.classList.add('mo-tick'); };
  ['#basketTotal', '#cartCount'].forEach(sel => {
    const el = document.querySelector(sel); if (!el) return;
    let last = el.textContent;
    new MutationObserver(() => { if (el.textContent !== last) { last = el.textContent; tick(el); } })
      .observe(el, { childList: true, characterData: true, subtree: true });
  });
})();
