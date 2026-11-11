/* SpyPlus — 회색 안개 작전 '오래 머무는 장치' 모듈 (2026-11-10 시안)
   벤치마킹 정리: https://claude.ai/artifact/2EiqyXsSBagbeoauP3zihv

   들어 있는 것
     · 요원 계급(경험치)      SpyPlus.addXP(n, '이유')  /  SpyPlus.rankHTML()
     · 안개 복도 잠입         const stop = SpyPlus.mountSneak(el, {avatarSVG})   (턴제 잠입 퍼즐, 문 번호 도전)
     · 장비 도감·이모트       SpyPlus.mountGear(el)
     · 비밀 코드             SpyPlus.mountCode(el)
     · 전교 정화 작전         SpyPlus.mountRaid(el, {total, goal, today})   (서버에는 익명 합계만)
     · 안전장치              하루 잠입 3판, 밤 10시~아침 6시 본부 소등(SpyPlus.isCurfew())

   저장: 휴대폰 localStorage 'spy-plus-v1' 하나. 이름·반·번호 없음.
   본체가 서버로 보낼 것은 SpyPlus.on('report', fn) 으로 받는 익명 이벤트뿐: {type:'door'|'safe'|'code'|'gear'} → 합계 +1.
   모든 mount 함수는 cleanup 함수를 돌려줌. CSS는 자동 삽입(.sp 범위). */
(function(){
'use strict';
const VER='spy-plus-v1';
const CSS=`
.sp{--ink:#1c2130;--paper:#fffaf0;--panel:#fff;--fog:#a7adb5;--fog-d:#727985;--fog-l:#d7dbe0;--red:#e0522f;--yellow:#ffcc33;--green:#3dbb5c;--green-d:#23863c;--sky:#4aa6e8;--grape:#9b82f5;--mint:#3cc6b4;--coral:#ff7564;--muted:#5c6372;
 --fd:"Do Hyeon","Jua","Gothic A1","Apple SD Gothic Neo","Malgun Gothic",sans-serif;--fb:"Gothic A1","Apple SD Gothic Neo","Malgun Gothic",sans-serif;
 font-family:var(--fb);color:var(--ink);-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
.sp *{box-sizing:border-box}
.sp h3,.sp h4{font-family:var(--fd);font-weight:400;margin:0}
.sp p{margin:0}
.sp .b{border:3px solid var(--ink);border-radius:10px;background:var(--panel);box-shadow:0 4px 0 var(--ink);padding:9px 14px;font-family:var(--fd);font-size:17px;line-height:1.15;color:var(--ink);cursor:pointer;transition:transform .07s,box-shadow .07s;touch-action:manipulation}
.sp .b:active,.sp .b.dn{transform:translateY(3px);box-shadow:0 1px 0 var(--ink)}
.sp .b.g{background:var(--green);color:#fff;text-shadow:0 2px 0 var(--green-d)}
.sp .b.y{background:var(--yellow)}
.sp .b.s{background:var(--sky);color:#fff}
.sp .b:disabled{opacity:.45;pointer-events:none}
.sp .w{width:100%}
.sp .chip{display:inline-block;font-size:12px;font-weight:700;background:var(--panel);border:2px solid var(--ink);border-radius:6px;padding:1px 7px;white-space:nowrap}
.sp .card{background:var(--paper);border:3px solid var(--ink);border-radius:12px;box-shadow:0 4px 0 var(--ink);padding:12px}
.sp .muted{color:var(--muted);font-size:13px}
/* 계급 */
.sp-rank{display:flex;align-items:center;gap:8px;min-width:0}
.sp-rank .lv{flex:none;width:34px;height:34px;border:3px solid var(--ink);border-radius:8px;background:var(--yellow);display:grid;place-items:center;font-family:var(--fd);font-size:18px;box-shadow:0 3px 0 var(--ink)}
.sp-rank .nm{display:block;font-family:var(--fd);font-size:15px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-rank .xb{display:block;height:9px;border:2px solid var(--ink);border-radius:5px;background:#fff;overflow:hidden;margin-top:3px}
.sp-rank .xb i{display:block;height:100%;background:var(--green);transition:width .5s}
/* 팝업·토스트 */
.sp-pop{position:fixed;left:50%;top:38%;transform:translate(-50%,0);font-family:var(--fd);font-size:26px;color:#fff;-webkit-text-stroke:1.5px var(--ink);text-shadow:0 3px 0 var(--ink);pointer-events:none;z-index:9999;animation:spPop 1.1s ease-out forwards;font-family:"Do Hyeon","Jua",sans-serif}
@keyframes spPop{0%{opacity:0;transform:translate(-50%,10px) scale(.7)}15%{opacity:1;transform:translate(-50%,0) scale(1.1)}70%{opacity:1}100%{opacity:0;transform:translate(-50%,-40px)}}
.sp-modal{position:fixed;inset:0;background:rgba(28,33,48,.55);display:grid;place-items:center;z-index:9998;padding:16px;animation:spFade .2s}
@keyframes spFade{from{opacity:0}}
.sp-modal .card{max-width:330px;width:100%;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center;animation:spUp .3s cubic-bezier(.2,1.4,.5,1)}
@keyframes spUp{from{transform:translateY(30px) scale(.9)}}
.sp-modal h3{font-size:24px}
.sp-modal .ico{width:84px;height:84px;border:3px solid var(--ink);border-radius:14px;display:grid;place-items:center;background:#fff;box-shadow:0 4px 0 var(--ink)}
.sp-modal .ico svg{width:64px;height:64px}
.sp .rar{font-family:var(--fd);font-size:13px;padding:1px 8px;border-radius:6px;border:2px solid var(--ink)}
.sp .r0{background:#e9edf1}.sp .r1{background:#a9d4ff}.sp .r2{background:linear-gradient(90deg,#ffcc33,#ff7564,#9b82f5);color:#fff;text-shadow:0 1px 0 var(--ink)}
/* 잠입 */
.sp-sn{display:flex;flex-direction:column;gap:10px;max-width:420px;margin:0 auto}
.sp-sn .top{display:flex;align-items:center;gap:8px;justify-content:space-between}
.sp-sn .door{font-family:var(--fd);font-size:24px;line-height:1}
.sp-sn .door small{font-size:14px;color:var(--muted)}
.sp-sn .hearts{display:flex;gap:3px}
.sp-sn .hearts i{width:18px;height:18px;border:2px solid var(--ink);border-radius:4px;background:var(--coral)}
.sp-sn .hearts i.off{background:var(--fog-l)}
.sp-board{position:relative;display:grid;gap:3px;padding:6px;background:#4b5260;border:3px solid var(--ink);border-radius:14px;box-shadow:0 5px 0 var(--ink);touch-action:none}
.sp-board.shake{animation:spShake .35s}
@keyframes spShake{20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}}
.sp-c{position:relative;aspect-ratio:1;border-radius:5px;background:#e3dccb;overflow:visible}
.sp-c.wall{background:#8c6a4a;box-shadow:inset 0 -5px 0 #6d5037;border:2px solid #4d3826}
.sp-c.wall::after{content:"";position:absolute;left:18%;right:18%;top:22%;height:16%;background:#a98462;border-radius:2px}
.sp-c.hide{background:#6f9ec9;box-shadow:inset 0 0 0 3px #3f6f9c}
.sp-c.hide::after{content:"";position:absolute;inset:22% 30%;border-left:3px solid #3f6f9c;border-right:3px solid #3f6f9c}
.sp-c.exit{background:var(--green);box-shadow:inset 0 0 0 3px var(--green-d)}
.sp-c.exit::after{content:"문";position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);color:#fff;font-size:15px}
.sp-c.seen{background-image:repeating-linear-gradient(135deg,rgba(80,86,98,.62) 0 5px,rgba(80,86,98,.38) 5px 10px)}
.sp-c.adj{cursor:pointer}
.sp-c.adj::before{content:"";position:absolute;inset:3px;border:2px dashed rgba(28,33,48,.45);border-radius:4px}
.sp-c .shard{position:absolute;inset:30%;transform:rotate(45deg);border:2px solid var(--ink);background:linear-gradient(135deg,#ffcc33,#ff7564,#9b82f5,#4aa6e8);animation:spBob 1.2s ease-in-out infinite}
@keyframes spBob{50%{transform:rotate(45deg) translate(-2px,-2px)}}
.sp-tok{position:absolute;width:var(--cw);height:var(--cw);transition:transform .16s ease-out;pointer-events:none;z-index:2}
.sp-tok svg{width:100%;height:100%;display:block;overflow:visible}
.sp-tok.me{z-index:3}
.sp-tok.me.hid svg{opacity:.45}
.sp-tok .warn{position:absolute;top:-30%;left:50%;transform:translateX(-50%);font-family:var(--fd);font-size:18px;color:var(--red);-webkit-text-stroke:1px #fff;animation:spBlink .5s steps(2) infinite}
@keyframes spBlink{50%{opacity:.2}}
.sp-pad{display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(2,52px);gap:6px;justify-content:center}
.sp-pad .b{padding:0;font-size:22px;display:grid;place-items:center}
.sp-pad .wt{font-size:13px;line-height:1.1;background:var(--mint)}
.sp-sn .msg{min-height:2.6em;text-align:center;font-size:14px;line-height:1.35}
.sp-sn .msg b{font-family:var(--fd);font-weight:400;font-size:17px}
.sp-legend{display:flex;flex-wrap:wrap;gap:6px 10px;justify-content:center;font-size:12px;color:var(--muted)}
.sp-legend span{display:inline-flex;align-items:center;gap:4px}
.sp-legend i{width:14px;height:14px;border-radius:3px;display:inline-block;border:1.5px solid var(--ink)}
.sp-over{position:absolute;inset:0;border-radius:11px;background:rgba(28,33,48,.78);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;z-index:5;animation:spFade .25s}
.sp-over h3{font-size:26px;color:#fff}
.sp-over .b{min-width:170px}
.sp-over p{font-size:14px;line-height:1.4}
/* 안전가옥 */
.sp-safe{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:6px 0}
.sp-safe .orb{width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff6c9,#ffcc33 60%,#e8a900);border:3px solid var(--ink);box-shadow:0 5px 0 var(--ink);transform:scale(.6);transition:transform 4s ease-in-out}
.sp-safe .orb.in{transform:scale(1)}
.sp-safe .orb.out{transform:scale(.6);transition-duration:5s}
.sp-safe img{width:110px}
.sp-crate{width:120px;height:96px;border:3px solid var(--ink);border-radius:10px;background:repeating-linear-gradient(90deg,#c58b55 0 18px,#b37a46 18px 20px);box-shadow:0 5px 0 var(--ink);position:relative;cursor:pointer}
.sp-crate::before{content:"";position:absolute;left:-3px;right:-3px;top:28%;height:14px;background:var(--yellow);border:3px solid var(--ink)}
.sp-crate.shk{animation:spShake .5s infinite}
/* 도감 */
.sp-gear{display:flex;flex-direction:column;gap:12px;max-width:420px;margin:0 auto}
.sp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.sp-slot{aspect-ratio:1;border:3px solid var(--ink);border-radius:10px;background:#fff;display:grid;place-items:center;position:relative;box-shadow:0 3px 0 var(--ink);cursor:pointer;padding:0}
.sp-slot svg{width:70%;height:70%}
.sp-slot.no{background:var(--fog-l);cursor:default}
.sp-slot.no::after{content:"?";font-family:var(--fd);font-size:26px;color:var(--fog-d)}
.sp-slot.on{outline:4px solid var(--green);outline-offset:1px}
.sp-slot .rd{position:absolute;left:4px;top:4px;width:9px;height:9px;border-radius:50%;border:1.5px solid var(--ink)}
.sp-prog{display:flex;justify-content:space-between;align-items:baseline}
.sp-prog b{font-family:var(--fd);font-weight:400;font-size:20px}
.sp-emotes{display:flex;gap:8px;flex-wrap:wrap}
.sp-emotes .b{font-size:15px;padding:7px 11px}
.sp-stagebox{height:170px;display:grid;place-items:center;background:linear-gradient(#bfe4ff,#e6f4ff);border:3px solid var(--ink);border-radius:12px;position:relative;overflow:hidden}
.sp-stagebox img{height:150px;border-radius:14px;transition:transform .3s}
.sp-stagebox .lock{position:absolute;inset:0;background:rgba(215,219,224,.85);display:grid;place-items:center;font-family:var(--fd)}
.em-bounce{animation:emB .5s ease-in-out infinite alternate}
@keyframes emB{to{transform:translateY(-14px) rotate(-4deg)}}
.em-flop{animation:emF 1.6s ease-in-out infinite}
@keyframes emF{0%,100%{transform:none}40%,70%{transform:translateY(30px) scaleY(.55) scaleX(1.25)}}
.em-yawn{animation:emY 2s ease-in-out infinite}
@keyframes emY{50%{transform:scale(1.08) rotate(3deg)}}
.em-dance{animation:emD .45s ease-in-out infinite alternate}
@keyframes emD{0%{transform:rotate(-9deg) translateY(0)}100%{transform:rotate(9deg) translateY(-10px)}}
/* 코드 */
.sp-code{display:flex;flex-direction:column;gap:12px;max-width:420px;margin:0 auto}
.sp-code input{width:100%;font-family:var(--fd);font-size:24px;text-align:center;letter-spacing:.08em;padding:12px;border:3px solid var(--ink);border-radius:10px;background:#fff;box-shadow:inset 0 3px 0 rgba(0,0,0,.08);text-transform:uppercase;user-select:text;-webkit-user-select:text}
.sp-code .res{min-height:1.5em;text-align:center;font-family:var(--fd);font-size:17px}
.sp-code ul{margin:0;padding-left:18px;font-size:13.5px;line-height:1.6}
/* 전교 작전 */
.sp-raid{display:flex;flex-direction:column;gap:12px;max-width:420px;margin:0 auto}
.sp-boss{position:relative;height:180px;border:3px solid var(--ink);border-radius:14px;background:linear-gradient(#8e949d,#c3c8cf);overflow:hidden;display:grid;place-items:center;box-shadow:0 5px 0 var(--ink)}
.sp-boss svg{width:190px;transition:opacity .6s,transform .6s}
.sp-hp{height:26px;border:3px solid var(--ink);border-radius:8px;background:#fff;overflow:hidden;position:relative}
.sp-hp i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#727985,#a7adb5);transition:width .8s}
.sp-hp span{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-size:15px}
.sp-ms{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
.sp-ms li{display:flex;gap:8px;align-items:center;font-size:14px}
.sp-ms li i{flex:none;width:22px;height:22px;border:2px solid var(--ink);border-radius:5px;background:#fff;display:grid;place-items:center;font-style:normal;font-family:var(--fd)}
.sp-ms li.ok i{background:var(--green);color:#fff}
.sp-stat{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sp-stat div{background:#fff;border:3px solid var(--ink);border-radius:10px;padding:8px;text-align:center}
.sp-stat b{display:block;font-family:var(--fd);font-weight:400;font-size:26px}
.sp-stat span{font-size:12px;color:var(--muted)}
/* 소등 */
.sp-night{position:fixed;inset:0;z-index:9997;background:#111a2e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center}
.sp-night img{width:150px;filter:brightness(.75);border-radius:18px}
.sp-night h3{font-size:28px;color:#ffe69a}
.sp-night p{font-size:15px;line-height:1.5;max-width:300px;color:#dbe3f4}
.sp-night .stars{position:absolute;inset:0;background-image:radial-gradient(2px 2px at 20% 20%,#fff,transparent),radial-gradient(2px 2px at 70% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 40% 70%,#fff,transparent),radial-gradient(2px 2px at 85% 60%,#fff,transparent),radial-gradient(1.5px 1.5px at 12% 82%,#fff,transparent);pointer-events:none}
.sp-night .help{font-size:13px;color:#aab6d0}
@media (prefers-reduced-motion:reduce){.sp *,.sp-pop,.sp-modal *{animation:none!important;transition:none!important}}
`;
function injectCSS(){ if(document.getElementById('sp-css')) return; const s=document.createElement('style'); s.id='sp-css'; s.textContent=CSS; document.head.appendChild(s); }

/* ---------------- 데이터 ---------------- */
const RANKS=[ // [이름, 필요 누적 XP]
 ['견습 요원',0],['평범 요원',60],['위장 요원',150],['잠입 요원',280],['감각 요원',450],['정예 요원',700],['비밀 요원',1000],['전설의 평범요원',1400]];
const XP={minigame:20, order:15, door:10, shard:5, safe:15, code:30, daily:10, raid:5};

/* 픽셀 아이콘: 10x10, 글자=색 */
const PAL={k:'#1c2130',w:'#ffffff',y:'#ffcc33',r:'#e0522f',s:'#4aa6e8',g:'#3dbb5c',p:'#9b82f5',m:'#3cc6b4',o:'#ff7564',b:'#c58b55',n:'#8c6a4a',a:'#a7adb5',d:'#727985',l:'#d7dbe0',c:'#f3c99e'};
const GEAR=[
 {id:'glasses', name:'평범한 안경', r:0, d:'아무도 의심하지 않는 평범함의 상징.', px:['..........','..........','..........','kkkk..kkkk','kwwk..kwwk','kwwkkkkwwk','kwwk..kwwk','kkkk..kkkk','..........','..........']},
 {id:'memo', name:'요원 수첩', r:0, d:'오늘 본 하늘색을 적어 두는 곳.', px:['.kkkkkkkk.','.kyyyyyyyk','.kywwwwwyk','.kykkkkwyk','.kywwwwwyk','.kykkkkwyk','.kywwwwwyk','.kykkkwwyk','.kyyyyyyyk','.kkkkkkkk.']},
 {id:'earbud', name:'잠입 이어폰', r:0, d:'음악이 아니라 주변 소리를 듣는 데 씀.', px:['...kkkk...','..kwwwwk..','.kw....wk.','.k......k.','kk......kk','kwk....kwk','kwk....kwk','kkk....kkk','..........','..........']},
 {id:'light', name:'손전등', r:0, d:'안개 속 발밑을 비춘다.', px:['..........','.kkk......','.kyykkkkk.','.kyywwwwk.','.kyykkkkk.','.kkk......','..........','..........','..........','..........']},
 {id:'candy', name:'비상 사탕', r:0, d:'천천히 녹여 먹으면 맛이 돌아온다.', px:['..........','..........','k........k','kk.kkkk.kk','kokooooroo','kk.kkkk.kk','k........k','..........','..........','..........']},
 {id:'radio', name:'무전기', r:0, d:'본부와 연결. 지지직.', px:['....k.....','....k.....','..kkkkkk..','..kddddk..','..kdssdk..','..kddddk..','..kdkdkk..','..kdkdkk..','..kddddk..','..kkkkkk..']},
 {id:'scope', name:'접이식 망원경', r:1, d:'먼 곳을 보면 눈이 쉰다.', px:['..........','.........k','.......kkk','.....kkbbk','...kkbbbk.','.kkbbbbk..','kssbbbk...','kssbbk....','.kkkk.....','..........']},
 {id:'plant', name:'위장용 화분', r:1, d:'뒤에 숨으면 아무도 못 알아본다(아마도).', px:['....gg....','..gggggg..','.gg.gg.gg.','..g.gg.g..','....gg....','.kkkkkkkk.','..kbbbbk..','..kbbbbk..','..kbbbbk..','...kkkk...']},
 {id:'badge', name:'늘곰 배지', r:1, d:'Wee클래스 요원의 증표.', px:['...kkkk...','..kyyyyk..','.kycyyyck.','.kyyyyyyk.','.kykyykyk.','.kyyccyyk.','..kyyyyk..','...kkkk...','..kr..rk..','..kr..rk..']},
 {id:'shades', name:'소장의 선글라스', r:2, d:'늘곰 소장이 몰래 빌려준 진짜 요원 장비.', px:['..........','..........','kkkkkkkkkk','kkkkkkkkkk','.kkkk.kkkk','.kkwk.kkwk','.kkkk.kkkk','..kk...kk.','..........','..........']},
 {id:'umbrella', name:'무지개 우산', r:2, d:'회색 비도 이 우산 아래에선 색이 된다.', px:['....k.....','..rrooyy..','.rrrooyyy.','rrrrooyyyy','kkkkkkkkkk','....k.....','....k.....','....k.....','..k.k.....','...k......']},
 {id:'phones', name:'룰루랄라 헤드폰', r:2, d:'늘곰이 매일 부르는 노래가 들린다.', px:['..kkkkkk..','.kppppppk.','kpk....kpk','kk......kk','k........k','kkk....kkk','kmmk..kmmk','kmmk..kmmk','kmmk..kmmk','.kk....kk.']}
];
const RNAME=['흔함','희귀','전설'];
const RCOL=['#d7dbe0','#4aa6e8','#ffcc33'];
/* 비밀 코드: 원문 대신 SHA-256만 저장(소스를 열어도 코드가 안 보이게). 운영 시 시트 '코드' 탭에서 바꾸면 됨.
   시연용 코드: WEE3F, SKY10, 룰루랄라, DDAY1215, 천천히, 무지개 */
let codeTable={ // 시연용 기본 코드(해시). 운영 시 setCodes()로 교체
 "c4e23c5aef434f5d0cc64405a13e2a77c36e9c933634a2e11e936611cacb564c":{gear:"badge",msg:"Wee클래스 요원 인증!"},
 "2227c82f548a2163ba2cacf7c057b2750de704f02921d563cac747b628cba682":{gear:"scope",msg:"하늘을 10초 본 요원에게"},
 "bb77618c8c8d7c7b7cde362805d2223c60ba7c15d367a903633d2eda341facb4":{gear:"phones",msg:"늘곰의 노래가 들린다"},
 "fefc56969a990d3a06b956921328eecf9ea3d9afd96456f94ebf7cbf7d5fa8b9":{gear:"shades",msg:"D-Day 작전 참가 확인"},
 "71c0b7db98a074453c8748f4b8082755cf2cbe4507bcaacee11ad0a7c79bcf6c":{gear:"candy",msg:"천천히 먹은 요원에게"},
 "1e821ffcefd0cae04600520d9d08206b46ae05fa0fbbf12064c2f95ece85584b":{gear:"umbrella",msg:"전교 정화 작전 성공 보상"}
};
function setCodes(t){ codeTable=t; }
const MONSTERS={
 patrol:{name:'멍구름', d:'정해진 길을 왔다 갔다 하며 앞만 본다. 화살표 쪽으로 움직여요.', tip:'지나간 뒤 등 뒤로 따라가면 안전.'},
 spin:{name:'두리번구름', d:'제자리에서 시계 방향으로 고개를 돌린다.', tip:'고개가 다른 쪽을 볼 때 지나가요.'},
 sleep:{name:'졸음구름', d:'두 턴 자고 두 턴 깨어 있다. 깨기 직전엔 ! 표시.', tip:'Zzz일 때 지나가요. 가만히 기다리는 것도 작전.'}
};

/* ---------------- 상태 ---------------- */
const DEF={xp:0, door:1, ckpt:1, best:0, run:null, energy:{day:0,used:0}, gear:{}, equip:null, emote:'idle', codes:{}, days:{}, dex:{}, contrib:0, firstSeen:0};
let S=load();
function load(){ try{ return Object.assign(JSON.parse(JSON.stringify(DEF)), JSON.parse(localStorage.getItem(VER)||'{}')); }catch(e){ return JSON.parse(JSON.stringify(DEF)); } }
function save(){ try{ localStorage.setItem(VER, JSON.stringify(S)); }catch(e){} }
const listeners={};
function on(ev,fn){ (listeners[ev]=listeners[ev]||[]).push(fn); }
function emit(ev,data){ (listeners[ev]||[]).forEach(f=>{ try{f(data);}catch(e){} }); }
function report(type){ S.contrib++; save(); emit('report',{type}); }
const today=()=>{const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();};
let demoTime=null; // 시연용 시각 덮어쓰기
function hourNow(){ return demoTime!=null?demoTime:new Date().getHours(); }
function isCurfew(){ const h=hourNow(); return h>=22||h<6; }
const ENERGY=3;
function energyLeft(){ if(S.energy.day!==today()){ S.energy={day:today(),used:0}; save(); } return Math.max(0,ENERGY-S.energy.used); }

/* ---------------- 공통 UI ---------------- */
function el(tag,cls,html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
function vib(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
function pop(text){ injectCSS(); const d=el('div','sp-pop',text); document.body.appendChild(d); setTimeout(()=>d.remove(),1150); }
function modal(html,btn,cb){ injectCSS(); const m=el('div','sp sp-modal'); const c=el('div','card',html); const b=el('button','b g w',btn||'좋아'); c.appendChild(b); m.appendChild(c); document.body.appendChild(m);
  b.onclick=()=>{ m.remove(); cb&&cb(); }; return m; }
function iconSVG(g){ const px=g.px; let r=''; for(let y=0;y<10;y++) for(let x=0;x<10;x++){ const ch=px[y][x]; if(ch!=='.') r+=`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${PAL[ch]}"/>`; } return `<svg viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`; }

/* ---------------- 계급 ---------------- */
function rankOf(xp){ let i=0; for(let k=0;k<RANKS.length;k++) if(xp>=RANKS[k][1]) i=k; return i; }
function rankInfo(){ const i=rankOf(S.xp); const cur=RANKS[i][1], nxt=RANKS[i+1]?RANKS[i+1][1]:null; return {lv:i+1, name:RANKS[i][0], xp:S.xp, pct:nxt?Math.round((S.xp-cur)/(nxt-cur)*100):100, need:nxt?nxt-S.xp:0, next:RANKS[i+1]?RANKS[i+1][0]:null}; }
function rankHTML(){ injectCSS(); const r=rankInfo(); return `<div class="sp sp-rank"><span class="lv">${r.lv}</span><span style="min-width:0;flex:1"><span class="nm">${r.name}</span><span class="xb"><i style="width:${r.pct}%"></i></span></span></div>`; }
const EMOTES=[{id:'idle',name:'기본',lv:1,img:'base',cls:''},{id:'bounce',name:'신남',lv:2,img:'base',cls:'em-bounce'},{id:'flop',name:'철퍼덕',lv:3,img:'base',cls:'em-flop'},{id:'yawn',name:'하품',lv:5,img:'yawn',cls:'em-yawn'},{id:'agent',name:'요원 모드',lv:6,img:'agent',cls:'em-bounce'},{id:'dance',name:'룰루랄라 춤',lv:7,img:'dance',cls:'em-dance'}];
function addXP(n,why){ const before=rankOf(S.xp); S.xp+=n; save(); pop('+'+n+' XP'); emit('xp',{n,why,total:S.xp});
  const after=rankOf(S.xp);
  if(after>before){ setTimeout(()=>{ vib([40,60,40]); const em=EMOTES.find(e=>e.lv===after+1);
    modal(`<span class="chip">계급 상승</span><h3>${RANKS[after][0]}</h3><p class="muted">Lv.${after+1}. 본부가 요원님의 평범함을 인정했습니다.</p>${em?`<p style="font-size:14px">새 이모트 해금: <b>${em.name}</b></p>`:''}`,'계속 작전'); emit('rankup',{lv:after+1}); },700); }
}
function checkIn(){ const t=today(); if(!S.days[t]){ S.days[t]=1; save(); addXP(XP.daily,'출근'); return true; } return false; }
function daysCount(){ return Object.keys(S.days).length; }

/* ---------------- 장비 ---------------- */
function giveGear(id){ const g=GEAR.find(x=>x.id===id); if(!g) return null; const dup=!!S.gear[id]; if(!dup){ S.gear[id]=1; save(); report('gear'); } return {g,dup}; }
function rollGear(){ const roll=Math.random(); const r=roll<0.06?2:roll<0.32?1:0; const pool=GEAR.filter(g=>g.r===r&&!['shades','phones'].includes(g.id)); const pick=(pool.length?pool:GEAR.filter(g=>g.r===0))[Math.floor(Math.random()*(pool.length||6))]; return pick.id; }
function gearModal(res,cb){ const {g,dup}=res; vib(g.r?[30,40,30,40,60]:30);
  modal(`<span class="rar r${g.r}">${RNAME[g.r]}</span><div class="ico" style="background:${RCOL[g.r]}22">${iconSVG(g)}</div><h3>${g.name}</h3><p class="muted">${g.d}</p>${dup?'<p style="font-size:14px">이미 있는 장비라서 <b>경험치 +15</b>로 바꿨어요.</p>':'<p style="font-size:14px">장비 도감에 등록됐어요.</p>'}`,'받기',()=>{ if(dup) addXP(15,'중복 장비'); cb&&cb(); }); }

/* ---------------- 시드 난수 ---------------- */
function rng(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const DIRS=[[-1,0],[0,1],[1,0],[0,-1]]; // 위 오른쪽 아래 왼쪽
function gcd(a,b){ return b?gcd(b,a%b):a; } function lcm(a,b){ return a/gcd(a,b)*b; }

/* ---------------- 문 만들기 (같은 번호 = 모두 같은 방) ---------------- */
const COLS=6, ROWS=8;
function doorSpec(n){ // 난이도
  if(n<=2) return {mons:['patrol'], vis:2};
  if(n<=4) return {mons:['patrol','patrol'], vis:2};
  if(n<=7) return {mons:['patrol','spin'], vis:2};
  if(n<=10) return {mons:['patrol','sleep','patrol'], vis:2};
  if(n<=15) return {mons:['patrol','spin','sleep'], vis:2};
  if(n<=25) return {mons:['patrol','patrol','spin','sleep'], vis:3};
  return {mons:['patrol','patrol','spin','sleep','sleep'], vis:3};
}
function monAt(m,t){ // t번째 턴의 위치·방향·깨어있음
  if(m.type==='patrol'){ const L=m.path.length, P=2*(L-1); const k=t%P; const i=k<L?k:P-k;
    const face=k<L-1?m.fdir:(m.fdir+2)%4; // 다음에 움직일 쪽을 바라봄
    return {r:m.path[i][0], c:m.path[i][1], dir:face, awake:true}; }
  if(m.type==='spin') return {r:m.r,c:m.c,dir:(m.dir+t)%4,awake:true};
  if(m.type==='sleep'){ const ph=(t+m.off)%4; return {r:m.r,c:m.c,dir:m.dir,awake:ph<2, wakeSoon:ph===3}; }
}
function monPeriod(m){ return m.type==='patrol'?Math.max(1,2*(m.path.length-1)):4; }
function visionCells(L,t){ const set=new Set(); L.mons.forEach(m=>{ const s=monAt(m,t); if(!s.awake) return; let r=s.r,c=s.c; const [dr,dc]=DIRS[s.dir]; for(let k=0;k<L.vis;k++){ r+=dr;c+=dc; if(r<0||c<0||r>=ROWS||c>=COLS||L.wall[r][c]) break; set.add(r*COLS+c);} }); return set; }
function monCells(L,t){ const set=new Set(); L.mons.forEach(m=>{ const s=monAt(m,t); set.add(s.r*COLS+s.c); }); return set; }
function caught(L,pr,pc,t,prevR,prevC){ // 플레이어가 (pr,pc)로 옮긴 직후 t→t+1
  const id=pr*COLS+pc; const hid=L.hide[pr][pc];
  if(monCells(L,t).has(id)||monCells(L,t+1).has(id)) return true;
  if(!hid && (visionCells(L,t).has(id)||visionCells(L,t+1).has(id))) return true;
  // 맞바꾸기
  if(prevR!=null){ for(const m of L.mons){ const a=monAt(m,t),b=monAt(m,t+1); if(a.r===pr&&a.c===pc&&b.r===prevR&&b.c===prevC) return true; } }
  return false;
}
function solvePath(L,t0,r0,c0){ // 최단 경로(이동 목록). 없으면 null
  t0=t0||0; if(r0==null){ r0=L.sr; c0=L.sc; }
  let P=1; L.mons.forEach(m=>P=lcm(P,monPeriod(m)));
  if(t0===0&&(visionCells(L,0).has(r0*COLS+c0)||monCells(L,0).has(r0*COLS+c0))) return null;
  const seen=new Map(); const q=[[r0,c0,t0,0]]; seen.set(r0+','+c0+','+(t0%P),null); let head=0;
  while(head<q.length){ const cur=q[head++]; const [r,c,t,d]=cur; if(d>60) continue;
    for(const mv of [[0,0],...DIRS]){ const nr=r+mv[0],nc=c+mv[1]; if(nr<0||nc<0||nr>=ROWS||nc>=COLS||L.wall[nr][nc]) continue;
      if(caught(L,nr,nc,t,r,c)) continue; const node=[nr,nc,t+1,d+1,cur,mv];
      if(nr===L.er&&nc===L.ec){ const path=[]; let x=node; while(x&&x[5]){ path.unshift(x[5]); x=x[4]; } return path; }
      const k=nr+','+nc+','+((t+1)%P); if(seen.has(k)) continue; seen.set(k,1); node.length=6; q.push(node); } }
  return null; }
function solve(L){ const p=solvePath(L); return p?p.length:-1; }
function makeDoor(n){
  const spec=doorSpec(n);
  for(let attempt=0;attempt<400;attempt++){
    const R=rng(n*7919+attempt*104729+17);
    const L={n,vis:spec.vis,wall:[],hide:[],mons:[],sr:ROWS-1,sc:Math.floor(R()*COLS),er:0,ec:Math.floor(R()*COLS),shard:null};
    for(let r=0;r<ROWS;r++){ L.wall.push(Array(COLS).fill(false)); L.hide.push(Array(COLS).fill(false)); }
    const dens=n<3?0.1:n<10?0.14:0.18;
    for(let r=1;r<ROWS-1;r++) for(let c=0;c<COLS;c++) if(R()<dens) L.wall[r][c]=true;
    const free=()=>{ for(let k=0;k<50;k++){ const r=1+Math.floor(R()*(ROWS-2)), c=Math.floor(R()*COLS); if(!L.wall[r][c]&&!L.hide[r][c]&&!L.mons.some(m=>m._cells&&m._cells.some(x=>x[0]===r&&x[1]===c))) return [r,c]; } return null; };
    let ok=true;
    for(const type of spec.mons){ const p=free(); if(!p){ok=false;break;}
      if(type==='patrol'){ const horiz=R()<0.5; const fdir=horiz?1:2; const path=[[p[0],p[1]]]; let r=p[0],c=p[1]; const want=3+Math.floor(R()*3);
        while(path.length<want){ r+=DIRS[fdir][0]; c+=DIRS[fdir][1]; if(r<1||c<0||r>=ROWS-1||c>=COLS||L.wall[r][c]) break; path.push([r,c]); }
        if(path.length<2){ ok=false; break; } L.mons.push({type,path,fdir,dir:fdir,_cells:path}); }
      else if(type==='spin') L.mons.push({type,r:p[0],c:p[1],dir:Math.floor(R()*4),_cells:[p]});
      else L.mons.push({type,r:p[0],c:p[1],dir:Math.floor(R()*4),off:Math.floor(R()*4),_cells:[p]});
    }
    if(!ok) continue;
    const nh=n<3?1:2; for(let k=0;k<nh;k++){ const p=free(); if(p) L.hide[p[0]][p[1]]=true; }
    const sp=free(); if(sp) L.shard=sp;
    const d=solve(L); const minLen=n<3?7:n<10?8:10;
    if(d>=minLen && d<=34){ L.par=d; return L; }
  }
  // 안전장치: 몬스터 하나만
  const L={n,vis:2,wall:[],hide:[],mons:[],sr:ROWS-1,sc:2,er:0,ec:3,shard:null,par:8}; for(let r=0;r<ROWS;r++){ L.wall.push(Array(COLS).fill(false)); L.hide.push(Array(COLS).fill(false)); }
  L.mons.push({type:'patrol',path:[[3,0],[3,1],[3,2],[3,3]],fdir:1,dir:1}); return L;
}

/* ---------------- 그림 ---------------- */
function cloudSVG(s,type){ const awake=s.awake; const arrow=['M50 4 L42 16 L58 16Z','M96 50 L84 42 L84 58Z','M50 96 L42 84 L58 84Z','M4 50 L16 42 L16 58Z'][s.dir];
  const eyes=awake?`<circle cx="40" cy="54" r="5" fill="#1c2130"/><circle cx="60" cy="54" r="5" fill="#1c2130"/>`:`<path d="M34 55 h12 M54 55 h12" stroke="#1c2130" stroke-width="4" stroke-linecap="round"/>`;
  const body=type==='spin'?'#9aa1ab':type==='sleep'?'#b7a9d9':'#a7adb5';
  return `<svg viewBox="0 0 100 100"><path d="M24 74 Q8 74 10 60 Q10 46 24 46 Q24 28 44 28 Q58 22 66 36 Q86 34 88 52 Q94 72 76 74 Z" fill="${body}" stroke="#1c2130" stroke-width="5" stroke-linejoin="round"/>${eyes}${awake?`<path d="${arrow}" fill="#e0522f" stroke="#1c2130" stroke-width="3"/>`:`<text x="70" y="30" font-size="20" font-family="sans-serif" font-weight="900" fill="#fff" stroke="#1c2130" stroke-width="1.5">z</text>`}</svg>`; }
function agentSVG(){ return `<svg viewBox="0 0 100 100"><rect x="22" y="58" width="56" height="34" rx="6" fill="#26304a" stroke="#1c2130" stroke-width="5"/><rect x="24" y="14" width="52" height="48" rx="8" fill="#f3c99e" stroke="#1c2130" stroke-width="5"/><rect x="20" y="8" width="60" height="16" rx="5" fill="#1c2130"/><rect x="28" y="32" width="18" height="11" rx="3" fill="#1c2130"/><rect x="54" y="32" width="18" height="11" rx="3" fill="#1c2130"/><rect x="44" y="35" width="12" height="4" fill="#1c2130"/><path d="M42 52 h16" stroke="#1c2130" stroke-width="4" stroke-linecap="round"/></svg>`; }

/* ---------------- 안개 복도 잠입 ---------------- */
function mountSneak(host,opts){
  injectCSS(); opts=opts||{};
  const IMG=opts.img||{base:'img/base.png',agent:'img/agent.png',yawn:'img/yawn.png'};
  const root=el('div','sp sp-sn'); host.innerHTML=''; host.appendChild(root);
  let L=null,t=0,pr=0,pc=0,busy=false,gotShard=false,timers=[];
  const meSVG=opts.avatarSVG?opts.avatarSVG():agentSVG();
  function clearT(){ timers.forEach(clearTimeout); timers=[]; }
  function later(f,ms){ timers.push(setTimeout(f,ms)); }

  function lobby(){ clearT(); const e=energyLeft(); const run=S.run;
    root.innerHTML=`<div class="card" style="text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center">
      <span class="chip">안개 복도 잠입</span>
      <h3 style="font-size:28px">${run?`${S.door}번 문에서 이어하기`:`${S.ckpt}번 문부터 출발`}</h3>
      <p class="muted" style="max-width:280px">안개 구름의 시선(회색 줄무늬)을 피해 초록 문까지. 한 칸 움직이면 구름도 한 칸 움직여요. 5번째 문마다 안전가옥에서 숨 고르고 저장.</p>
      <div class="sp-stat" style="width:100%"><div><b>${S.best}</b><span>내 최고 기록(문)</span></div><div><b>${e} / ${ENERGY}</b><span>오늘 남은 작전</span></div></div>
      <button class="b g w" id="go" ${(!run&&e<=0)?'disabled':''} style="font-size:22px;padding:13px">${run?'이어서 잠입':'작전 시작 (1회 사용)'}</button>
      ${(!run&&e<=0)?`<p style="font-size:14px">오늘 잠입 작전은 끝! 내일 다시 3번 열려요.<br>본부 미니게임과 평범지령은 계속 할 수 있어요.</p>`:''}
      <div class="sp-legend"><span><i style="background:#e3dccb"></i>복도</span><span><i style="background:#8c6a4a"></i>책상</span><span><i style="background:#6f9ec9"></i>사물함(숨기)</span><span><i style="background:repeating-linear-gradient(135deg,#6b717c 0 3px,#9aa0a8 3px 6px)"></i>시선</span><span><i style="background:var(--green)"></i>출구</span></div>
    </div>`;
    root.querySelector('#go').onclick=()=>{ if(!S.run){ if(energyLeft()<=0) return; S.energy.used++; S.run={hearts:3}; S.door=S.ckpt; save(); } start(S.door); };
  }
  function start(n){ clearT(); L=makeDoor(n); t=0; pr=L.sr; pc=L.sc; busy=false; gotShard=false;
    root.innerHTML=`<div class="top"><div class="door">${n}<small>번 문</small></div><div class="hearts" id="hh"></div><span class="chip" id="tc">턴 0 · 목표 ${L.par}</span></div>
      <div class="sp-board" id="bd" style="grid-template-columns:repeat(${COLS},1fr)"></div>
      <p class="msg" id="msg"></p><button class="b" id="hint" style="align-self:center;font-size:14px;padding:6px 12px">늘곰 무전 힌트 (문마다 1번)</button>
      <div class="sp-pad"><span></span><button class="b" data-d="0" aria-label="위">▲</button><span></span><button class="b" data-d="3" aria-label="왼쪽">◀</button><button class="b wt" data-d="w">숨 한 번<br>(대기)</button><button class="b" data-d="1" aria-label="오른쪽">▶</button></div>
      <div class="sp-pad" style="grid-template-rows:52px;margin-top:-4px"><span></span><button class="b" data-d="2" aria-label="아래">▼</button><span></span></div>`;
    const bd=root.querySelector('#bd');
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){ const d=el('div','sp-c'); d.dataset.r=r; d.dataset.c=c; if(L.wall[r][c]) d.classList.add('wall'); if(L.hide[r][c]) d.classList.add('hide'); if(r===L.er&&c===L.ec) d.classList.add('exit'); bd.appendChild(d); }
    if(L.shard){ bd.children[L.shard[0]*COLS+L.shard[1]].innerHTML='<i class="shard"></i>'; }
    L.mons.forEach((m,i)=>{ const k=el('div','sp-tok'); k.id='m'+i; bd.appendChild(k); });
    const me=el('div','sp-tok me',meSVG); me.id='me'; bd.appendChild(me);
    root.querySelectorAll('.sp-pad .b').forEach(b=>{ b.onclick=()=>{ const d=b.dataset.d; d==='w'?move(0,0):move(DIRS[d][0],DIRS[d][1]); }; });
    bd.addEventListener('click',e=>{ const c=e.target.closest('.sp-c'); if(!c) return; const r=+c.dataset.r, cc=+c.dataset.c; const dr=r-pr, dc=cc-pc; if(Math.abs(dr)+Math.abs(dc)===1) move(dr,dc); else if(dr===0&&dc===0) move(0,0); });
    let sx=0,sy=0; bd.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; },{passive:true});
    bd.addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy; if(Math.max(Math.abs(dx),Math.abs(dy))<28) return; e.preventDefault(); if(Math.abs(dx)>Math.abs(dy)) move(0,dx>0?1:-1); else move(dy>0?1:-1,0); });
    window.addEventListener('keydown',key);
    let hinted=false; root.querySelector('#hint').onclick=e=>{ if(hinted||busy) return; const p=solvePath(L,t,pr,pc); hinted=true; e.target.disabled=true;
      const nm=p&&p.length?({'-1,0':'위로','1,0':'아래로','0,-1':'왼쪽으로','0,1':'오른쪽으로','0,0':'제자리에서 숨 한 번'})[p[0].join(',')]:null;
      root.querySelector('#msg').innerHTML=nm?`<b>늘곰 소장(무전):</b> "지금은… ${nm}. 서두르지 마."`:'<b>늘곰 소장(무전):</b> "음… 이 문은 처음부터 다시 해 보자."'; };
    render(); intro();
  }
  function key(e){ const m={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1],' ':[0,0]}[e.key]; if(m&&root.isConnected&&root.querySelector('#bd')){ e.preventDefault(); move(m[0],m[1]); } }
  function intro(){ // 새 안개 도감 등록
    const types=[...new Set(L.mons.map(m=>m.type))]; const nu=types.filter(x=>!S.dex[x]);
    const msg=root.querySelector('#msg');
    if(nu.length){ const x=nu[0]; S.dex[x]=1; save(); const M=MONSTERS[x]; busy=true;
      modal(`<span class="chip">새 안개 발견 · 안개 도감 등록</span><div class="ico">${cloudSVG({awake:true,dir:1},x)}</div><h3>${M.name}</h3><p style="font-size:14px">${M.d}</p><p class="muted">요령: ${M.tip}</p>`,'알겠어',()=>{busy=false; intro();}); return; }
    msg.innerHTML=L.n===1&&S.best===0?'<b>칸을 누르거나 밀어서 이동</b><br>회색 줄무늬 칸에 서 있으면 들켜요.':`<b>${L.n}번 문</b> · 목표 ${L.par}턴 안에 통과하면 보너스`;
  }
  function render(){ const bd=root.querySelector('#bd'); if(!bd) return; const cw=(bd.clientWidth-12-3*(COLS-1))/COLS; bd.style.setProperty('--cw',cw+'px');
    const pos=(r,c)=>`translate(${6+c*(cw+3)}px,${6+r*(cw+3)}px)`;
    const vis=visionCells(L,t);
    [...bd.children].forEach(ch=>{ if(!ch.classList.contains('sp-c')) return; const r=+ch.dataset.r,c=+ch.dataset.c; ch.classList.toggle('seen',vis.has(r*COLS+c)); ch.classList.toggle('adj',Math.abs(r-pr)+Math.abs(c-pc)===1&&!L.wall[r][c]); });
    L.mons.forEach((m,i)=>{ const s=monAt(m,t); const k=bd.querySelector('#m'+i); k.style.transform=pos(s.r,s.c); k.innerHTML=cloudSVG(s,m.type)+(m.type==='sleep'&&s.wakeSoon?'<span class="warn">!</span>':''); });
    const me=bd.querySelector('#me'); me.style.transform=pos(pr,pc); me.classList.toggle('hid',L.hide[pr][pc]);
    const hh=root.querySelector('#hh'); hh.innerHTML=[0,1,2].map(i=>`<i class="${i<(S.run?S.run.hearts:3)?'':'off'}" title="위장 하트"></i>`).join('');
    root.querySelector('#tc').textContent=`턴 ${t} · 목표 ${L.par}`;
  }
  function move(dr,dc){ if(busy||!L) return; const nr=pr+dr, nc=pc+dc; if(nr<0||nc<0||nr>=ROWS||nc>=COLS||L.wall[nr][nc]){ vib(15); return; }
    const was=[pr,pc]; const bad=caught(L,nr,nc,t,pr,pc); pr=nr; pc=nc; t++; vib(8);
    if(L.shard&&!gotShard&&pr===L.shard[0]&&pc===L.shard[1]){ gotShard=true; root.querySelector('#bd').children[pr*COLS+pc].innerHTML=''; pop('색 조각 +'+XP.shard); S.xp+=XP.shard; save(); }
    render();
    if(bad){ busy=true; return later(()=>caughtFx(),180); }
    if(pr===L.er&&pc===L.ec){ busy=true; return later(clear,200); }
    if(dr===0&&dc===0) root.querySelector('#msg').innerHTML=L.hide[pr][pc]?'<b>사물함 속에서 숨 한 번.</b> 아무도 못 봐요.':'<b>숨 한 번.</b> 기다리는 것도 작전이에요.';
    else root.querySelector('#msg').innerHTML=L.hide[pr][pc]?'<b>사물함에 숨었다.</b> 시선이 지나가도 안전.':'';
  }
  function caughtFx(){ const bd=root.querySelector('#bd'); bd.classList.add('shake'); vib([60,40,90]); S.run.hearts--; save(); render();
    const lines=['안개 구름: "…저 학생, 너무 수상하게 평범한데?"','들켰다! 하지만 평범하게 지나가는 척 성공.','안개 구름이 하품하는 사이 빠져나왔다. 다시!'];
    if(S.run.hearts>0){ const o=el('div','sp-over',`<h3>들켰다!</h3><p>${lines[Math.floor(Math.random()*lines.length)]}<br>위장 하트 ${S.run.hearts}개 남음</p>`); const b=el('button','b y','같은 문 다시'); b.onclick=()=>start(L.n); o.appendChild(b); bd.appendChild(o); }
    else { const reached=L.n; S.run=null; S.door=S.ckpt; save(); emit('runover',{reached});
      const o=el('div','sp-over',`<h3>작전 종료</h3><p>${reached}번 문까지 왔어요. 최고 기록 <b>${S.best}</b>번 문.<br>다음엔 <b>${S.ckpt}</b>번 문(안전가옥 저장 지점)부터 시작해요.</p>`); const b=el('button','b y','본부로'); b.onclick=lobby; o.appendChild(b); bd.appendChild(o); }
  }
  function clear(){ const n=L.n; const underPar=t<=L.par; let gain=XP.door+(underPar?5:0); if(n>S.best){ S.best=n; } S.door=n+1; save(); report('door'); addXP(gain,'문 통과'); vib([20,30,20]);
    const bd=root.querySelector('#bd'); const o=el('div','sp-over',`<h3>${n}번 문 통과</h3><p>${t}턴${underPar?' · <b>목표 안에 통과! +5</b>':''}${gotShard?' · 색 조각 획득':''}</p>`);
    const go=el('button','b g',n%5===0?'안전가옥으로':'다음 문 열기'); go.onclick=()=>{ n%5===0?safeRoom(n):start(n+1); }; o.appendChild(go);
    if(n%5!==0){ const st=el('button','b','여기서 쉬기'); st.onclick=()=>{ window.removeEventListener('keydown',key); lobby(); }; o.appendChild(st); }
    bd.appendChild(o); }
  function safeRoom(n){ clearT(); window.removeEventListener('keydown',key); let k=0; const N=3;
    root.innerHTML=`<div class="card sp-safe"><span class="chip">${n}번 문 뒤 · 안전가옥</span><h3 style="font-size:24px">여기선 안개가 못 들어와요</h3>
      <p class="muted">노란 공이 커질 때 들이쉬고, 작아질 때 내쉬어요. 숨 ${N}번이면 저장 완료.</p><div class="orb" id="orb"></div><p id="sg" style="font-family:var(--fd);font-size:20px">버튼을 꾹 누르고 들이쉬기</p>
      <button class="b y w" id="hold" style="padding:14px;font-size:19px">꾹 누르고 들이쉬기 (0/${N})</button></div>`;
    const orb=root.querySelector('#orb'), hold=root.querySelector('#hold'), sg=root.querySelector('#sg'); let st='idle', t0=0;
    const down=e=>{ e.preventDefault(); if(st!=='idle') return; st='in'; t0=Date.now(); orb.className='orb in'; hold.classList.add('dn'); sg.textContent='들이쉬고…'; };
    const up=()=>{ hold.classList.remove('dn'); if(st!=='in') return; if(Date.now()-t0<2500){ st='idle'; orb.className='orb'; sg.textContent='조금 더 길게, 4초쯤 들이쉬어요'; return; }
      st='out'; orb.className='orb out'; sg.textContent='천천히 내쉬고…'; later(()=>{ k++; st='idle'; hold.textContent=`꾹 누르고 들이쉬기 (${k}/${N})`; sg.textContent=k<N?'한 번 더':'좋아요.'; vib(20); if(k>=N) done(); },4200); };
    hold.addEventListener('pointerdown',down); hold.addEventListener('pointerup',up); hold.addEventListener('pointerleave',up); hold.addEventListener('pointercancel',up);
    function done(){ S.ckpt=n+1; S.door=n+1; if(S.run) S.run.hearts=3; save(); report('safe'); addXP(XP.safe,'안전가옥');
      root.innerHTML=`<div class="card sp-safe"><span class="chip">저장 완료 · 다음엔 ${n+1}번 문부터</span><h3 style="font-size:24px">보급 상자가 도착했다</h3><p class="muted">눌러서 열기. 무엇이 나올지는 몰라요.</p><div class="sp-crate" id="cr" role="button" aria-label="보급 상자 열기"></div><img src="${IMG.agent}" alt="늘곰 소장"></div>`;
      const cr=root.querySelector('#cr'); cr.onclick=()=>{ cr.classList.add('shk'); vib([20,20,20,20,20]); later(()=>{ const res=giveGear(rollGear()); gearModal(res,()=>{
        root.innerHTML=`<div class="card sp-safe"><h3>위장 하트 3개 회복</h3><p class="muted">계속 가도 되고, 오늘은 여기까지 해도 저장돼 있어요.</p><button class="b g w" id="nx">${n+1}번 문 열기</button><button class="b w" id="st">오늘은 여기까지</button></div>`;
        root.querySelector('#nx').onclick=()=>start(n+1); root.querySelector('#st').onclick=()=>{ S.run=null; save(); lobby(); };
      }); },900); }; }
  }
  const ro=new ResizeObserver(()=>render&&L&&root.querySelector('#bd')&&render()); ro.observe(root);
  lobby();
  return ()=>{ clearT(); ro.disconnect(); window.removeEventListener('keydown',key); host.innerHTML=''; };
}

/* ---------------- 장비 도감 · 이모트 ---------------- */
function mountGear(host,opts){ injectCSS(); opts=opts||{}; const IMG=Object.assign({base:'img/base.png',agent:'img/agent.png',yawn:'img/yawn.png',dance:'img/dance-music.png'},opts.img||{});
  const root=el('div','sp sp-gear'); host.innerHTML=''; host.appendChild(root);
  function draw(){ const have=GEAR.filter(g=>S.gear[g.id]).length; const r=rankInfo(); const em=EMOTES.find(e=>e.id===S.emote)||EMOTES[0];
    root.innerHTML=`<div class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="sp-prog"><h3 style="font-size:20px">요원 카드</h3><span class="chip">출근 ${daysCount()}일째</span></div>
      ${rankHTML()}
      <p class="muted">${r.next?`다음 계급 '${r.next}'까지 ${r.need} XP`:'최고 계급 달성!'} · 누적 ${r.xp} XP</p>
      <div class="sp-stagebox"><img src="${IMG[em.img]}" class="${em.cls}" alt="늘곰 ${em.name}"></div>
      <div class="sp-emotes">${EMOTES.map(e=>`<button class="b ${S.emote===e.id?'y':''}" data-e="${e.id}" ${r.lv<e.lv?'disabled':''}>${r.lv<e.lv?'Lv.'+e.lv+' ':''}${e.name}</button>`).join('')}</div>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="sp-prog"><h3 style="font-size:20px">스파이 장비 도감</h3><b>${have} / ${GEAR.length}</b></div>
      <div class="sp-grid">${GEAR.map(g=>S.gear[g.id]?`<button class="sp-slot ${S.equip===g.id?'on':''}" data-g="${g.id}" aria-label="${g.name}"><span class="rd" style="background:${RCOL[g.r]}"></span>${iconSVG(g)}</button>`:`<div class="sp-slot no" aria-label="아직 못 찾은 장비"></div>`).join('')}</div>
      <p class="muted" id="gi">장비는 안전가옥 보급 상자와 비밀 코드로 모아요. 눌러서 착용. 능력 차이는 없고 멋만 납니다.</p>
    </div>`;
    root.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{ S.emote=b.dataset.e; save(); draw(); emit('emote',S.emote); });
    root.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{ const g=GEAR.find(x=>x.id===b.dataset.g); S.equip=S.equip===g.id?null:g.id; save(); draw(); root.querySelector('#gi').innerHTML=`<b>${g.name}</b> <span class="rar r${g.r}">${RNAME[g.r]}</span><br>${g.d}`; emit('equip',S.equip); });
  }
  draw(); const h=()=>{ if(root.isConnected) draw(); }; on('xp',h); return ()=>{ host.innerHTML=''; };
}

/* ---------------- 비밀 코드 ---------------- */
async function sha(s){ const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function norm(s){ return (s||'').normalize('NFC').replace(/\s+/g,'').toUpperCase(); }
function mountCode(host){ injectCSS(); const root=el('div','sp sp-code'); host.innerHTML=''; host.appendChild(root);
  root.innerHTML=`<div class="card" style="display:flex;flex-direction:column;gap:10px">
    <h3 style="font-size:22px">비밀 코드 입력</h3>
    <p class="muted">학교 곳곳에 숨겨진 코드를 찾아 입력하면 장비가 지급돼요.</p>
    <input id="ci" maxlength="16" placeholder="코드" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="비밀 코드">
    <button class="b g w" id="cb">확인</button>
    <p class="res" id="cr"></p></div>
    <div class="card"><h4 style="font-size:17px;margin-bottom:4px">코드가 숨어 있는 곳 (운영 예시)</h4>
    <ul><li>마음돌봄 부스 6곳 입구 안내판</li><li>3층 Wee클래스 문 앞 늘곰 포스터</li><li>웹앱 본부 라디오 '오늘의 추천곡' 아래 한마디</li><li>전교 정화 작전 100% 달성 시 공개</li></ul></div>`;
  const ci=root.querySelector('#ci'), cr=root.querySelector('#cr');
  async function go(){ const c=norm(ci.value); if(!c) return; let h=''; try{ h=await sha(c); }catch(e){ cr.textContent='이 기기에서는 코드 확인이 안 돼요'; return; }
    const hit=codeTable&&codeTable[h];
    if(!hit){ cr.style.color='var(--red)'; cr.textContent='본부 기록에 없는 코드예요'; vib([30,30,30]); return; }
    if(S.codes[h]){ cr.style.color='var(--muted)'; cr.textContent='이미 사용한 코드예요'; return; }
    S.codes[h]=1; save(); report('code'); cr.style.color='var(--green-d)'; cr.textContent=hit.msg||'코드 확인!'; ci.value='';
    addXP(XP.code,'코드'); setTimeout(()=>gearModal(giveGear(hit.gear)),500); }
  root.querySelector('#cb').onclick=go; ci.addEventListener('keydown',e=>{ if(e.key==='Enter') go(); });
  return ()=>{ host.innerHTML=''; };
}

/* ---------------- 전교 정화 작전 (익명 합계) ---------------- */
function bossSVG(p){ return `<svg viewBox="0 0 200 150" style="opacity:${1-p*0.75};transform:scale(${1-p*0.35})"><path d="M30 120 Q0 120 6 92 Q8 66 34 66 Q32 30 70 28 Q90 4 120 22 Q160 14 168 52 Q198 58 192 92 Q192 122 160 120 Z" fill="#6b717c" stroke="#1c2130" stroke-width="6" stroke-linejoin="round"/><ellipse cx="78" cy="78" rx="12" ry="${p>.5?3:12}" fill="#1c2130"/><ellipse cx="128" cy="78" rx="12" ry="${p>.5?3:12}" fill="#1c2130"/><path d="M84 104 Q104 ${p>.5?112:96} 124 104" stroke="#1c2130" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`; }
function mountRaid(host,opts){ injectCSS(); opts=Object.assign({total:0,goal:900,today:0,name:'회색 거인',week:'1주차'},opts||{}); const root=el('div','sp sp-raid'); host.innerHTML=''; host.appendChild(root);
  function draw(){ const total=opts.total; const p=Math.min(1,total/opts.goal); const left=Math.max(0,opts.goal-total);
    const MS=[[.25,'늘곰 소장의 새 대사 공개'],[.5,'학교 지도에 무지개가 뜸'],[.75,'하늘 게시판에 비밀 코드 하나 공개'],[1,'전교 보상: 모든 요원에게 무지개 우산 코드']];
    root.innerHTML=`<div class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="sp-prog"><h3 style="font-size:20px">전교 정화 작전 · ${opts.week}</h3><span class="chip">익명 합계</span></div>
      <div class="sp-boss">${bossSVG(p)}${p>=1?'<div style="position:absolute;font-family:var(--fd);font-size:30px;color:#fff;-webkit-text-stroke:1.5px #1c2130">정화 완료!</div>':''}</div>
      <div class="sp-hp"><i style="width:${(1-p)*100}%"></i><span>${opts.name} 안개 ${left} 남음</span></div>
      <p class="muted">전교 요원이 문을 통과하거나 미니게임·지령을 마칠 때마다 안개가 1씩 줄어요. 누가 했는지는 기록하지 않고 숫자만 더해요. 반별 순위도 없어요.</p>
      <div class="sp-stat"><div><b>${total}</b><span>이번 주 전교 정화 횟수</span></div><div><b>${opts.today}</b><span>오늘 출근한 요원 수</span></div></div>
    </div>
    <div class="card"><h4 style="font-size:17px;margin-bottom:8px">함께 깨면 열리는 것</h4><ul class="sp-ms">${MS.map(([q,txt])=>`<li class="${p>=q?'ok':''}"><i>${p>=q?'✓':Math.round(q*100)}</i>${Math.round(q*100)}% · ${txt}</li>`).join('')}</ul>
    <p class="muted" style="margin-top:8px">내가 보탠 정화: ${S.contrib}회</p></div>`; }
  draw(); return { stop:()=>{host.innerHTML='';}, set:(o)=>{ Object.assign(opts,o); draw(); } };
}

/* ---------------- 본부 소등 ---------------- */
function nightGuard(opts){ injectCSS(); opts=opts||{}; const old=document.querySelector('.sp-night'); if(old) old.remove(); if(!isCurfew()) return false;
  const d=el('div','sp sp-night',`<div class="stars"></div><img src="${(opts.img||'img/yawn.png')}" alt="하품하는 늘곰"><h3>본부 소등</h3><p>밤 10시부터 아침 6시까지는 늘곰 소장도 자요. 요원의 가장 중요한 임무는 잠. 오늘 모은 장비와 기록은 그대로 저장돼 있어요.</p><p class="help">마음이 너무 힘든 밤이라면 지금도 1388(문자 #1388)에서 24시간 이야기를 들어줘요.</p>`);
  if(opts.demo){ const b=el('button','b y','시연: 다시 켜기'); b.onclick=()=>{ demoTime=null; d.remove(); opts.onWake&&opts.onWake(); }; d.appendChild(b); }
  document.body.appendChild(d); return true; }

window.SpyPlus={ mountSneak, mountGear, mountCode, mountRaid, nightGuard, isCurfew, addXP, rankHTML, rankInfo, checkIn, daysCount, giveGear, gearModal, setCodes, on, energyLeft,
  XP, GEAR, RANKS, EMOTES, MONSTERS, makeDoor, solve, solvePath, _state:()=>S, _reset:()=>{ S=JSON.parse(JSON.stringify(DEF)); save(); }, _setHour:(h)=>{ demoTime=h; }, _refill:()=>{ S.energy={day:today(),used:0}; save(); }, sha, norm };
})();
