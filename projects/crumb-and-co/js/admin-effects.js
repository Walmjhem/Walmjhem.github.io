(()=>{
const $=s=>document.querySelector(s),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,fine=matchMedia('(pointer:fine)').matches;
const FX='.primary,.secondary,.cart-button,.filter,.add-btn,.mini-button,.theme-btn';
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest(FX);if(!b||reduce)return;const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,d=document.createElement('span');d.className='ripple';d.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;b.append(d);setTimeout(()=>d.remove(),650);});
if(fine&&!reduce){const M='.primary,.cart-button';document.addEventListener('pointermove',e=>{const b=e.target.closest&&e.target.closest(M);if(!b)return;const r=b.getBoundingClientRect();b.style.translate=`${(e.clientX-r.left-r.width/2)*.16}px ${(e.clientY-r.top-r.height/2)*.26}px`;});document.addEventListener('pointerout',e=>{const b=e.target.closest&&e.target.closest(M);if(b)b.style.translate='';});}
const bar=document.createElement('div');bar.id='scrollbar';document.body.append(bar);
const prog=()=>{const h=document.documentElement;bar.style.transform=`scaleX(${h.scrollTop/((h.scrollHeight-h.clientHeight)||1)})`};addEventListener('scroll',prog,{passive:true});prog();

const live=document.createElement('span');live.className='live';live.innerHTML='<i></i><em style="font-style:normal">Live sync</em>';$('#customerActions').before(live);
const net=()=>{live.classList.toggle('off',!navigator.onLine);live.lastChild.textContent=navigator.onLine?'Live sync':'Offline';};addEventListener('online',net);addEventListener('offline',net);net();
const stats=document.createElement('div');stats.className='stats';
stats.innerHTML=[['Products','sP','--ube'],['Menu sections','sS','--sun'],['Average price','sA','--pan'],['Top section','sT','--ube2']].map((s,i)=>`<div class="stat" style="--i:${i};--c:var(${s[2]})"><span>${s[0]}</span><b id="${s[1]}">–</b></div>`).join('');
$('.dashboard-grid').before(stats);
function tween(el,to,fmt){const from=+el.dataset.v||0;el.dataset.v=to;if(reduce){el.textContent=fmt(to);return;}const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/700),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(f);})(t0);}
function updateStats(){const n=productsCache.length,sum=productsCache.reduce((a,p)=>a+(Number(p.price)||0),0),c={};productsCache.forEach(p=>c[p.category]=(c[p.category]||0)+1);const top=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];
  tween($('#sP'),n,v=>Math.round(v));tween($('#sS'),3+customSections.length,v=>Math.round(v));tween($('#sA'),n?sum/n:0,formatMoney);$('#sT').textContent=top?categoryLabel(top):'–';$('#sT').style.fontSize='1.3rem';}
const list=$('#manageProductList'),si=document.createElement('input');si.type='search';si.className='list-search';si.placeholder='Search products…';si.setAttribute('aria-label','Search products');list.before(si);
function filterRows(){const q=si.value.trim().toLowerCase();list.querySelectorAll('.manage-row').forEach(r=>r.style.display=!q||r.textContent.toLowerCase().includes(q)?'':'none');}si.addEventListener('input',filterRows);
const form=$('#productForm'),wrap=document.createElement('div');wrap.className='form-wrap';
const pv=document.createElement('aside');pv.className='live-preview';pv.innerHTML='<small>Live preview · what customers see</small><div class="pv-art"><img alt="" hidden><span>🥐</span></div><div class="pv-cat"></div><h4></h4><p></p><b></b>';
form.before(wrap);wrap.append(form,pv);
let fileUrl='';
function refresh(){const id=$('#editingProductName').value,ex=id&&productsCache.find(p=>p.id===id),img=pv.querySelector('img'),src=fileUrl||(ex&&ex.imageUrl)||'';
  img.hidden=!src;if(src)img.src=src;pv.querySelector('span').hidden=!!src;const sel=$('#productCategory');
  pv.querySelector('.pv-cat').textContent=sel.selectedOptions[0]?sel.selectedOptions[0].textContent:'';pv.querySelector('h4').textContent=$('#productName').value||'Product name';
  pv.querySelector('p').textContent=$('#productDescription').value||'Your description appears here.';pv.querySelector('b').textContent=formatMoney($('#productPrice').value);}
form.addEventListener('input',refresh);form.addEventListener('change',refresh);form.addEventListener('reset',()=>{fileUrl='';setTimeout(refresh)});list.addEventListener('click',()=>setTimeout(refresh));
imageInput.addEventListener('change',()=>{const f=imageInput.files&&imageInput.files[0];if(!f){fileUrl='';refresh();return;}const r=new FileReader();r.onload=()=>{fileUrl=r.result;refresh();};r.readAsDataURL(f);});
const dz=imageInput.closest('label');dz.classList.add('drop');imageInput.after(Object.assign(document.createElement('small'),{className:'hint',textContent:'Drop an image here or choose a file'}));
['dragenter','dragover'].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.add('over');}));['dragleave','drop'].forEach(t=>dz.addEventListener(t,e=>{e.preventDefault();dz.classList.remove('over');}));
dz.addEventListener('drop',e=>{if(e.dataTransfer.files.length){imageInput.files=e.dataTransfer.files;imageInput.dispatchEvent(new Event('change',{bubbles:true}));}});
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();form.requestSubmit();}});$('#saveProduct').title='Ctrl + S';
const _a=applyCatalogUpdate;applyCatalogUpdate=function(){_a();updateStats();refresh();};
const _s=renderSections;renderSections=function(){_s();updateStats();refresh();};
const _m=renderManageProducts;renderManageProducts=function(){_m();filterRows();};
updateStats();refresh();
})();
