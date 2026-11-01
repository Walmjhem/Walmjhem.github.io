document.documentElement.classList.remove('no-js');
// reveal on scroll
(function(){
  var els=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
  els.forEach(function(e){io.observe(e)});
})();
// sticky CTA: show after hero, hide while form is on screen
(function(){
  var s=document.getElementById('sticky'),hero=document.querySelector('.hero'),form=document.getElementById('enquire');
  function upd(){
    var past=hero.getBoundingClientRect().bottom<0;
    var r=form.getBoundingClientRect();
    var onForm=r.top<window.innerHeight*.8&&r.bottom>0;
    s.classList.toggle('on',past&&!onForm);
  }
  window.addEventListener('scroll',upd,{passive:true});upd();
})();
// form
(function(){
  var f=document.getElementById('enquiry');
  var date=document.getElementById('date');
  var t=new Date();date.min=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  function bad(el,on){el.closest('.field').classList.toggle('invalid',on);el.setAttribute('aria-invalid',on?'true':'false');return !on}
  function validate(){
    var ok=true,first=null;
    function chk(el,cond){var v=bad(el,!cond);if(!v){ok=false;first=first||el}}
    chk(f.elements["name"],f.elements["name"].value.trim().length>1);
    chk(f.email,/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()));
    chk(date,!!date.value||f.flex.checked);
    var d=parseInt(f.day.value,10),e=parseInt(f.eve.value,10);
    chk(f.day,d>=1&&d<=100);
    if(f.eve.value!==''){chk(f.eve,e<=150&&e>=1&&(isNaN(d)||e>=d))}else bad(f.eve,false);
    return {ok:ok,first:first}
  }
  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    if(f.website.value)return;
    var r=validate();
    if(!r.ok){r.first.focus();return}
    var n=f.elements['name'].value.trim();
    document.getElementById('who').textContent=n;
    f.style.display='none';
    var s=document.getElementById('success');s.classList.add('show');s.focus();
    s.scrollIntoView({behavior:'smooth',block:'center'});
  });
  ['input','change'].forEach(function(evt){f.addEventListener(evt,function(e){
    var fld=e.target.closest&&e.target.closest('.field');
    if(fld&&fld.classList.contains('invalid'))validate();
  })});
})();

// motion
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var f=document.querySelector('.facts');if(f)f.classList.add('rv','stag');
  document.querySelectorAll('.feel,.food-mosaic,.points,.steps,.food-notes,.numbers,.facts ul').forEach(function(g){
    if(g.classList.contains('rv'))g.classList.add('stag');
    [].forEach.call(g.children,function(c,i){c.classList.add('st');c.style.setProperty('--i',i)});
  });
  var nav=document.querySelector('.nav');
  function onScroll(){nav.classList.toggle('scrolled',window.scrollY>8)}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  if(reduce)return;
  // count up
  var nums=document.querySelectorAll('.num strong');
  if('IntersectionObserver' in window){
    var co=new IntersectionObserver(function(en){en.forEach(function(x){if(!x.isIntersecting)return;co.unobserve(x.target);
      var el=x.target,end=parseInt(el.textContent,10),t0=null;
      (function step(t){t0=t0||t;var p=Math.min((t-t0)/1500,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(end*e);if(p<1)requestAnimationFrame(step)})(performance.now());
    })},{threshold:.6});
    nums.forEach(function(n){co.observe(n)});
  }
  // banner parallax
  var ban=document.querySelector('.banner'),bi=ban&&ban.querySelector('img'),tick=false;
  function par(){tick=false;var r=ban.getBoundingClientRect(),h=window.innerHeight;if(r.bottom<0||r.top>h)return;
    bi.style.setProperty('--py',(((r.top+r.height/2-h/2)/h)*-70).toFixed(1)+'px')}
  if(bi)window.addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(par)}},{passive:true});
})();
