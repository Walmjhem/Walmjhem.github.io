/* Lead capture helper (plain JavaScript)
   - Remembers where a visitor came from (UTM tags, ad click IDs, referrer)
   - Sends events to window.dataLayer for Google Tag Manager / GA4
   - Scores each lead hot / warm / cold
   - Posts the lead to a webhook (Make, Zapier, Formspree, a CRM form URL)
   With no webhook set, leads are kept in this browser only and nothing is sent. */
(function (w, d) {
  'use strict';

  var cfg = { site: 'site', endpoint: '', score: null };
  var startedAt = {};
  var dl = (w.dataLayer = w.dataLayer || []);
  var QUEUE = 'lead_queue';
  var DEMO_LOG = 'lead_demo_log';

  function safe(fn) { try { return fn(); } catch (e) { return null; } }
  function read(key, area) { return safe(function () { return JSON.parse(w[area || 'localStorage'].getItem(key)); }); }
  function write(key, val, area) { safe(function () { w[area || 'localStorage'].setItem(key, JSON.stringify(val)); }); }

  /* 1. Attribution: first touch of the session, kept in sessionStorage */
  function channel(a) {
    var m = (a.utm_medium || '').toLowerCase();
    if (a.gclid || a.fbclid || a.msclkid || /cpc|ppc|paid|display/.test(m)) { return 'paid'; }
    if (a.utm_source) { return /email|newsletter/.test(m) ? 'email' : 'campaign'; }
    if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(a.referrer)) { return 'organic search'; }
    if (/facebook\.|instagram\.|tiktok\.|linkedin\.|t\.co|pinterest\./.test(a.referrer)) { return 'social'; }
    if (a.referrer && a.referrer !== 'direct') { return 'referral'; }
    return 'direct';
  }
  function attribution() {
    var saved = read('lead_attr', 'sessionStorage');
    if (saved) { return saved; }
    var q = new URLSearchParams(w.location.search);
    var a = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid'].forEach(function (k) {
      if (q.get(k)) { a[k] = q.get(k); }
    });
    a.referrer = d.referrer ? safe(function () { return new URL(d.referrer).hostname; }) || d.referrer : 'direct';
    a.landing_page = w.location.pathname;
    a.first_seen = new Date().toISOString();
    a.channel = channel(a);
    write('lead_attr', a, 'sessionStorage');
    return a;
  }

  /* 2. Events */
  function track(name, params) {
    var e = { event: name, site: cfg.site };
    for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k)) { e[k] = params[k]; } }
    dl.push(e);
  }

  /* 4. Delivery, with a retry queue for failed sends */
  function post(payload) {
    return w.fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } });
  }
  function flush() {
    var q = read(QUEUE) || [];
    if (!cfg.endpoint || !q.length || !w.fetch) { return; }
    write(QUEUE, []);
    q.forEach(function (p) {
      post(p).catch(function () { var again = read(QUEUE) || []; again.push(p); write(QUEUE, again); });
    });
  }

  /* 3 + 4. Score, then send */
  function submit(form, fields) {
    var s = 0;
    if (cfg.score) { s = safe(function () { return cfg.score(fields); }) || 0; }
    s = Math.max(0, Math.min(100, Math.round(s)));
    var tier = s >= 70 ? 'hot' : s >= 40 ? 'warm' : 'cold';
    var t0 = startedAt[form];
    var payload = {
      site: cfg.site,
      form: form,
      submitted_at: new Date().toISOString(),
      lead_score: s,
      lead_tier: tier,
      seconds_to_complete: t0 ? Math.round((Date.now() - t0) / 1000) : null,
      fields: fields,
      attribution: attribution(),
      page: w.location.href
    };
    track('generate_lead', { form: form, lead_score: s, lead_tier: tier, channel: payload.attribution.channel });

    if (!cfg.endpoint || !w.fetch) {
      var log = read(DEMO_LOG) || [];
      log.push(payload);
      write(DEMO_LOG, log.slice(-20));
      return Promise.resolve({ ok: true, demo: true, payload: payload });
    }
    return post(payload).then(function () {
      return { ok: true, demo: false, payload: payload };
    }).catch(function () {
      var q = read(QUEUE) || [];
      q.push(payload);
      write(QUEUE, q.slice(-20));
      track('lead_send_failed', { form: form });
      return { ok: false, demo: false, payload: payload };
    });
  }

  /* Spam check: a hidden honeypot field that people never see, so only bots fill it.
     (A "filled in too fast" rule is not used: browser autofill would drop real leads.) */
  function isBot(form, formEl) {
    var hp = formEl && formEl.querySelector('.hp');
    return !!(hp && hp.value);
  }

  function init(options) {
    for (var k in options) { if (Object.prototype.hasOwnProperty.call(options, k)) { cfg[k] = options[k]; } }
    attribution();
    flush();
    track('page_view_lead_layer', { channel: attribution().channel });

    d.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-cta]');
      if (el) { track('cta_click', { cta: el.getAttribute('data-cta') }); }
    });
    d.addEventListener('focusin', function (e) {
      var f = e.target.closest && e.target.closest('[data-lead-form]');
      if (!f) { return; }
      var id = f.getAttribute('data-lead-form');
      if (!startedAt[id]) { startedAt[id] = Date.now(); track('form_start', { form: id }); }
    });

    var marks = [25, 50, 75, 100], hit = {}, busy = false;
    w.addEventListener('scroll', function () {
      if (busy) { return; }
      busy = true;
      w.requestAnimationFrame(function () {
        busy = false;
        var h = d.documentElement;
        var pct = ((w.pageYOffset + w.innerHeight) / (h.scrollHeight || 1)) * 100;
        marks.forEach(function (m) {
          if (pct >= m - 1 && !hit[m]) { hit[m] = true; track('scroll_depth', { percent: m }); }
        });
      });
    }, { passive: true });
  }

  w.Lead = {
    init: init,
    track: track,
    submit: submit,
    isBot: isBot,
    attribution: attribution,
    demoNote: 'This is a portfolio preview, so your details stay in your browser and are not sent anywhere.'
  };
})(window, document);
