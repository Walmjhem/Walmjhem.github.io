(function(){
  var cv=document.getElementById("space"),cx=cv.getContext("2d"),W,H,dpr,stars=[],belt=[],shoot=[],mx=0,my=0,sy=0,last=0,t=0,nextS=4,TEX=[];
  var rd=matchMedia("(prefers-reduced-motion: reduce)").matches,TAU=Math.PI*2,rnd=Math.random;
  window.__pal=function(){if(rd)draw()};
  function mk(fn){var c=document.createElement("canvas");c.width=256;c.height=128;var g=c.getContext("2d");fn(g);g.drawImage(c,0,0,128,128,128,0,128,128);return c}
  function blobs(g,cols,n,rmin,rmax,a){for(var i=0;i<n;i++){g.fillStyle=cols[(rnd()*cols.length)|0];g.globalAlpha=a;g.beginPath();g.ellipse(rnd()*128,rnd()*128,rmin+rnd()*(rmax-rmin),(rmin+rnd()*(rmax-rmin))*.6,0,0,TAU);g.fill()}g.globalAlpha=1}
  function bands(g,cols,n,a){for(var i=0;i<n;i++){g.fillStyle=cols[(rnd()*cols.length)|0];g.globalAlpha=a;g.fillRect(0,rnd()*128,128,2+rnd()*9)}g.globalAlpha=1}
  function base(g,c){g.fillStyle=c;g.fillRect(0,0,128,128)}
  // name, color, size, orbit speed, spin, tex builder, flags
  var PL=[
   {s:2.3,v:.62,sp:.4,f:function(g){base(g,"#8d8780");blobs(g,["#6e6963","#a9a39b","#5d5852"],40,2,8,.5)}},
   {s:3.8,v:.5,sp:.15,f:function(g){base(g,"#d9b97c");blobs(g,["#e8d09a","#c79f5e","#efe0b8"],30,6,20,.35);bands(g,["#e6cf9a","#c9a45f"],10,.3)}},
   {s:4.1,v:.42,sp:.7,earth:1,f:function(g){base(g,"#1d4f91");blobs(g,["#2f7a45","#4f6d36","#8a7a52"],16,8,22,.95);blobs(g,["#ffffff"],26,6,20,.35);blobs(g,["#eaf2ff"],6,8,16,.7)}},
   {s:3.1,v:.34,sp:.65,f:function(g){base(g,"#a8522f");blobs(g,["#7d3a22","#c47a4c","#8e4a2b"],34,3,14,.5);blobs(g,["#f0e6dc"],3,4,8,.6)}},
   {s:10,v:.2,sp:1.4,moons:[{d:1.5,w:2.6,p:0,r:.1,c:"#e8d27a"},{d:1.9,w:1.7,p:2,r:.09,c:"#d9d2c4"},{d:2.4,w:1,p:4,r:.14,c:"#a89c88"},{d:2.9,w:.55,p:1,r:.12,c:"#7d7366"}],f:function(g){base(g,"#cfa97c");bands(g,["#b78859","#e8d2b0","#a26b45","#f1e4cc","#8f5e3c"],34,.55);g.fillStyle="#b4522f";g.globalAlpha=.8;g.beginPath();g.ellipse(80,84,11,6,0,0,TAU);g.fill();g.globalAlpha=1}},
   {s:8.4,v:.15,sp:1.2,ring:1,moons:[{d:2.7,w:.7,p:1,r:.1,c:"#e0b060"}],f:function(g){base(g,"#dcc48e");bands(g,["#c4a96f","#ead9ab","#b99a5c"],22,.4)}},
   {s:5.5,v:.1,sp:.8,f:function(g){base(g,"#8fd0d6");bands(g,["#a5e0e4","#7fbfc7"],8,.25)}},
   {s:5.3,v:.08,sp:.8,f:function(g){base(g,"#2f4fc2");bands(g,["#3d63d6","#2540a0"],9,.3);blobs(g,["#7fa0ff"],4,4,9,.3)}}
  ];
  PL.forEach(function(p){p.tex=mk(p.f)});
  var COM=[{a:.85,e:.86,r:.7,w:.05,p:1.2},{a:.66,e:.8,r:-.8,w:.075,p:3.4}];
  var ang=PL.map(function(_,i){return i*1.9+.5});
  function size(){
    dpr=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);
    stars=[];var n=Math.round(W*H/3600),i,h,x,y;
    for(i=0;i<n;i++){h=rnd();
      if(rnd()<.38){var k=rnd(),px=-.1*W+k*1.2*W,py=H*.9-k*H*.8,g=(rnd()+rnd()+rnd()-1.5)*H*.18;x=px-g*.6;y=py+g*.8}else{x=rnd()*W;y=rnd()*H}
      stars.push({x:x,y:y,z:.2+rnd()*.8,r:Math.pow(rnd(),3)*1.5+.25,p:rnd()*TAU,s:.5+rnd()*1.6,c:h<.1?"170,200,255":h<.2?"255,226,190":"240,244,255"})}
    belt=[];for(i=0;i<260;i++)belt.push({a:rnd()*TAU,d:.92+rnd()*.16,r:rnd()*1+.3,s:.03+rnd()*.03,c:rnd()<.5?"150,140,128":"110,104,96"});
    if(rd)draw();
  }
  function draw(){
    cx.clearRect(0,0,W,H);
    cx.save();cx.translate(W*.5,H*.5);cx.rotate(-.62);var mg=cx.createLinearGradient(0,-H*.28,0,H*.28);mg.addColorStop(0,"rgba(150,170,220,0)");mg.addColorStop(.5,"rgba(160,180,230,.07)");mg.addColorStop(1,"rgba(150,170,220,0)");cx.fillStyle=mg;cx.fillRect(-W,-H*.28,W*2,H*.56);cx.restore();
    stars.forEach(function(s){var x=s.x-mx*12*s.z,y=((s.y-sy*.1*s.z)%H+H)%H,a=(.3+.7*Math.abs(Math.sin(t*s.s+s.p)))*(.4+.6*s.z);
      cx.fillStyle="rgba("+s.c+","+a.toFixed(2)+")";cx.beginPath();cx.arc(x,y,s.r*s.z+.2,0,TAU);cx.fill()});
    var mob=W<860,u=Math.min(W,H*1.3)*(mob?.5:.52),ox=(mob?W*.5:W*.74)-mx*14,oy=(mob?H*.26:H*.42)-sy*.1-my*8,sq=.34,rot=-.26,cr=Math.cos(rot),sr=Math.sin(rot);
    function pt(a,r){var x=Math.cos(a)*r,y=Math.sin(a)*r*sq;return[ox+x*cr-y*sr,oy+x*sr+y*cr]}
    cx.lineWidth=1;cx.strokeStyle="rgba(200,215,245,.075)";
    PL.forEach(function(p,i){var r=u*(.17+i*.1);cx.beginPath();cx.ellipse(ox,oy,r,r*sq,rot,0,TAU);cx.stroke()});
    belt.forEach(function(b){var q=pt(b.a+t*b.s*.6,u*.52*b.d);cx.fillStyle="rgba("+b.c+",.7)";cx.beginPath();cx.arc(q[0],q[1],b.r,0,TAU);cx.fill()});
    var S=u*.062,PU=7*(1+.03*Math.sin(t*.9)),g=cx.createRadialGradient(ox,oy,0,ox,oy,S*PU);
    g.addColorStop(0,"rgba(255,248,225,.95)");g.addColorStop(.14,"rgba(255,214,120,.55)");g.addColorStop(.35,"rgba(255,150,50,.16)");g.addColorStop(1,"rgba(255,120,30,0)");
    cx.fillStyle=g;cx.beginPath();cx.arc(ox,oy,S*PU,0,TAU);cx.fill();
    var sg=cx.createRadialGradient(ox,oy,0,ox,oy,S);sg.addColorStop(0,"#fffef5");sg.addColorStop(.7,"#ffe9a8");sg.addColorStop(1,"#ffb347");cx.fillStyle=sg;cx.beginPath();cx.arc(ox,oy,S,0,TAU);cx.fill();
    var list=PL.map(function(p,i){var r=u*(.17+i*.1),a=ang[i]+t*p.v*.25,q=pt(a,r);return{p:p,x:q[0],y:q[1],a:a,r:r}}).sort(function(m,n){return m.y-n.y});
    list.forEach(function(o){
      var p=o.p,R=p.s*(u/200)+2,x=o.x,y=o.y,dx=ox-x,dy=oy-y,dl=Math.sqrt(dx*dx+dy*dy)||1;dx/=dl;dy/=dl;
      if(p.ring){cx.strokeStyle="rgba(222,205,160,.55)";cx.lineWidth=R*.5;cx.beginPath();cx.ellipse(x,y,R*1.75,R*.55,rot,Math.PI,TAU);cx.stroke();cx.strokeStyle="rgba(180,160,120,.4)";cx.lineWidth=R*.2;cx.beginPath();cx.ellipse(x,y,R*2.15,R*.7,rot,Math.PI,TAU);cx.stroke()}
      cx.save();cx.beginPath();cx.arc(x,y,R,0,TAU);cx.clip();
      var off=(t*p.sp*4)%128;cx.drawImage(p.tex,off,0,128,128,x-R,y-R,R*2,R*2);
      var sh=cx.createRadialGradient(x+dx*R*.5,y+dy*R*.5,R*.1,x+dx*R*.15,y+dy*R*.15,R*1.25);sh.addColorStop(0,"rgba(0,0,0,0)");sh.addColorStop(.5,"rgba(0,0,10,.25)");sh.addColorStop(1,"rgba(0,0,8,.94)");
      cx.fillStyle=sh;cx.fillRect(x-R,y-R,R*2,R*2);cx.restore();
      if(p.earth){cx.strokeStyle="rgba(130,180,255,.35)";cx.lineWidth=1.2;cx.beginPath();cx.arc(x,y,R+.6,0,TAU);cx.stroke();var m=t*1.4;cx.fillStyle="rgba(200,200,205,.9)";cx.beginPath();cx.arc(x+Math.cos(m)*R*2.1,y+Math.sin(m)*R*.8,R*.27,0,TAU);cx.fill()}
      if(p.moons){p.moons.forEach(function(m){var a=t*m.w+m.p;cx.fillStyle=m.c;cx.beginPath();cx.arc(x+Math.cos(a)*R*m.d,y+Math.sin(a)*R*m.d*.38,Math.max(1,R*m.r),0,TAU);cx.fill()})}
      if(p.ring){cx.strokeStyle="rgba(222,205,160,.6)";cx.lineWidth=R*.5;cx.beginPath();cx.ellipse(x,y,R*1.75,R*.55,rot,0,Math.PI);cx.stroke();cx.strokeStyle="rgba(180,160,120,.45)";cx.lineWidth=R*.2;cx.beginPath();cx.ellipse(x,y,R*2.15,R*.7,rot,0,Math.PI);cx.stroke()}
    });
    COM.forEach(function(c){var M=(t*c.w+c.p)%TAU,E=M,i;for(i=0;i<6;i++)E-=(E-c.e*Math.sin(E)-M)/(1-c.e*Math.cos(E));
      var a=u*c.a,b=a*Math.sqrt(1-c.e*c.e),px=a*(Math.cos(E)-c.e),py=b*Math.sin(E)*.62,cs=Math.cos(c.r),sn=Math.sin(c.r),x=ox+px*cs-py*sn,y=oy+px*sn+py*cs,dx=x-ox,dy=y-oy,d=Math.sqrt(dx*dx+dy*dy)||1,ux=dx/d,uy=dy/d,L=Math.max(16,Math.min(u*.38,u*.045/(d/u))),w=Math.max(1.5,u*.006);
      var gi=cx.createLinearGradient(x,y,x+ux*L,y+uy*L);gi.addColorStop(0,"rgba(170,210,255,.7)");gi.addColorStop(1,"rgba(170,210,255,0)");cx.fillStyle=gi;cx.beginPath();cx.moveTo(x-uy*w,y+ux*w);cx.lineTo(x+ux*L,y+uy*L);cx.lineTo(x+uy*w,y-ux*w);cx.closePath();cx.fill();
      var gd=cx.createLinearGradient(x,y,x+ux*L*.7,y+uy*L*.7);gd.addColorStop(0,"rgba(255,225,180,.5)");gd.addColorStop(1,"rgba(255,225,180,0)");cx.fillStyle=gd;cx.beginPath();cx.moveTo(x-uy*w*1.8,y+ux*w*1.8);cx.quadraticCurveTo(x+ux*L*.5+uy*L*.12,y+uy*L*.5-ux*L*.12,x+ux*L*.7+uy*L*.25,y+uy*L*.7-ux*L*.25);cx.lineTo(x+uy*w*1.8,y-ux*w*1.8);cx.closePath();cx.fill();
      var hg=cx.createRadialGradient(x,y,0,x,y,w*4);hg.addColorStop(0,"rgba(255,255,255,.95)");hg.addColorStop(1,"rgba(200,225,255,0)");cx.fillStyle=hg;cx.beginPath();cx.arc(x,y,w*4,0,TAU);cx.fill()});
    shoot.forEach(function(s){var gr=cx.createLinearGradient(s.x,s.y,s.x-s.vx*.2,s.y-s.vy*.2);gr.addColorStop(0,"rgba(255,255,255,"+s.l+")");gr.addColorStop(1,"rgba(255,255,255,0)");cx.strokeStyle=gr;cx.lineWidth=1.3;cx.beginPath();cx.moveTo(s.x,s.y);cx.lineTo(s.x-s.vx*.2,s.y-s.vy*.2);cx.stroke()});
  }
  function tick(ts){var dt=Math.min((ts-last)/1000||0,.05);last=ts;t+=dt;
    nextS-=dt;if(nextS<0){nextS=6+rnd()*8;shoot.push({x:W*(.35+rnd()*.65),y:rnd()*H*.4,vx:-(520+rnd()*280),vy:240+rnd()*140,l:1})}
    shoot.forEach(function(s){s.x+=s.vx*dt;s.y+=s.vy*dt;s.l-=dt*1.1});shoot=shoot.filter(function(s){return s.l>0});
    draw();requestAnimationFrame(tick)}
  addEventListener("resize",size);
  addEventListener("pointermove",function(e){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  addEventListener("scroll",function(){sy=scrollY;if(rd)draw()},{passive:true});
  size();if(!rd){document.addEventListener("visibilitychange",function(){last=performance.now()});requestAnimationFrame(tick)}
})();
