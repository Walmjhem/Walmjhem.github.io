(()=>{
const $=s=>document.querySelector(s),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,fine=matchMedia('(pointer:fine)').matches;
const FX='.primary,.secondary,.cart-button,.filter,.add-btn,.mini-button,.theme-btn';
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest(FX);if(!b||reduce)return;const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,d=document.createElement('span');d.className='ripple';d.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;b.append(d);setTimeout(()=>d.remove(),650);});
if(fine&&!reduce){const M='.primary,.cart-button';document.addEventListener('pointermove',e=>{const b=e.target.closest&&e.target.closest(M);if(!b)return;const r=b.getBoundingClientRect();b.style.translate=`${(e.clientX-r.left-r.width/2)*.16}px ${(e.clientY-r.top-r.height/2)*.26}px`;});document.addEventListener('pointerout',e=>{const b=e.target.closest&&e.target.closest(M);if(b)b.style.translate='';});}
const bar=document.createElement('div');bar.id='scrollbar';document.body.append(bar);
const prog=()=>{const h=document.documentElement;bar.style.transform=`scaleX(${h.scrollTop/((h.scrollHeight-h.clientHeight)||1)})`};addEventListener('scroll',prog,{passive:true});prog();

try{const t=localStorage.getItem('crumb-theme');if(t)document.documentElement.dataset.theme=t;else if(matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.dataset.theme='dark';}catch(e){}
const tb=document.createElement('button');tb.className='theme-btn';tb.type='button';tb.setAttribute('aria-label','Toggle dark mode');
const paint=()=>tb.textContent=document.documentElement.dataset.theme==='dark'?'☀':'☾';paint();
tb.onclick=()=>{const d=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=d;try{localStorage.setItem('crumb-theme',d)}catch(e){}paint();};
$('#cartButton').before(tb);
document.querySelectorAll('.hero>div:first-child>*').forEach((el,i)=>el.style.setProperty('--k',i));
const hero=$('.hero-art');if(fine&&!reduce)$('.hero').addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();hero.style.setProperty('--px',(e.clientX-r.left-r.width/2)/-22);hero.style.setProperty('--py',(e.clientY-r.top-r.height/2)/-22);});
let query='',sort='new';
const tools=document.createElement('div');tools.className='tools';
tools.innerHTML='<label class="search"><span aria-hidden="true">⌕</span><input id="q" type="search" placeholder="Search bakes  ( / )" aria-label="Search bakes"></label><select id="sortBy" aria-label="Sort bakes"><option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name A–Z</option></select>';
$('.section-head').append(tools);
$('#q').addEventListener('input',e=>{query=e.target.value;applyFilter();});$('#sortBy').addEventListener('change',e=>{sort=e.target.value;applyFilter();});
addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('#q').focus();}});
applyFilter=function(){
  const map=new Map(currentProducts().map((p,i)=>[String(p.id),[p,i]])),q=query.trim().toLowerCase();
  const cards=[...productGrid.querySelectorAll('.product-card')],k=c=>map.get(c.dataset.id)||[{},0],ids=a=>a.map(c=>c.dataset.id).join();
  const sorted=[...cards].sort((a,b)=>{const[pa,ia]=k(a),[pb,ib]=k(b);return sort==='low'?pa.price-pb.price:sort==='high'?pb.price-pa.price:sort==='name'?String(pa.name).localeCompare(pb.name):ia-ib});
  if(ids(sorted)!==ids(cards))sorted.forEach(c=>productGrid.append(c));
  let n=0;sorted.forEach(c=>{const p=k(c)[0],hay=((p.name||'')+' '+(p.description||'')+' '+categoryLabel(p.category)).toLowerCase();
    const ok=(activeFilter==='all'||c.dataset.category===activeFilter)&&(!q||hay.includes(q));c.style.display=ok?'':'none';if(ok)c.style.setProperty('--i',n++);});
  const loading=remoteProducts===null&&!catalogTimedOut;
  emptyMessage.textContent=q?`No bakes match “${query.trim()}”.`:'No treats in this category just yet.';
  emptyMessage.style.display=n||loading?'none':'block';
};
if(!productGrid.children.length){productGrid.replaceChildren(...Array.from({length:8},()=>{const s=document.createElement('div');s.className='skeleton-card';return s;}));emptyMessage.style.display='none';}
if(fine&&!reduce){
  productGrid.addEventListener('pointermove',e=>{const c=e.target.closest('.product-card');if(!c)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');c.style.setProperty('--rx',(.5-y)*8+'deg');c.style.setProperty('--ry',(x-.5)*10+'deg');});
  productGrid.addEventListener('pointerout',e=>{const c=e.target.closest('.product-card');if(c&&!c.contains(e.relatedTarget)){c.style.removeProperty('--rx');c.style.removeProperty('--ry');}});
}
productGrid.addEventListener('click',e=>{const add=e.target.closest('.add-btn');if(!add||reduce)return;
  const r=add.getBoundingClientRect(),t=$('#cartButton').getBoundingClientRect(),art=add.closest('.product-card').querySelector('.product-art'),img=art.querySelector('img'),d=document.createElement('div');
  d.className='fly';d.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;if(img)d.style.backgroundImage=`url("${img.src}")`;else d.textContent=(art.querySelector('.product-emoji')||{}).textContent||'🥐';
  document.body.append(d);const dx=t.left+t.width/2-r.left-r.width/2,dy=t.top+t.height/2-r.top-r.height/2;
  d.animate([{transform:'translate(0,0) scale(1.3)'},{transform:`translate(${dx*.5}px,${dy-90}px) scale(1)`,offset:.5},{transform:`translate(${dx}px,${dy}px) scale(.3)`,opacity:.3}],{duration:750,easing:'cubic-bezier(.4,0,.3,1)'}).onfinish=()=>{d.remove();$('#cartButton').animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:300});};});
const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}}),{threshold:.15});
document.querySelectorAll('.section-head,.promise-item,.visit>*').forEach((el,i)=>{el.classList.add('reveal');el.style.setProperty('--d',(i%3)*90+'ms');io.observe(el);});
})();
