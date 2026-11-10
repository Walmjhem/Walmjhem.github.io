const firebaseConfig = {
  apiKey: "AIzaSyB1G-ia-NZ2SssegocFJRX1CrkhXH3xrHk",
  authDomain: "miss-lau-app.firebaseapp.com",
  projectId: "miss-lau-app",
  storageBucket: "miss-lau-app.appspot.com",
  messagingSenderId: "1035558029907",
  appId: "1:1035558029907:web:8f1af22b3f32121e8d14a6",
  measurementId: "G-7DCEVP3D1T"
};
const CLOUDINARY_CLOUD_NAME = 'ajtiipby';
// Cloudinary unsigned upload preset configured for this bakery.
const CLOUDINARY_UPLOAD_PRESET = 'bakery_uploads';
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const productsCollection = db.collection('products');
const sectionsCollection = db.collection('menuSections');
const categoryNames = { bread: 'Breads', pastry: 'Pastries', cake: 'Cakes & sweets' };

const emptyMessage = document.getElementById('emptyMessage');
const productGrid = document.getElementById('productGrid');
const adminPanel = document.getElementById('adminPanel');
const adminToggle = document.getElementById('adminToggle');
const imageInput = document.getElementById('productImage');
const imagePreview = document.getElementById('imagePreview');
const adminStatus = document.getElementById('adminStatus');
document.body.classList.add('admin-mode');
adminPanel.hidden = false;

let productsCache = [];
let customSections = [];
let toastTimer;
let activeFilter = 'all';

function categoryLabel(value, fallback) {
  if (categoryNames[value]) return categoryNames[value];
  const custom = customSections.find(section => section.value === value);
  return custom ? custom.label : (fallback || value || 'Bakery');
}
function setStatus(kind, message) { adminStatus.className = 'admin-status' + (kind ? ' ' + kind : ''); adminStatus.textContent = message; }
function formatMoney(value) { return '₱' + Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 }); }

function renderProduct(product) {
  const card = document.createElement('article'); card.className = 'product-card'; card.dataset.id = product.id; card.dataset.category = product.category || 'bread';
  const art = document.createElement('div'); art.className = 'product-art';
  if (product.imageUrl) { const img = document.createElement('img'); img.className = 'product-photo'; img.src = product.imageUrl; img.alt = product.name || 'Product'; img.loading = 'lazy'; art.append(img); }
  else { const emoji = document.createElement('span'); emoji.className = 'product-emoji'; emoji.textContent = '🥐'; art.append(emoji); }
  const info = document.createElement('div'); info.className = 'product-info';
  const cat = document.createElement('div'); cat.className = 'product-category'; cat.textContent = categoryLabel(product.category, product.categoryLabel);
  const title = document.createElement('h3'); title.className = 'product-name'; title.textContent = product.name || 'Untitled';
  const desc = document.createElement('div'); desc.className = 'product-desc'; desc.textContent = product.description || 'Freshly made with care.';
  const bottom = document.createElement('div'); bottom.className = 'product-bottom'; const price = document.createElement('span'); price.className = 'price'; price.textContent = formatMoney(product.price); bottom.append(price);
  info.append(cat, title, desc, bottom); card.append(art, info); return card;
}
function applyFilter() {
  let visible = 0;
  productGrid.querySelectorAll('.product-card').forEach(card => {
    const match = activeFilter === 'all' || card.dataset.category === activeFilter;
    card.style.display = match ? '' : 'none'; if (match) visible++;
  });
  emptyMessage.style.display = visible ? 'none' : 'block';
}
function applyCatalogUpdate() {
  productGrid.replaceChildren(...productsCache.map(renderProduct));
  renderManageProducts();
  applyFilter();
}
function loadProducts() {
  // Live listener: any add / edit / delete refreshes the lists automatically (no re-subscribing needed).
  productsCollection.onSnapshot(snap => {
    productsCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0));
    applyCatalogUpdate();
  }, error => {
    console.error(error);
    setStatus('error', 'Could not load Firebase products (' + (error.code || error.message || 'unknown error') + '). Check Firestore Database and rules for /products/{productId}.');
  });
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
}
document.querySelector('.filters').addEventListener('click', event => {
  const button = event.target.closest('.filter'); if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filters .filter').forEach(item => item.classList.toggle('active', item === button));
  applyFilter();
});
adminToggle.addEventListener('click', () => adminPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
imageInput.addEventListener('change', () => {
  const file = imageInput.files && imageInput.files[0];
  if (!file) { imagePreview.style.display = 'none'; imagePreview.removeAttribute('src'); return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    imageInput.value = ''; imagePreview.style.display = 'none';
    setStatus('error', 'Choose a JPG, PNG, or WebP image smaller than 5 MB.'); return;
  }
  const reader = new FileReader();
  reader.onload = () => { imagePreview.src = reader.result; imagePreview.style.display = 'block'; };
  reader.readAsDataURL(file);
});
document.getElementById('productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const file = imageInput.files && imageInput.files[0];
  const name = document.getElementById('productName').value.trim();
  const price = Number(document.getElementById('productPrice').value);
  const category = document.getElementById('productCategory').value;
  const description = document.getElementById('productDescription').value.trim();
  const editingId = document.getElementById('editingProductName').value;
  const existing = editingId ? productsCache.find(p => p.id === editingId) : null;
  if (!name || !Number.isFinite(price) || price < 0 || (!file && !existing)) {
    adminStatus.className = 'admin-status error';
    adminStatus.textContent = 'Enter a product name, valid price, and choose an image for a new product.';
    return;
  }
  const saveButton = document.getElementById('saveProduct');
  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';
  adminStatus.className = 'admin-status';
  try {
    let imageUrl = existing?.imageUrl || '';
    let cloudinaryPublicId = existing?.cloudinaryPublicId || '';
    if (file) {
      adminStatus.textContent = 'Uploading image to Cloudinary…';
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: uploadData });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || 'Cloudinary upload failed. Verify cloud name and unsigned preset.');
      imageUrl = result.secure_url;
      cloudinaryPublicId = result.public_id || '';
    }
    const productData = { name, price, category, description, imageUrl, cloudinaryPublicId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (editingId) {
      await productsCollection.doc(editingId).set(productData, { merge: true });
    } else {
      productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await productsCollection.add(productData);
    }
    adminStatus.className = 'admin-status success';
    adminStatus.textContent = editingId ? 'Product updated in Firebase.' : 'Product saved to Firebase. Its image is hosted by Cloudinary.';
    event.target.reset();
    imagePreview.style.display = 'none';
    imagePreview.removeAttribute('src');
    document.getElementById('editingProductName').value = '';
    document.getElementById('productFormHeading').textContent = 'Add a new bake';
    document.getElementById('saveProduct').textContent = 'Upload & add product';
    document.getElementById('cancelEdit').hidden = true;
    imageInput.required = true;
  } catch (error) {
    console.error('Product save failed:', error);
    adminStatus.className = 'admin-status error';
    adminStatus.textContent = 'Save failed: ' + (error.code || error.message || 'Check Firebase rules and Cloudinary preset.');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = document.getElementById('editingProductName').value ? 'Save changes' : 'Upload & add product';
  }
});

// Owner dashboard helpers for the interactive portfolio preview.
const builtInSections = [
  { value: 'bread', label: 'Breads' },
  { value: 'pastry', label: 'Pastries' },
  { value: 'cake', label: 'Cakes & sweets' }
];
function renderManageProducts(){
 const list=document.getElementById('manageProductList');list.replaceChildren();
 if(!productsCache.length){const empty=document.createElement('p');empty.className='dashboard-note';empty.textContent='No products in Firebase yet. Add your first bake below.';list.append(empty);return;}
 productsCache.forEach(product=>{const row=document.createElement('div');row.className='manage-row';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=product.name||'Untitled';const detail=document.createElement('small');detail.textContent=categoryLabel(product.category,product.categoryLabel)+' · '+formatMoney(product.price);info.append(title,detail);const actions=document.createElement('div');actions.className='manage-actions';const edit=document.createElement('button');edit.className='mini-button';edit.type='button';edit.textContent='Edit';edit.addEventListener('click',()=>{document.getElementById('editingProductName').value=product.id;document.getElementById('productName').value=product.name||'';document.getElementById('productPrice').value=product.price??'';document.getElementById('productCategory').value=product.category||'bread';document.getElementById('productDescription').value=product.description||'';imageInput.required=false;document.getElementById('productFormHeading').textContent='Edit product';document.getElementById('saveProduct').textContent='Save changes';document.getElementById('cancelEdit').hidden=false;adminStatus.className='admin-status';adminStatus.textContent='Leave the image blank to keep the current Cloudinary image.';document.getElementById('productForm').scrollIntoView({behavior:'smooth',block:'start'});});const del=document.createElement('button');del.className='mini-button danger';del.type='button';del.textContent='Delete';del.addEventListener('click',async()=>{if(!confirm('Delete '+(product.name||'this product')+' from Firebase?'))return;try{await productsCollection.doc(product.id).delete();try{localStorage.setItem('crumb-co-product-deleted-v1',JSON.stringify({id:String(product.id),at:Date.now()}));}catch(storageError){}adminStatus.className='admin-status success';adminStatus.textContent='Product deleted from Firebase. It will also be removed from customers’ open baskets when the live catalogue updates.';}catch(e){adminStatus.className='admin-status error';adminStatus.textContent='Delete failed: '+e.message;}});actions.append(edit,del);row.append(info,actions);list.append(row);});
}
function renderSections() {
  const list = document.getElementById('sectionList');
  list.replaceChildren();
  const select = document.getElementById('productCategory');
  const selectedValue = select.value;
  select.replaceChildren();
  [...builtInSections, ...customSections].forEach(section => {
    const option = document.createElement('option'); option.value = section.value; option.textContent = section.label; select.append(option);
    const row = document.createElement('div'); row.className = 'manage-row';
    const name = document.createElement('strong'); name.textContent = section.label; row.append(name);
    if (section.custom) {
      const remove = document.createElement('button'); remove.className = 'mini-button danger'; remove.type = 'button'; remove.textContent = 'Delete';
      remove.addEventListener('click', async () => {
        const used = productsCache.some(product => product.category === section.value);
        if (used && !confirm('Products use this section. Delete the section anyway?')) return;
        try { await sectionsCollection.doc(section.id).delete(); adminStatus.className='admin-status success'; adminStatus.textContent='Menu section deleted from Firebase.'; }
        catch (error) { adminStatus.className='admin-status error'; adminStatus.textContent='Could not delete section: '+(error.code||error.message); }
      }); row.append(remove);
    }
    list.append(row);
  });
  if ([...select.options].some(option => option.value === selectedValue)) select.value = selectedValue;
  const filterWrap = document.querySelector('.filters');
  filterWrap.querySelectorAll('[data-custom-section="true"]').forEach(button => button.remove());
  customSections.forEach(section => {
    const button = document.createElement('button'); button.className='filter'; button.dataset.filter=section.value; button.dataset.customSection='true'; button.textContent=section.label;
    if (activeFilter === section.value) button.classList.add('active');
    filterWrap.append(button);
  });
  if (activeFilter !== 'all' && !categoryNames[activeFilter] && !customSections.some(item => item.value === activeFilter)) {
    activeFilter = 'all';
    filterWrap.querySelector('[data-filter="all"]').classList.add('active');
  }
}
sectionsUnsubscribe = sectionsCollection.orderBy('label').onSnapshot(snap => {
  customSections = snap.docs.map(doc => ({id:doc.id, ...doc.data(), custom:true})).filter(section => section.value && section.label).sort((a, b) => String(a.label).localeCompare(String(b.label)));
  renderSections();
  applyCatalogUpdate();
}, error => { console.error('Menu sections listener failed:', error); adminStatus.className='admin-status error'; adminStatus.textContent='Could not load menu sections ('+(error.code||error.message||'unknown error')+'). Check Firestore rules for /menuSections/{sectionId}.'; });
document.getElementById('sectionForm').addEventListener('submit', async event => {
  event.preventDefault();
  const label = document.getElementById('sectionName').value.trim();
  if (!label) return;
  if ([...builtInSections, ...customSections].some(section => section.label.toLowerCase() === label.toLowerCase())) {
    adminStatus.className='admin-status error'; adminStatus.textContent='A section with that name already exists.'; return;
  }
  const slug = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'section';
  const value = 'custom-' + slug;
  try {
    adminStatus.className='admin-status'; adminStatus.textContent='Saving menu section to Firebase…';
    await sectionsCollection.add({value, label, createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    event.target.reset(); adminStatus.className='admin-status success'; adminStatus.textContent='Menu section saved. It will appear on the customer page automatically.';
  } catch(error) { console.error(error); adminStatus.className='admin-status error'; adminStatus.textContent='Could not add menu section ('+(error.code||error.message)+'). Check Firestore rules for /menuSections/{sectionId}.'; }
});
document.getElementById('cancelEdit').addEventListener('click', () => {
  document.getElementById('productForm').reset();
  imageInput.required = false;
  document.getElementById('editingProductName').value = '';
  document.getElementById('productFormHeading').textContent = 'Add a new bake';
  document.getElementById('saveProduct').textContent = 'Upload & add product';
  document.getElementById('cancelEdit').hidden = true;
  imagePreview.style.display = 'none';
});
loadProducts();
