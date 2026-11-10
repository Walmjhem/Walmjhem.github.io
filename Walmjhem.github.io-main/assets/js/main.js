(function(){
  var $=function(s,c){return(c||document).querySelector(s)},$$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  $("#year").textContent=new Date().getFullYear();
  var cards=$$("#grid .card[data-cat]");
  $("#count").textContent=cards.length;
  $$(".cover img").forEach(function(i){var m=function(){i.classList.add("miss")};if(i.complete&&i.naturalWidth===0)m();i.addEventListener("error",m)});
  var L={data:"Live data and APIs",tools:"Tools",web:"Web design"},f=$("#filters"),cats=[];
  cards.forEach(function(c){if(cats.indexOf(c.dataset.cat)<0)cats.push(c.dataset.cat)});
  function mk(k,t){var b=document.createElement("button");b.type="button";b.className="filter"+(k==="all"?" on":"");b.dataset.k=k;b.textContent=t;f.appendChild(b)}
  mk("all","All ("+cards.length+")");cats.forEach(function(c){mk(c,L[c]||c)});f.hidden=false;
  f.addEventListener("click",function(e){var b=e.target.closest(".filter");if(!b)return;
    $$(".filter",f).forEach(function(x){x.classList.toggle("on",x===b)});
    $$("#grid .card").forEach(function(c,i){var sh=(b.dataset.k==="all"||c.dataset.cat===b.dataset.k||c.classList.contains("soon"));c.style.display=sh?"":"none";c.classList.remove("pop");if(sh){void c.offsetWidth;c.classList.add("in","pop");c.style.setProperty("--sd",(i%4)*70+"ms")}});
  });
  var R=document.documentElement,mt=$('meta[name="theme-color"]');
  function setP(p,save){R.setAttribute("data-pal",p);$$(".pal button").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.p===p))});if(save){try{localStorage.setItem("pal",p)}catch(e){}}if(window.__pal)window.__pal()}
  setP(R.getAttribute("data-pal"),false);
  $$(".pal button").forEach(function(b){b.addEventListener("click",function(){setP(b.dataset.p,true)})});
  var rd=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nm=$(".name");
  if(nm&&!rd){var n=0;nm.setAttribute("aria-label",nm.textContent.replace(/\s+/g," ").trim());
    (function sp(el){Array.prototype.slice.call(el.childNodes).forEach(function(c){
      if(c.nodeType===3){var f=document.createDocumentFragment();c.textContent.split("").forEach(function(ch){if(ch===" "){f.appendChild(document.createTextNode(" "));return}var s=document.createElement("span");s.className="ch";s.setAttribute("aria-hidden","true");s.style.setProperty("--i",n++);s.textContent=ch;f.appendChild(s)});el.replaceChild(f,c)}
      else if(c.nodeType===1)sp(c)})})(nm);
    requestAnimationFrame(function(){requestAnimationFrame(function(){R.classList.add("go")})});
    var ct=$("#count"),end=+ct.textContent,t0=null;ct.textContent="0";
    setTimeout(function(){requestAnimationFrame(function s(ts){if(t0===null)t0=ts;var p=Math.min((ts-t0)/1400,1);ct.textContent=Math.round(end*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(s)})},900);
  }
  $$(".card,.int,.panel,.fact").forEach(function(e){e.classList.add("sp");e.addEventListener("pointermove",function(ev){var r=e.getBoundingClientRect();e.style.setProperty("--mx",ev.clientX-r.left+"px");e.style.setProperty("--my",ev.clientY-r.top+"px")})});
  var rs=$$(".card,.int,.panel,.fact,.job,.head,.contact,.about>div,.res+p");
  rs.forEach(function(e){e.classList.add("rs");var sib=Array.prototype.indexOf.call(e.parentNode.children,e);e.style.setProperty("--sd",(sib%4)*110+"ms")});
  if("IntersectionObserver"in window&&!rd){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.12,rootMargin:"0px 0px -6% 0px"});rs.forEach(function(e){io.observe(e)})}
  else rs.forEach(function(e){e.classList.add("in")});
  var tl=$(".tl"),jobs=$$(".job");
  function tls(){if(!tl)return;var r=tl.getBoundingClientRect(),vh=innerHeight,p=rd?1:Math.min(1,Math.max(0,(vh*.65-r.top)/r.height));tl.style.setProperty("--p",p.toFixed(3));jobs.forEach(function(j){j.classList.toggle("reach",rd||j.getBoundingClientRect().top<vh*.65)})}
  addEventListener("scroll",tls,{passive:true});addEventListener("resize",tls);tls();
  if(!rd&&matchMedia("(hover:hover)").matches)$$(".btn").forEach(function(b){b.addEventListener("pointermove",function(ev){var r=b.getBoundingClientRect();b.style.setProperty("--bx",(ev.clientX-r.left-r.width/2)*.18+"px");b.style.setProperty("--by",(ev.clientY-r.top-r.height/2)*.28+"px")});b.addEventListener("pointerleave",function(){b.style.setProperty("--bx","0px");b.style.setProperty("--by","0px")})});
  var nav=$("#nav"),bg=$("#burger");
  bg.addEventListener("click",function(){var o=nav.classList.toggle("open");bg.setAttribute("aria-expanded",o);bg.innerHTML=o?"&#10005;":"&#9776;"});
  $$("a",nav).forEach(function(a){a.addEventListener("click",function(){nav.classList.remove("open")})});
  if("IntersectionObserver"in window){
    var sp=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)$$("a",nav).forEach(function(a){a.classList.toggle("on",a.getAttribute("href")==="#"+e.target.id)})})},{rootMargin:"-40% 0px -55% 0px"});
    $$("section[id]").forEach(function(s){sp.observe(s)});
  }
  var bar=$("#bar");
  addEventListener("scroll",function(){var h=document.documentElement,m=h.scrollHeight-h.clientHeight;bar.style.transform="scaleX("+(m>0?h.scrollTop/m:0)+")"},{passive:true});
  var t=$("#toast"),tt;
  $("#copy").addEventListener("click",function(){
    var m=$("#mail").textContent,ok=function(){t.textContent="Email copied";t.classList.add("show");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("show")},2000)};
    if(navigator.clipboard)navigator.clipboard.writeText(m).then(ok);
  });
})();
