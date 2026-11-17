/* 말랑이: 수요일 통로 방의 왁뿌볼과 본부 말랑이 상자의 말랑이들. 기존 앱(index.html)의 것을 그대로 옮겨 왔다.
   왁뿌볼은 실물 그림 위에 조각 단위로 깨지는 사탕 껍질과 말랑한 속, 나머지는 실물 그림을 그물망으로 감싸 누른 자리가 들어가고 출렁이는 장난감이다.
   쓰는 법: WAX.open(무대 요소, 안내 글 요소, 다 깼을 때 부를 함수) / WAX.toy(이름, 무대 요소, 안내 글 요소) / WAX.info(이름) / WAX.preload(이름)
   소리는 게임의 ♪ 버튼을 따른다 (stage.html이 window.gameAudio를 내어 준다) */
(()=>{
let actx=null;
function buzz(p){ try{ navigator.vibrate&&navigator.vibrate(p); }catch(e){} }
const SQIMG={};
function sqImg(src){ if(SQIMG[src]) return SQIMG[src]; const i=new Image(); i.onerror=()=>{ if(SQIMG[src]===i) delete SQIMG[src]; }; i.src=src; return SQIMG[src]=i; }   // 못 받은 그림은 기억하지 않는다. 다음에 다시 받는다
/* ---- 왁뿌볼: 캔버스 물리 버전 (조각 단위로 깨지는 사탕 껍질 + 말랑한 속) ---- */
let wxNoise=null;
// 게임과 같은 소리 통로를 쓴다. 게임에서 소리를 꺼 두었으면(♪ → ×) 말랑이도 조용하다. 게임 밖에서 따로 열었을 때만 제 것을 만든다
function wxAudio(){ try{ const A=window.gameAudio?window.gameAudio():(actx=actx||new (window.AudioContext||window.webkitAudioContext)()); if(!A) return null; if(A.state==='suspended') A.resume();
  if(!wxNoise){ const n=A.sampleRate; wxNoise=A.createBuffer(1,n,n); const a=wxNoise.getChannelData(0); for(let i=0;i<n;i++) a[i]=Math.random()*2-1; } return A; }catch(e){ return null; } }
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
    if(st.clientWidth&&(Math.abs(cv.width-st.clientWidth*dpr)>2||Math.abs(cv.height-st.clientHeight*dpr)>2)) fit();   // 폰을 돌리면 다시 맞춘다
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
/* ---- 말랑이: 실물 그림을 그물망으로 감싸 누른 자리가 들어가고 출렁이는 장난감. 기존 앱(index.html)의 것을 옮겨 왔다.
   k: 되돌아오는 힘, c: 출렁임이 잦아드는 빠르기, kn: 옆으로 번지는 정도, drag: 손가락에 끌려오는 정도, plastic: 눌린 자국이 남는 빠르기 ---- */
const SOFT={
  apple:{name:'말랑 사과',tag:'사과',img:'img/sq-apple.webp',k:150,c:8,kn:60,drag:.55,words:['말랑','탱글','몰캉','통통','쫀득'],hint:'누르면 쑥 들어가고, 누른 채 끌면 늘어나요'},
  peach:{name:'말랑 복숭아',tag:'복숭아',img:'img/sq-peach.webp',k:150,c:8,kn:60,drag:.55,words:['말랑','탱글','몰캉','통통','쫀득'],hint:'누르면 쑥 들어가고, 누른 채 끌면 늘어나요'},
  mandarin:{name:'말랑 귤',tag:'귤',img:'img/sq-mandarin.webp',k:150,c:8,kn:60,drag:.55,words:['말랑','탱글','몰캉','통통','쫀득'],hint:'누르면 쑥 들어가고, 누른 채 끌면 늘어나요'},
  butter:{name:'버터 슬랑이',tag:'슬랑이',img:'img/sq-butter.webp',k:190,c:26,kn:30,drag:.5,plastic:5,words:['쏙','푹','스윽','쑥'],reset:'다시 뭉치기',hint:'누른 자국이 그대로 남아요. 모양을 바꿔 보고 다시 뭉쳐요'},
  mochi:{name:'말랑 찹쌀떡',tag:'찹쌀떡',img:'img/sq-mochi.webp',k:70,c:6.5,kn:45,drag:1.15,words:['쫀득','쭈욱','말랑','쫄깃'],hint:'잡고 길게 끌었다가 놓으면 느릿하게 돌아와요'} };
function softToy(st,cnt,key){ const O=SOFT[key]; if(!O) return;
  st.style.background='radial-gradient(circle at 50% 36%,#fffaf0,#efdcb4)';
  st.innerHTML='<canvas class="wxcv" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none"></canvas>'+(O.reset?'<button class="wxagain" id="sqre">'+O.reset+'</button>':'');
  const cv=st.querySelector('canvas'), g=cv.getContext('2d'), N=12, V=(N+1)*(N+1);
  let img=sqImg(O.img), W=0,H=0,dpr=1,S=200,cx=0,cy=0,amap=null,tried=false,retry=0;
  const rx=new Float32Array(V), ry=new Float32Array(V), dx=new Float32Array(V), dy=new Float32Array(V), vx=new Float32Array(V), vy=new Float32Array(V), px=new Float32Array(V), py=new Float32Array(V), ax=new Float32Array(V), ay=new Float32Array(V);
  for(let j=0;j<=N;j++) for(let i=0;i<=N;i++){ const q=j*(N+1)+i; rx[q]=i/N*2-1; ry[q]=j/N*2-1; }
  const fit=()=>{ W=st.clientWidth||320; H=st.clientHeight||240; dpr=Math.min(3,window.devicePixelRatio||1); cv.width=W*dpr; cv.height=H*dpr; S=Math.min(W*.66,H*.8); cx=W/2; cy=H*.5; };
  fit();
  let hold=null, depth=0, k=0, lastT=0, live=1, marks=[], pops=[], sq=0, sqv=3;
  // 그림의 투명한 자리는 눌리지 않는다
  const mkmap=()=>{ amap=null; try{ const c=document.createElement('canvas'); c.width=c.height=48; const x=c.getContext('2d'); x.drawImage(img,0,0,48,48); amap=x.getImageData(0,0,48,48).data; }catch(e){ amap=null; } };
  const solid=(x,y)=>{ if(Math.abs(x)>1||Math.abs(y)>1) return false; if(!amap) return x*x+y*y<.9; const u=Math.min(47,Math.max(0,Math.floor((x+1)*24))), v=Math.min(47,Math.max(0,Math.floor((y+1)*24))); return amap[(v*48+u)*4+3]>40; };
  if(img.complete&&img.naturalWidth) mkmap(); else img.addEventListener('load',mkmap,{once:true});
  const re=st.querySelector('#sqre'); if(re) re.onclick=()=>{ px.fill(0); py.fill(0); marks=[]; sqv=4; live=1; wxBoing(.5); };
  // 폰을 세로로 든 채 돌려 그린 화면에서는 손가락 자리도 돌려서 읽는다
  const local=e=>{ const r=cv.getBoundingClientRect(), tn=!!(window.G&&window.G.rot), lx=tn?e.clientY-r.top:e.clientX-r.left, ly=tn?r.right-e.clientX:e.clientY-r.top; return [(lx-cx)/(S/2),(ly-cy)/(S/2)]; };
  const label=()=>{ cnt.textContent=k?O.name+' · '+k+'번 주물렀다':O.name+' · '+O.hint; };
  cv.addEventListener('pointerdown',e=>{ e.preventDefault(); if(!(img.complete&&img.naturalWidth)) return; const [x,y]=local(e); if(!solid(x,y)) return; try{ cv.setPointerCapture(e.pointerId); }catch(_){}   // 그림이 뜨기 전에는 눌리지 않는다
    wxAudio(); hold={id:e.pointerId,x0:x,y0:y,x,y,t:0,far:0}; depth=0; live=1; buzz(10); wxTick(.25,420,.09,0,1.2); });
  cv.addEventListener('pointermove',e=>{ if(!hold||hold.id!==e.pointerId) return; const [x,y]=local(e); let ddx=x-hold.x0, ddy=y-hold.y0; const L=Math.hypot(ddx,ddy), M=O.drag>1?1.5:1; if(L>M){ ddx*=M/L; ddy*=M/L; }
    hold.x=hold.x0+ddx; hold.y=hold.y0+ddy; const f=Math.min(M,L); if(f-hold.far>.22){ hold.far=f; buzz(6); wxTick(.12,300+f*500,.05,0,2); } });
  const up=e=>{ if(!hold||(e.pointerId!==undefined&&hold.id!==e.pointerId)) return; const h=hold; hold=null; const str=Math.hypot(h.x-h.x0,h.y-h.y0);
    if(O.plastic){ marks.push({x:h.x0+(h.x-h.x0)*.5,y:h.y0+(h.y-h.y0)*.5,d:depth}); if(marks.length>16) marks.shift(); wxTick(.3,260,.08,0,1); }
    else { wxBoing(Math.min(1,str+depth*.4)); sqv-=1.2*depth; }
    buzz(str>.5?[14,30,18]:16); k++; const ws=O.words; pops.push({x:cx+h.x0*S/2,y:cy+h.y0*S/2-24,t:0,s:ws[k%ws.length]}); label(); };
  ['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,up));
  function step(dt){ const sg=.42, s2=2*sg*sg, K=O.k, C=O.c, KN=O.kn;
    let hx0=0,hy0=0,hdx=0,hdy=0; if(hold){ hx0=hold.x0; hy0=hold.y0; hdx=hold.x-hx0; hdy=hold.y-hy0; }
    let e=0;
    for(let j=0;j<=N;j++) for(let i=0;i<=N;i++){ const q=j*(N+1)+i; let tx=px[q], ty=py[q];
      if(hold){ const ox=hx0-rx[q], oy=hy0-ry[q], d2=ox*ox+oy*oy, w=Math.exp(-d2/s2), dd=Math.sqrt(d2)||1;
        const hx=w*depth*.36*ox+w*hdx*O.drag-(1-w)*depth*.06*ox/dd, hy=w*depth*.36*oy+w*hdy*O.drag-(1-w)*depth*.06*oy/dd;
        if(O.plastic){ const r=Math.min(1,O.plastic*dt); px[q]+=(hx*.8-px[q])*r*w; py[q]+=(hy*.8-py[q])*r*w; tx=px[q]; ty=py[q]; }
        tx+=hx; ty+=hy; }
      let nx=0,ny=0,n=0; if(i>0){nx+=dx[q-1];ny+=dy[q-1];n++;} if(i<N){nx+=dx[q+1];ny+=dy[q+1];n++;} if(j>0){nx+=dx[q-N-1];ny+=dy[q-N-1];n++;} if(j<N){nx+=dx[q+N+1];ny+=dy[q+N+1];n++;}
      ax[q]=K*(tx-dx[q])+KN*(nx/n-dx[q])-C*vx[q]; ay[q]=K*(ty-dy[q])+KN*(ny/n-dy[q])-C*vy[q]; }
    for(let q=0;q<V;q++){ vx[q]+=ax[q]*dt; vy[q]+=ay[q]*dt; dx[q]+=vx[q]*dt; dy[q]+=vy[q]*dt; e+=vx[q]*vx[q]+vy[q]*vy[q]; }
    return e; }
  function tri(x0,y0,x1,y1,x2,y2,u0,v0,u1,v1,u2,v2){ const d=(u1-u0)*(v2-v0)-(u2-u0)*(v1-v0); if(!d) return;
    const a=((x1-x0)*(v2-v0)-(x2-x0)*(v1-v0))/d, b=((y1-y0)*(v2-v0)-(y2-y0)*(v1-v0))/d, c=((x2-x0)*(u1-u0)-(x1-x0)*(u2-u0))/d, e=((y2-y0)*(u1-u0)-(y1-y0)*(u2-u0))/d;
    const mx=(x0+x1+x2)/3, my=(y0+y1+y2)/3, E=1.6, P=(x,y)=>{ const ux=x-mx, uy=y-my, L=Math.hypot(ux,uy)||1; return [x+ux/L*E, y+uy/L*E]; }, A=P(x0,y0), B=P(x1,y1), Cc=P(x2,y2);
    g.save(); g.beginPath(); g.moveTo(A[0],A[1]); g.lineTo(B[0],B[1]); g.lineTo(Cc[0],Cc[1]); g.closePath(); g.clip(); g.transform(a,b,c,e,x0-a*u0-c*v0,y0-b*u0-e*v0); g.drawImage(img,0,0); g.restore(); }
  function frame(now){ if(!st.isConnected||!cv.isConnected) return; requestAnimationFrame(frame);
    const dt=Math.min(.033,(now-(lastT||now))/1000); lastT=now;
    if(st.clientWidth&&(Math.abs(cv.width-st.clientWidth*dpr)>2||Math.abs(cv.height-st.clientHeight*dpr)>2)){ fit(); live=1; }   // 폰을 돌리거나 주소창이 다시 나와 칸 크기가 바뀌면 다시 맞춘다
    if(hold){ hold.t+=dt; depth+=(1-depth)*Math.min(1,dt*7); } else depth+=(0-depth)*Math.min(1,dt*10);
    const e=step(dt/2)+step(dt/2); sqv+=(-(sq-(hold?.045*depth:0))*170-sqv*11)*dt; sq+=sqv*dt;
    pops=pops.filter(p=>p.t<.8);
    if(!hold&&e<1e-5&&Math.abs(sqv)<.004&&depth<.01&&!pops.length){ if(!live) return; live=0; } else live=1;
    g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
    if(!(img.complete&&img.naturalWidth)){ live=1;
      if(img.complete&&now-retry>3000){ retry=now; img=sqImg(O.img); amap=null; tried=false; }   // 그림을 못 받았으면 3초마다 다시 받아 본다 (학교 와이파이가 잠깐 끊긴 때)
      g.fillStyle='#5f574c'; g.font='14px system-ui'; g.textAlign='center'; g.fillText('그림을 불러오는 중…',cx,cy); return; }
    if(!amap&&!tried){ tried=true; mkmap(); }
    const iw=img.naturalWidth, ih=img.naturalHeight, h=S/2, by=cy+h;
    const X=q=>cx+(rx[q]+dx[q])*h*(1+sq), Y=q=>by+((ry[q]+dy[q])*h-h)*(1-sq);
    for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const a=j*(N+1)+i, b=a+1, c=a+N+1, d=c+1;
      if(amap&&!(solid(rx[a],ry[a])||solid(rx[b],ry[b])||solid(rx[c],ry[c])||solid(rx[d],ry[d])||solid((rx[a]+rx[d])/2,(ry[a]+ry[d])/2))) continue;
      const u0=i/N*iw,u1=(i+1)/N*iw,v0=j/N*ih,v1=(j+1)/N*ih;
      tri(X(a),Y(a),X(b),Y(b),X(c),Y(c),u0,v0,u1,v0,u0,v1); tri(X(b),Y(b),X(d),Y(d),X(c),Y(c),u1,v0,u1,v1,u0,v1); }
    // 눌린 자리 음영 (그림 위에만)
    g.globalCompositeOperation='source-atop';
    const dent=(x,y,d,rr)=>{ const X0=cx+x*h, Y0=cy+y*h, r=rr*h; let gr=g.createRadialGradient(X0,Y0+r*.08,0,X0,Y0,r); gr.addColorStop(0,`rgba(40,20,10,${.34*d})`); gr.addColorStop(.55,`rgba(40,20,10,${.16*d})`); gr.addColorStop(1,'rgba(40,20,10,0)'); g.fillStyle=gr; g.beginPath(); g.arc(X0,Y0,r,0,6.283); g.fill();
      gr=g.createRadialGradient(X0,Y0+r*.5,r*.35,X0,Y0+r*.5,r*.8); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(.6,`rgba(255,255,255,${.2*d})`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.beginPath(); g.arc(X0,Y0+r*.5,r*.8,0,6.283); g.fill(); };
    marks.forEach(m=>dent(m.x,m.y,m.d*.42,.3));
    if(depth>.02&&hold) dent(hold.x,hold.y,depth,.5);
    g.globalCompositeOperation='destination-over';
    g.fillStyle='rgba(26,25,23,.17)'; g.beginPath(); g.ellipse(cx,by-h*.04,h*.78*(1+sq*1.5),h*.11,0,0,6.283); g.fill();
    g.globalCompositeOperation='source-over';
    pops.forEach(p=>{ p.t+=dt; const kk=Math.min(1,p.t/.12); g.globalAlpha=Math.max(0,1-(p.t-.4)/.4); g.font=`900 ${17*(.6+.4*kk)}px "Do Hyeon",system-ui,sans-serif`; g.textAlign='center';
      const PX=Math.max(40,Math.min(W-40,p.x)), PY=Math.max(22,p.y-p.t*38); g.lineWidth=4; g.strokeStyle='#fffaf0'; g.strokeText(p.s,PX,PY); g.fillStyle='#1a1917'; g.fillText(p.s,PX,PY); }); g.globalAlpha=1;
  }
  label(); requestAnimationFrame(frame);
}

// 본부 말랑이 상자가 쓰는 이름표: 이름, 고르는 버튼에 쓸 짧은 이름, 그림
const INFO={wax:{name:'왁뿌볼',tag:'왁뿌볼',img:'img/sq-candy-0.webp'}};
Object.keys(SOFT).forEach(k=>{ const O=SOFT[k]; INFO[k]={name:O.name,tag:O.tag,img:O.img}; });
window.WAX={open:waxToy,
  toy(k,st,cnt){ if(k==='wax') waxToy(st,cnt,()=>{}); else softToy(st,cnt,k); },   // 상자에서는 몇 개를 깨든 끝이 없다
  info:k=>INFO[k]||null,
  preload(k){ if(k&&k!=='wax'){ if(INFO[k]) sqImg(INFO[k].img); return; } for(let i=0;i<4;i++){ sqImg('img/sq-candy-'+i+'.webp'); sqImg('img/sq-jelly-'+i+'.webp'); } }};
})();
