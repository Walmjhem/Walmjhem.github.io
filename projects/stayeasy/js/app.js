(()=>{
const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const peso=n=>'₱'+Math.round(n).toLocaleString('en-PH');
const day=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const nights=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const img=id=>`https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;
const H=[
 {id:'villa',name:'Modern Villa',area:'Bacolod City',type:'Villa',price:3500,cap:6,rating:4.9,img:'photo-1600585154340-be6161a56a0c',emoji:'🏡',desc:'Three bedrooms around a small pool, with a wide living room that opens to the garden. About ten minutes from the city center by car.',am:['WiFi','Pool','Parking','Air-con'],bk:[[3,6],[14,17]]},
 {id:'beach',name:'Beach House',area:'Talisay',type:'Beach',price:4200,cap:8,rating:4.8,img:'photo-1505693416388-ac5ce068fe85',emoji:'🏖️',desc:'Four bedrooms a short walk from the shore, a big dining table and a covered terrace. Enough beds for the whole family.',am:['WiFi','Parking','Kitchen','Air-con'],bk:[[8,11],[20,24]]},
 {id:'cabin',name:'Mountain Cabin',area:'Vallehermoso',type:'Cabin',price:2800,cap:4,rating:4.7,img:'photo-1556912173-3bb406ef7e77',emoji:'🏔️',desc:'Two bedrooms, a wood-paneled living area and a kitchen you can actually cook in. Nights are cool, so bring a jacket.',am:['WiFi','Kitchen','Parking'],bk:[[1,3],[10,13]]},
 {id:'heritage',name:'Silay Heritage Home',area:'Silay',type:'Heritage',price:3100,cap:5,rating:4.8,img:'photo-1568605114967-8130f3a36994',emoji:'🏛️',desc:'An old-style house with high ceilings, capiz windows and a shaded front porch, within walking distance of the heritage district in Silay.',am:['WiFi','Air-con','Parking','Self check-in'],bk:[[5,8],[18,21]]}
];
H.forEach(h=>h.bk=h.bk.map(([a,b])=>[day(a),day(b)]));
let favs=new Set(store.get('se-fav',[])),trips=store.get('se-trips',[]);
const D={type:'All',q:'',max:5000,sort:'rec',fav:false,area:'',guests:1,in:'',out:''};let f={...D};
const grid=$('#grid');
$('#sArea').insertAdjacentHTML('beforeend',[...new Set(H.map(h=>h.area))].map(a=>`<option>${a}</option>`).join(''));
$('#types').innerHTML=['All',...new Set(H.map(h=>h.type))].map(t=>`<button class="chipf${t==='All'?' on':''}" data-t="${t}">${t==='All'?'All stays':t}</button>`).join('');
const clash=(h,a,b)=>h.bk.concat(trips.filter(t=>t.id===h.id).map(t=>[t.in,t.out])).some(([s,e])=>a<e&&b>s);
const dated=()=>f.in&&f.out&&f.out>f.in;
function list(){const q=f.q.trim().toLowerCase();const r=H.filter(h=>(f.type==='All'||h.type===f.type)&&(!f.area||h.area===f.area)&&h.price<=f.max&&h.cap>=f.guests&&(!f.fav||favs.has(h.id))&&(!q||(h.name+' '+h.area+' '+h.type+' '+h.am.join(' ')).toLowerCase().includes(q))&&(!dated()||!clash(h,f.in,f.out)));
 if(f.sort==='low')r.sort((a,b)=>a.price-b.price);else if(f.sort==='high')r.sort((a,b)=>b.price-a.price);else if(f.sort==='top')r.sort((a,b)=>b.rating-a.rating);return r}
const card=(h,i)=>`<article class="card" data-id="${h.id}" tabindex="0" style="--i:${i}" aria-label="View ${h.name}"><div class="art2"><span>${h.emoji}</span><img src="${img(h.img)}" alt="${h.name}" loading="lazy" onerror="this.remove()"><span class="tag">${h.type}</span><button class="heart" aria-label="Save ${h.name}" aria-pressed="${favs.has(h.id)}">♥</button></div><div class="info"><div class="row"><h3>${h.name}</h3><span class="rate">★ ${h.rating}</span></div><p class="loc">${h.area} · sleeps ${h.cap}</p><div class="row"><span class="price"><b>${peso(h.price)}</b> / night</span><span class="go">Check dates</span></div></div></article>`;
function render(){const r=list();grid.innerHTML=r.map(card).join('');$('#count').textContent=r.length+(r.length===1?' stay':' stays')+(dated()?` open ${f.in} to ${f.out}`:'');$('#empty').hidden=!!r.length}
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2800)}
function tween(el,to,fmt){if(reduce){el.textContent=fmt(to);return}const t0=performance.now(),from=+el.dataset.v||0;el.dataset.v=to;(function s(t){const k=Math.min(1,(t-t0)/800),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(s)})(t0)}
/* theme, progress, nav */
const root=document.documentElement,tb=$('#theme');const paint=()=>tb.textContent=root.dataset.theme==='dark'?'☀':'☾';paint();
tb.onclick=()=>{const d=root.dataset.theme==='dark'?'light':'dark';root.dataset.theme=d;store.set('theme',d);paint()};
$('#menuBtn').onclick=e=>{const o=$('#links').classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',o)};$$('#links a').forEach(a=>a.onclick=()=>$('#links').classList.remove('open'));
const secs=$$('main section[id],#home'),links=$$('#links a');
function onScroll(){const h=root;$('#bar').style.transform=`scaleX(${h.scrollTop/((h.scrollHeight-h.clientHeight)||1)})`;$('#top').classList.toggle('show',h.scrollTop>600);let cur='home';$$('main section[id]').forEach(s=>{if(s.getBoundingClientRect().top<140)cur=s.id});links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+cur))}
addEventListener('scroll',onScroll,{passive:true});onScroll();$('#top').onclick=()=>scrollTo({top:0});
/* filters */
$('#types').onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;f.type=b.dataset.t;sync();render()};
$('#q').oninput=e=>{f.q=e.target.value;render()};$('#sort').onchange=e=>{f.sort=e.target.value;render()};
$('#max').oninput=e=>{f.max=+e.target.value;$('#maxO').textContent=peso(f.max);render()};
$('#favOnly').onclick=()=>{f.fav=!f.fav;sync();render()};
function sync(){$$('#types .chipf').forEach(b=>b.classList.toggle('on',b.dataset.t===f.type));$('#favOnly').classList.toggle('on',f.fav);$('#favOnly').setAttribute('aria-pressed',f.fav)}
const clear=()=>{f={...D};$('#q').value='';$('#sort').value='rec';$('#max').value=5000;$('#maxO').textContent='₱5,000';$('#sArea').value='';$('#sIn').value='';$('#sOut').value='';$('#sG').value=2;sync();render()};
$('#reset').onclick=clear;$('#reset2').onclick=clear;
addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('#q').focus()}if(e.key==='Escape'){closeM();closeD()}});
/* hero search */
$('#sIn').min=day(0);$('#sOut').min=day(1);$('#sIn').onchange=e=>{$('#sOut').min=e.target.value||day(1)};
$('#search').onsubmit=e=>{e.preventDefault();const a=$('#sIn').value,b=$('#sOut').value;if((a||b)&&!(a&&b&&b>a)){toast('Choose a check-out date after check-in');return}
 Object.assign(f,{area:$('#sArea').value,in:a,out:b,guests:Math.max(1,+$('#sG').value||1)});render();$('#houses').scrollIntoView({behavior:reduce?'auto':'smooth'});toast(list().length+(list().length===1?' house matches':' houses match'))};
/* cards: favorite or open */
grid.addEventListener('click',e=>{const c=e.target.closest('.card');if(!c)return;if(e.target.closest('.heart')){const id=c.dataset.id;favs.has(id)?favs.delete(id):favs.add(id);store.set('se-fav',[...favs]);const b=e.target.closest('.heart');b.setAttribute('aria-pressed',favs.has(id));if(f.fav)render();return}openM(c.dataset.id,c)});
grid.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('card')){e.preventDefault();e.target.click()}});
/* modal + booking calculator */
let cur,last;const ov=$('#ov');
function openM(id,from){cur=H.find(h=>h.id===id);last=from;const h=cur;
 $('#mBody').innerHTML=`<div class="mgrid"><div class="mimg"><span>${h.emoji}</span><img src="${img(h.img)}" alt="${h.name}" onerror="this.remove()"></div><div class="mbody"><div><span class="kick">${h.type} · ${h.area}</span><h3 id="mT">${h.name}</h3></div><p>${h.desc}</p><div class="ams">${h.am.map(a=>`<span>${a}</span>`).join('')}</div><div class="dates"><label>Check-in<input class="field" type="date" id="bIn" min="${day(0)}"></label><label>Check-out<input class="field" type="date" id="bOut" min="${day(1)}"></label></div><div class="step"><span>Guests (max ${h.cap})</span><div><button type="button" id="gm" aria-label="Fewer guests">−</button><b id="bG">${Math.min(Math.max(f.guests,1),h.cap)}</b><button type="button" id="gp" aria-label="More guests">+</button></div></div><div class="sum"><div><span id="l1">${peso(h.price)} × 0 nights</span><span id="v1">₱0</span></div><div><span>Cleaning fee</span><span id="v2">₱0</span></div><div><span>Service fee (8%)</span><span id="v3">₱0</span></div><div class="t"><span>Total</span><span id="v4">₱0</span></div></div><div class="msg" id="bMsg" role="status"></div><button class="btn" id="bGo" disabled>Request booking</button><p class="note">Demo only: no payment is taken and no real booking is made.</p></div></div>`;
 if(dated()){$('#bIn').value=f.in;$('#bOut').value=f.out}
 ['#bIn','#bOut'].forEach(s=>$(s).onchange=()=>{const a=$('#bIn').value;if(a)$('#bOut').min=day(0)>a?day(1):new Date(new Date(a).getTime()+864e5).toISOString().slice(0,10);calc()});
 $('#gm').onclick=()=>step(-1);$('#gp').onclick=()=>step(1);$('#bGo').onclick=book;calc(true);ov.classList.add('open');document.body.style.overflow='hidden';$('#mx').focus()}
function step(d){const g=$('#bG');g.textContent=Math.min(cur.cap,Math.max(1,+g.textContent+d));calc()}
function calc(first){const a=$('#bIn').value,b=$('#bOut').value,n=a&&b?nights(a,b):0,m=$('#bMsg'),h=cur;let ok=false;
 if(!a||!b){m.className='msg';m.textContent='Pick your check-in and check-out dates.'}else if(n<1){m.className='msg bad';m.textContent='Check-out must be after check-in.'}else if(clash(h,a,b)){m.className='msg bad';m.textContent='Those dates are taken. Try another range.'}else{m.className='msg ok';m.textContent=`Available for ${n} night${n>1?'s':''}.`;ok=true}
 const sub=ok?h.price*n:0,fee=ok?500:0,svc=sub*.08;$('#l1').textContent=`${peso(h.price)} × ${ok?n:0} nights`;$('#v1').textContent=peso(sub);$('#v2').textContent=peso(fee);$('#v3').textContent=peso(svc);tween($('#v4'),sub+fee+svc,peso);$('#bGo').disabled=!ok}
function book(){const a=$('#bIn').value,b=$('#bOut').value,n=nights(a,b),sub=cur.price*n,t={code:'SE-'+Math.random().toString(36).slice(2,6).toUpperCase(),id:cur.id,name:cur.name,in:a,out:b,g:+$('#bG').textContent,total:sub*1.08+500};
 trips.unshift(t);store.set('se-trips',trips);paintTrips();closeM();render();toast(`Request saved. Your code is ${t.code}.`)}
function closeM(){if(!ov.classList.contains('open'))return;ov.classList.remove('open');document.body.style.overflow='';last&&last.focus&&last.focus()}
$('#mx').onclick=closeM;ov.onclick=e=>{if(e.target===ov)closeM()};
/* trips drawer */
const dr=$('#drawer');
function paintTrips(){$('#tripN').textContent=trips.length;$('#trips').innerHTML=trips.length?trips.map((t,i)=>`<div class="trip"><b>${t.name}</b><small>${t.in} → ${t.out} · ${t.g} guest${t.g>1?'s':''}</small><span>${peso(t.total)} · ${t.code}</span><button data-i="${i}">Cancel request</button></div>`).join(''):'<p class="sub">Nothing here yet. Requests you send will show up here.</p>'}
$('#tripsBtn').onclick=()=>{dr.classList.add('open');$('#dx').focus()};function closeD(){dr.classList.remove('open')}$('#dx').onclick=closeD;
$('#trips').onclick=e=>{const b=e.target.closest('[data-i]');if(!b)return;trips.splice(+b.dataset.i,1);store.set('se-trips',trips);paintTrips();render();toast('Request cancelled')};
/* contact */
$('#cf').onsubmit=e=>{e.preventDefault();const n=$('#cn').value.trim(),m=$('#ce').value.trim(),t=$('#cm').value.trim();if(!n||!/^\S+@\S+\.\S+$/.test(m)||!t){toast('Add your name, a valid email and a message');return}e.target.reset();toast(`Thanks, ${n}. This is a demo form, so nothing was sent.`)};
/* fx: tilt + spotlight, magnetic, ripple, hero parallax, reveal, counters */
if(fine&&!reduce){document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card,.amen');if(c){const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');c.style.setProperty('--rx',(.5-y)*7+'deg');c.style.setProperty('--ry',(x-.5)*9+'deg')}
 const b=e.target.closest&&e.target.closest('.btn:not(.ghost):not(.back)');if(b){const r=b.getBoundingClientRect();b.style.translate=`${(e.clientX-r.left-r.width/2)*.15}px ${(e.clientY-r.top-r.height/2)*.25}px`}});
 document.addEventListener('pointerout',e=>{const c=e.target.closest&&e.target.closest('.card,.amen');if(c&&!c.contains(e.relatedTarget)){c.style.removeProperty('--rx');c.style.removeProperty('--ry')}const b=e.target.closest&&e.target.closest('.btn');if(b)b.style.translate=''});
 const art=$('#heroArt');$('.hero').addEventListener('pointermove',e=>{const r=art.getBoundingClientRect();art.style.setProperty('--px',(e.clientX-r.left-r.width/2)/-30);art.style.setProperty('--py',(e.clientY-r.top-r.height/2)/-30)})}
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('.btn');if(!b||reduce)return;const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,d=document.createElement('span');d.className='rip';d.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;b.append(d);setTimeout(()=>d.remove(),650)});
$$('.hero-in>div:first-child>*').forEach((el,i)=>el.style.setProperty('--k',i));
const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.15});$$('.rv').forEach((el,i)=>{el.style.setProperty('--d',(i%3)*90+'ms');io.observe(el)});
render();paintTrips();
})();
