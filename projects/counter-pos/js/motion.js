/* Counter POS: motion layer. Adds feedback on totals and the cart without touching app.js. */
(() => {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const retrigger = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  // totals pop whenever their text changes
  ['#sTot', '#payTotal', '#todayTot', '.cartbar b'].forEach(sel => document.querySelectorAll(sel).forEach(el => {
    let last = el.textContent;
    new MutationObserver(() => {
      if (el.textContent !== last) { last = el.textContent; if (last.trim()) retrigger(el, 'mo-tick'); }
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }));

  // the cart panel pulses when a line is added
  const lines = document.getElementById('lines'), cart = document.querySelector('.cart');
  if (lines && cart) {
    let count = lines.children.length;
    new MutationObserver(() => {
      if (lines.children.length > count) retrigger(cart, 'mo-flash');
      count = lines.children.length;
    }).observe(lines, { childList: true });
  }
})();
