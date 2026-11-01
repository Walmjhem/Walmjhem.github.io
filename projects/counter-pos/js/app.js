/* ---------- DEMO MODE ----------
   No Firebase, no sign-in. This tiny local database mimics the Firestore calls the app uses.
   Data lives in the visitor's own browser (localStorage), so everyone gets a private sandbox. */
const CLOUDINARY = { maxImageMB: 10 };
const SHOP = { name: "COUNTER CAFE", place: "Bacolod City, Philippines" };

const DEMO_KEY = "counter-pos-demo-db-v1";
const mem = { posProducts: {}, posSales: {}, posHeld: {}, posMeta: {} };
const watchers = [];
try { var saved = JSON.parse(localStorage.getItem(DEMO_KEY) || "null"); if (saved && saved.posProducts) Object.assign(mem, saved); } catch (e) {}
function flush() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(mem)); } catch (e) {} }
function resolveVal(old, v) {
  if (v && v.__ts) return Date.now();
  if (v && v.__inc != null) return (old || 0) + v.__inc;
  return v;
}
function applyPatch(target, patch) { for (var k in patch) target[k] = resolveVal(target[k], patch[k]); return target; }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function snapOf(ref) { var d = mem[ref._col][ref.id]; return { exists: function () { return !!d; }, data: function () { return d ? clone(d) : undefined; }, id: ref.id }; }
function notify() {
  flush();
  watchers.slice().forEach(function (w) {
    var docs = Object.keys(mem[w.q._col]).map(function (id) { return { id: id, data: function () { return clone(mem[w.q._col][id]); } }; });
    if (w.q.order) { var f = w.q.order.f, dir = w.q.order.d === "desc" ? -1 : 1; docs.sort(function (a, b) { var x = a.data()[f], y = b.data()[f]; return x < y ? -dir : x > y ? dir : 0; }); }
    if (w.q.lim) docs = docs.slice(0, w.q.lim);
    try { w.cb({ docs: docs }); } catch (e) { console.error(e); }
  });
}
const collection = function (_, name) { return { _col: name }; };
const doc = function (_, col, id) { return { _col: col, id: id }; };
const orderBy = function (f, d) { return { order: { f: f, d: d } }; };
const limit = function (n) { return { lim: n }; };
const query = function (c) { var q = { _col: c._col }; for (var i = 1; i < arguments.length; i++) Object.assign(q, arguments[i]); return q; };
const serverTimestamp = function () { return { __ts: true }; };
const increment = function (n) { return { __inc: n }; };
const addDoc = function (c, data) {
  var id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  mem[c._col][id] = applyPatch({}, clone(data)); notify(); return Promise.resolve({ id: id });
};
const updateDoc = function (ref, patch) {
  if (!mem[ref._col][ref.id]) return Promise.reject(new Error("Item no longer exists"));
  applyPatch(mem[ref._col][ref.id], patch); notify(); return Promise.resolve();
};
const deleteDoc = function (ref) { delete mem[ref._col][ref.id]; notify(); return Promise.resolve(); };
const onSnapshot = function (q, cb) {
  var w = { q: q, cb: cb }; watchers.push(w); setTimeout(notify, 0);
  return function () { var i = watchers.indexOf(w); if (i >= 0) watchers.splice(i, 1); };
};
const fdb = null;
const C = { products: { _col: "posProducts" }, sales: { _col: "posSales" }, held: { _col: "posHeld" } };
const runTransaction = function (_, fn) {
  var writes = [];
  var tx = {
    get: function (ref) { return Promise.resolve(snapOf(ref)); },
    update: function (ref, patch) { writes.push(["u", ref, patch]); },
    set: function (ref, data) { writes.push(["s", ref, data]); }
  };
  return Promise.resolve(fn(tx)).then(function (result) {
    writes.forEach(function (w) {
      if (w[0] === "s") mem[w[1]._col][w[1].id] = applyPatch({}, clone(w[2]));
      else applyPatch(mem[w[1]._col][w[1].id], w[2]);
    });
    notify(); return result;
  });
};

(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  var SND = "counter-pos-sound", CASH = "counter-pos-cashier";
  var peso = function (n) { return "₱" + (Math.round(n * 100) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var VAT = 0.12, NS = "http://www.w3.org/2000/svg";
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svgEl(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  /* sound and haptics */
  var sound = store.get(SND, false), actx = null;
  function paintSound() { $("#soundBtn").setAttribute("aria-pressed", String(sound)); $("#sw").style.opacity = sound ? 1 : 0.15; }
  function beep(f, d) {
    if (!sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.value = 0.06;
      o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d); o.stop(actx.currentTime + d);
    } catch (e) {}
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  $("#soundBtn").addEventListener("click", function () { sound = !sound; store.set(SND, sound); paintSound(); beep(660, 0.12); toast(sound ? "Sound on" : "Sound off"); });

  /* demo data */
  var SEED = [
    ["Americano", "BEV-001", "Drinks", 95, 28, 60], ["Caffe Latte", "BEV-002", "Drinks", 125, 38, 60], ["Iced Matcha", "BEV-003", "Drinks", 140, 52, 40],
    ["Mineral Water", "BEV-004", "Drinks", 35, 12, 120], ["Butter Croissant", "BKY-001", "Bakery", 85, 30, 30], ["Sourdough Loaf", "BKY-002", "Bakery", 180, 70, 14],
    ["Choco Cookie", "BKY-003", "Bakery", 65, 20, 45], ["Cinnamon Roll", "BKY-004", "Bakery", 95, 32, 8], ["Chicken Sandwich", "FOD-001", "Meals", 165, 70, 25],
    ["Tuna Melt", "FOD-002", "Meals", 155, 64, 20], ["Pasta Pesto", "FOD-003", "Meals", 210, 88, 3], ["Garden Salad", "FOD-004", "Meals", 145, 55, 18],
    ["Tote Bag", "MRC-001", "Merch", 320, 150, 12], ["Coffee Beans 250g", "MRC-002", "Merch", 480, 260, 16], ["Tumbler", "MRC-003", "Merch", 650, 310, 0]
  ];
  var CATCOL = { Drinks: ["#6d28d9", "#a78bfa"], Bakery: ["#c2410c", "#ffb020"], Meals: ["#be185d", "#ff4d8d"], Merch: ["#4338ca", "#a5b4fc"] };
  var EXTRA = [["#7e22ce", "#e879f9"], ["#b45309", "#fcd34d"], ["#9f1239", "#fb7185"]];
  function colorsFor(cat) { if (CATCOL[cat]) return CATCOL[cat]; var h = 0; for (var i = 0; i < cat.length; i++) h += cat.charCodeAt(i); return EXTRA[h % EXTRA.length]; }
  var ICONS = {
    Drinks: '<path d="M7 5h10l-1.2 14.2a1.5 1.5 0 0 1-1.5 1.3H9.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M6.5 9h11M13 5l2-3"/>',
    Bakery: '<path d="M3 14c0-4 4-8 9-8s9 4 9 8c0 2-2 3-4 3-1.5 0-2.2-1-4-1s-2.5 1-4 1c-2 0-4-1-4-3z"/><path d="M9 8l1 4M15 8l-1 4M12 7v5"/>',
    Meals: '<circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3.5"/><path d="M4 3v6M2.5 3v4a1.5 1.5 0 0 0 3 0V3M21 3c-1.5 1-2 3-2 5h2z"/>',
    Merch: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    Other: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>'
  };
  function seedProducts() { return SEED.map(function (r, i) { return { id: "p" + (i + 1), name: r[0], sku: r[1], cat: r[2], price: r[3], cost: r[4], stock: r[5], url: "" }; }); }
  function makeSale(items, sub, disc, method, tender, cashier, at, no) {
    var total = Math.max(0, sub - disc);
    return { no: no, at: +at, items: items, sub: sub, disc: disc, vat: total - total / (1 + VAT), total: total, method: method, tender: tender || total, change: Math.max(0, (tender || total) - total), cashier: cashier };
  }
  function seedSales(products) {
    var out = [], s = 7, n = 0, now = new Date();
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    var cashiers = ["Maria", "Jheremie"], methods = ["Cash", "Cash", "GCash", "Card"];
    for (var d = 6; d >= 0; d--) {
      var count = 7 + Math.floor(rnd() * 8);
      for (var k = 0; k < count; k++) {
        var at = new Date(); at.setDate(at.getDate() - d); at.setHours(8 + Math.floor(rnd() * 11), Math.floor(rnd() * 60), 0, 0);
        if (at > now) continue;
        var items = [], used = {}, ni = 1 + Math.floor(rnd() * 3);
        for (var j = 0; j < ni; j++) {
          var p = products[Math.floor(rnd() * products.length)]; if (used[p.id]) continue; used[p.id] = 1;
          items.push({ id: p.id, name: p.name, price: p.price, cost: p.cost, qty: 1 + Math.floor(rnd() * 2) });
        }
        var sub = items.reduce(function (a, i) { return a + i.price * i.qty; }, 0);
        n++; out.push(makeSale(items, sub, 0, methods[Math.floor(rnd() * methods.length)], 0, cashiers[Math.floor(rnd() * 2)], at, "D" + (1000 + n)));
      }
    }
    return out.sort(function (a, b) { return a.at - b.at; });
  }

  /* state */
  var db = { products: [], sales: [], held: [], cashier: store.get(CASH, "Cashier") };
  var user = { uid: "demo", email: "demo@portfolio" }, role = "owner", loaded = { products: false, sales: false }, unsubs = [];
  var cart = [], disc = { type: "pct", val: 0 }, cat = "All", rangeSel = "today", view = "sell", payMethod = "Cash", tender = "";
  function persist() { store.set(CASH, db.cashier); }
  function isOwner() { return role === "owner"; }
  function product(id) { return db.products.find(function (p) { return p.id === id; }); }
  function inCart(id) { var l = cart.find(function (c) { return c.id === id; }); return l ? l.qty : 0; }
  var toastT;
  function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 2100); }
  var numF = new WeakMap();
  function countTo(node, from, to, fmt) {
    cancelAnimationFrame(numF.get(node));
    if (reduce || from === to) { node.textContent = fmt(to); return; }
    var t0 = performance.now(), dur = 450;
    (function step(now) { var p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3); node.textContent = fmt(p === 1 ? to : from + (to - from) * e); if (p < 1) numF.set(node, requestAnimationFrame(step)); })(t0);
  }
  document.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".go,.ghost,.pad button"); if (!b || b.disabled || reduce) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), d = el("span", "rip");
    d.style.cssText = "width:" + s + "px;height:" + s + "px;left:" + (e.clientX - r.left - s / 2) + "px;top:" + (e.clientY - r.top - s / 2) + "px";
    b.appendChild(d); setTimeout(function () { d.remove(); }, 600);
  });
  if (fine && !reduce) document.addEventListener("pointermove", function (e) { document.body.style.setProperty("--mx", e.clientX + "px"); document.body.style.setProperty("--my", e.clientY + "px"); });

  /* product pictures: Cloudinary (or any image link), generated art as the fallback */
  function artNode(p) {
    var c = colorsFor(p.cat), d = el("div", "art");
    d.style.background = "radial-gradient(120% 90% at 20% 10%," + c[1] + "55,transparent 60%),linear-gradient(145deg," + c[0] + ",#0b0b14)";
    d.innerHTML = '<svg viewBox="0 0 24 24">' + (ICONS[p.cat] || ICONS.Other) + "</svg>";
    return d;
  }
  // Cloudinary can resize and re-encode on the fly: insert a transformation after /upload/
  function mediaThumb(p, w) {
    var u = p.url; if (!u) return "";
    if (u.indexOf("res.cloudinary.com") < 0 || u.indexOf("/upload/") < 0) return u;
    if (p.mediaType === "video") return u.replace("/upload/", "/upload/so_0,q_auto,w_" + w + ",c_limit/").replace(/\.[a-z0-9]+(\?.*)?$/i, ".jpg");
    return u.replace("/upload/", "/upload/f_auto,q_auto,w_" + w + ",c_limit/");
  }
  // priority: product photo (or video frame) from Cloudinary, images/<SKU>.jpg or .png, then generated art
  function photo(p, box) {
    box.appendChild(artNode(p));
    var chain = [], t = mediaThumb(p, box.classList.contains("ph") ? 480 : 160);
    if (t) chain.push(t);
    chain.push("images/" + p.sku + ".jpg", "images/" + p.sku + ".png");
    (function next(i) {
      if (i >= chain.length) return;
      var im = new Image(); im.alt = p.name; im.decoding = "async";
      im.onload = function () { var a = box.querySelector(".art"); if (a) a.remove(); box.insertBefore(im, box.firstChild); };
      im.onerror = function () { next(i + 1); };
      im.src = chain[i];
    })(0);
  }

  /* navigation */
  $$(".rn[data-view]").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.view); }); });
  function show(v) {
    view = v;
    $$(".rn[data-view]").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.view === v)); });
    $$(".view").forEach(function (s) { s.classList.toggle("on", s.id === v); });
    if (v === "sales") renderSales(); if (v === "stock") renderStock(); if (v === "report") renderReport(); if (v === "sell") renderGrid();
  }
  function paintCashier() { $("#cashier").textContent = db.cashier; }
  $("#cashier").addEventListener("click", function () { $("#cashName").value = db.cashier; $("#cashDlg").showModal(); $("#cashName").select(); });
  $("#cashForm").addEventListener("submit", function () { var v = $("#cashName").value.trim(); if (v) { db.cashier = v; persist(); paintCashier(); } });
  var shownToday = 0;
  function paintToday() {
    var s = new Date(); s.setHours(0, 0, 0, 0);
    var t = db.sales.filter(function (x) { return x.at >= +s; }).reduce(function (a, x) { return a + x.total; }, 0);
    countTo($("#todayTot"), shownToday, t, peso); shownToday = t;
  }

  /* catalogue */
  var search = $("#search"), dragId = null;
  function cats() { var s = ["All"]; db.products.forEach(function (p) { if (s.indexOf(p.cat) < 0) s.push(p.cat); }); return s; }
  function renderCats() {
    var w = $("#cats"); w.innerHTML = "";
    cats().forEach(function (c) { var b = el("button", "cat", c); b.type = "button"; b.setAttribute("aria-pressed", String(c === cat)); b.addEventListener("click", function () { cat = c; renderCats(); renderGrid(); }); w.appendChild(b); });
  }
  function renderGrid() {
    var q = search.value.trim().toLowerCase(), g = $("#grid"); g.innerHTML = "";
    var list = db.products.filter(function (p) { return (cat === "All" || p.cat === cat) && (!q || (p.name + " " + p.sku + " " + p.cat).toLowerCase().indexOf(q) >= 0); });
    if (!list.length) {
      var msg = !loaded.products ? "Loading items…" : !db.products.length ? (isOwner() ? "No products yet. Add one in Stock, or load demo data in Reports." : "No products yet. Ask the owner to add some.") : "No items match your search.";
      g.appendChild(el("p", "empty", msg)); return;
    }
    list.forEach(function (p, i) {
      var left = p.stock - inCart(p.id), n = inCart(p.id);
      var c = el("button", "card"); c.type = "button"; c.dataset.id = p.id; c.disabled = left <= 0 && n === 0; c.draggable = left > 0; c.style.setProperty("--i", Math.min(i, 14));
      var ph = el("div", "ph"); photo(p, ph);
      ph.append(el("span", "price", peso(p.price)), el("span", "stk" + (left <= 0 ? " out" : left <= 5 ? " low" : ""), left <= 0 ? "Sold out" : left + " left"));
      var inc = el("span", "inc" + (n ? " show" : ""), String(n)); inc.dataset.inc = p.id; ph.appendChild(inc);
      var m = el("div", "meta"); m.append(el("b", null, p.name), el("span", null, p.cat + " · " + p.sku));
      c.append(ph, m); c.setAttribute("aria-label", p.name + ", " + peso(p.price) + (left <= 0 ? ", sold out" : ", " + left + " left"));
      c.addEventListener("click", function () { addToCart(p.id, 1, ph); });
      c.addEventListener("dragstart", function (e) { dragId = p.id; c.classList.add("drag"); try { e.dataTransfer.setData("text/plain", p.id); e.dataTransfer.effectAllowed = "copy"; } catch (x) {} });
      c.addEventListener("dragend", function () { dragId = null; c.classList.remove("drag"); $("#cart").classList.remove("over"); });
      if (fine && !reduce) {
        c.addEventListener("pointermove", function (e) {
          var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
          c.style.setProperty("--cx", x + "px"); c.style.setProperty("--cy", y + "px");
          c.style.setProperty("--ry", ((x / r.width - 0.5) * 7).toFixed(2) + "deg"); c.style.setProperty("--rx", ((0.5 - y / r.height) * 7).toFixed(2) + "deg");
        });
        c.addEventListener("pointerleave", function () { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
      }
      g.appendChild(c);
    });
  }
  function refreshBadges() {
    $$("[data-inc]").forEach(function (b) { var p = product(b.dataset.inc); if (!p) return; var n = inCart(p.id); b.textContent = n; b.classList.toggle("show", n > 0); });
    $$(".card").forEach(function (c) {
      var p = product(c.dataset.id), left = p.stock - inCart(p.id), st = c.querySelector(".stk");
      st.textContent = left <= 0 ? "Sold out" : left + " left"; st.className = "stk" + (left <= 0 ? " out" : left <= 5 ? " low" : "");
      c.disabled = left <= 0 && inCart(p.id) === 0;
    });
  }
  search.addEventListener("input", renderGrid);
  search.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var q = search.value.trim().toLowerCase(); if (!q) return;
    var exact = db.products.find(function (p) { return p.sku.toLowerCase() === q; });
    var hits = exact ? [exact] : db.products.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0; });
    if (hits.length === 1) { addToCart(hits[0].id, 1, null); search.value = ""; renderGrid(); }
    else toast(hits.length ? "Several matches, tap the one you want" : "No item or SKU found");
  });

  /* cart */
  function fly(fromEl) {
    if (reduce || !fromEl) return;
    var a = fromEl.getBoundingClientRect(), b = $("#lines").getBoundingClientRect(); if (!a.width || !b.width) return;
    var f = el("div", "fly"), s = Math.min(a.width, 90); f.style.width = f.style.height = s + "px"; f.style.left = (a.left + a.width / 2 - s / 2) + "px"; f.style.top = (a.top + a.height / 2 - s / 2) + "px";
    var im = fromEl.querySelector("img"); if (im) f.style.backgroundImage = 'url("' + im.src + '")';
    document.body.appendChild(f);
    var dx = b.left + 40 - (a.left + a.width / 2), dy = b.top + 40 - (a.top + a.height / 2);
    var an = f.animate([{ transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 }, { transform: "translate(" + dx * 0.5 + "px," + (dy * 0.5 - 60) + "px) scale(.7) rotate(8deg)", opacity: 1, offset: 0.5 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.2) rotate(-6deg)", opacity: 0.2 }], { duration: 620, easing: "cubic-bezier(.5,0,.3,1)" });
    an.onfinish = function () { f.remove(); };
  }
  function addToCart(id, n, from) {
    var p = product(id); if (!p) return; n = n || 1;
    if (inCart(id) + n > p.stock) { toast("Only " + p.stock + " in stock"); beep(220, 0.12); return; }
    var l = cart.find(function (c) { return c.id === id; });
    if (l) l.qty += n; else cart.push({ id: id, qty: n });
    fly(from); beep(740, 0.08); buzz(15); renderCart(id);
  }
  function totals() {
    var sub = cart.reduce(function (a, l) { return a + product(l.id).price * l.qty; }, 0);
    var d = disc.type === "pct" ? sub * Math.min(disc.val, 100) / 100 : Math.min(disc.val, sub); d = Math.round(d * 100) / 100;
    var total = Math.max(0, sub - d); return { sub: sub, disc: d, total: total, vat: total - total / (1 + VAT) };
  }
  var shownTotal = 0, lineKeys = {};
  function renderCart(bumpId) {
    var w = $("#lines"); w.innerHTML = "";
    if (!cart.length) {
      var e = el("div", "empty"); e.innerHTML = '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>'; e.append("Tap or drag an item into the order."); w.appendChild(e);
    }
    cart.forEach(function (l) {
      var p = product(l.id), row = el("div", "ln"); if (lineKeys[l.id]) row.style.animation = "none"; lineKeys[l.id] = 1;
      var th = el("div", "th"); photo(p, th);
      var mid = el("div"); mid.append(el("b", null, p.name), el("small", null, peso(p.price) + " each"));
      var rt = el("div", "rt"); rt.appendChild(el("strong", null, peso(p.price * l.qty)));
      var q = el("div", "qty"), m = el("button", null, "−"), pl = el("button", null, "+"); m.type = pl.type = "button";
      m.setAttribute("aria-label", "Remove one " + p.name); pl.setAttribute("aria-label", "Add one " + p.name);
      m.addEventListener("click", function () {
        if (l.qty > 1) { l.qty--; renderCart(); return; }
        row.classList.add("leaving"); setTimeout(function () { cart = cart.filter(function (c) { return c !== l; }); delete lineKeys[l.id]; renderCart(); }, reduce ? 0 : 230);
      });
      pl.addEventListener("click", function () { addToCart(l.id, 1, null); });
      q.append(m, el("span", null, String(l.qty)), pl); rt.appendChild(q); row.append(th, mid, rt); w.appendChild(row);
    });
    var t = totals();
    $("#sSub").textContent = peso(t.sub); $("#sDisc").textContent = t.disc ? "−" + peso(t.disc) : peso(0); $("#sVat").textContent = peso(t.vat);
    countTo($("#sTot"), shownTotal, t.total, peso); shownTotal = t.total;
    $("#pay").disabled = $("#hold").disabled = $("#clear").disabled = !cart.length;
    $("#pay").textContent = cart.length ? "Charge " + peso(t.total) : "Charge";
    var n = cart.reduce(function (a, l) { return a + l.qty; }, 0);
    $("#cbN").textContent = n + (n === 1 ? " item" : " items"); $("#cbT").textContent = peso(t.total);
    var h = db.held.length, hi = $("#heldInfo"); hi.innerHTML = "";
    if (h) { var b = el("button", "ghost", h + " held order" + (h > 1 ? "s" : "") + " – resume"); b.type = "button"; b.addEventListener("click", openHeld); hi.appendChild(b); }
    refreshBadges();
    if (bumpId) { var bd = $('[data-inc="' + bumpId + '"]'); if (bd) { bd.classList.remove("bump"); void bd.offsetWidth; bd.classList.add("bump"); } }
  }
  $("#discType").addEventListener("change", function (e) { disc.type = e.target.value; renderCart(); });
  $("#discVal").addEventListener("input", function (e) { disc.val = Math.max(0, parseFloat(e.target.value) || 0); renderCart(); });
  function resetOrder() { cart = []; lineKeys = {}; disc = { type: "pct", val: 0 }; $("#discVal").value = ""; $("#discType").value = "pct"; renderCart(); }
  $("#clear").addEventListener("click", function () { resetOrder(); toast("Order cleared"); });
  $("#hold").addEventListener("click", function () {
    addDoc(C.held, { at: Date.now(), cart: cartLines(), disc: { type: disc.type, val: disc.val }, uid: user && user.uid }).catch(fail);
    resetOrder(); toast("Order held");
  });
  function cartLines() { return cart.map(function (l) { return { id: l.id, qty: l.qty }; }); }
  $("#cartBar").addEventListener("click", function () { $("#cart").scrollIntoView({ behavior: "smooth", block: "start" }); });
  var cartBox = $("#cart");
  cartBox.addEventListener("dragover", function (e) { if (dragId) { e.preventDefault(); cartBox.classList.add("over"); } });
  cartBox.addEventListener("dragleave", function (e) { if (!cartBox.contains(e.relatedTarget)) cartBox.classList.remove("over"); });
  cartBox.addEventListener("drop", function (e) { e.preventDefault(); cartBox.classList.remove("over"); var id = dragId || e.dataTransfer.getData("text/plain"); dragId = null; if (id) addToCart(id, 1, null); });

  function openHeld() {
    var w = $("#heldList"); w.innerHTML = "";
    if (!db.held.length) w.appendChild(el("p", "hint", "No held orders."));
    db.held.forEach(function (h, i) {
      var n = h.cart.reduce(function (a, l) { return a + l.qty; }, 0), row = el("div", "row"); row.style.marginBottom = "6px";
      var info = el("span", null, "Order " + (i + 1) + " · " + n + " item" + (n > 1 ? "s" : "") + " · " + new Date(h.at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })); info.style.flex = "1";
      var res = el("button", "go", "Resume"); res.type = "button"; res.style.padding = "7px 14px";
      var del = el("button", "ghost danger", "Delete"); del.type = "button";
      res.addEventListener("click", function () {
        if (cart.length) addDoc(C.held, { at: Date.now(), cart: cartLines(), disc: { type: disc.type, val: disc.val }, uid: user && user.uid }).catch(fail);
        deleteDoc(doc(fdb, "posHeld", h._id)).catch(fail);
        cart = h.cart.filter(function (l) { return product(l.id); }).map(function (l) { return { id: l.id, qty: l.qty }; });
        disc = { type: h.disc.type, val: h.disc.val };
        $("#discVal").value = disc.val || ""; $("#discType").value = disc.type; renderCart(); $("#heldDlg").close();
      });
      del.addEventListener("click", function () { deleteDoc(doc(fdb, "posHeld", h._id)).catch(fail); });
      row.append(info, res, del); w.appendChild(row);
    });
    if (!$("#heldDlg").open) $("#heldDlg").showModal();
  }
  $("#heldClose").addEventListener("click", function () { $("#heldDlg").close(); });

  /* payment with keypad */
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].forEach(function (k) { var b = el("button", null, k); b.type = "button"; b.addEventListener("click", function () { key(k); }); $("#pad").appendChild(b); });
  function key(k) {
    if (payMethod !== "Cash") return;
    if (k === "⌫") tender = tender.slice(0, -1);
    else if (k === ".") { if (tender.indexOf(".") < 0) tender = (tender || "0") + "."; }
    else if (/^\d$/.test(k)) { if (/\.\d\d$/.test(tender) || tender.length > 9) return; tender = tender === "0" ? k : tender + k; }
    beep(520, 0.04); calc();
  }
  function calc() {
    var t = totals(), tn = parseFloat(tender) || 0, ok = payMethod !== "Cash" || tn >= t.total - 0.001;
    $("#tenderDisp").textContent = tender ? Number(tender.replace(/\.$/, "")).toLocaleString("en-PH", { maximumFractionDigits: 2 }) + (/\.$/.test(tender) ? "." : "") : "0";
    var c = $("#chg"); if (payMethod === "Cash") { c.textContent = tn ? (ok ? peso(tn - t.total) : "Short " + peso(t.total - tn)) : peso(0); c.className = tn ? (ok ? "good" : "bad") : ""; }
    $("#payOk").disabled = !ok;
  }
  function setMethod(m) {
    payMethod = m; var idx = ["Cash", "GCash", "Card"].indexOf(m);
    $$("#methods button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.m === m)); });
    $("#mThumb").style.transform = "translateX(" + idx * 100 + "%)";
    $("#cashBox").style.display = m === "Cash" ? "grid" : "none"; $("#nonCash").hidden = m === "Cash"; calc();
  }
  $$("#methods button").forEach(function (b) { b.addEventListener("click", function () { setMethod(b.dataset.m); }); });
  function openPay() {
    if (!cart.length) return; var t = totals(); tender = "";
    $("#payTotal").textContent = peso(t.total);
    var q = $("#quick"); q.innerHTML = ""; var opts = [{ l: "Exact", v: Math.ceil(t.total) }];
    [100, 200, 500, 1000].forEach(function (d) { var v = Math.ceil(t.total / d) * d; if (v >= t.total && !opts.some(function (o) { return o.v === v; })) opts.push({ l: peso(v).replace(".00", ""), v: v }); });
    opts.slice(0, 5).forEach(function (o) { var b = el("button", "ghost", o.l); b.type = "button"; b.addEventListener("click", function () { tender = String(o.v); calc(); }); q.appendChild(b); });
    setMethod("Cash"); $("#payDlg").showModal();
  }
  $("#pay").addEventListener("click", openPay);
  $("#payCancel").addEventListener("click", function () { $("#payDlg").close(); });
  $("#payDlg").addEventListener("keydown", function (e) {
    if (/^[0-9.]$/.test(e.key)) { e.preventDefault(); key(e.key); } else if (e.key === "Backspace") { e.preventDefault(); key("⌫"); }
  });
  var charging = false;
  $("#payForm").addEventListener("submit", function (e) {
    e.preventDefault(); if ($("#payOk").disabled || !cart.length || charging) return;
    var t = totals(), tn = payMethod === "Cash" ? parseFloat(tender) : t.total;
    var items = cart.map(function (l) { var p = product(l.id); return { id: p.id, name: p.name, price: p.price, cost: p.cost, qty: l.qty }; });
    for (var i = 0; i < items.length; i++) if (product(items[i].id).stock < items[i].qty) { toast("Stock changed for " + items[i].name); return; }
    charging = true; $("#payOk").disabled = true; $("#payOk").textContent = "Saving…";
    commitSale(items, t, tn, payMethod).then(function (sale) {
      $("#payDlg").close(); showReceipt(sale, true); resetOrder();
    }).catch(function (err) {
      var m = String((err && err.message) || err);
      if (m.indexOf("stock:") === 0) toast("Not enough stock for " + m.slice(6));
      else if (m.indexOf("gone:") === 0) toast(m.slice(6) + " was removed from the catalogue");
      else toast(navigator.onLine ? "Could not save the sale. Try again." : "You are offline. Reconnect to complete the sale.");
      console.error(err);
    }).then(function () { charging = false; $("#payOk").textContent = "Complete sale"; calc(); });
  });

  /* receipt and confetti */
  function showReceipt(s, fresh) {
    var r = $("#receipt"); r.innerHTML = "";
    var add = function (a, b, bold) { var d = el("div", "rw"), x = el("span", null, a), y = el("span", null, b); if (bold) x.style.fontWeight = y.style.fontWeight = "700"; d.append(x, y); r.appendChild(d); };
    r.appendChild(el("div", "c", SHOP.name)); r.appendChild(el("div", "c", SHOP.place)); r.appendChild(el("hr"));
    add("Receipt " + s.no, new Date(s.at).toLocaleDateString("en-PH")); add("Cashier: " + s.cashier, new Date(s.at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })); r.appendChild(el("hr"));
    s.items.forEach(function (i) { add(i.qty + " x " + i.name, peso(i.price * i.qty)); });
    r.appendChild(el("hr")); add("Subtotal", peso(s.sub)); if (s.disc) add("Discount", "-" + peso(s.disc));
    add("TOTAL", peso(s.total), true); add("VAT incl. (12%)", peso(s.vat)); add(s.method, peso(s.tender)); if (s.method === "Cash") add("Change", peso(s.change));
    r.appendChild(el("hr")); r.appendChild(el("div", "c", "Thank you! Come again.")); r.appendChild(el("div", "c", "Sample receipt, not an official receipt"));
    $("#rcpSub").textContent = s.no + " · " + peso(s.total);
    if (!$("#rcpDlg").open) $("#rcpDlg").showModal();
    if (fresh) { confetti(); beep(880, 0.15); setTimeout(function () { beep(1180, 0.2); }, 120); buzz(40); }
  }
  $("#rcpClose").addEventListener("click", function () { $("#rcpDlg").close(); renderGrid(); search.focus(); });
  $("#rcpPrint").addEventListener("click", function () { window.print(); });
  function confetti() {
    if (reduce) return;
    var c = $("#conf"), x = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight;
    var cols = ["#8b5cf6", "#ff4d8d", "#ffb020", "#f5f5fb", "#c4b5fd"];
    var ps = Array.from({ length: 140 }, function () { return { x: c.width / 2 + (Math.random() - 0.5) * 220, y: c.height * 0.45, vx: (Math.random() - 0.5) * 20, vy: -Math.random() * 18 - 5, s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }; });
    var t0 = performance.now();
    (function f(now) {
      var e = now - t0; x.clearRect(0, 0, c.width, c.height);
      ps.forEach(function (p) { p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - e / 2600); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (e < 2600) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height);
    })(t0);
  }

  /* sales */
  function renderSales() {
    var q = $("#salesSearch").value.trim().toLowerCase(), b = $("#salesBody"); b.innerHTML = "";
    db.sales.slice().reverse().filter(function (s) { return !q || (s.no + " " + s.cashier + " " + s.method).toLowerCase().indexOf(q) >= 0; }).slice(0, 200).forEach(function (s) {
      var tr = el("tr", "click"); tr.tabIndex = 0; var n = s.items.reduce(function (a, i) { return a + i.qty; }, 0);
      [s.no, new Date(s.at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), s.cashier, s.method, n, peso(s.total)].forEach(function (v, i) { tr.appendChild(el("td", i > 3 ? "r" : "", String(v))); });
      var open = function () { showReceipt(s, false); }; tr.addEventListener("click", open); tr.addEventListener("keydown", function (e) { if (e.key === "Enter") open(); }); b.appendChild(tr);
    });
    if (!b.children.length) { var tr = el("tr"), td = el("td", null, "No sales found."); td.colSpan = 6; tr.appendChild(td); b.appendChild(tr); }
  }
  $("#salesSearch").addEventListener("input", renderSales);
  function exportCsv() {
    var rows = [["Receipt", "Date", "Cashier", "Method", "Items", "Subtotal", "Discount", "VAT", "Total"]];
    db.sales.forEach(function (s) { rows.push([s.no, new Date(s.at).toISOString(), s.cashier, s.method, s.items.map(function (i) { return i.qty + "x " + i.name; }).join("; "), s.sub.toFixed(2), s.disc.toFixed(2), s.vat.toFixed(2), s.total.toFixed(2)]); });
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "sales-" + new Date().toISOString().slice(0, 10) + ".csv"; document.body.appendChild(a); a.click(); a.remove(); toast("Sales exported");
  }
  $("#exportCsv").addEventListener("click", exportCsv);

  /* inventory (demo: stored in the browser) */
  function shrinkImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1048576) { resolve(file); return; }
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) { resolve(blob && blob.size < file.size ? blob : file); }, "image/jpeg", 0.85);
      };
      im.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      im.src = url;
    });
  }
  // Demo: photos are kept in the visitor's browser as a small data URL. Nothing is uploaded anywhere.
  function uploadMedia(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) { reject(new Error("Demo supports photos only")); return; }
      if (file.size > CLOUDINARY.maxImageMB * 1048576) { reject(new Error("That file is over " + CLOUDINARY.maxImageMB + " MB")); return; }
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 400 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve({ url: c.toDataURL("image/jpeg", 0.8), publicId: "", type: "image" });
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Could not read that image")); };
      im.src = url;
    });
  }
  function renderStock() {
    var q = $("#stockSearch").value.trim().toLowerCase(), b = $("#stockBody"); b.innerHTML = "";
    db.products.filter(function (p) { return !q || (p.name + p.sku + p.cat).toLowerCase().indexOf(q) >= 0; }).forEach(function (p) {
      var tr = el("tr"), nm = el("td"), tn = el("span", "tn"); photo(p, tn); nm.append(tn, el("b", null, p.name)); tr.appendChild(nm);
      tr.append(el("td", null, p.sku), el("td", "r", peso(p.price)), el("td", "r", String(p.stock)));
      var st = el("td"); st.appendChild(el("span", "badge " + (p.stock <= 0 ? "out" : p.stock <= 5 ? "low" : "ok"), p.stock <= 0 ? "Out" : p.stock <= 5 ? "Low" : "OK")); tr.appendChild(st);
      var ph = el("td", "own"), lb = el("label", "photo-btn"), fi = el("input"); fi.type = "file"; fi.accept = "image/*"; lb.append(p.url ? "Change" : "Upload", fi);
      fi.addEventListener("change", function () {
        var f = fi.files[0]; if (!f) return;
        shrinkImage(f).then(uploadMedia).then(function (m) {
          return updateDoc(doc(fdb, "posProducts", p.id), { url: m.url, publicId: m.publicId, mediaType: m.type, updatedAt: serverTimestamp() });
        }).then(function () { toast("Photo saved for " + p.name); }, fail);
      }); ph.appendChild(lb);
      if (p.url) {
        var rm = el("button", "ghost", "Remove"); rm.type = "button"; rm.style.cssText = "padding:4px 10px;font-size:.78rem;margin-left:6px";
        rm.addEventListener("click", function () { updateDoc(doc(fdb, "posProducts", p.id), { url: "", publicId: "", mediaType: "", updatedAt: serverTimestamp() }).catch(fail); });
        ph.appendChild(rm);
      }
      tr.appendChild(ph);
      var rs = el("td", "r own"), inp = el("input", "mini"); inp.type = "number"; inp.min = "1"; inp.placeholder = "Qty"; inp.setAttribute("aria-label", "Restock quantity for " + p.name);
      var add = el("button", "ghost", "Add"); add.type = "button"; add.style.cssText = "padding:4px 12px;margin-left:6px";
      add.addEventListener("click", function () {
        var n = parseInt(inp.value, 10); if (!(n > 0)) { toast("Enter a quantity"); return; }
        updateDoc(doc(fdb, "posProducts", p.id), { stock: increment(n), updatedAt: serverTimestamp() }).then(function () { toast(p.name + " restocked +" + n); }, fail);
      });
      rs.append(inp, add); tr.appendChild(rs); b.appendChild(tr);
    });
    if (!b.children.length) { var tr0 = el("tr"), td0 = el("td", null, loaded.products ? "No products found." : "Loading…"); td0.colSpan = 7; tr0.appendChild(td0); b.appendChild(tr0); }
  }
  $("#stockSearch").addEventListener("input", renderStock);
  $("#addProd").addEventListener("click", function () {
    var dl = $("#catList"); dl.innerHTML = ""; cats().slice(1).forEach(function (c) { var o = document.createElement("option"); o.value = c; dl.appendChild(o); });
    $("#prodForm").reset(); $("#pStock").value = 10; $("#prodDlg").showModal(); $("#pName").focus();
  });
  $("#prodCancel").addEventListener("click", function () { $("#prodDlg").close(); });
  $("#prodForm").addEventListener("submit", function () {
    if (!isOwner()) { toast("Only the owner can add products"); return; }
    var sku = $("#pSku").value.trim().toUpperCase();
    if (db.products.some(function (p) { return p.sku.toUpperCase() === sku; })) { toast("That SKU already exists"); return; }
    var data = { name: $("#pName").value.trim(), sku: sku, cat: $("#pCat").value.trim(), price: parseFloat($("#pPrice").value), cost: parseFloat($("#pCost").value), stock: parseInt($("#pStock").value, 10) || 0, url: $("#pUrl").value.trim(), publicId: "", mediaType: "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    var f = $("#pFile").files[0];
    var save = function (m) { if (m) { data.url = m.url; data.publicId = m.publicId; data.mediaType = m.type; } return addDoc(C.products, data); };
    (f ? shrinkImage(f).then(uploadMedia).then(save) : save(null)).then(function () { toast("Product added"); }, fail);
  });

  /* reports */
  $$("#range button").forEach(function (b) { b.addEventListener("click", function () { rangeSel = b.dataset.r; $$("#range button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); renderReport(); }); });
  function inRange() {
    var s = new Date(); s.setHours(0, 0, 0, 0); if (rangeSel === "7") s.setDate(s.getDate() - 6); else if (rangeSel === "all") s = new Date(0);
    return db.sales.filter(function (x) { return x.at >= +s; });
  }
  var PCOL = ["#8b5cf6", "#ff4d8d", "#ffb020", "#a5b4fc"];
  function renderReport() {
    var list = inRange(), rev = 0, cost = 0, items = 0, vat = 0, byPay = {}, byProd = {}, byDay = {};
    list.forEach(function (s) {
      rev += s.total; vat += s.vat; byPay[s.method] = (byPay[s.method] || 0) + s.total;
      var d = new Date(s.at), dk = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); byDay[dk] = (byDay[dk] || 0) + s.total;
      var sub = s.items.reduce(function (a, i) { return a + i.price * i.qty; }, 0) || 1;
      s.items.forEach(function (i) { cost += i.cost * i.qty; items += i.qty; var o = byProd[i.name] || (byProd[i.name] = { qty: 0, rev: 0 }); o.qty += i.qty; o.rev += (i.price * i.qty / sub) * s.total; });
    });
    var k = $("#kpis"); k.innerHTML = "";
    var whole = function (v) { return String(Math.round(v)); };
    [["Revenue", rev, peso], ["Orders", list.length, whole], ["Items sold", items, whole], ["Average order", list.length ? rev / list.length : 0, peso], ["Gross profit", rev - vat - cost, peso]].forEach(function (d) {
      var c = el("div", "kpi"), b = el("b", null, d[2](0)); c.append(el("span", null, d[0]), b); k.appendChild(c); countTo(b, 0, d[1], d[2]);
    });
    var days = Object.keys(byDay).sort(), svg = $("#dayChart"); svg.innerHTML = ""; $("#dayTip").textContent = days.length ? "Hover a bar for details." : "";
    if (!days.length) { var t = svgEl("text", { x: 20, y: 40, fill: "#9c9cb5", "font-size": 13 }); t.textContent = "No sales in this range."; svg.appendChild(t); }
    else {
      var max = Math.max.apply(null, days.map(function (d) { return byDay[d]; })), slot = 460 / days.length, bw = Math.min(48, slot - 10);
      days.forEach(function (d, i) {
        var h = 130 * byDay[d] / max, x = 30 + i * slot + (slot - bw) / 2;
        var r = svgEl("rect", { class: "b", x: x, y: 150 - h, width: bw, height: h, rx: 6 });
        if (!reduce) { r.style.transformOrigin = (x + bw / 2) + "px 150px"; r.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 600, delay: i * 50, easing: "cubic-bezier(.2,1,.3,1)", fill: "backwards" }); }
        var lab = new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
        var show = function () { $("#dayTip").textContent = lab + ": " + peso(byDay[d]); };
        r.addEventListener("pointerenter", show); r.addEventListener("focus", show); r.setAttribute("tabindex", "0"); r.setAttribute("aria-label", lab + " " + peso(byDay[d])); svg.appendChild(r);
        var tx = svgEl("text", { x: x + bw / 2, y: 172, "text-anchor": "middle", fill: "#9c9cb5", "font-size": 11 }); tx.textContent = new Date(d + "T12:00:00").toLocaleDateString("en", { weekday: "short" }); svg.appendChild(tx);
      });
    }
    var dn = $("#donut"), mix = $("#mix"); dn.innerHTML = ""; mix.innerHTML = "";
    var pk = Object.keys(byPay).sort(function (a, b) { return byPay[b] - byPay[a]; }), C = 2 * Math.PI * 42, off = 0;
    pk.forEach(function (m, i) {
      var frac = byPay[m] / (rev || 1), c = svgEl("circle", { cx: 60, cy: 60, r: 42, stroke: PCOL[i % 4], "stroke-dasharray": Math.max(frac * C - 2, 0) + " " + C, "stroke-dashoffset": -off });
      var tt = svgEl("title", {}); tt.textContent = m + ": " + peso(byPay[m]); c.appendChild(tt); dn.appendChild(c); off += frac * C;
      var lg = el("div", "lg"), sw = el("i"); sw.style.background = PCOL[i % 4]; lg.append(sw, el("span", null, m + " " + Math.round(frac * 100) + "% · " + peso(byPay[m]))); mix.appendChild(lg);
    });
    if (!pk.length) mix.appendChild(el("span", "hint", "No sales in this range."));
    var top = $("#top"); top.innerHTML = "";
    var names = Object.keys(byProd).sort(function (a, b) { return byProd[b].rev - byProd[a].rev; }).slice(0, 6), tm = names.length ? byProd[names[0]].rev : 1;
    names.forEach(function (n) { var r = el("div", "bar"), t = el("div", "t"), i = el("i"); i.style.width = (byProd[n].rev / tm * 100) + "%"; t.appendChild(i); r.append(el("span", null, n), t, el("span", null, byProd[n].qty + " sold")); top.appendChild(r); });
    if (!names.length) top.appendChild(el("span", "hint", "No sales in this range."));
  }
  $("#resetDemo").addEventListener("click", function () {
    if (!confirm("Reset the demo? This restores the sample products and sales in your browser.")) return;
    ["posProducts", "posSales", "posHeld", "posMeta"].forEach(function (k) { mem[k] = {}; });
    seedDemo(); notify(); toast("Demo reset");
  });

  /* command palette */
  var pal = { items: [], shown: [], i: 0 };
  function palItems() {
    var a = [
      ["Actions", "Charge current order", "F4", openPay], ["Actions", "Hold order", "", function () { $("#hold").click(); }], ["Actions", "Clear order", "", function () { $("#clear").click(); }],
      ["Actions", "Resume held order", db.held.length + " held", openHeld], ["Actions", "Export sales CSV", "", exportCsv], ["Actions", "Toggle sound", "", function () { $("#soundBtn").click(); }],
      ["Actions", "Change cashier", "", function () { $("#cashier").click(); }], 
      ["Go to", "Sell", "", function () { show("sell"); }], ["Go to", "Sales history", "", function () { show("sales"); }], ["Go to", "Inventory", "", function () { show("stock"); }], ["Go to", "Reports", "", function () { show("report"); }]
    ].map(function (r) { return { g: r[0], t: r[1], h: r[2], run: r[3] }; });
    db.products.forEach(function (p) { a.push({ g: "Add to order", t: p.name, h: peso(p.price), run: function () { show("sell"); addToCart(p.id, 1, null); } }); });
    return a;
  }
  function palRender() {
    var q = $("#palIn").value.trim().toLowerCase(), ul = $("#palList"); ul.innerHTML = "";
    pal.shown = pal.items.filter(function (x) { return !q || (x.t + " " + x.g).toLowerCase().indexOf(q) >= 0; }); if (pal.i >= pal.shown.length) pal.i = 0;
    if (!pal.shown.length) { ul.appendChild(el("li", "g", "No matches")); return; }
    var last = "";
    pal.shown.forEach(function (x, i) {
      if (x.g !== last) { ul.appendChild(el("li", "g", x.g)); last = x.g; }
      var li = el("li", i === pal.i ? "act" : ""); li.setAttribute("role", "option"); li.dataset.i = i; li.append(el("span", null, x.t), el("small", null, x.h || "")); ul.appendChild(li);
    });
    var a = $("li.act", ul); if (a) a.scrollIntoView({ block: "nearest" });
  }
  function palOpen() { if (!user) return; pal.items = palItems(); pal.i = 0; $("#palIn").value = ""; palRender(); if (!$("#pal").open) $("#pal").showModal(); $("#palIn").focus(); }
  function palRun(i) { var x = pal.shown[i]; if (!x) return; $("#pal").close(); setTimeout(x.run, 120); }
  $("#palBtn").addEventListener("click", palOpen);
  $("#palIn").addEventListener("input", function () { pal.i = 0; palRender(); });
  $("#palIn").addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); pal.i = pal.shown.length ? (pal.i + 1) % pal.shown.length : 0; palRender(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); pal.i = pal.shown.length ? (pal.i - 1 + pal.shown.length) % pal.shown.length : 0; palRender(); }
    else if (e.key === "Enter") { e.preventDefault(); palRun(pal.i); }
  });
  $("#palList").addEventListener("click", function (e) { var li = e.target.closest("li[data-i]"); if (li) palRun(+li.dataset.i); });
  $$("dialog").forEach(function (d) { d.addEventListener("mousedown", function (e) { if (e.target === d ) d.close(); }); });

  /* keyboard */
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if ($("#pal").open) $("#pal").close(); else palOpen(); return; }
    if (document.querySelector("dialog[open]")) return;
    if (e.key === "F2") { e.preventDefault(); show("sell"); search.focus(); }
    else if (e.key === "F4") { e.preventDefault(); if (view === "sell") openPay(); }
  });

  /* cloud: sign-in, live data, checkout */
  function fail(err) {
    console.error(err);
    toast(err && err.code === "permission-denied" ? "You do not have permission for that." : String((err && err.message) || err));
  }
  function net(state) { var n = $("#net"); n.textContent = state; n.dataset.s = state; }
  
  // One transaction: check stock, take it off the shelf, number the receipt, save the sale.
  // If two tills sell the last item at the same moment, only one of them succeeds.
  function commitSale(items, t, tn, method) {
    var counterRef = doc(fdb, "posMeta", "counter");
    var refs = items.map(function (it) { return doc(fdb, "posProducts", it.id); });
    return runTransaction(fdb, async function (tx) {
      var cSnap = await tx.get(counterRef), snaps = [];
      for (var i = 0; i < refs.length; i++) snaps.push(await tx.get(refs[i]));
      for (var j = 0; j < snaps.length; j++) {
        if (!snaps[j].exists()) throw new Error("gone: " + items[j].name);
        if ((snaps[j].data().stock || 0) < items[j].qty) throw new Error("stock:" + items[j].name);
      }
      var seq = cSnap.exists() ? cSnap.data().seq : 1001, no = "R" + seq;
      var sale = makeSale(items, t.sub, t.disc, method, tn, db.cashier, new Date(), no);
      sale.uid = user.uid; sale.createdAt = serverTimestamp();
      snaps.forEach(function (s, k) { tx.update(refs[k], { stock: s.data().stock - items[k].qty, updatedAt: serverTimestamp() }); });
      tx.set(counterRef, { seq: seq + 1 });
      tx.set(doc(fdb, "posSales", no), sale);
      return sale;
    });
  }

  function stopListening() { unsubs.forEach(function (f) { try { f(); } catch (e) {} }); unsubs = []; }
  function listen() {
    stopListening();
    unsubs.push(onSnapshot(query(C.products, orderBy("name")), function (snap) {
      db.products = snap.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      loaded.products = true;
      cart = cart.filter(function (l) { return product(l.id); });
      renderCats(); renderGrid(); renderCart(); if (view === "stock") renderStock();
    }, fail));
    unsubs.push(onSnapshot(query(C.sales, orderBy("at", "desc"), limit(1000)), function (snap) {
      db.sales = snap.docs.map(function (d) { return d.data(); }).sort(function (a, b) { return a.at - b.at; });
      loaded.sales = true; paintToday(); if (view === "sales") renderSales(); if (view === "report") renderReport();
    }, fail));
    unsubs.push(onSnapshot(query(C.held, orderBy("at")), function (snap) {
      db.held = snap.docs.map(function (d) { var x = d.data(); x._id = d.id; return x; });
      renderCart(); if ($("#heldDlg").open) openHeld();
    }, fail));
  }

  /* demo bootstrap: seed once per browser, then start listening */
  function seedDemo() {
    if (Object.keys(mem.posProducts).length || mem.posMeta.seeded) return;
    var pr = seedProducts().map(function (p) { p.id = "demo-" + p.id; return p; }), sl = seedSales(pr);
    pr.forEach(function (p) { var d = Object.assign({}, p); delete d.id; d.publicId = ""; d.mediaType = ""; d.demo = true; mem.posProducts[p.id] = d; });
    sl.forEach(function (x) { var d = Object.assign({}, x); d.demo = true; d.uid = "demo"; mem.posSales[x.no] = d; });
    mem.posMeta.seeded = { v: 1 }; flush();
  }
  document.body.classList.add("owner");
  seedDemo(); net("Demo"); listen();

  /* start */
  paintSound(); paintCashier(); renderCats(); renderCart(); renderGrid(); paintToday();
})();
