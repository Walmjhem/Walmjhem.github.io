// Marci Metzger Homes: page behaviour (plain JavaScript)
(function () {
  'use strict';
  var doc = document;
  var win = window;
  var reduceMotion = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Active nav link (scroll spy)
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll('.site-nav a[data-spy]'));
  var spyMap = { home: 'home', listings: 'listings', about: 'about', sell: 'sell', services: 'services', gallery: 'services', contact: 'contact' };
  var spySections = Object.keys(spyMap).map(function (id) { return doc.getElementById(id); }).filter(Boolean);

  function updateNav() {
    var y = win.pageYOffset || doc.documentElement.scrollTop;
    var probe = y + 160;
    var current = 'home';
    spySections.forEach(function (s) {
      if (s.getBoundingClientRect().top + y <= probe) { current = s.id; }
    });
    if (win.innerHeight + y >= doc.documentElement.scrollHeight - 4) { current = 'contact'; }
    navLinks.forEach(function (link) {
      var on = link.getAttribute('data-spy') === spyMap[current];
      link.classList.toggle('active', on);
      if (on) { link.setAttribute('aria-current', 'true'); } else { link.removeAttribute('aria-current'); }
    });
  }
  var ticking = false;
  win.addEventListener('scroll', function () {
    if (ticking) { return; }
    ticking = true;
    win.requestAnimationFrame(function () { updateNav(); ticking = false; });
  }, { passive: true });
  win.addEventListener('resize', updateNav);
  updateNav();

  // Mobile menu
  var header = doc.getElementById('site-header');
  var toggle = doc.querySelector('.nav-toggle');
  var nav = doc.getElementById('site-nav');
  function setNav(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) { setNav(false); } });
  doc.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !header.contains(e.target)) { setNav(false); }
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); toggle.focus(); }
  });
  win.addEventListener('resize', function () { if (win.innerWidth >= 1000) { setNav(false); } });

  // Gallery filmstrip: arrows scroll one photo, counter follows the scroll position
  var strip = doc.querySelector('.strip');
  if (strip) {
    var shots = strip.children;
    var counter = doc.querySelector('.g-count');
    var step = function () { return shots[0].offsetWidth + 16; };
    var current = function () { return Math.min(Math.round(strip.scrollLeft / step()), shots.length - 1); };
    var update = function () { counter.textContent = (current() + 1) + ' / ' + shots.length; };
    var target = 0;
    var busy = false;
    var go = function (dir) {
      var next = (busy ? target : current()) + dir;
      if (next < 0) { next = shots.length - 1; }
      if (next >= shots.length) { next = 0; }
      target = next;
      busy = true;
      win.setTimeout(function () { busy = false; }, 600);
      strip.scrollTo({ left: next * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    doc.querySelector('.g-prev').addEventListener('click', function () { go(-1); });
    doc.querySelector('.g-next').addEventListener('click', function () { go(1); });
    strip.addEventListener('scroll', update, { passive: true });
    update();
  }

  // Click-to-enlarge viewer (gallery photos only)
  function groupOf(el) { var s = el.closest('section'); return s ? s.id : 'footer'; }
  var zoomImgs = Array.prototype.slice.call(doc.querySelectorAll('.shot img'));
  zoomImgs.forEach(function (img) {
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'zoom';
    btn.setAttribute('aria-label', 'View larger: ' + img.alt);
    img.parentNode.insertBefore(btn, img);
    btn.appendChild(img);
  });

  var lb = doc.createElement('dialog');
  lb.className = 'lightbox';
  lb.setAttribute('aria-label', 'Photo viewer');
  lb.innerHTML =
    '<button class="lb-btn lb-close" type="button" aria-label="Close photo viewer">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<button class="lb-btn lb-next" type="button" aria-label="Next photo">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    '<figure class="lb-fig"><img class="lb-img" alt=""><figcaption class="lb-cap"><span class="lb-text"></span><span class="lb-count"></span></figcaption></figure>';
  doc.body.appendChild(lb);

  if (lb.showModal) {
    var lbImg = lb.querySelector('.lb-img');
    var lbText = lb.querySelector('.lb-text');
    var lbCount = lb.querySelector('.lb-count');
    var lbPrev = lb.querySelector('.lb-prev');
    var lbNext = lb.querySelector('.lb-next');
    var set = [];
    var at = 0;

    var showPhoto = function (i) {
      at = (i + set.length) % set.length;
      var src = set[at];
      lbImg.src = src.currentSrc || src.src;
      lbImg.alt = src.alt;
      // never enlarge past 2x the real file, so small photos stay reasonably sharp
      var base = parseInt(src.getAttribute('width'), 10) || 900;
      lbImg.style.maxWidth = Math.min(win.innerWidth * 0.92, base * 2) + 'px';
      lbText.textContent = src.alt;
      lbCount.textContent = set.length > 1 ? (at + 1) + ' / ' + set.length : '';
    };

    zoomImgs.forEach(function (img) {
      img.parentNode.addEventListener('click', function () {
        var group = groupOf(img);
        set = zoomImgs.filter(function (o) { return groupOf(o) === group; });
        lbPrev.hidden = lbNext.hidden = set.length < 2;
        showPhoto(set.indexOf(img));
        doc.documentElement.classList.add('lb-open');
        lb.showModal();
      });
    });

    lb.querySelector('.lb-close').addEventListener('click', function () { lb.close(); });
    lbPrev.addEventListener('click', function () { showPhoto(at - 1); });
    lbNext.addEventListener('click', function () { showPhoto(at + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-fig')) { lb.close(); } });
    lb.addEventListener('close', function () { doc.documentElement.classList.remove('lb-open'); lbImg.removeAttribute('src'); });
    lb.addEventListener('keydown', function (e) {
      if (set.length < 2) { return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(at - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(at + 1); }
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null || set.length < 2) { return; }
      var dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) { showPhoto(dx < 0 ? at + 1 : at - 1); }
    }, { passive: true });
  }

  // Search form
  var searchForm = doc.getElementById('search-form');
  var searchOut = doc.getElementById('search-result');

  function setStatus(box, nodes, isError) {
    box.textContent = '';
    box.classList.toggle('is-error', !!isError);
    nodes.forEach(function (n) {
      box.appendChild(typeof n === 'string' ? doc.createTextNode(n) : n);
    });
  }

  function money(value) {
    return '$' + Number(value).toLocaleString('en-US');
  }

  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = searchForm.elements;
      var min = f.min.value.trim();
      var max = f.max.value.trim();

      if (min && max && Number(min) > Number(max)) {
        setStatus(searchOut, ['The minimum price is higher than the maximum. Please adjust one of them.'], true);
        return;
      }

      var parts = [];
      parts.push(f.location.value || 'Any location');
      parts.push(f.type.value || 'Any type');
      if (f.beds.value) { parts.push(f.beds.value + ' bed'); }
      if (f.baths.value) { parts.push(f.baths.value + ' bath'); }
      if (min && max) { parts.push(money(min) + ' to ' + money(max)); }
      else if (min) { parts.push('from ' + money(min)); }
      else if (max) { parts.push('up to ' + money(max)); }
      parts.push('sorted: ' + f.sort.value.toLowerCase());

      var link = doc.createElement('a');
      link.href = 'https://marcimetzger.com/listings';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'See live listings';

      setStatus(searchOut, [
        'Your search: ' + parts.join(', ') + '. ',
        link,
        ' or call (206) 919-6886.'
      ], false);
    });
  }

  // Contact form
  var contactForm = doc.getElementById('contact-form');
  var contactStatus = doc.getElementById('contact-status');

  if (contactForm) {
    var emailInput = contactForm.elements.email;
    var emailError = doc.getElementById('c-email-error');
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    emailInput.addEventListener('input', function () {
      if (!emailError.hidden && emailPattern.test(emailInput.value.trim())) {
        emailError.hidden = true;
        emailInput.removeAttribute('aria-invalid');
      }
    });

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      contactStatus.textContent = '';
      contactStatus.classList.remove('is-error');

      if (!emailPattern.test(emailInput.value.trim())) {
        emailError.hidden = false;
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.focus();
        return;
      }

      emailError.hidden = true;
      emailInput.removeAttribute('aria-invalid');
      contactForm.reset();
      setStatus(contactStatus, [
        'Thanks for reaching out. This form is not connected to email yet, so please call Marci at (206) 919-6886.'
      ], false);
    });
  }

  // Cookie notice
  var banner = doc.getElementById('cookie-banner');
  var acceptBtn = doc.getElementById('cookie-accept');
  var COOKIE_KEY = 'mm-cookie-accepted';

  if (banner && acceptBtn) {
    var accepted = false;
    try { accepted = win.localStorage.getItem(COOKIE_KEY) === '1'; } catch (err) { /* storage blocked */ }

    if (!accepted) {
      var showBanner = function () { banner.hidden = false; win.removeEventListener('scroll', onFirstScroll); };
      var onFirstScroll = function () { if ((win.pageYOffset || 0) > win.innerHeight * 0.6) { showBanner(); } };
      win.addEventListener('scroll', onFirstScroll, { passive: true });
      win.setTimeout(showBanner, 12000);
    }

    acceptBtn.addEventListener('click', function () {
      banner.hidden = true;
      try { win.localStorage.setItem(COOKIE_KEY, '1'); } catch (err) { /* storage blocked */ }
    });
  }

  // Footer year
  var yearEl = doc.querySelector('[data-year]');
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  // Live office status
  var statusEls = Array.prototype.slice.call(doc.querySelectorAll('[data-status]'));
  function officeStatus() {
    var h = 0, m = 0;
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', hour12: false })
      .formatToParts(new Date()).forEach(function (p) {
        if (p.type === 'hour') { h = Number(p.value) % 24; }
        if (p.type === 'minute') { m = Number(p.value); }
      });
    var open = h * 60 + m >= 480 && h * 60 + m < 1140;
    statusEls.forEach(function (el) {
      el.classList.toggle('is-open', open);
      el.textContent = open ? 'Open now, until 7:00 pm' : 'Closed now, opens 8:00 am';
    });
  }
  if (statusEls.length && win.Intl) { officeStatus(); win.setInterval(officeStatus, 60000); }

  // Count-up numbers
  function countUp(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var dec = Number(el.getAttribute('data-dec') || 0);
    var pre = el.getAttribute('data-pre') || '';
    var suf = el.getAttribute('data-suf') || '';
    var t0 = null;
    function step(t) {
      if (t0 === null) { t0 = t; }
      var p = Math.min((t - t0) / 1400, 1);
      el.textContent = pre + (end * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suf;
      if (p < 1) { win.requestAnimationFrame(step); }
    }
    win.requestAnimationFrame(step);
  }
  var counters = Array.prototype.slice.call(doc.querySelectorAll('[data-count]'));
  if (counters.length && 'IntersectionObserver' in win && !reduceMotion) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); co.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

})();
