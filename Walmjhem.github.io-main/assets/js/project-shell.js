/* Shared project layer. Reads <html data-project="..."> and adds:
   - a floating "All work" pill in the project's card color
   - [ and ] keys to jump to the previous / next project
   Remove the <script> tag from a page to switch it off. */
(function () {
  "use strict";
  var me = document.currentScript, root = new URL("../../", me.src).href;
  var P = [
    { id: "stockpilot", n: "StockPilot", s: "Multi-branch inventory", c: "#FFB39E", d: "#3A1D17", img: "projects/stockpilot/images/cover.png" },
    { id: "crumb-and-co", n: "Crumb & Co.", s: "Bakery shop", c: "#BFD7FF", d: "#152340", img: "projects/crumb-and-co/images/cover.png" },
    { id: "skycast", n: "Skycast", s: "Weather & currency", c: "#FFE08A", d: "#3A3012", img: "projects/skycast/images/cover.png" },
    { id: "counter-pos", n: "Counter POS", s: "Café point of sale", c: "#B8E6C1", d: "#14301E", img: "projects/counter-pos/images/cover.png" },
    { id: "ashden-manor", n: "Ashden Manor", s: "Wedding venue lead funnel", c: "#E5C6FF", d: "#2B183D", img: "projects/ashden-manor/images/cover.jpg" },
    { id: "marci-metzger", n: "Marci Metzger Homes", s: "Realtor lead funnel", c: "#FFC9E0", d: "#3A1828", img: "projects/marci-metzger/images/cover.jpg" },
    { id: "stayeasy", n: "StayEasy", s: "Rentals booking requests", c: "#FFD7A8", d: "#3A2713", img: "assets/images/stayeasy-cover.webp" }
  ];
  var id = document.documentElement.getAttribute("data-project"), i = -1, k;
  for (k = 0; k < P.length; k++) if (P[k].id === id) i = k;
  if (i < 0) return;
  var cur = P[i], nxt = P[(i + 1) % P.length], prv = P[(i + P.length - 1) % P.length];
  var num = (i + 1 < 10 ? "0" : "") + (i + 1) + "/0" + P.length;
  function url(p) { return root + "projects/" + p.id + "/index.html"; }
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }

  function build() {
    var pill = el("a", "ps-pill", "<b aria-hidden=\"true\">←</b><span class=\"ps-lbl\">All work</span><small>" + num + "</small>");
    pill.href = root + "index.html#work";
    pill.setAttribute("aria-label", "Back to the portfolio, project " + num);
    var left = me.getAttribute("data-left");
    if (left) pill.style.setProperty("--ps-l", left);
    document.body.appendChild(pill);

  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    if (e.key === "]") location.href = url(nxt);
    else if (e.key === "[") location.href = url(prv);
  });

  if (document.body) build(); else document.addEventListener("DOMContentLoaded", build);
})();
