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
// lead capture setup
// To send real leads, paste a webhook URL below (Make, Zapier, Formspree, a CRM form endpoint).
// Left empty, leads stay in the browser and nothing is sent.
Lead.init({
  site:'ashden-manor',
  endpoint:'',
  // Example rule set: how ready to book does this enquiry look?
  score:function(x){
    var s=20; // email is always given
    if(x.wedding_date){
      s+=25;
      var months=(new Date(x.wedding_date)-new Date())/2.63e9;
      if(months<=18)s+=15;
    }else if(x.flexible)s+=10;
    if(x.day_guests>=40&&x.day_guests<=100)s+=15;else if(x.day_guests)s+=5;
    if(x.phone)s+=15;
    if(x.evening_guests)s+=5;
    if(x.message&&x.message.length>20)s+=5;
    return s;
  }
});
// quick check in the hero hands its answers to the full form, which opens on step 2
(function(){
  var q=document.getElementById('quick');if(!q)return;
  var qd=document.getElementById('qDate'),qg=document.getElementById('qGuests');
  var t=new Date();qd.min=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  function mark(el,ok){el.closest('.field').classList.toggle('invalid',!ok);el.setAttribute('aria-invalid',ok?'false':'true');return ok}
  q.addEventListener('submit',function(e){
    e.preventDefault();
    var g=parseInt(qg.value,10);
    var a=mark(qd,!!qd.value),b=mark(qg,g>=1&&g<=100);
    if(!a){qd.focus();return}
    if(!b){qg.focus();return}
    Lead.track('hero_quick_check',{guests:g});
    document.getElementById('date').value=qd.value;
    document.getElementById('dayGuests').value=g;
    document.dispatchEvent(new CustomEvent('ashden:step2'));
    document.getElementById('enquiry').scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
// enquiry form: two steps, then score and send
(function(){
  var f=document.getElementById('enquiry');
  var E=f.elements;
  var date=E.date,s1=document.getElementById('step1'),s2=document.getElementById('step2');
  var next=document.getElementById('next'),send=document.getElementById('send'),back=document.getElementById('back');
  var p1=document.getElementById('p1'),p2=document.getElementById('p2'),recap=document.getElementById('recap');
  var t=new Date();date.min=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  var step=1;
  function bad(el,on){el.closest('.field').classList.toggle('invalid',on);el.setAttribute('aria-invalid',on?'true':'false');return !on}
  function check(list){var ok=true,first=null;list.forEach(function(c){var v=bad(c[0],!c[1]);if(!v){ok=false;first=first||c[0]}});return {ok:ok,first:first}}
  function v1(){
    var d=parseInt(E.day.value,10);
    return check([[date,!!date.value||E.flex.checked],[E.day,d>=1&&d<=100]]);
  }
  function v2(){
    var d=parseInt(E.day.value,10),e=parseInt(E.eve.value,10);
    var r=check([[E['name'],E['name'].value.trim().length>1],[E.email,/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(E.email.value.trim())]]);
    if(E.eve.value!==''){
      var okE=e<=150&&e>=1&&(isNaN(d)||e>=d);bad(E.eve,!okE);
      if(!okE){r.ok=false;r.first=r.first||E.eve;E.eve.closest('details').open=true}
    }else bad(E.eve,false);
    return r;
  }
  function pretty(){
    if(date.value){return new Date(date.value+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
    return 'Flexible on the date';
  }
  function show(n,focus){
    step=n;
    s1.hidden=n!==1;s2.hidden=n!==2;next.hidden=n!==1;send.hidden=n!==2;back.hidden=n!==2;
    p1.className=n===1?'on':'done';p2.className=n===2?'on':'';
    if(n===2){recap.textContent=pretty()+' · '+E.day.value+' day guest'+(E.day.value==='1'?'':'s')}
    Lead.track('form_step',{step:n});
    if(focus){(n===1?date:E['name']).focus({preventScroll:true})}
  }
  next.addEventListener('click',function(){var r=v1();if(!r.ok){r.first.focus();Lead.track('form_error',{step:1});return}show(2,true)});
  back.addEventListener('click',function(){show(1,true)});
  document.getElementById('edit').addEventListener('click',function(){show(1,true)});
  document.addEventListener('ashden:step2',function(){var r=v1();if(r.ok)show(2,false)});
  f.addEventListener('submit',function(ev){
    ev.preventDefault();
    if(step===1){next.click();return}
    var r=v2();
    if(!r.ok){r.first.focus();Lead.track('form_error',{step:2});return}
    var name=E['name'].value.trim();
    function done(res){
      document.getElementById('who').textContent=name;
      var note=document.getElementById('demoNote');
      if(res&&res.demo){note.textContent=Lead.demoNote;note.hidden=false}
      if(res&&!res.ok){
        document.querySelector('#success p').textContent="We couldn't send that just now, but we've saved it on this device and will try again. You can also write to us directly.";
      }
      f.style.display='none';
      var s=document.getElementById('success');s.classList.add('show');s.focus();
      s.scrollIntoView({behavior:'smooth',block:'center'});
    }
    if(Lead.isBot('enquiry',f)){done({ok:true,demo:false});return}
    send.disabled=true;send.textContent='Sending…';
    Lead.submit('enquiry',{
      names:name,email:E.email.value.trim(),phone:E.phone.value.trim(),
      wedding_date:date.value||'',flexible:E.flex.checked,
      day_guests:parseInt(E.day.value,10)||null,evening_guests:parseInt(E.eve.value,10)||null,
      pet:E.pet.checked,source:E.source.value,message:E.msg.value.trim()
    }).then(done);
  });
  ['input','change'].forEach(function(evt){f.addEventListener(evt,function(e){
    var fld=e.target.closest&&e.target.closest('.field');
    if(fld&&fld.classList.contains('invalid'))(step===1?v1:v2)();
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
  // photos ease in: soft fade with a gentle 1.02 -> 1 settle (no bounce)
  if('IntersectionObserver' in window){
    var imgs=document.querySelectorAll('.mosaic img,.feel img,.food-mosaic img');
    var ii=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('img-in');ii.unobserve(x.target)}})},{threshold:.15,rootMargin:'0px 0px -5% 0px'});
    imgs.forEach(function(im){im.classList.add('img-rv');ii.observe(im)});
  }
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
