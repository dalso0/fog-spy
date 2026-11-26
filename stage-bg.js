/* 2주차 장소 배경 (복도·음악실·도서관·방송실·명상 숲). (2026-11-26 달슈 님이 고른 A안: 실내 벽)
   배경은 판마다 한 번 띠 그림(색·회색)으로 찍어 두고, 그릴 때는 띠를 이어 붙이기만 한다.
   띠 바닥(y=SH)이 화면의 땅 높이(hz)에 맞춰지고, 위쪽은 화면 높이만큼만 보인다. */
(()=>{
const ART=window.ART, SH=360, INK='#1f1b18';
const cvs=(w,h)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
const gcol=c=>c===INK?'#3a3d42':ART.grey(c);
// 띠 하나를 색과 회색으로 두 번 찍는다. fn(R,clr,x,w) — R(색,x,y,w,h)는 y를 바닥 기준(위로 +)으로 받는다
function strip(w,fn){ const o={w};
  for(const g of [0,1]){ const c=cvs(w,SH), x=c.getContext('2d');
    const R=(col,a,b,ww,hh)=>{ x.fillStyle=g?gcol(col):col; x.fillRect(a,SH-b-hh,ww,hh); };
    const clr=(a,b,ww,hh)=>x.clearRect(a,SH-b-hh,ww,hh);
    fn(R,clr,x); o[g?'g':'c']=c; }
  return o; }
function tile(bx,s,par,cx,hz,W,prog){ const off=((Math.floor(cx*par))%s.w+s.w)%s.w, top=hz-SH;
  for(let x=-off;x<W;x+=s.w){ bx.drawImage(s.g,x,top); if(prog>0){ bx.globalAlpha=prog; bx.drawImage(s.c,x,top); bx.globalAlpha=1; } } }

/* ---------------- 실내 벽 (징두리 판자 + 창으로 보이는 마음 날씨 하늘) ---------------- */
const WALL={hall:['#efe3c8','#e4d5b5','#c9a36a','#a7804c'],music:['#efe0cc','#e3d0b6','#a9583a','#86412a'],lib:['#ebe0c6','#dfd1b0','#8f6a45','#6e4f32'],cast:['#e2e1d6','#d3d2c4','#6f7f8f','#566573']};
function window4(R,clr,x){ // 창: 테두리 황토, 유리는 뚫어서 뒤의 하늘이 보이게
  R('#8a6a44',x,62,48,70); clr(x+3,65,42,64); R('#8a6a44',x+23,65,2,64); R('#8a6a44',x+3,96,42,2);
  R('#b59565',x-2,60,52,3); R('#d6c198',x-2,62,52,1); }
function wallA(place){ const [w1,w2,p1,p2]=WALL[place], W0=192;
  return strip(W0,(R,clr)=>{
    R(w1,0,0,W0,SH); for(let i=0;i<W0;i+=32) R(w2,i,46,1,SH);   // 벽면, 옅은 이음매
    R(w2,0,150,W0,2); R('#fff8e8',0,152,W0,1);                    // 액자 걸이 띠
    R(p1,0,4,W0,40); R(p2,0,43,W0,3); R('#fff8e8',0,46,W0,1); for(let i=4;i<W0;i+=12) R(p2,i,6,1,36);   // 징두리 판자
    R(p2,0,0,W0,4);                                               // 걸레받이
    window4(R,clr,14);
    const X=84;
    if(place==='hall'){ // 교실 앞문과 반 팻말, 작은 게시판
      R('#7a5a3a',X,4,32,62); R('#c9a36a',X+2,4,28,60); R('#a7804c',X+2,4,1,60); R('#8a6a44',X+6,34,20,24); R('#cfe3ee',X+8,36,16,20); R('#a7804c',X+23,22,3,3);
      R('#5d6f86',X+4,70,24,9); R('#fff8e8',X+6,72,20,5); R('#5d6f86',X+9,73,3,3); R('#5d6f86',X+15,73,2,3); R('#5d6f86',X+18,73,3,3);
      R('#8a6a44',X+48,62,52,40); R('#d9b98a',X+50,64,48,36); R('#fff8e8',X+54,70,14,18); R('#f6d9a3',X+72,80,16,14); R('#cfe3ee',X+74,66,18,10); R('#d9512c',X+60,86,2,2); R('#d9512c',X+80,92,2,2); }
    if(place==='music'){ // 오선 띠와 음표, 흡음판
      for(let i=0;i<5;i++) R('#c9a98a',0,104+i*5,W0,1);
      for(const [a,b] of [[70,106],[96,114],[150,109],[176,119]]){ R('#a9583a',a,b,4,3); R('#a9583a',a+3,b+2,1,12); }
      for(let r=0;r<2;r++) for(let i=0;i<3;i++){ R('#c8b89c',X+14+i*22,54+r*22,20,20); R('#d8cab0',X+15+i*22,55+r*22,18,1); for(let q=0;q<18;q+=4) R('#b9a88a',X+16+i*22+q,57+r*22,2,16); } }
    if(place==='lib'){ // 벽에 붙은 책장
      R('#6e4f32',X,4,104,112); R('#8f6a45',X+3,4,98,108);
      const BK=['#a95a3a','#5d6f86','#c9993f','#7c8a5a','#b98a6a','#6d5a7a','#d6c198'];
      for(let s=0;s<4;s++){ const y=8+s*27; R('#6e4f32',X+3,y-3,98,3); let x=X+5, n=s*3;
        while(x<X+98){ const bw=4+(n*7%3), bh=16+(n*5%7); if(x+bw>X+99) break; R(BK[n%BK.length],x,y,bw,bh); R('#fff8e8',x+1,y+bh-3,bw-2>0?1:0,1); x+=bw+1; n++; if(n%9===4) x+=6; } } }
    if(place==='cast'){ // 체크무늬 흡음 스펀지, 시계, ON AIR 등
      for(let r=0;r<4;r++) for(let i=0;i<4;i++){ R((r+i)%2?'#9aa6b1':'#8796a3',X+i*18,50+r*18,18,18); R('#aeb8c1',X+i*18+(r%2?2:9),50+r*18+7,6,2); }
      R('#566573',X,48,72,2); R('#566573',X,122,72,2);
      R('#7a2a18',X+80,98,24,14); R('#d9512c',X+81,99,22,12); R('#ffd7c4',X+84,104,16,2);   // ON AIR 등
      R('#6f7f8f',X+84,66,16,16); R('#fff8e8',X+86,68,12,12); R('#566573',X+91,74,1,5); R('#566573',X+91,73,4,1); }   // 시계
  }); }
// 명상 숲: 하늘은 그대로 두고, 먼 숲 실루엣 + 가까운 나무 기둥 줄
function forestA(){
  const blob=(R,cx,cy,r,col)=>{ for(let dy=-r;dy<=r;dy++){ const w=Math.round(Math.sqrt(r*r-dy*dy)); R(col,cx-w,cy+dy,w*2+1,1); } };
  return {far:strip(256,(R)=>{ for(let x=0;x<256;x+=2){ const h=Math.round(78+Math.sin(x*.05)*10+Math.sin(x*.13)*5); R('#b7cfa4',x,0,2,h); } for(let x=0;x<256;x+=2){ const h=Math.round(50+Math.sin(x*.07+1)*9); R('#9cc08a',x,0,2,h); } }),
  near:strip(240,(R)=>{ for(const [x,w,h] of [[24,8,96],[132,10,116],[196,7,88]]){ R('#6e553c',x,0,w,h); R('#8a6a48',x+2,0,Math.max(2,w-5),h);
      blob(R,x+w/2-10,h+4,16,'#5f9157'); blob(R,x+w/2+12,h+2,14,'#5f9157'); blob(R,x+w/2,h+16,18,'#6f9f62'); blob(R,x+w/2-4,h+20,9,'#86b475'); }
    for(let x=0;x<240;x+=2){ const h=Math.round(10+Math.sin(x*.09)*4+Math.sin(x*.23)*2); R('#7fae6c',x,0,2,h); } })}; }

const cache={};
function get(place){ const key=place; if(cache[key]) return cache[key];
  return cache[key]=place==='forest'?forestA():{wall:wallA(place)}; }

window.BG2={
  // 하늘(마음 날씨)과 구름은 게임이 먼저 그린다. 그 위에 장소 띠를 얹는다. 회색 띠 위에 색 띠를 prog만큼 겹쳐 안개가 걷히는 만큼 색이 돌아온다
  draw(bx,o){ const {place,cx,hz,W,prog,old}=o; if(!WALL[place]&&place!=='forest'){ old(); return; } const L=get(place);
    if(place==='forest'){ tile(bx,L.far,.2,cx,hz,W,prog); tile(bx,L.near,.45,cx,hz,W,prog); } else tile(bx,L.wall,.5,cx,hz,W,prog); }
};
})();
