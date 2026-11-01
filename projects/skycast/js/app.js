(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- storage (always guarded) ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var K = { unit: "skycast-unit", cities: "skycast-cities", last: "skycast-last", cur: "skycast-cur", cache: "skycast-cache-" };

  /* ---------- API helpers with timeout, retry and cache ---------- */
  function getJSON(url, ttlMs) {
    var key = K.cache + url, cached = store.get(key, null);
    if (cached && Date.now() - cached.t < ttlMs) return Promise.resolve(cached.d);
    function attempt(n) {
      var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 9000);
      return fetch(url, { signal: ctl.signal }).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      }).catch(function (e) {
        clearTimeout(timer);
        if (n < 1) return attempt(n + 1);
        throw e;
      });
    }
    return attempt(0).then(function (d) { store.set(key, { t: Date.now(), d: d }); return d; })
      .catch(function (e) { if (cached) { cached.stale = true; return cached.d; } throw e; });
  }

  /* ---------- weather code map and icons ---------- */
  function info(code, day) {
    if (code === 0) return day ? ["Clear sky", "sun", "clear-day"] : ["Clear night", "moon", "clear-night"];
    if (code <= 2) return [code === 1 ? "Mostly clear" : "Partly cloudy", day ? "partsun" : "partmoon", day ? "clear-day" : "clear-night"];
    if (code === 3) return ["Overcast", "cloud", day ? "cloud-day" : "cloud-night"];
    if (code === 45 || code === 48) return ["Fog", "fog", "fog"];
    if (code >= 51 && code <= 57) return ["Drizzle", "rain", "rain"];
    if (code >= 61 && code <= 67) return ["Rain", "rain", "rain"];
    if (code >= 71 && code <= 77) return ["Snow", "snow", "snow"];
    if (code >= 80 && code <= 82) return ["Rain showers", "rain", "rain"];
    if (code === 85 || code === 86) return ["Snow showers", "snow", "snow"];
    if (code >= 95) return ["Thunderstorm", "storm", "storm"];
    return ["Cloudy", "cloud", "cloud-day"];
  }
  var CLOUD = '<path d="M20 46h26a10 10 0 0 0 1-19.9A14 14 0 0 0 20.5 30 8 8 0 0 0 20 46z" fill="#e8eefc"/>';
  function icon(kind) {
    var p = "";
    if (kind === "sun") p = '<g class="sun"><circle cx="32" cy="32" r="11" fill="#fcd34d"/><g stroke="#fcd34d" stroke-width="3" stroke-linecap="round"><path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4 4M45 45l4 4M49 15l-4 4M19 45l-4 4"/></g></g>';
    else if (kind === "moon") p = '<path d="M40 10a22 22 0 1 0 14 38A18 18 0 0 1 40 10z" fill="#e0e7ff"/>';
    else if (kind === "partsun") p = '<g class="sun"><circle cx="24" cy="24" r="9" fill="#fcd34d"/></g><g class="drift">' + CLOUD + '</g>';
    else if (kind === "partmoon") p = '<path d="M30 8a15 15 0 1 0 12 24A12 12 0 0 1 30 8z" fill="#e0e7ff"/><g class="drift">' + CLOUD + '</g>';
    else if (kind === "cloud") p = '<g class="drift">' + CLOUD + '</g>';
    else if (kind === "fog") p = CLOUD + '<g stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"><path d="M14 52h36M20 58h28"/></g>';
    else if (kind === "rain") p = '<g fill="#cbd5e1">' + CLOUD.replace('#e8eefc', '#b6c4df') + '</g><g stroke="#7dd3fc" stroke-width="3" stroke-linecap="round"><path class="fall" d="M24 50l-2 6"/><path class="fall" style="animation-delay:.3s" d="M34 50l-2 6"/><path class="fall" style="animation-delay:.6s" d="M44 50l-2 6"/></g>';
    else if (kind === "snow") p = CLOUD.replace('#e8eefc', '#cfd9ee') + '<g fill="#fff"><circle class="fall" cx="24" cy="53" r="2.2"/><circle class="fall" style="animation-delay:.4s" cx="34" cy="55" r="2.2"/><circle class="fall" style="animation-delay:.8s" cx="44" cy="53" r="2.2"/></g>';
    else if (kind === "storm") p = CLOUD.replace('#e8eefc', '#8b97b5') + '<path d="M34 42l-8 12h7l-3 8 11-14h-7z" fill="#fde047"/>';
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' + p + '</svg>';
  }

  /* ---------- state ---------- */
  var unit = store.get(K.unit, "c") === "f" ? "f" : "c";
  var cities = store.get(K.cities, []);
  if (!Array.isArray(cities)) cities = [];
  var current = null;        // {name, country, lat, lon}
  var data = null;           // last forecast
  var selDay = 0;
  var loadId = 0;

  function T(c) { return Math.round(unit === "f" ? c * 9 / 5 + 32 : c); }
  function speed(kmh) { return unit === "f" ? Math.round(kmh * 0.621) + " mph" : Math.round(kmh) + " km/h"; }
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }

  /* ---------- search with autocomplete ---------- */
  var q = $("#q"), box = $("#suggest"), sugg = [], sIdx = -1, qTimer, qSeq = 0;
  function hideSuggest() { box.hidden = true; q.setAttribute("aria-expanded", "false"); sIdx = -1; }
  function showSuggest(list) {
    sugg = list; sIdx = -1;
    if (!list.length) { hideSuggest(); return; }
    box.innerHTML = "";
    list.forEach(function (c, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "option");
      b.innerHTML = esc(c.name) + " <small>" + esc([c.admin1, c.country].filter(Boolean).join(", ")) + "</small>";
      b.addEventListener("click", function () { pick(c); });
      box.appendChild(b);
    });
    box.hidden = false; q.setAttribute("aria-expanded", "true");
  }
  function geocode(term) {
    var url = "https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=" + encodeURIComponent(term);
    return getJSON(url, 86400000).then(function (d) { return (d.results || []).map(function (r) { return { name: r.name, country: r.country || "", admin1: r.admin1 || "", lat: r.latitude, lon: r.longitude }; }); });
  }
  q.addEventListener("input", function () {
    clearTimeout(qTimer);
    var term = q.value.trim();
    if (term.length < 2) { hideSuggest(); return; }
    var my = ++qSeq;
    qTimer = setTimeout(function () {
      geocode(term).then(function (l) { if (my === qSeq) showSuggest(l); }).catch(function () { if (my === qSeq) hideSuggest(); });
    }, 250);
  });
  q.addEventListener("keydown", function (e) {
    var items = $$("button", box);
    if (box.hidden || !items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sIdx = (sIdx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach(function (b, i) { b.classList.toggle("on", i === sIdx); });
    } else if (e.key === "Escape") hideSuggest();
  });
  $("#searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (sIdx >= 0 && sugg[sIdx]) { pick(sugg[sIdx]); return; }
    var term = q.value.trim(); if (!term) return;
    geocode(term).then(function (l) {
      if (l.length) pick(l[0]); else showError("No city found for “" + term + "”.", null);
    }).catch(function () { showError("Search failed. Check your connection.", null); });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".search")) hideSuggest(); });
  function pick(c) { q.value = ""; hideSuggest(); loadCity(c); }

  /* ---------- geolocation ---------- */
  $("#locate").addEventListener("click", function () {
    if (!navigator.geolocation) { showError("Location is not supported in this browser.", null); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      loadCity({ name: "My location", country: "", lat: lat, lon: lon });
    }, function () { showError("Location permission was denied. Search for a city instead.", null); }, { timeout: 8000 });
  });

  /* ---------- saved cities ---------- */
  function sameCity(a, b) { return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01; }
  function renderChips() {
    var wrap = $("#chips"); wrap.innerHTML = "";
    cities.forEach(function (c) {
      var s = document.createElement("span");
      s.className = "chip" + (current && sameCity(c, current) ? " active" : "");
      var go = document.createElement("button"); go.type = "button"; go.className = "go"; go.textContent = c.name;
      go.addEventListener("click", function () { loadCity(c); });
      var x = document.createElement("button"); x.type = "button"; x.className = "x"; x.textContent = "×";
      x.setAttribute("aria-label", "Remove " + c.name);
      x.addEventListener("click", function () { cities = cities.filter(function (k) { return k !== c; }); store.set(K.cities, cities); renderChips(); });
      s.append(go, x); wrap.appendChild(s);
    });
  }
  function toggleSave() {
    if (!current || current.name === "My location") return;
    var i = cities.findIndex(function (c) { return sameCity(c, current); });
    if (i >= 0) cities.splice(i, 1); else cities.unshift(current);
    cities = cities.slice(0, 8);
    store.set(K.cities, cities); renderChips(); renderNow();
  }

  /* ---------- errors ---------- */
  function showError(msg, retry) {
    var b = $("#errBox"); b.innerHTML = "";
    var d = document.createElement("div"); d.className = "err"; d.setAttribute("role", "alert");
    var s = document.createElement("span"); s.textContent = msg; d.appendChild(s);
    if (retry) { var r = document.createElement("button"); r.type = "button"; r.textContent = "Retry"; r.addEventListener("click", retry); d.appendChild(r); }
    b.appendChild(d);
  }
  function clearError() { $("#errBox").innerHTML = ""; }

  /* ---------- load forecast ---------- */
  function loadCity(c) {
    current = c; store.set(K.last, c); renderChips();
    var id = ++loadId; clearError();
    $("#nowCard").innerHTML = '<div class="skel" style="height:130px"></div><div class="stats"><div class="skel" style="height:58px"></div><div class="skel" style="height:58px"></div><div class="skel" style="height:58px"></div><div class="skel" style="height:58px"></div></div>';
    $("#hourBody").innerHTML = '<div class="skel" style="height:150px"></div>';
    $("#days").innerHTML = new Array(8).join('<div class="skel" style="height:34px;margin:6px 0"></div>');
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + c.lat + "&longitude=" + c.lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day,precipitation" +
      "&hourly=temperature_2m,precipitation_probability,weather_code,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max" +
      "&timezone=auto&forecast_days=7";
    getJSON(url, 600000).then(function (d) {
      if (id !== loadId) return;
      data = d; selDay = 0; renderAll();
    }).catch(function () {
      if (id !== loadId) return;
      $("#nowCard").innerHTML = ""; $("#hourBody").innerHTML = ""; $("#days").innerHTML = "";
      showError("Could not load the forecast for " + c.name + ". Check your connection.", function () { loadCity(c); });
    });
  }

  function fmtTime(iso) { return iso.slice(11, 16); }
  function hour12(iso) { var h = +iso.slice(11, 13); return (h % 12 || 12) + (h < 12 ? "am" : "pm"); }
  function dayName(iso, i) { return i === 0 ? "Today" : new Date(iso + "T12:00:00").toLocaleDateString("en", { weekday: "short" }); }

  function renderAll() { renderNow(); renderHours(); renderDays(); }

  function renderNow() {
    if (!data) return;
    var cu = data.current, w = info(cu.weather_code, cu.is_day === 1);
    document.body.setAttribute("data-sky", w[2]);
    var saved = cities.some(function (c) { return sameCity(c, current); });
    var place = current.name + (current.country ? ", " + current.country : "");
    var uv = data.daily.uv_index_max[0];
    $("#nowCard").innerHTML =
      '<div class="now stagger"><div class="big">' + icon(w[1]) + '</div><div><div class="place">' + esc(place) + '</div>' +
      '<div class="sub">' + new Date().toLocaleString("en", { timeZone: data.timezone, weekday: "long", hour: "numeric", minute: "2-digit" }) + '</div>' +
      '<div class="temp">' + T(cu.temperature_2m) + '<sup>&deg;' + unit.toUpperCase() + '</sup></div><div class="cond">' + w[0] + ' &middot; feels like ' + T(cu.apparent_temperature) + '&deg;</div>' +
      (current.name !== "My location" ? '<button type="button" class="seg" id="saveBtn" style="margin-top:10px;padding:6px 14px;background:var(--glass);border:1px solid var(--line);font-weight:700;font-size:.82rem" aria-pressed="' + saved + '">' + (saved ? "Saved ✓" : "Save city") + '</button>' : '') +
      '</div></div>' +
      '<div class="stats">' +
      stat("Humidity", cu.relative_humidity_2m + "%") + stat("Wind", speed(cu.wind_speed_10m)) +
      stat("UV index", uv == null ? "-" : uv.toFixed(1)) + stat("Rain chance", data.daily.precipitation_probability_max[0] + "%") +
      stat("Sunrise", fmtTime(data.daily.sunrise[0])) + stat("Sunset", fmtTime(data.daily.sunset[0])) +
      stat("Precipitation", cu.precipitation + " mm") + stat("Time zone", data.timezone_abbreviation || "") + '</div>';
    var sb = $("#saveBtn"); if (sb) sb.addEventListener("click", toggleSave);
    document.title = T(cu.temperature_2m) + "° " + current.name + " | Skycast";
  }
  function stat(a, b) { return '<div class="stat"><span>' + a + "</span><b>" + b + "</b></div>"; }

  /* hourly chart for the selected day (today = from the current hour) */
  function hourSlice() {
    var h = data.hourly, out = [], dayStr = data.daily.time[selDay];
    var nowIso = data.current.time, start = 0;
    for (var i = 0; i < h.time.length; i++) {
      if (selDay === 0) { if (h.time[i] >= nowIso.slice(0, 13) + ":00") { start = i; break; } }
      else if (h.time[i].slice(0, 10) === dayStr) { start = i; break; }
    }
    for (var j = start; j < Math.min(start + 24, h.time.length); j++) out.push(j);
    return out;
  }
  function renderHours() {
    var idx = hourSlice(), h = data.hourly;
    if (!idx.length) { $("#hourBody").innerHTML = ""; return; }
    var temps = idx.map(function (i) { return T(h.temperature_2m[i]); });
    var lo = Math.min.apply(null, temps), hi = Math.max.apply(null, temps);
    if (hi === lo) hi = lo + 1;
    var W = 520, H = 190, pl = 26, pr = 10, pt = 22, pb = 28, pw = W - pl - pr, ph = H - pt - pb - 30;
    function X(k) { return pl + pw * k / Math.max(idx.length - 1, 1); }
    function Y(v) { return pt + ph * (1 - (v - lo) / (hi - lo)); }
    var pts = temps.map(function (v, k) { return [X(k), Y(v)]; });
    var d = pts.map(function (p, k) { return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var area = d + " L" + X(idx.length - 1) + " " + (pt + ph) + " L" + X(0) + " " + (pt + ph) + "Z";
    var bars = idx.map(function (i, k) {
      var pr_ = h.precipitation_probability[i] || 0, bh = 26 * pr_ / 100;
      return '<rect class="rain" x="' + (X(k) - 5) + '" y="' + (H - pb - bh + 14) + '" width="10" height="' + bh + '" rx="2"/>';
    }).join("");
    var labels = idx.map(function (i, k) { return k % 4 === 0 ? '<text x="' + X(k) + '" y="' + (H - 4) + '" text-anchor="middle">' + hour12(h.time[i]) + "</text>" : ""; }).join("");
    $("#hourBody").innerHTML =
      '<svg class="chart" id="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Hourly temperature chart">' +
      '<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc" stop-opacity=".45"/><stop offset="1" stop-color="#7dd3fc" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="area" d="' + area + '"/>' + bars + '<path class="line" id="hline" d="' + d + '" pathLength="1"/>' +
      '<text x="' + pl + '" y="12">' + hi + "&deg;</text><text x=\"" + pl + '" y="' + (pt + ph + 12) + '">' + lo + "&deg;</text>" + labels +
      '<g id="hov" style="display:none"><line class="hover" id="hovL" y1="' + pt + '" y2="' + (pt + ph) + '"/><circle class="dot" id="hovD" r="5"/></g></svg>' +
      '<div class="tip" id="tip">Hover or touch the chart for details.</div>';
    if (!reduce) {
      var ln = $("#hline"); ln.style.strokeDasharray = 1; ln.style.strokeDashoffset = 1;
      ln.getBoundingClientRect();
      ln.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900, easing: "ease-out", fill: "forwards" });
    }
    var svg = $("#chart");
    function move(ev) {
      var r = svg.getBoundingClientRect(), cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      var k = Math.max(0, Math.min(idx.length - 1, Math.round(((cx / r.width) * W - pl) / pw * (idx.length - 1))));
      var i = idx[k], w = info(h.weather_code[i], h.is_day[i] === 1);
      $("#hov").style.display = "";
      $("#hovL").setAttribute("x1", X(k)); $("#hovL").setAttribute("x2", X(k));
      $("#hovD").setAttribute("cx", X(k)); $("#hovD").setAttribute("cy", Y(temps[k]));
      $("#tip").textContent = hour12(h.time[i]) + ": " + temps[k] + "° " + unit.toUpperCase() + ", " + w[0] + ", " + (h.precipitation_probability[i] || 0) + "% rain";
    }
    svg.addEventListener("pointermove", move); svg.addEventListener("touchmove", move, { passive: true });
    svg.addEventListener("pointerleave", function () { $("#hov").style.display = "none"; });
  }

  function renderDays() {
    var d = data.daily, mins = d.temperature_2m_min.map(T), maxs = d.temperature_2m_max.map(T);
    var lo = Math.min.apply(null, mins), hi = Math.max.apply(null, maxs), span = Math.max(hi - lo, 1);
    var wrap = $("#days"); wrap.innerHTML = "";
    d.time.forEach(function (t, i) {
      var w = info(d.weather_code[i], true);
      var b = document.createElement("button"); b.type = "button"; b.className = "day" + (i === selDay ? " sel" : "");
      b.setAttribute("aria-label", dayName(t, i) + ": " + w[0] + ", high " + maxs[i] + ", low " + mins[i]);
      b.innerHTML = "<span>" + dayName(t, i) + "</span>" + icon(w[1]) +
        '<div class="range"><i style="left:' + ((mins[i] - lo) / span * 100) + "%;right:" + (100 - (maxs[i] - lo) / span * 100) + '%"></i></div>' +
        "<em>" + mins[i] + "&deg; / " + maxs[i] + "&deg;</em>";
      b.addEventListener("click", function () { selDay = i; renderDays(); renderHours(); $("#hourCard h2").textContent = i === 0 ? "Next 24 hours" : dayName(t, i) + " hourly"; });
      wrap.appendChild(b);
    });
  }

  $$(".seg [data-unit]").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.unit === unit));
    b.addEventListener("click", function () {
      unit = b.dataset.unit; store.set(K.unit, unit);
      $$(".seg [data-unit]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      if (data) renderAll();
    });
  });

  /* ---------- currency converter ---------- */
  var amt = $("#amt"), selFrom = $("#from"), selTo = $("#to"), curPrefs = store.get(K.cur, { from: "USD", to: "PHP", amt: "100" });
  var curSeq = 0;
  function money(v, code) { try { return new Intl.NumberFormat("en", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(v); } catch (e) { return v.toFixed(2) + " " + code; } }
  function fillCurrencies(map) {
    var codes = Object.keys(map).sort();
    [selFrom, selTo].forEach(function (s) {
      s.innerHTML = codes.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
    });
    selFrom.value = codes.indexOf(curPrefs.from) >= 0 ? curPrefs.from : "USD";
    selTo.value = codes.indexOf(curPrefs.to) >= 0 ? curPrefs.to : "PHP";
    amt.value = curPrefs.amt || "100";
  }
  function convert() {
    var f = selFrom.value, t = selTo.value, a = parseFloat(String(amt.value).replace(/,/g, ""));
    store.set(K.cur, { from: f, to: t, amt: amt.value });
    var out = $("#curResult");
    if (!(a >= 0)) { out.innerHTML = '<small>Enter an amount to convert.</small>'; $("#spark").innerHTML = ""; return; }
    if (f === t) { out.innerHTML = money(a, t) + "<small>Same currency</small>"; $("#spark").innerHTML = ""; return; }
    var my = ++curSeq, end = new Date(), start = new Date(Date.now() - 30 * 86400000);
    var iso = function (d) { return d.toISOString().slice(0, 10); };
    var url = "https://api.frankfurter.dev/v1/" + iso(start) + ".." + iso(end) + "?base=" + f + "&symbols=" + t;
    getJSON(url, 3600000).then(function (d) {
      if (my !== curSeq) return;
      var days = Object.keys(d.rates).sort(), series = days.map(function (k) { return d.rates[k][t]; });
      var rate = series[series.length - 1];
      out.innerHTML = money(a * rate, t) + "<small>" + money(a, f) + " = " + money(a * rate, t) + " &middot; 1 " + f + " = " + rate.toFixed(4) + " " + t + " &middot; " + days[days.length - 1] + "</small>";
      spark(series);
    }).catch(function () {
      if (my !== curSeq) return;
      out.innerHTML = '<small style="color:var(--bad)">Could not load exchange rates. Try again shortly.</small>'; $("#spark").innerHTML = "";
    });
  }
  function spark(s) {
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s), sp = hi - lo || 1;
    var d = s.map(function (v, i) { return (i ? "L" : "M") + (i / Math.max(s.length - 1, 1) * 296 + 2).toFixed(1) + " " + (48 - (v - lo) / sp * 42).toFixed(1); }).join(" ");
    $("#spark").innerHTML = '<path d="' + d + '"/>';
  }
  var cTimer;
  amt.addEventListener("input", function () { clearTimeout(cTimer); cTimer = setTimeout(convert, 200); });
  selFrom.addEventListener("change", convert); selTo.addEventListener("change", convert);
  $("#swapCur").addEventListener("click", function () { var t = selFrom.value; selFrom.value = selTo.value; selTo.value = t; convert(); });
  getJSON("https://api.frankfurter.dev/v1/currencies", 604800000).then(function (m) { fillCurrencies(m); convert(); })
    .catch(function () { $("#curResult").innerHTML = '<small style="color:var(--bad)">Currency list unavailable right now.</small>'; });

  /* ---------- start ---------- */
  renderChips();
  var last = store.get(K.last, null);
  loadCity(last && typeof last.lat === "number" ? last : { name: "Bacolod", country: "Philippines", lat: 10.6667, lon: 122.95 });
})();
