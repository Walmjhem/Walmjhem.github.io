/* ---------- Firebase (safe: the page still works if it can't connect) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyB1G-ia-NZ2SssegocFJRX1CrkhXH3xrHk",
  authDomain: "miss-lau-app.firebaseapp.com",
  projectId: "miss-lau-app",
  storageBucket: "miss-lau-app.appspot.com",
  messagingSenderId: "1035558029907",
  appId: "1:1035558029907:web:8f1af22b3f32121e8d14a6",
  measurementId: "G-7DCEVP3D1T"
};
let productsCollection = null;
let sectionsCollection = null;
try {
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  productsCollection = db.collection('products');
  sectionsCollection = db.collection('menuSections');
} catch (error) {
  console.warn('Firebase unavailable, showing demo menu instead:', error);
}

/* ---------- Demo menu (shown when Firestore is empty, blocked or offline) ---------- */
const DEMO_PRODUCTS = [
  { id: 'demo-sourdough', name: 'Country Sourdough', price: 180, category: 'bread', emoji: '🍞', art: 'art-bread', description: 'A crisp golden crust with a soft, tangy centre.' },
  { id: 'demo-croissant', name: 'Butter Croissant', price: 85, category: 'pastry', emoji: '🥐', art: 'art-croissant', description: 'Delicate, flaky layers with rich buttery goodness.' },
  { id: 'demo-shortcake', name: 'Strawberry Shortcake', price: 220, category: 'cake', emoji: '🎂', art: 'art-cake', description: 'Cloud-soft sponge, cream, and sweet strawberries.' },
  { id: 'demo-cookie', name: 'Choco Chunk Cookie', price: 65, category: 'cake', emoji: '🍪', art: 'art-cookie', description: 'Chewy in the middle, crisp at the edges.' },
  { id: 'demo-cupcake', name: 'Vanilla Cloud Cupcake', price: 75, category: 'cake', emoji: '🧁', art: 'art-cupcake', description: 'A fluffy vanilla treat topped with silky frosting.' },
  { id: 'demo-cinnamon', name: 'Cinnamon Swirl', price: 95, category: 'pastry', emoji: '🍥', art: 'art-roll', description: 'Soft, sweet dough rolled with cinnamon sugar.' },
  { id: 'demo-tart', name: 'Seasonal Fruit Tart', price: 150, category: 'cake', emoji: '🥧', art: 'art-tart', description: 'Buttery pastry, vanilla custard, and fresh fruit.' },
  { id: 'demo-donut', name: 'Classic Glazed Donut', price: 55, category: 'pastry', emoji: '🍩', art: 'art-donut', description: 'Light, pillowy, and finished with a sweet glaze.' }
];

const categoryNames = { bread: 'Breads', pastry: 'Pastries', cake: 'Cakes & sweets' };
const categoryEmoji = { bread: '🍞', pastry: '🥐', cake: '🎂' };

/* ---------- State ---------- */
let remoteProducts = null;     // null = not loaded yet
let catalogTimedOut = false;
let customSections = [];
let activeFilter = 'all';
let basket = [];
let activeDetailProduct = null;
let toastTimer;
let lastFocused = null;

const productGrid = document.getElementById('productGrid');
const emptyMessage = document.getElementById('emptyMessage');
const filterWrap = document.querySelector('.filters');

/* ---------- Helpers ---------- */
function formatMoney(value) {
  return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function categoryLabel(value) {
  if (categoryNames[value]) return categoryNames[value];
  const custom = customSections.find(section => section.value === value);
  return custom ? custom.label : 'Bakery';
}
function productEmoji(product) {
  return product.emoji || categoryEmoji[product.category] || '🥐';
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}

/* ---------- Catalogue ---------- */
function currentProducts() {
  if (remoteProducts && remoteProducts.length) return remoteProducts;
  if (remoteProducts !== null || catalogTimedOut) return DEMO_PRODUCTS; // loaded but empty, failed, or too slow
  return [];
}

function renderProduct(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.id = product.id;
  card.dataset.category = product.category || 'bread';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', 'View details for ' + (product.name || 'product'));

  const art = document.createElement('div');
  art.className = 'product-art ' + (product.imageUrl ? '' : (product.art || 'art-croissant'));
  const showEmoji = () => {
    if (art.querySelector('.product-emoji')) return;
    const emoji = document.createElement('span');
    emoji.className = 'product-emoji';
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = productEmoji(product);
    art.classList.add(product.art || 'art-croissant');
    art.append(emoji);
  };
  if (product.imageUrl) {
    const photo = document.createElement('img');
    photo.className = 'product-photo';
    photo.src = product.imageUrl;
    photo.alt = product.name || 'Bakery product';
    photo.loading = 'lazy';
    photo.addEventListener('error', () => { photo.remove(); showEmoji(); });
    art.append(photo);
  } else {
    showEmoji();
  }

  const info = document.createElement('div');
  info.className = 'product-info';
  const cat = document.createElement('div');
  cat.className = 'product-category';
  cat.textContent = categoryLabel(product.category);
  const title = document.createElement('h3');
  title.className = 'product-name';
  title.textContent = product.name || 'Untitled product';
  const bottom = document.createElement('div');
  bottom.className = 'product-bottom';
  const price = document.createElement('span');
  price.className = 'price';
  price.textContent = formatMoney(product.price);
  const add = document.createElement('button');
  add.className = 'add-btn';
  add.type = 'button';
  add.textContent = '+';
  add.setAttribute('aria-label', 'Add ' + (product.name || 'product') + ' to basket');
  bottom.append(price, add);
  info.append(cat, title, bottom);
  card.append(art, info);
  return card;
}

function renderCatalog() {
  const products = currentProducts();
  productGrid.replaceChildren(...products.map(renderProduct));
  applyFilter();
}

function applyFilter() {
  let visible = 0;
  productGrid.querySelectorAll('.product-card').forEach(card => {
    const match = activeFilter === 'all' || card.dataset.category === activeFilter;
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  if (visible) {
    emptyMessage.style.display = 'none';
  } else {
    emptyMessage.textContent = (remoteProducts === null && !catalogTimedOut)
      ? 'Loading fresh bakes…'
      : 'No treats in this category just yet.';
    emptyMessage.style.display = 'block';
  }
}

/* ---------- Filters / menu sections ---------- */
function syncFilterButtons() {
  filterWrap.querySelectorAll('.filter').forEach(button => {
    const on = button.dataset.filter === activeFilter;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  });
}
function renderCustomerSections() {
  filterWrap.querySelectorAll('[data-custom-section="true"]').forEach(button => button.remove());
  customSections.forEach(section => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter';
    button.dataset.filter = section.value;
    button.dataset.customSection = 'true';
    button.textContent = section.label;
    filterWrap.append(button);
  });
  const stillExists = activeFilter === 'all' || categoryNames[activeFilter] || customSections.some(s => s.value === activeFilter);
  if (!stillExists) activeFilter = 'all';
  syncFilterButtons();
}
// One delegated listener handles built-in AND custom section buttons.
filterWrap.addEventListener('click', event => {
  const button = event.target.closest('.filter');
  if (!button) return;
  activeFilter = button.dataset.filter;
  syncFilterButtons();
  applyFilter();
});

/* ---------- Live data from Firestore ---------- */
function startLiveCatalog() {
  setTimeout(() => {              // don't leave visitors staring at "Loading" if Firestore is slow/blocked
    if (remoteProducts === null) { catalogTimedOut = true; renderCatalog(); }
  }, 3500);
  if (!productsCollection) { catalogTimedOut = true; renderCatalog(); return; }

  productsCollection.onSnapshot(snap => {
    remoteProducts = snap.docs
      .map(doc => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
    reconcileBasketWithProducts(remoteProducts);
    renderCatalog();
  }, error => {
    console.error('Firestore product listener failed:', error);
    remoteProducts = [];
    renderCatalog();
  });

  sectionsCollection.onSnapshot(snap => {
    customSections = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(section => section.value && section.label)
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    renderCustomerSections();
    renderCatalog();              // refresh category labels on cards
  }, error => console.warn('Custom menu sections could not be loaded:', error));
}

/* ---------- Modals ---------- */
function openModal(id) {
  lastFocused = document.activeElement;
  const modal = document.getElementById(id);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  const close = modal.querySelector('.modal-close');
  if (close) close.focus();
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (!document.querySelector('.modal-backdrop.open')) {
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
}
document.querySelectorAll('[data-close-modal]').forEach(button =>
  button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
document.querySelectorAll('.modal-backdrop').forEach(backdrop =>
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop.id); }));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(modal => closeModal(modal.id));
});

/* ---------- Basket ---------- */
const BASKET_KEY = 'crumb-co-basket-v1';
function loadBasket() {
  try {
    const saved = JSON.parse(localStorage.getItem(BASKET_KEY) || '[]');
    if (Array.isArray(saved)) {
      basket = saved
        .filter(item => item && item.key && item.name && item.quantity > 0)
        .map(item => ({ ...item, price: Number(item.price) || 0, quantity: Math.floor(Number(item.quantity)) || 1 }));
    }
  } catch (error) { basket = []; }
}
function saveBasket() {
  try { localStorage.setItem(BASKET_KEY, JSON.stringify(basket)); } catch (error) { /* storage blocked: basket still works this visit */ }
}

// Keep the saved basket in sync with the live Firebase catalogue. If an owner
// deletes a product in another tab, its next Firestore snapshot removes it here.
function reconcileBasketWithProducts(products) {
  if (!Array.isArray(products)) return;
  const validIds = new Set(products.map(product => String(product.id)));
  const validNames = new Set(products.filter(product => !product.id).map(product => String(product.name || '')));
  const previousLength = basket.length;
  basket = basket.filter(item => validIds.has(String(item.key)) || validNames.has(String(item.name || '')));
  if (basket.length !== previousLength) updateBasket();
}

function addToBasket(product) {
  if (!product || !product.name) return;
  const key = product.id || product.name;
  const existing = basket.find(item => item.key === key);
  if (existing) {
    existing.quantity++;
  } else {
    basket.push({ key, name: product.name, price: Number(product.price || 0), imageUrl: product.imageUrl || '', emoji: productEmoji(product), quantity: 1 });
  }
  updateBasket(true);
  showToast(product.name + ' added to your basket');
}

function updateBasket(bump) {
  const count = basket.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cartCount');
  countEl.textContent = count;
  if (bump) { countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); }

  const lines = document.getElementById('basketLines');
  lines.replaceChildren();
  let total = 0;

  if (!basket.length) {
    const empty = document.createElement('div');
    empty.className = 'basket-empty';
    empty.textContent = 'Your basket is waiting for something delicious.';
    lines.append(empty);
  }

  basket.forEach(item => {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;
    const row = document.createElement('div');
    row.className = 'basket-line';

    let thumb;
    if (item.imageUrl) {
      thumb = document.createElement('img');
      thumb.className = 'basket-thumb';
      thumb.src = item.imageUrl;
      thumb.alt = '';
      thumb.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'basket-thumb-emoji';
        fallback.textContent = item.emoji || '🥐';
        thumb.replaceWith(fallback);
      });
    } else {
      thumb = document.createElement('div');
      thumb.className = 'basket-thumb-emoji';
      thumb.textContent = item.emoji || '🥐';
    }

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'basket-line-name';
    name.textContent = item.name;
    const price = document.createElement('div');
    price.className = 'basket-line-price';
    price.textContent = formatMoney(item.price) + ' each';
    const sub = document.createElement('div');
    sub.className = 'basket-line-sub';
    sub.textContent = formatMoney(lineTotal);
    info.append(name, price, sub);

    const controls = document.createElement('div');
    controls.className = 'quantity-controls';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Remove one ' + item.name);
    minus.addEventListener('click', () => {
      item.quantity--;
      if (item.quantity <= 0) basket = basket.filter(line => line.key !== item.key);
      updateBasket();
    });
    const qty = document.createElement('span');
    qty.textContent = item.quantity;
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Add one ' + item.name);
    plus.addEventListener('click', () => { item.quantity++; updateBasket(); });
    controls.append(minus, qty, plus);

    row.append(thumb, info, controls);
    lines.append(row);
  });

  document.getElementById('basketTotal').textContent = formatMoney(total);
  document.getElementById('basketSummary').textContent = count ? count + (count === 1 ? ' item' : ' items') : '';
  document.getElementById('clearBasket').disabled = !basket.length;
  document.getElementById('checkoutBtn').disabled = !basket.length;
  saveBasket();
}

/* ---------- Product cards: open details, or add straight to basket ---------- */
productGrid.addEventListener('click', event => {
  const card = event.target.closest('.product-card');
  if (!card) return;
  const product = currentProducts().find(p => String(p.id) === card.dataset.id);
  if (!product) return;

  if (event.target.closest('.add-btn')) {
    addToBasket(product);
    return;
  }

  activeDetailProduct = product;
  const image = document.getElementById('detailImage');
  const emoji = document.getElementById('detailEmoji');
  if (product.imageUrl) {
    image.src = product.imageUrl;
    image.alt = product.name || 'Bakery product';
    image.style.display = 'block';
    emoji.classList.remove('show');
    image.onerror = () => { image.style.display = 'none'; emoji.textContent = productEmoji(product); emoji.classList.add('show'); };
  } else {
    image.style.display = 'none';
    emoji.textContent = productEmoji(product);
    emoji.classList.add('show');
  }
  document.getElementById('detailCategory').textContent = categoryLabel(product.category);
  document.getElementById('detailTitle').textContent = product.name || 'Product';
  document.getElementById('detailPrice').textContent = formatMoney(product.price);
  document.getElementById('detailDescription').textContent = product.description || 'Freshly made with care.';
  openModal('productModal');
});
productGrid.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('product-card')) {
    event.preventDefault();
    event.target.click();
  }
});

document.getElementById('detailAdd').addEventListener('click', () => {
  addToBasket(activeDetailProduct);
  closeModal('productModal');
});
document.getElementById('cartButton').addEventListener('click', () => {
  updateBasket();
  openModal('basketModal');
});
document.getElementById('clearBasket').addEventListener('click', () => { basket = []; updateBasket(); });
document.getElementById('checkoutBtn').addEventListener('click', () => showToast('Checkout is turned off in this portfolio demo'));

/* ---------- Start ---------- */
loadBasket();
updateBasket();
syncFilterButtons();
startLiveCatalog();
