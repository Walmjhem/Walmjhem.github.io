(async () => {
/* =====================================================
   StockPilot shared config (index2.html + admin.html)
   Data fields  -> Firebase Firestore
   Images/Video -> Cloudinary
   ===================================================== */
const {initializeApp} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
const {getFirestore} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

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
const {collection, onSnapshot, query, orderBy, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, increment} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

const $ = id => document.getElementById(id);
let products = [];

/* ---------- toast ---------- */
let tt;
function toast(msg, bad = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (bad ? " bad" : "");
  clearTimeout(tt);
  tt = setTimeout(() => (t.className = "toast"), 3000);
}

/* ---------- realtime data (no login: portfolio demo) ---------- */
onSnapshot(query(collection(db, COLLECTION), orderBy("createdAt", "desc")), snap => {
  products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
}, err => toast("Load failed: " + err.message, true));

/* ---------- filters ---------- */
const fill = (el, obj) => Object.entries(obj).forEach(([k, v]) => el.insertAdjacentHTML("beforeend", `<option value="${k}">${v}</option>`));
fill($("aBranch"), BRANCHES);
fill($("aCategory"), CATEGORIES);
fill($("fBranch"), BRANCHES);
fill($("fCategory"), CATEGORIES);
["aSearch", "aBranch", "aCategory"].forEach(id => $(id).addEventListener("input", render));

/* ---------- table ---------- */
function render() {
  const s = $("aSearch").value.toLowerCase(), b = $("aBranch").value, c = $("aCategory").value;
  const list = products.filter(p =>
    (b === "all" || p.branch === b) && (c === "all" || p.category === c) &&
    (p.name || "").toLowerCase().includes(s));

  $("aProducts").textContent = products.length;
  $("aUnits").textContent = products.reduce((n, p) => n + (+p.quantity || 0), 0);
  $("aLow").textContent = products.filter(p => p.quantity <= 5).length;
  $("aValue").textContent = formatPrice(products.reduce((n, p) => n + p.price * p.quantity, 0));

  $("rows").innerHTML = list.length ? list.map(p => {
    const img = (p.media || []).find(m => m.type === "image");
    const vids = (p.media || []).filter(m => m.type === "video").length;
    return `<tr>
      <td><div class="cell-prod">${img ? `<img src="${optimize(img.url, 120)}" alt="">` : `<img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">`}${esc(p.name)}</div></td>
      <td>${esc(BRANCHES[p.branch] || p.branch)}</td>
      <td>${esc(CATEGORIES[p.category] || p.category)}</td>
      <td>${formatPrice(p.price)}</td>
      <td><div class="qty"><button data-q="-1" data-id="${p.id}">−</button><span>${p.quantity}</span><button data-q="1" data-id="${p.id}">+</button></div></td>
      <td>${(p.media || []).length - vids} IMG / ${vids} VID</td>
      <td><div class="actions">
        <button class="btn btn--ghost btn--sm" data-edit="${p.id}">Edit</button>
        <button class="btn btn--danger btn--sm" data-del="${p.id}">Delete</button>
      </div></td></tr>`;
  }).join("") : `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--muted)">No products yet. Click “Add product”.</td></tr>`;
}

$("rows").addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.q) {
    const p = products.find(x => x.id === t.dataset.id);
    if (p.quantity + +t.dataset.q < 0) return;
    await updateDoc(doc(db, COLLECTION, p.id), { quantity: increment(+t.dataset.q), updatedAt: serverTimestamp() });
  }
  if (t.dataset.edit) openForm(products.find(x => x.id === t.dataset.edit));
  if (t.dataset.del) {
    const p = products.find(x => x.id === t.dataset.del);
    if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
      await deleteDoc(doc(db, COLLECTION, p.id));
      toast("Product deleted");
    }
  }
});

/* ---------- form ---------- */
const form = $("productForm"), dlg = $("formModal");
let editing = null;      // product being edited
let existing = [];       // media already saved
let pending = [];        // new File objects

$("addBtn").onclick = () => openForm(null);
$("cancelForm").onclick = () => dlg.close();

function openForm(p) {
  editing = p;
  form.reset();
  pending = [];
  existing = p ? [...(p.media || [])] : [];
  $("formTitle").textContent = p ? "Edit product" : "Add product";
  if (p) Object.keys(form.elements).forEach(k => {
    if (isNaN(k) && form.elements[k] && p[form.elements[k].name] !== undefined) form.elements[k].value = p[form.elements[k].name];
  });
  drawPreviews();
  dlg.showModal();
}

function drawPreviews() {
  const el = $("previews");
  el.innerHTML = "";
  existing.forEach((m, i) => el.insertAdjacentHTML("beforeend", `
    <div class="preview">${m.type === "video" ? `<video src="${m.url}" muted></video><span class="tagv">VIDEO</span>` : `<img src="${optimize(m.url, 200)}" alt="">`}
    <button type="button" data-ex="${i}" aria-label="Remove">×</button></div>`));
  pending.forEach((f, i) => {
    const u = URL.createObjectURL(f);
    el.insertAdjacentHTML("beforeend", `
      <div class="preview">${f.type.startsWith("video") ? `<video src="${u}" muted></video><span class="tagv">NEW VIDEO</span>` : `<img src="${u}" alt="">`}
      <button type="button" data-new="${i}" aria-label="Remove">×</button></div>`);
  });
}
$("previews").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.ex) existing.splice(+b.dataset.ex, 1);
  if (b.dataset.new) pending.splice(+b.dataset.new, 1);
  drawPreviews();
});

const addFiles = list => {
  pending.push(...[...list].filter(f => /^(image|video)\//.test(f.type)));
  drawPreviews();
};
$("files").onchange = e => { addFiles(e.target.files); e.target.value = ""; };
const drop = $("drop");
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));

form.onsubmit = async e => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(form));
  const data = {
    name: fd.name.trim(), branch: fd.branch, category: fd.category,
    price: +fd.price, quantity: +fd.quantity,
    color: fd.color.trim(), storage: fd.storage.trim() || "N/A", processor: fd.processor.trim() || "N/A",
    display: fd.display.trim() || "N/A", battery: fd.battery.trim() || "N/A", camera: fd.camera.trim() || "N/A",
    description: fd.description.trim()
  };
  data.nameLower = data.name.toLowerCase();

  $("saveBtn").disabled = true;
  const bar = $("progress"); bar.classList.add("on");
  const fill = bar.firstElementChild;

  try {
    const uploaded = [];
    let imgN = existing.filter(m => m.type === "image").length;
    let vidN = existing.filter(m => m.type === "video").length;

    for (let i = 0; i < pending.length; i++) {
      const f = pending[i];
      const kind = f.type.startsWith("video") ? "video" : "image";
      const index = kind === "video" ? ++vidN : ++imgN;
      const pid = buildPublicId({ ...data, kind, index });
      const m = await uploadToCloudinary(f, pid, r => (fill.style.width = ((i + r) / pending.length * 100) + "%"));
      uploaded.push(m);
    }
    fill.style.width = "100%";
    data.media = [...existing, ...uploaded];

    if (editing) {
      await updateDoc(doc(db, COLLECTION, editing.id), { ...data, updatedAt: serverTimestamp() });
    } else {
      await setDoc(doc(db, COLLECTION, buildDocId(data)), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    toast("Product saved");
    dlg.close();
  } catch (err) {
    console.error(err);
    toast(err.message || "Save failed", true);
  } finally {
    $("saveBtn").disabled = false;
    bar.classList.remove("on");
    fill.style.width = "0";
  }
};
})();
