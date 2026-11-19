/* 회색 안개 작전 배경 음악.
   8비트 게임기 소리(펄스파 멜로디, 펄스파 반주, 삼각파 베이스, 잡음 드럼)로 새로 지은 곡이다.
   다른 게임의 곡을 옮긴 것이 아니고, 통통 튀는 래그타임풍 진행(쿵-짝 베이스와 당김음 멜로디)만 장르에서 빌렸다.
   쓰는 법: BGM.play(오디오컨텍스트) / BGM.pause() / BGM.rewind() / BGM.set(크기 0~1, 먹먹하게 여부) */
(()=>{
const STEP=.12;                       // 16분음표 한 칸(초). 4분음표 = 125 (처음 .09에서 선생님 요청으로 0.75배 느리게, 2026.11.20)
const LEVEL=.5;                       // 효과음보다 조금 작게
const NOTE={};
'C C# D D# E F F# G G# A A# B'.split(' ').forEach((n,i)=>{ for(let o=2;o<=7;o++) NOTE[n+o]=440*Math.pow(2,(i-9)/12+o-4); });
// 코드마다: 베이스 두 음(쿵, 쿵), 반주 두 음(짝)
const CH={ C:['C3','G3','E4','G4'], Am:['A3','E3','C4','E4'], F:['F3','C3','F4','A4'], G7:['G3','D3','F4','B4'], Dm:['D3','A3','F4','A4'], D7:['D3','A3','F#4','C5'] };
// 한 마디 = 16칸. 멜로디는 "칸번호+음이름(/길이)". 길이를 안 쓰면 2칸.
const A=[
  ['C',     '0E5 3G5 6C6 8B5 10A5 12G5/3'],
  ['Am',    '0E5 3G5 6A5 8G5 10E5 12C5/3'],
  ['F',     '0F5 3A5 6C6 8D6 10C6 12A5/3'],
  ['G7',    '0B5 3A5 6G5 8F5 10D5 12G5/3'],
  ['C',     '0E5 3G5 6C6 8B5 10A5 12G5/3'],
  ['Am',    '0E5 3G5 6A5 8C6/3 12A5 14G5'] ];
const SONG=[
  ...A,
  ['Dm G7', '0F5 2A5 4D6 6C6 8B5 10G5 12A5 14B5'],
  ['C',     '0C6/3 4G5 6E5 8C5/4 14G5'],
  // 가운데 부분: 같은 음을 톡톡 두드리다가 한 단계씩 올라간다
  ['F',     '0A5 3A5 6A5 8C6 10A5 12F5/3'],
  ['F',     '0A5 3A5 6A5 8D6 10C6 12A5/3'],
  ['C',     '0G5 3G5 6G5 8C6 10G5 12E5/3'],
  ['C',     '0G5 2A5 4G5 6E5 8C5/4 14E5'],
  ['D7',    '0F#5 3F#5 6F#5 8A5 10F#5 12D5/3'],
  ['D7',    '0F#5 2A5 4C6 6D6 8C6 10A5 12F#5 14A5'],
  ['G7',    '0G5/3 4B5 6D6 8F6/3 12D6 14B5'],
  ['G7',    '0G5 2A5 4B5 6C6 8D6/3 12G5 14G5'],
  // 처음 가락으로 돌아와서 시원하게 맺는다
  ...A,
  ['F G7',  '0A5 2C6 4F6 6E6 8D6 10B5 12G5 14B5'],
  ['C',     '0C6 3C6 6C6 8C6/4 14G5'] ];
const BARS=SONG.length, TOTAL=BARS*16;

// 곡을 칸마다의 사건 목록으로 풀어 둔다
const EV=Array.from({length:TOTAL},()=>[]);
SONG.forEach(([chords,mel],b)=>{ const base=b*16, cs=chords.split(' ').map(c=>CH[c]), last=b%8===7, third=b>=16;
  for(const m of mel.matchAll(/(\d+)([A-G]#?\d)(?:\/(\d+))?/g)) EV[base+ +m[1]].push({k:'lead',f:NOTE[m[2]],len:+(m[3]||2)});
  for(let q=0;q<4;q++){ const c=cs[cs.length===2?(q>>1):0], s=base+q*4;
    EV[s].push({k:'bass',f:NOTE[c[q%2]],len:2.3});
    EV[s+2].push({k:'stab',f:NOTE[c[2]]},{k:'stab',f:NOTE[c[3]]});
    EV[s+2].push({k:'hat'}); if(third) EV[s].push({k:'hat',soft:true});
    EV[s].push({k:q%2?'snare':'kick'}); }
  if(last){ EV[base+14].push({k:'snare'}); EV[base+15].push({k:'snare',soft:true}); } });

// 소리 만들기
const waves=new WeakMap();
function wave(ctx,name){ let m=waves.get(ctx); if(!m){ m={}; waves.set(ctx,m); } if(m[name]) return m[name];
  const n=28, re=new Float32Array(n), im=new Float32Array(n);
  if(name==='bass'){ [0,1,.34,.22,0,.07,.03].forEach((v,i)=>{ im[i]=v; }); }      // 삼각파에 배음을 조금 보태 폰 스피커에서도 들리게
  else { const d=+name; for(let i=1;i<n;i++) re[i]=4/(i*Math.PI)*Math.sin(i*Math.PI*d); } // 펄스파(듀티 d)
  return m[name]=ctx.createPeriodicWave(re,im); }
function voice(ctx,dest,w,f,t,dur,vol,hold=.6,vib=false){ const o=ctx.createOscillator(), g=ctx.createGain(); o.setPeriodicWave(wave(ctx,w)); o.frequency.setValueAtTime(f,t);
  if(vib){ const l=ctx.createOscillator(), lg=ctx.createGain(); l.frequency.value=6.5; lg.gain.setValueAtTime(0,t); lg.gain.setValueAtTime(f*.007,t+.11); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+dur+.02); }
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.004); g.gain.linearRampToValueAtTime(vol*hold,t+Math.max(.02,dur-.014)); g.gain.linearRampToValueAtTime(0,t+dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t+dur+.02); }
const noises=new WeakMap();
function hiss(ctx,dest,t,dur,vol,type,freq){ let b=noises.get(ctx); if(!b){ b=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate); const a=b.getChannelData(0); let s=22222; for(let i=0;i<a.length;i++){ s=(s*16807)%2147483647; a[i]=s/1073741823.5-1; } noises.set(ctx,b); }
  const src=ctx.createBufferSource(), fl=ctx.createBiquadFilter(), g=ctx.createGain(); src.buffer=b; fl.type=type; fl.frequency.value=freq; fl.Q.value=.8;
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0008,t+dur); src.connect(fl); fl.connect(g); g.connect(dest); src.start(t,(t*7.3)%.8,dur+.02); }
function thump(ctx,dest,t,vol){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='triangle'; o.frequency.setValueAtTime(190,t); o.frequency.exponentialRampToValueAtTime(62,t+.09);
  g.gain.setValueAtTime(vol,t); g.gain.linearRampToValueAtTime(0,t+.1); o.connect(g); g.connect(dest); o.start(t); o.stop(t+.12); }
function playStep(ctx,dest,pos,t){ for(const e of EV[pos]){
    if(e.k==='lead'){ voice(ctx,dest,'0.25',e.f,t,e.len*STEP*.92,.05,.55,e.len>=3); voice(ctx,dest,'0.125',e.f,t+STEP*2,STEP*1.3,.011,.3); }
    else if(e.k==='stab') voice(ctx,dest,'0.5',e.f,t,STEP*.85,.017,.4);
    else if(e.k==='bass') voice(ctx,dest,'bass',e.f,t,e.len*STEP,.085,.8);
    else if(e.k==='hat') hiss(ctx,dest,t,.03,e.soft?.012:.022,'highpass',7000);
    else if(e.k==='snare') hiss(ctx,dest,t,.09,e.soft?.03:.05,'bandpass',1900);
    else if(e.k==='kick') thump(ctx,dest,t,.11); } }

// 틀어 주는 쪽
let ctx=null, bus=null, lp=null, timer=null, nextT=0, pos=0, playing=false, vol=1, muf=false;
function pump(){ if(!playing) return; const now=ctx.currentTime; if(now>nextT+.25) nextT=now+.05;   // 탭이 쉬다 오면 밀린 음을 몰아 치지 않는다
  while(nextT<now+.24){ playStep(ctx,bus,pos,nextT); nextT+=STEP; pos=(pos+1)%TOTAL; } }
function play(c){ if(playing||!c) return; if(ctx!==c){ ctx=c; bus=ctx.createGain(); lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=muf?650:16000; bus.connect(lp); lp.connect(ctx.destination); }
  const now=ctx.currentTime; bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(0,now); bus.gain.linearRampToValueAtTime(LEVEL*vol,now+.08);
  nextT=now+.07; playing=true; timer=setInterval(pump,30); pump(); }
function pause(){ if(!playing) return; playing=false; clearInterval(timer); const now=ctx.currentTime; bus.gain.cancelScheduledValues(now); bus.gain.setTargetAtTime(0,now,.06); }
function rewind(){ pos=0; }
function set(v,muffled){ if(v!==vol){ vol=v; if(playing) bus.gain.setTargetAtTime(LEVEL*vol,ctx.currentTime,.12); }
  if(muffled!==muf){ muf=muffled; if(lp) lp.frequency.setTargetAtTime(muf?650:16000,ctx.currentTime,.12); } }
// 한 바퀴를 통째로 그려 내기(소리 점검용)
function render(c,dest){ for(let i=0;i<TOTAL;i++) playStep(c,dest,i,.05+i*STEP); return .05+TOTAL*STEP; }
window.BGM={play,pause,rewind,set,render,STEP,TOTAL,get playing(){return playing;},get pos(){return pos;}};
})();
