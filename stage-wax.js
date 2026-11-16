/* 말랑이 방의 왁뿌볼. 기존 앱(index.html)의 왁뿌볼을 그대로 옮겨 왔다: 실물 그림 위에 조각 단위로 깨지는 사탕 껍질과 말랑한 속.
   쓰는 법: WAX.open(무대 요소, 안내 글 요소, 다 깼을 때 부를 함수) / WAX.preload() */
(()=>{
let actx=null;
function buzz(p){ try{ navigator.vibrate&&navigator.vibrate(p); }catch(e){} }
const SQIMG={};
function sqImg(src){ if(SQIMG[src]) return SQIMG[src]; const i=new Image(); i.src=src; return SQIMG[src]=i; }
/* ---- 왁뿌볼: 캔버스 물리 버전 (조각 단위로 깨지는 사탕 껍질 + 말랑한 속) ---- */
let wxNoise=null;
function wxAudio(){ try{ if(typeof sound!=='undefined'&&!sound) return null; actx=actx||(typeof ac==='function'?ac():null)||new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==='suspended') actx.resume();
  if(!wxNoise){ const n=actx.sampleRate; wxNoise=actx.createBuffer(1,n,n); const a=wxNoise.getChannelData(0); for(let i=0;i<n;i++) a[i]=Math.random()*2-1; } return actx; }catch(e){ return null; } }
function wxTick(vol,freq,dur,when,q){ const A=wxAudio(); if(!A) return; try{ const t=A.currentTime+(when||0), s=A.createBufferSource(); s.buffer=wxNoise;
  const f=A.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=q||6; const g=A.createGain();
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.002); g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  s.connect(f); f.connect(g); g.connect(A.destination); s.start(t,Math.random()*.8,dur+.02); }catch(e){} }
function wxCrackle(power){ // 빠직: 아주 짧은 고음 알갱이 여러 개
  const k=2+Math.floor(power*5); for(let i=0;i<k;i++) wxTick(.25+Math.random()*.35*power+.1, 2600+Math.random()*4200, .012+Math.random()*.03, i?Math.random()*.07*(1+power):0, 5+Math.random()*8); }
function wxSnap(power){ // 조각이 떨어질 때: 딱 + 낮은 울림
  const A=wxAudio(); if(!A) return; wxTick(.7,1500+Math.random()*900,.05,0,3); wxTick(.5,5200,.03,.004,4);
  try{ const t=A.currentTime, o=A.createOscillator(), g=A.createGain(); o.type='triangle'; o.frequency.setValueAtTime(260+Math.random()*80,t); o.frequency.exponentialRampToValueAtTime(90,t+.09);
    g.gain.setValueAtTime(.22*power,t); g.gain.exponentialRampToValueAtTime(.001,t+.11); o.connect(g); g.connect(A.destination); o.start(t); o.stop(t+.12); }catch(e){} }
function wxBoing(p){ const A=wxAudio(); if(!A) return; try{ const t=A.currentTime, o=A.createOscillator(), g=A.createGain(); o.type='sine'; o.frequency.setValueAtTime(150+p*60,t); o.frequency.exponentialRampToValueAtTime(330+p*120,t+.13);
  g.gain.setValueAtTime(.2,t); g.gain.exponentialRampToValueAtTime(.001,t+.22); o.connect(g); g.connect(A.destination); o.start(t); o.stop(t+.23); }catch(e){} }

function waxToy(st,cnt,finish){
  const COL=[ // [진한색, 밝은색, 속 젤리, 이름, 어두운색, 그림 번호]
    ['#e06a12','#ffb46a','#ffe0bf','꿀','#7a3206',0],['#d3202f','#ff8f98','#ffd5d2','딸기','#74101c',1],['#4faa1e','#b6ee8a','#dcf7c8','청포도','#225a0c',2],['#1e9fc9','#9fe0f5','#d5eefc','소다','#0c5878',3]];
  COL.forEach(c=>{ sqImg(`img/sq-candy-${c[5]}.webp`); sqImg(`img/sq-jelly-${c[5]}.webp`); });
  const ok=i=>i&&i.complete&&i.naturalWidth; let cimg=null, jimg=null;
  st.style.background='radial-gradient(circle at 50% 38%,#fffaf0,#f1dfb8)';
  st.innerHTML='<canvas class="wxcv" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none"></canvas><button class="wxagain" id="wxa" hidden>하나 더 깨기</button>';
  const cv=st.querySelector('canvas'), g=cv.getContext('2d'), again=st.querySelector('#wxa');
  let W=0,H=0,dpr=1,R=96,cx=0,cy=0;
  const fit=()=>{ W=st.clientWidth||320; H=st.clientHeight||240; dpr=Math.min(3,window.devicePixelRatio||1); cv.width=W*dpr; cv.height=H*dpr; R=Math.min(104,W*.3,H*.34); cx=W/2; cy=H*.47; };
  fit();
  let round=0, col, shards, hair, fly, dust, pops, total, gone, phase, sq, s=0, sv=0, jk=0, jv=0, jx=0, jy=0, tx=0, ty=0, shake=0, hold=null, lastT=0, bobT=0, dropY=0, dropV=0;

  function build(){
    col=COL[(round+Math.floor(Math.random()*COL.length))%COL.length];
    const N=24, seeds=[]; let tries=0;
    while(seeds.length<N && tries++<4000){ const a=Math.random()*6.283, r=Math.sqrt(Math.random())*.93, p=[Math.cos(a)*r,Math.sin(a)*r];
      if(seeds.every(q=>Math.hypot(q[0]-p[0],q[1]-p[1])>.3)) seeds.push(p); }
    shards=seeds.map((si,i)=>{ let poly=[]; for(let k=0;k<44;k++){ const a=k/44*6.283; poly.push([Math.cos(a),Math.sin(a)]); }
      seeds.forEach((sj,j)=>{ if(j===i||poly.length<3) return; const mx=(si[0]+sj[0])/2, my=(si[1]+sj[1])/2, nx=sj[0]-si[0], ny=sj[1]-si[1], out=[];
        for(let k=0;k<poly.length;k++){ const a=poly[k], b=poly[(k+1)%poly.length], da=(a[0]-mx)*nx+(a[1]-my)*ny, db=(b[0]-mx)*nx+(b[1]-my)*ny;
          if(da<=0) out.push(a); if((da<0&&db>0)||(da>0&&db<0)){ const t=da/(da-db); out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]); } }
        poly=out; });
      let mx=0,my=0; poly.forEach(p=>{mx+=p[0];my+=p[1];}); mx/=poly.length||1; my/=poly.length||1;
      return {poly, c:[mx,my], dmg:0, on:poly.length>=3, tough:.8+Math.random()*.5, jit:[0,0]}; }).filter(x=>x.on);
    cimg=sqImg(`img/sq-candy-${col[5]}.webp`); jimg=sqImg(`img/sq-jelly-${col[5]}.webp`);
    hair=[]; fly=[]; dust=[]; pops=[]; total=shards.length; gone=0; phase='shell'; sq=0; s=0; sv=0; jk=0; jv=0; jx=jy=tx=ty=0; hold=null; dropY=-H*.7; dropV=0; again.hidden=true;
    cnt.textContent=`${col[3]}맛 왁뿌볼 · 겉을 두드리거나 문질러서 깨요`;
  }
  const local=e=>{ const r=cv.getBoundingClientRect(), tn=!!(window.G&&window.G.rot), lx=tn?e.clientY-r.top:e.clientX-r.left, ly=tn?r.right-e.clientX:e.clientY-r.top; return [(lx-cx)/R, (ly-cy-dropY)/R]; };
  function popShard(sh,hx,hy,power){ sh.on=false; gone++;
    const dx=sh.c[0]-hx*.35, dy=sh.c[1]-hy*.35, L=Math.hypot(dx,dy)||1, sp=(150+Math.random()*190)*(.7+power*.5);
    fly.push({ox:sh.c[0]*R, oy:sh.c[1]*R, poly:sh.poly.map(p=>[(p[0]-sh.c[0])*R,(p[1]-sh.c[1])*R]), x:cx+sh.c[0]*R, y:cy+sh.c[1]*R, vx:dx/L*sp+(Math.random()-.5)*60, vy:dy/L*sp-120-Math.random()*120, r:0, vr:(Math.random()-.5)*14, t:0, b:0, lite:Math.random()<.4});
    for(let i=0;i<5;i++) dust.push({x:cx+sh.c[0]*R,y:cy+sh.c[1]*R,vx:(Math.random()-.5)*260,vy:-Math.random()*240-20,t:0,z:1.5+Math.random()*2.5,w:Math.random()<.5});
    hair=hair.filter(h=>h.sh!==sh); }
  function hit(x,y,power,quiet){ if(phase!=='shell') return 0; const d0=Math.hypot(x,y); if(d0>1.04) return 0;
    let popped=0, near=null, nd=9; const rad=.42+power*.3;
    shards.forEach(sh=>{ if(!sh.on) return; const d=Math.hypot(sh.c[0]-x,sh.c[1]-y); if(d<nd){ nd=d; near=sh; }
      const f=Math.max(0,1-d/rad); if(f<=0) return; sh.dmg+=power*f*f/sh.tough; sh.jit=[(Math.random()-.5)*.012,(Math.random()-.5)*.012];
      if(sh.dmg>=1){ popShard(sh,x,y,power); popped++; } });
    if(near&&near.on&&!quiet&&hair.length<70){ const k=2+Math.floor(Math.random()*3); for(let i=0;i<k;i++){ let a=Math.random()*6.283, px=x, py=y; const pts=[[x,y]], seg=2+Math.floor(Math.random()*3);
        for(let j=0;j<seg;j++){ a+=(Math.random()-.5)*1.2; const L=.05+Math.random()*.1; px+=Math.cos(a)*L; py+=Math.sin(a)*L; pts.push([px,py]); } hair.push({pts,sh:near}); } }
    if(popped){ wxSnap(Math.min(1,.5+popped*.25)); wxCrackle(.6); buzz(popped>1?[18,20,30]:22); shake=Math.min(9,shake+3+popped*2); sv+=.5+popped*.3;
      if(Math.random()<.6||popped>1) pops.push({x:cx+x*R,y:cy+y*R-10,t:0,s:popped>1?'와작!':['빠직!','톡!','쩍!','딱!'][Math.floor(Math.random()*4)]}); }
    else if(!quiet){ wxCrackle(Math.min(1,power)); buzz(8); sv+=.9*power; }
    const left=total-gone;
    if(left>0&&left<=2){ shards.forEach(sh=>{ if(sh.on) popShard(sh,x,y,1); }); wxSnap(1); }
    if(gone>=total){ phase='jelly'; jv+=4; buzz([30,30,50]); cnt.textContent='다 깼다! 이제 속 젤리를 눌러요 0 / 5'; pops.push({x:cx,y:cy-R-18,t:0,s:'와장창!',big:1}); }
    else cnt.textContent=`조각 ${gone} / ${total}`;
    return popped; }

  cv.addEventListener('pointerdown',e=>{ e.preventDefault(); try{ cv.setPointerCapture(e.pointerId); }catch(_){}
    wxAudio(); const [x,y]=local(e);
    if(phase==='shell'){ hold={x,y,t:0,acc:0,id:e.pointerId}; hit(x,y,.5); }
    else if(phase==='jelly'&&sq<5&&Math.hypot(x,y)<1.15){ hold={x,y,t:0,id:e.pointerId,j:1}; tx=x*R*.22; ty=y*R*.22; buzz(12); wxBoing(0); } });
  cv.addEventListener('pointermove',e=>{ if(!hold||hold.id!==e.pointerId) return; const [x,y]=local(e);
    if(phase==='shell'){ const d=Math.hypot(x-hold.x,y-hold.y); hold.acc+=d; hold.x=x; hold.y=y; hold.t=0;
      if(hold.acc>.09){ hit(x,y,Math.min(.5,hold.acc*1.6), hold.acc<.16&&Math.random()<.5); hold.acc=0; } }
    else if(hold.j){ hold.x=x; hold.y=y; tx=Math.max(-1,Math.min(1,x))*R*.22; ty=Math.max(-1,Math.min(1,y))*R*.22; } });
  const up=e=>{ if(!hold||(e.pointerId!==undefined&&hold.id!==e.pointerId)) return; const h=hold; hold=null;
    if(h.j&&phase==='jelly'){ tx=ty=0; jv-=7; wxBoing(1); buzz(18); sq++; pops.push({x:cx+(Math.random()-.5)*60,y:cy-R-8,t:0,s:['말랑','쫀득','탱글','몰캉','통통'][sq%5]});
      if(sq>=5){ round++; phase='done'; cnt.textContent=`왁뿌볼 ${round}개 깼다!`; again.hidden=false; finish(); } else cnt.textContent=`속 젤리를 눌러요 ${sq} / 5`; } };
  ['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,up));
  again.onclick=()=>{ build(); };

  function ballPath(){ g.beginPath(); shards.forEach(sh=>{ if(!sh.on) return; sh.poly.forEach((p,i)=>{ const X=(p[0]+sh.jit[0]*sh.dmg)*R, Y=(p[1]+sh.jit[1]*sh.dmg)*R; i?g.lineTo(X,Y):g.moveTo(X,Y); }); g.closePath(); }); }
  function frame(now){ if(!st.isConnected||!cv.isConnected) return; requestAnimationFrame(frame);
    const dt=Math.min(.033,(now-(lastT||now))/1000); lastT=now; bobT+=dt;
    if(Math.abs(cv.width-st.clientWidth*dpr)>2&&st.clientWidth) fit();
    // 물리
    if(dropY<0||dropV){ dropV+=2600*dt; dropY+=dropV*dt; if(dropY>=0){ dropY=0; if(dropV>260){ sv+=dropV/420; dropV=-dropV*.28; wxTick(.5,700,.05,0,2); buzz(10); } else dropV=0; } }
    if(hold&&phase==='shell'){ hold.t+=dt; if(hold.t>.28){ hold.t=.14; hit(hold.x,hold.y,.3); } }
    const tgt=hold&&phase==='shell'?.05:0; sv+=(-(s-tgt)*190-sv*13)*dt; s+=sv*dt;
    const jt=hold&&hold.j?.17:0; jv+=(-(jk-jt)*150-jv*(hold&&hold.j?22:7))*dt; jk+=jv*dt; jx+=(tx-jx)*Math.min(1,dt*14); jy+=(ty-jy)*Math.min(1,dt*14);
    shake*=Math.pow(.0009,dt);
    g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
    const shx=(Math.random()-.5)*shake, shy=(Math.random()-.5)*shake, bob=phase==='shell'?Math.sin(bobT*1.6)*1.5:0;
    // 바닥 그림자
    const fy=cy+R+10; g.fillStyle='rgba(26,25,23,.16)'; g.beginPath(); g.ellipse(cx+shx,fy,R*(.82+s*.5)*(1+dropY/H*.5),R*.13,0,0,6.283); g.fill();
    g.save(); g.translate(cx+shx,cy+R+shy+dropY+bob); g.scale(1+s,1-s); g.translate(0,-R);
    // 속 젤리
    g.save(); g.translate(jx,jy+R); g.scale(1+jk,1-jk); g.translate(0,-R);
    const rc=R-7, cg=g.createRadialGradient(-rc*.35,-rc*.4,rc*.05,0,0,rc*1.05); cg.addColorStop(0,'#fff'); cg.addColorStop(.3,col[2]); cg.addColorStop(1,col[1]);
    if(ok(jimg)){ g.drawImage(jimg,-rc,-rc,rc*2,rc*2); g.restore(); } else { g.beginPath(); g.arc(0,0,rc,0,6.283); g.fillStyle=cg; g.fill(); g.lineWidth=1.5; g.strokeStyle=col[0]; g.globalAlpha=.5; g.stroke(); g.globalAlpha=1;
    g.fillStyle='rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(-rc*.38,-rc*.45,rc*.26,rc*.13,-.6,0,6.283); g.fill();
    g.fillStyle='rgba(255,255,255,.55)'; [[.3,.35,.07],[.5,.05,.04],[-.2,.5,.05],[.05,-.1,.03]].forEach(b=>{ g.beginPath(); g.arc(b[0]*rc,b[1]*rc,b[2]*rc,0,6.283); g.fill(); });
    g.restore(); }
    // 껍질
    if(gone<total){ ballPath(); g.lineJoin='round'; if(!ok(cimg)){ g.lineWidth=3.5; g.strokeStyle=col[4]; g.stroke(); }
      const sg=g.createRadialGradient(-R*.35,-R*.42,R*.06,0,0,R*1.08); sg.addColorStop(0,'#fff'); sg.addColorStop(.16,col[1]); sg.addColorStop(.72,col[0]); sg.addColorStop(1,col[4]);
      if(ok(cimg)){ g.save(); ballPath(); g.clip(); g.drawImage(cimg,-R,-R,R*2,R*2); g.restore(); } else { ballPath(); g.fillStyle=sg; g.fill(); g.lineWidth=1.2; g.strokeStyle=sg; g.stroke(); }
      g.save(); ballPath(); g.clip();
      // 금
      shards.forEach(sh=>{ if(!sh.on||sh.dmg<=0) return; const a=Math.min(1,sh.dmg*1.5); const P=sh.poly;
        for(let pass=0;pass<2;pass++){ g.beginPath(); for(let i=0;i<P.length;i++){ const A=P[i],B=P[(i+1)%P.length]; if(Math.hypot(A[0],A[1])>.985&&Math.hypot(B[0],B[1])>.985) continue; const o=pass?0:1.3; g.moveTo(A[0]*R+o,A[1]*R+o); g.lineTo(B[0]*R+o,B[1]*R+o); }
          g.lineWidth=pass?1.7:1.2; g.strokeStyle=pass?`rgba(255,255,255,${a})`:`rgba(26,25,23,${a*.35})`; g.stroke(); } });
      g.lineWidth=1.1; g.strokeStyle='rgba(255,255,255,.85)'; g.beginPath(); hair.forEach(h=>{ h.pts.forEach((p,i)=>{ i?g.lineTo(p[0]*R,p[1]*R):g.moveTo(p[0]*R,p[1]*R); }); }); g.stroke();
      // 윤기
      if(!ok(cimg)){ g.fillStyle='rgba(255,255,255,.78)'; g.beginPath(); g.ellipse(-R*.4,-R*.5,R*.3,R*.14,-.62,0,6.283); g.fill();
      g.fillStyle='rgba(255,255,255,.6)'; g.beginPath(); g.arc(-R*.62,-R*.18,R*.05,0,6.283); g.fill();
      g.strokeStyle='rgba(255,255,255,.3)'; g.lineWidth=R*.07; g.lineCap='round'; g.beginPath(); g.arc(0,0,R*.8,.5,1.35); g.stroke(); }
      g.restore(); }
    g.restore();
    // 날아가는 조각
    fly=fly.filter(f=>f.t<1.5); fly.forEach(f=>{ f.t+=dt; f.vy+=1500*dt; f.x+=f.vx*dt; f.y+=f.vy*dt; f.r+=f.vr*dt;
      if(f.y>fy&&f.vy>0&&f.b<2){ f.y=fy; f.vy*=-.38; f.vx*=.6; f.vr*=.5; f.b++; if(f.b===1) wxTick(.18,3000+Math.random()*2500,.02,0,7); }
      g.save(); g.globalAlpha=Math.max(0,Math.min(1,(1.5-f.t)*2.5)); g.translate(f.x,f.y); g.rotate(f.r); g.beginPath(); f.poly.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.closePath();
      const fg=g.createLinearGradient(-14,-14,14,14); fg.addColorStop(0,col[1]); fg.addColorStop(.5,col[0]); fg.addColorStop(1,col[4]); if(ok(cimg)){ g.save(); g.clip(); g.drawImage(cimg,-R-f.ox,-R-f.oy,R*2,R*2); g.restore(); } else { g.fillStyle=fg; g.fill(); } g.lineWidth=1; g.strokeStyle='rgba(255,255,255,.7)'; g.stroke(); g.fillStyle='rgba(255,255,255,.55)'; g.beginPath(); g.arc(f.poly[0][0]*.3,f.poly[0][1]*.3,2.2,0,6.283); g.fill(); g.restore(); });
    dust=dust.filter(d=>d.t<.7); dust.forEach(d=>{ d.t+=dt; d.vy+=900*dt; d.x+=d.vx*dt; d.y+=d.vy*dt; g.globalAlpha=1-d.t/.7; g.fillStyle=d.w?'#fff':col[1]; g.fillRect(d.x,d.y,d.z,d.z); }); g.globalAlpha=1;
    pops=pops.filter(p=>p.t<.8); pops.forEach(p=>{ p.t+=dt; const k=Math.min(1,p.t/.12); g.globalAlpha=Math.max(0,1-(p.t-.4)/.4); g.font=`900 ${(p.big?26:17)*(.6+.4*k)}px "Do Hyeon",system-ui,sans-serif`; g.textAlign='center';
      const X=Math.max(40,Math.min(W-40,p.x)), Y=Math.max(22,p.y-p.t*38); g.lineWidth=4; g.strokeStyle='#fffaf0'; g.strokeText(p.s,X,Y); g.fillStyle='#1a1917'; g.fillText(p.s,X,Y); }); g.globalAlpha=1;
  }
  build(); requestAnimationFrame(frame);
}
window.WAX={open:waxToy,preload(){ for(let i=0;i<4;i++){ sqImg('img/sq-candy-'+i+'.webp'); sqImg('img/sq-jelly-'+i+'.webp'); } }};
})();
