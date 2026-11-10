(async () => {
/* =====================================================
   StockPilot shared config (index2.html + admin.html)
   Data fields  -> Firebase Firestore
   Images/Video -> Cloudinary
   ===================================================== */
const {initializeApp} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
const {getFirestore} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
const {getAuth} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

const firebaseConfig = {
  apiKey: "AIzaSyB1G-ia-NZ2SssegocFJRX1CrkhXH3xrHk",
  authDomain: "miss-lau-app.firebaseapp.com",
  projectId: "miss-lau-app",
  storageBucket: "miss-lau-app.appspot.com",
  messagingSenderId: "1035558029907",
  appId: "1:1035558029907:web:8f1af22b3f32121e8d14a6",
  measurementId: "G-7DCEVP3D1T"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

/* ---------- CLOUDINARY (browser-safe: NO api secret here) ----------
   1. Cloudinary dashboard -> copy your "Cloud name"
   2. Settings -> Upload -> Add upload preset -> Signing mode: UNSIGNED
      name it:  iwarehouse_unsigned                                   */
const CLOUDINARY = {
  cloudName: "ajtiipby",
  uploadPreset: "iwarehouse_unsigned",
  rootFolder: "iwarehouse/products"
};

/* ---------- UNIFORM NAMING ---------- */
const COLLECTION = "iwarehouse_products";

const BRANCHES = {
  cebu:   "Cebu Branch",
  manila: "Manila Branch",
  davao:  "Davao Branch"
};

const CATEGORIES = {
  laptop:   "Laptops",
  phone:    "Phones",
  mouse:    "Mouse",
  keyboard: "Keyboards"
};

const slugify = (s = "") =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* Firestore doc id:   {branch}_{category}_{product-slug}_{base36time}
   e.g.  cebu_phone_iphone-15-pro_lq3x9a                              */
const buildDocId = ({ branch, category, name }) =>
  `${branch}_${category}_${slugify(name)}_${Date.now().toString(36)}`;

/* Cloudinary public_id:  iwarehouse/products/{branch}/{category}/{slug}_{img|vid}-{n}_{time}
   e.g.  iwarehouse/products/cebu/phone/iphone-15-pro_img-1_lq3x9a    */
const buildPublicId = ({ branch, category, name, kind, index }) =>
  `${CLOUDINARY.rootFolder}/${branch}/${category}/` +
  `${slugify(name)}_${kind === "video" ? "vid" : "img"}-${index}_${Date.now().toString(36)}`;

const formatPrice = (n) =>
  "₱" + Number(n || 0).toLocaleString("en-PH");

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

/* Cloudinary delivery transforms (auto format/quality + resize) */
const optimize = (url, w = 600) =>
  url && url.includes("/upload/")
    ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${w},c_limit/`)
    : url;

/* ---------- UPLOAD (with progress) ---------- */
function uploadToCloudinary(file, publicId, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const kind = file.type.startsWith("video") ? "video" : "image";
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY.uploadPreset);
    fd.append("public_id", publicId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/${kind}/upload`);
    xhr.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      const res = JSON.parse(xhr.responseText || "{}");
      xhr.status >= 200 && xhr.status < 300
        ? resolve({ type: kind, url: res.secure_url, publicId: res.public_id })
        : reject(new Error(res.error?.message || "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

/* ===== PAGE LOGIC ===== */
const {collection, onSnapshot, query, orderBy} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

const $ = id => document.getElementById(id);
const state = { products: [], branch: "all", category: "all", search: "", sort: "new" };

/* ---------- setup controls ---------- */
Object.entries(BRANCHES).forEach(([k, v]) => $("branch").insertAdjacentHTML("beforeend", `<option value="${k}">${v}</option>`));

$("search").oninput = e => { state.search = e.target.value.toLowerCase(); render(); };
$("branch").onchange = e => { state.branch = e.target.value; render(); };
$("sort").onchange = e => { state.sort = e.target.value; render(); };

/* ---------- realtime data from Firestore ---------- */
onSnapshot(
  query(collection(db, COLLECTION), orderBy("createdAt", "desc")),
  snap => {
    state.products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  },
  err => {
    console.error(err);
    $("products").innerHTML = `<div class="empty"><b>Couldn't load products</b>Check your Firestore rules and connection.</div>`;
  }
);

/* ---------- helpers ---------- */
const cover = p => (p.media || []).find(m => m.type === "image");
const hasVideo = p => (p.media || []).some(m => m.type === "video");
const stockClass = q => (q <= 0 ? "out" : q <= 5 ? "low" : "");
const stockText = q => (q <= 0 ? "Out of stock" : q <= 5 ? `Only ${q} left` : `${q} in stock`);

function filtered() {
  const { branch, category, search, sort } = state;
  let list = state.products.filter(p =>
    (branch === "all" || p.branch === branch) &&
    (category === "all" || p.category === category) &&
    [p.name, p.color, p.processor, p.storage].join(" ").toLowerCase().includes(search)
  );
  if (sort === "low")   list.sort((a, b) => a.price - b.price);
  if (sort === "high")  list.sort((a, b) => b.price - a.price);
  if (sort === "stock") list.sort((a, b) => b.quantity - a.quantity);
  return list;
}

function renderChips() {
  const base = state.products.filter(p => state.branch === "all" || p.branch === state.branch);
  const count = c => c === "all" ? base.length : base.filter(p => p.category === c).length;
  $("chips").innerHTML = [["all", "All"], ...Object.entries(CATEGORIES)].map(([k, v]) =>
    `<button class="chip ${state.category === k ? "active" : ""}" data-c="${k}">${v}<em>${count(k)}</em></button>`
  ).join("");
  $("chips").querySelectorAll(".chip").forEach(b => b.onclick = () => { state.category = b.dataset.c; render(); });
}

/* quantity watcher: remember each product's stock so a live change can flash its card */
const lastQty = {};
function changedIds() {
  const out = [];
  state.products.forEach(p => {
    const q = +p.quantity || 0;
    if (lastQty[p.id] !== undefined && lastQty[p.id] !== q) out.push(p.id);
    lastQty[p.id] = q;
  });
  return out;
}

function render() {
  renderChips();
  const changed = changedIds();

  $("statProducts").textContent = state.products.length;
  $("statUnits").textContent = state.products.reduce((s, p) => s + (+p.quantity || 0), 0);

  const list = filtered();
  if (!list.length) {
    $("products").innerHTML = `<div class="empty"><b>No products found</b>Try a different branch, category or search.</div>`;
    return;
  }

  $("products").innerHTML = list.map((p, i) => {
    const img = cover(p);
    return `
      <article class="card" style="--i:${Math.min(i, 12)}" data-id="${p.id}">
        <div class="card__media">
          <span class="badge badge--branch">${esc(BRANCHES[p.branch] || p.branch)}</span>
          <span class="badge badge--stock ${stockClass(p.quantity)}">${stockText(p.quantity)}</span>
          ${hasVideo(p) ? `<span class="badge badge--video">▶ Video</span>` : ""}
          ${img ? `<img loading="lazy" src="${optimize(img.url, 600)}" alt="${esc(p.name)}">` : `<div class="card__noimg">No image</div>`}
        </div>
        <div class="card__body">
          <span class="card__cat">${esc(CATEGORIES[p.category] || p.category)}</span>
          <h3 class="card__name">${esc(p.name)}</h3>
          <div class="card__price">${formatPrice(p.price)}</div>
          <div class="card__tags">
            ${[p.processor, p.storage, p.color].filter(v => v && v !== "N/A").map(v => `<span class="tag">${esc(v)}</span>`).join("")}
          </div>
        </div>
      </article>`;
  }).join("");

  $("products").querySelectorAll(".card").forEach(c => {
    c.onclick = () => openModal(state.products.find(p => p.id === c.dataset.id));
    if (changed.includes(c.dataset.id)) c.classList.add("flash");
  });
}

/* ---------- modal ---------- */
const modal = $("modal");

function showMedia(m) {
  $("stage").innerHTML = m.type === "video"
    ? `<video src="${m.url}" controls autoplay muted playsinline></video>`
    : `<img src="${optimize(m.url, 1000)}" alt="">`;
}

function openModal(p) {
  const media = p.media || [];
  $("mCat").textContent = CATEGORIES[p.category] || p.category;
  $("mName").textContent = p.name;
  $("mPrice").textContent = formatPrice(p.price);
  $("mDesc").textContent = p.description || "";

  const specs = [
    ["Branch", BRANCHES[p.branch] || p.branch], ["Availability", stockText(p.quantity)],
    ["Color", p.color], ["Storage", p.storage], ["Processor", p.processor],
    ["Display", p.display], ["Battery", p.battery], ["Camera", p.camera]
  ].filter(([, v]) => v && v !== "N/A");
  $("mSpecs").innerHTML = specs.map(([k, v]) => `<div class="spec"><small>${k}</small><span>${esc(v)}</span></div>`).join("");

  if (media.length) {
    showMedia(media[0]);
    $("thumbs").innerHTML = media.map((m, i) => `
      <button class="${i === 0 ? "active" : ""}" data-i="${i}">
        ${m.type === "video" ? `<video src="${m.url}" muted></video>` : `<img src="${optimize(m.url, 200)}" alt="">`}
      </button>`).join("");
    $("thumbs").querySelectorAll("button").forEach(b => b.onclick = () => {
      $("thumbs").querySelectorAll("button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      showMedia(media[+b.dataset.i]);
    });
  } else {
    $("stage").innerHTML = `<div class="card__noimg">No image</div>`;
    $("thumbs").innerHTML = "";
  }
  modal.showModal();
}

const closeModal = () => { $("stage").innerHTML = ""; modal.close(); };
$("closeModal").onclick = closeModal;
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
modal.addEventListener("cancel", () => { $("stage").innerHTML = ""; });
})();
