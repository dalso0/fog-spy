/* 회색 안개 작전 · 픽셀 그림. 글자 하나가 점 하나. 모든 그림은 여기서 직접 찍은 것. */
(()=>{
'use strict';
const PAL={k:'#1f1b18',w:'#ffffff',c:'#f6ead0',C:'#d6c198',r:'#d9512c',R:'#a03a1c',q:'#f08a5b',
  o:'#c9993f',O:'#8f6a22',e:'#e6bf6a',b:'#b0683a',B:'#7e4525',m:'#e8b98a',t:'#dcc095',T:'#b59565',
  H:'#3b2f29',g:'#6fae5c',G:'#3f7d45',l:'#9bd07a',d:'#c08a4a',D:'#94642f',s:'#69b4e6',S:'#3f86c2',
  y:'#f3c744',Y:'#c9951c',n:'#ee8a2f',f:'#c9cfd5',F:'#9aa2ab',x:'#6b727a',p:'#f7c9a8',P:'#d99a7a',
  A:'#d9512c',a:'#a03a1c'};
const hex=c=>{ const n=parseInt(c.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; };
const grey=c=>{ const [r,g,b]=hex(c); const L=r*.3+g*.59+b*.11; const v=Math.round(L*.5+92); return 'rgb('+(v-3)+','+v+','+(v+5)+')'; };
const GPAL={}; for(const key in PAL) GPAL[key]=(key==='k')?'#3a3d42':grey(PAL[key]);
function cvs(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
function px(rows,pal,name){ const h=rows.length,w=rows[0].length,c=cvs(w,h),x=c.getContext('2d');
  rows.forEach((row,y)=>{ if(row.length!==w) throw new Error('그림 '+name+' '+y+'번째 줄 너비 '+row.length+'≠'+w);
    for(let i=0;i<w;i++){ const ch=row[i]; if(ch==='.') continue; const col=pal[ch]; if(!col) throw new Error('그림 '+name+' 색 '+ch); x.fillStyle=col; x.fillRect(i,y,1,1); } });
  return c; }
function flip(c){ const o=cvs(c.width,c.height),x=o.getContext('2d'); x.translate(c.width,0); x.scale(-1,1); x.drawImage(c,0,0); return o; }
function greyPal(p){ const o={}; for(const key in p) o[key]=key==='k'?'#3a3d42':grey(p[key]); return o; }
function set(rows,name,pal){ const c=px(rows,pal||PAL,name), g=px(rows,pal?greyPal(pal):GPAL,name); return {c,g,cf:flip(c),gf:flip(g),w:c.width,h:c.height}; }

/* ---------- 늘곰 요원 (오른쪽을 봄) ---------- */
const BEAR_UP=[
'......kkkkkkk.....',
'..kkkkTttttttk....',
'.kbBBkTttttttk....',
'.kbBBkHHHHHHHk....',
'.kTTtttttttttttttk',
'..kkkkkkkkkkkkkkk.',
'...kBbbbbbbbbbk...',
'...kBbkwkkkkkkkk..',
'...kBbkkkkkbkkkk..',
'...kBbbbbmmmmmmk..',
'...kBbbbmmmmmkkk..',
'....kBbbbmmBmmk...',
'....kcTttttttck...',
'...ktTtttttctttk..',
'...ktTttttttcttk..',
'..kttTtttttttkttk.',
'..kTTTTTTTTToTTTk.',
'..kttTttttttttttk.',
'..kttTttttttttttk.',
'..kkkkkkkkkkkkkkk.'];
const LEGS={
 idle:['....kbbbk.kbbbk...','....kbbbk.kbbbk...','....kbbbbkkbbbbk..','....kkkkkkkkkkkk..'],
 runA:['...kBBk....kbbk...','..kBBk......kbbk..','.kBBBk......kbbbk.','.kkkkk......kkkkk.'],
 pass:['......kbbBk.......','......kbbBk.......','......kbbbBk......','......kkkkkk......'],
 runB:['...kbbk....kBBk...','..kbbk......kBBk..','.kbbbk......kBBBk.','.kkkkk......kkkkk.'],
 jump:['....kBBk..kbbbk...','...kBBk....kbbbk..','...kkk......kkkk..','..................'],
 fall:['....kBBk...kbbk...','....kBBk...kbbk...','...kBBBk...kbbbk..','...kkkkk...kkkkk..']};
const ARM={
 down:{x:6,y:13,r:['.kk.','kttk','kttk','kttk','kttk','kbbk','.kk.']},
 fwd:{x:9,y:13,r:['kkk...','ktttk.','.ktttk','..kbbk','...kk.']},
 back:{x:3,y:13,r:['...kkk','.ktttk','ktttk.','kbbk..','.kk...']},
 up:{x:10,y:10,r:['...kk.','..kbbk','.ktttk','ktttk.','kttk..']}};
const WINGL=['...kkk','..kttt','.ktttt','kTtttt','kTtttt','.kTTtt','..kkkk'];
const WINGR=['kkk.','ttk.','tttk','tttk','ttk.','kk..'];
function bear(P){ const F={};
  const up=px(BEAR_UP,P,'bear'), wl=px(WINGL,P,'wl'), wr=px(WINGR,P,'wr');
  const mk=(legs,arm,uy,wings)=>{ const c=cvs(28,25),x=c.getContext('2d');
    if(wings){ x.drawImage(wl,1,13+uy); x.drawImage(wr,20,13+uy); }
    x.drawImage(px(LEGS[legs],P,'legs'),5,21); x.drawImage(up,5,1+uy);
    const a=ARM[arm]; x.drawImage(px(a.r,P,'arm'),5+a.x,1+uy+a.y); return c; };
  F.idle=mk('idle','down',0); F.idle2=mk('idle','down',1); F.run0=mk('runA','fwd',0); F.run1=mk('pass','down',-1); F.run2=mk('runB','back',0); F.run3=mk('pass','down',-1);
  F.jump=mk('jump','up',0); F.fall=mk('fall','fwd',0); F.glide=mk('fall','up',0,true); F.breath=mk('idle','down',-1);
  return F; }
const bearC=bear(PAL), bearG=bear(GPAL); const BEAR={};
for(const n in bearC) BEAR[n]={c:bearC[n],g:bearG[n],cf:flip(bearC[n]),gf:flip(bearG[n]),w:28,h:25};
// 주홍 코트를 입은 늘곰: 모자와 코트만 주홍으로
const PALR=Object.assign({},PAL,{t:'#d9512c',T:'#a03a1c',H:'#fff8e8',c:'#fff8e8',o:'#f3c744'});
const bearR=bear(PALR); const BEARR={};
for(const n in bearR) BEARR[n]={c:bearR[n],g:bearG[n],cf:flip(bearR[n]),gf:flip(bearG[n]),w:28,h:25};

/* ---------- 병아리 요원 ---------- */
const CHICK=[set([
'....kkkkk...','...kyyyyyk..','..kyyyyyyyk.','..kykkkkkkkk','..kyykkykkk.','.kyyyyyyynnk','kyYYyyyyyk..','kyYYYyyyyk..','.kyyyyyyk...','..kkkkkk....','...n..n.....'],'chick'),
 set([
'....kkkkk...','...kyyyyyk..','..kyyyyyyyk.','..kykkkkkkkk','..kyykkykkk.','kYyyyyyyynnk','kYYYyyyyyk..','.kyyyyyyyk..','.kyyyyyyk...','..kkkkkk....','..n...n.....'],'chick2')];

/* ---------- 빌런 ---------- */
const MUNG=[set([
'......kkkk......','...kkkffffkk....','..kffffffffFkk..','.kffffffffffFFk.','.kfffffffffffFk.','kffkkfffkkfffFFk','kffwkfffwkfffFFk','kfffffffffffFFFk','kffffkkkkffffFFk','.kffffffffffFFk.','.kFFfffffffFFFk.','..kkFFFFFFFFkk..','...kxk....kxk...','...kkk....kkk...'],'mung'),
 set([
'................','......kkkk......','...kkkffffkk....','..kffffffffFkk..','.kffffffffffFFk.','kffkkfffkkfffFFk','kffwkfffwkfffFFk','kfffffffffffFFFk','kffffkkkkffffFFk','.kffffffffffFFk.','.kFFfffffffFFFk.','..kkFFFFFFFFkk..','....kxk..kxk....','....kkk..kkk....'],'mung2')];
const MUNG_SQ=set(['..kkkkkkkkkkkk..','.kffffffffffFFk.','kffkkfffkkfffFFk','kfffffffffffFFFk','.kFFFFFFFFFFFFk.','..kkkkkkkkkkkk..'],'mungsq');
const BUG=[set(['...kkkk.rr','..kxxxxkrr','.kxxxxxxk.','wkxwxxwxkw','wkxkxxkxkw','.kxxxxxxk.','.kxxkkxxk.','..kxxxxk..','...kkkk...'],'bug'),
 set(['...kkkk.rr','w.kxxxxkrr','wkxxxxxxkw','.kxwxxwxkw','.kxkxxkxk.','.kxxxxxxk.','.kxxkkxxk.','..kxxxxk..','...kkkk...'],'bug2')];

/* ---------- 땅과 상자 ---------- */
const GROUND=set([
'glggglgggglggglg','gggggggggggggggg','gggggGgggggggGgg','gGggGgggGggGgggG','GdGGdGdGGdGGdGdG','dddddDdddddddddd','dddddddddddDdddd','ddeddddddddddddd','dddddddddDdddddd','dddDdddddddddded','dddddddddddddddd','ddddddeddddDdddd','dDdddddddddddddd','dddddddddDdddddd','ddddeddddddddddD','dddddddddddddddd'],'ground');
const DIRT=set([
'dddddddddddddddd','dddDdddddddedddd','dddddddddddddddd','ddddddddDddddddd','deddddddddddddDd','dddddddddddddddd','ddddDddddddddddd','dddddddddedddddd','dddddddddddddddd','dDdddddddddddDdd','dddddddedddddddd','dddddddddddddddd','dddddDdddddddddd','dddddddddddDdddd','ddeddddddddddddd','dddddddddddddddd'],'dirt');
const BR=['eeeeeeeOeeeeeeeO','oooooooOoooooooO','oooooooOoooooooO','OOOOOOOOOOOOOOOO','eeeOeeeeeeeOeeee','oooOoooooooOoooo','oooOoooooooOoooo','OOOOOOOOOOOOOOOO'];
const BRICK=set(BR.concat(BR),'brick');
const HARD=set([
'kkkkkkkkkkkkkkkk','kwwwwwwwwwwwwwCk','kwccccccccccccCk','kwcCccccccccCcCk','kwccccccccccccCk','kwccccccccccccCk','kwccccccccccccCk','kwccccccccccccCk','kwccccccccccccCk','kwccccccccccccCk','kwccccccccccccCk','kwccccccccccccCk','kwcCccccccccCcCk','kwccccccccccccCk','kCCCCCCCCCCCCCCk','kkkkkkkkkkkkkkkk'],'hard');
const CR=[
'.kkkkkkkkkkkkkk.','kqqqqqqqqqqqqqqk','kqrrrrrrrrrrrrRk','kqrkrrrccrrrkrRk','kqrrrrrccrrrrrRk','kqrrrrccccrrrrRk','kqrrrrccccrrrrRk','kqrrrccccccrrrRk','kqrrrccccccrrrRk','kqrrrccccccrrrRk','kqrrrrccccrrrrRk','kqrrrrrrrrrrrrRk','kqrkrrrrrrrrkrRk','kqrrrrrrrrrrrrRk','kRRRRRRRRRRRRRRk','.kkkkkkkkkkkkkk.'];
const CRATE=[set(CR,'crate'), set(CR,'crate2',Object.assign({},PAL,{c:'#ffe28a'})), set(CR,'crate3',Object.assign({},PAL,{c:'#ffffff',q:'#ffb089'}))];
const USED=set(CR,'used',Object.assign({},PAL,{r:'#b59565',q:'#cdb07f',R:'#8a6d45',c:'#a3855b'}));
const WPAL=Object.assign({},PAL,{o:'#8e959d',e:'#aab1b8',O:'#5d646c'});
const WALLB=set(BR.concat(BR),'wallb',WPAL);
const WALLF=set([
'eeeeeeeOeeeeeeeO','oooooooOoooooooO','oooooooOoooooooO','OOOOOOOOOOOOOOOO','eeeOeeeeeeeOeeee','ookkoooooookkooo','okoOoooooooOokoo','OOOOOOOOOOOOOOOO','eeekkeeOeekkeeeO','oookkooOookkoooO','oooooooOoooooooO','OOOOOOOOOOOOOOOO','eeeOeeeeeeeOeeee','oooOokkkkkoOoooo','oooOkoooookOoooo','OOOOOOOOOOOOOOOO'],'wallf',WPAL);
const PAD=[set([
'....kkkkkkkk....','..kkpwwpppppkk..','.kpwpppppppppPk.','kppppkpppkppppPk','kpppppppppppppPk','kppppppkkpppppPk','kPppppppppppPPPk','.kPPPPPPPPPPPPk.','..kkkkkkkkkkkk..'],'pad'),
 set([
'................','................','................','..kkkkkkkkkkkk..','.kpwwpppppppppk.','kpppkkpppkkpppPk','kPppppppppppPPPk','.kPPPPPPPPPPPPk.','..kkkkkkkkkkkk..'],'pad2')];

/* ---------- 모으는 것 ---------- */
const DROP_ROWS=['...kk...','..kAAk..','..kwAk..','.kwAAAk.','.kAAAAk.','kwAAAAak','kAAAAAak','kAAAAaak','.kAaaak.','..kkkk..'];
const HUES=[['#d9512c','#a03a1c'],['#f3c744','#c9951c'],['#6fae5c','#3f7d45'],['#69b4e6','#3f86c2']];
const DROP=HUES.map(([A,a],i)=>set(DROP_ROWS,'drop'+i,Object.assign({},PAL,{A,a})));
const SHIELD=set(['kkkkkkkkkkk','kswwsssssSk','kswsssssSSk','ksssswsssSk','kssswwwssSk','ksssswsssSk','ksssssssSSk','.kssssssSk.','.kssssssSk.','..ksssSSk..','...ksSk....','....kk.....'],'shield');
const PIECE=[set(['.....k.....','....kqk....','...kqrrk...','..kqrrrrk..','.kqrrcrrrk.','kqrrcwcrrRk','.krrrcrrRk.','..krrrrRk..','...krrRk...','....kRk....','.....k.....'],'piece'),
 set(['.....k.....','....kwk....','...kwqrk...','..kwqrrrk..','.kqrrwrrrk.','kqrrwwwrrRk','.krrrwrrRk.','..krrrrRk..','...krrRk...','....kRk....','.....k.....'],'piece2')];

/* ---------- 찍어서 만드는 것 (문, 덤불, 나무, 구름, 학교) ---------- */
function disc(x,cx,cy,r,col){ x.fillStyle=col; for(let dy=-r;dy<=r;dy++){ const w=Math.round(Math.sqrt(r*r-dy*dy)); x.fillRect(cx-w,cy+dy,w*2+1,1); } }
function blob(w,h,list,pal){ const c=cvs(w,h),x=c.getContext('2d'); for(const [cx,cy,r] of list) disc(x,cx,cy,r+1,pal.k); for(const [cx,cy,r] of list) disc(x,cx,cy,r,pal.a); for(const [cx,cy,r] of list) disc(x,cx-1,cy-1,Math.max(1,r-2),pal.b); return c; }
function pair(fn){ return {c:fn(PAL),g:fn(GPAL)}; }
const BUSH=pair((P)=>{ const c=blob(30,14,[[7,10,5],[15,8,7],[23,10,5]],{k:P.k,a:P.G,b:P.g}); const x=c.getContext('2d'); x.fillStyle=P.l; x.fillRect(12,4,2,1); x.fillRect(20,7,1,1); x.fillRect(5,8,1,1); return c; });
const TREE=pair((P)=>{ const c=cvs(30,46),x=c.getContext('2d'); x.fillStyle=P.k; x.fillRect(12,26,6,20); x.fillStyle=P.B; x.fillRect(13,26,4,20); x.fillStyle=P.b; x.fillRect(13,26,2,20);
  const b=blob(30,30,[[9,17,7],[20,17,7],[15,10,9]],{k:P.k,a:P.G,b:P.g}); x.drawImage(b,0,0); x.fillStyle=P.l; x.fillRect(11,6,2,1); x.fillRect(17,12,2,1); x.fillRect(6,14,1,1); return c; });
const CLOUD=(()=>{ const c=cvs(34,14),x=c.getContext('2d'); for(const [cx,cy,r] of [[8,9,4],[16,7,6],[25,9,4]]) disc(x,cx,cy,r,'#ffffff'); x.fillStyle='#ffffff'; x.fillRect(4,10,26,3); x.fillStyle='#dfe8ee'; x.fillRect(6,12,22,1); return c; })();
const DOOR=pair((P)=>{ const c=cvs(32,40),x=c.getContext('2d'); const R=(col,a,b,w,h)=>{ x.fillStyle=col; x.fillRect(a,b,w,h); };
  R(P.k,0,0,32,40); R(P.c,1,1,30,39); R(P.C,1,36,30,4); R(P.k,0,8,32,1); R(P.r,1,1,30,7); R(P.q,1,1,30,1);
  R(P.k,7,12,18,28); R(P.O,8,13,16,27); R(P.o,9,14,14,26); R(P.e,9,14,14,1); R(P.k,11,17,10,8); R(P.s,12,18,8,6); R(P.w,13,19,2,2); R(P.k,20,29,2,2); R(P.y,20,29,1,1); R(P.k,3,13,3,8); R(P.y,4,14,1,6); return c; });
const SCHOOL=pair((P)=>{ const c=cvs(120,66),x=c.getContext('2d'); const R=(col,a,b,w,h)=>{ x.fillStyle=col; x.fillRect(a,b,w,h); };
  R(P.C,0,16,120,50); R(P.c,0,16,120,2); R(P.T,44,6,32,60); R(P.t,44,6,32,2); R(P.r,58,0,1,6); R(P.r,59,0,5,3);
  for(let r=0;r<3;r++) for(let i=0;i<5;i++){ R(P.S,4+i*8,22+r*14,5,8); R(P.S,78+i*8,22+r*14,5,8); }
  for(let r=0;r<3;r++) for(let i=0;i<3;i++) R(P.S,49+i*8,12+r*14,5,8); R(P.B,54,52,12,14); return c; });

// 본부 문 옆 라디오: 나무 상자 위에 올려 둔 주홍 라디오
const RADIO=pair((P)=>{ const c=cvs(26,34),x=c.getContext('2d'); const R=(col,a,b,w,h)=>{ x.fillStyle=col; x.fillRect(a,b,w,h); };
  R(P.k,3,22,20,12); R(P.o,4,23,18,10); R(P.e,4,23,18,1); R(P.O,4,32,18,1); R(P.O,10,24,1,8); R(P.O,16,24,1,8);   // 상자
  R(P.k,1,9,24,13); R(P.r,2,10,22,11); R(P.q,2,10,22,1); R(P.R,2,20,22,1);                                          // 몸통
  R(P.k,4,12,8,7); R(P.c,5,13,6,5); R(P.k,6,14,1,1); R(P.k,8,14,1,1); R(P.k,7,16,1,1); R(P.k,9,16,1,1);   // 스피커
  R(P.k,14,12,9,4); R(P.c,15,13,7,2); R(P.R,18,13,1,2);                                                              // 눈금 창
  R(P.k,15,17,3,3); R(P.y,16,18,1,1); R(P.k,20,17,3,3); R(P.y,21,18,1,1);                                           // 다이얼
  R(P.k,6,7,14,1); R(P.k,6,8,1,1); R(P.k,19,8,1,1);                                                                  // 손잡이
  R(P.k,21,7,1,2); R(P.k,22,5,1,2); R(P.k,23,3,1,2); R(P.k,24,1,1,2); R(P.r,24,0,2,1); return c; });                 // 안테나
const COAT=set(['...kk.kk...','..krrkrrk..','.krrckcrrk.','krrrrcrrrrk','krkrrrrrkrk','kk.krrrk.kk','...kryrk...','...krrrk...','..krrrrrk..','..krrRrrk..','..kkkkkkk..'],'coat');
window.ART={PAL,GPAL,BEAR,BEARR,COAT,CHICK,MUNG,MUNG_SQ,BUG,GROUND,DIRT,BRICK,HARD,CRATE,USED,WALLB,WALLF,PAD,DROP,SHIELD,PIECE,BUSH,TREE,CLOUD,DOOR,RADIO,SCHOOL,grey,cvs};
})();
