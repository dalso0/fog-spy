/* 본부 연결 (hq.js)
   - config.js 의 window.HQ_URL 이 비어 있으면 아무것도 보내지 않습니다(각 휴대폰 안에서만 동작).
   - 보내는 것: 날짜별 합계에 더할 숫자(+1)와, 하늘 게시판의 이름 없는 한 줄뿐.
     요원 코드, 이름, 기기 번호 같은 건 보내지 않습니다.
   - 같은 항목은 한 휴대폰에서 하루 한 번만 세도록 휴대폰 안에 표시해 둡니다. */
(function(){
  const URL_ = (window.HQ_URL||'').trim();
  const ON = /^https:\/\/script\.google(usercontent)?\.com\//.test(URL_);
  const LK='fog-hq-v1';
  let L={}; try{ L=JSON.parse(localStorage.getItem(LK)||'{}')||{}; }catch(e){ L={}; }
  const saveL=()=>{ try{ localStorage.setItem(LK,JSON.stringify(L)); }catch(e){} };
  const day=()=>{ const d=new Date(Date.now()+9*3600e3); return d.toISOString().slice(0,10); }; // 한국 날짜
  if(L.d!==day()){ L={d:day(), once:{}, q:L.q||{}, st:L.st, stAt:L.stAt}; saveL(); }

  /* ---- 합계 보내기: 모았다가 한 번에 ---- */
  let timer=null;
  function queue(k,n){ if(!ON) return; L.q=L.q||{}; L.q[k]=(L.q[k]||0)+n; saveL(); clearTimeout(timer); timer=setTimeout(flush,2500); }
  function flush(){ if(!ON||!L.q||!Object.keys(L.q).length) return; const inc=L.q; L.q={}; saveL();
    const body=JSON.stringify({a:'count',inc});
    try{ fetch(URL_,{method:'POST',body,headers:{'Content-Type':'text/plain;charset=utf-8'},keepalive:true,mode:'no-cors'}).catch(()=>{ L.q=Object.assign({},inc); saveL(); }); }catch(e){}
  }
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') flush(); });
  /* 하루 한 번만 세는 항목 */
  function once(k){ if(L.once[k]) return false; L.once[k]=1; saveL(); queue(k,1); return true; }
  /* 여러 번 세는 항목(서버가 한 번에 올릴 수 있는 양을 제한) */
  function add(k,n){ queue(k,n||1); }
  /* 마음 날씨: 오늘 고른 것 하나만 셈(바꾸면 이전 것 -1) */
  function mood(k){ const prev=L.once.mood; if(prev===k) return; L.once.mood=k; saveL(); if(prev) queue('m_'+prev,-1); queue('m_'+k,1); }

  /* ---- 본부 소식 받기(1분 캐시) ---- */
  let pending=null;
  function state(force){
    if(!ON) return Promise.resolve(null);
    if(!force && L.st && Date.now()-(L.stAt||0)<60e3) return Promise.resolve(L.st);
    if(pending) return pending;
    pending=fetch(URL_+'?a=state',{cache:'no-store'}).then(r=>r.json()).then(j=>{ pending=null; if(j&&j.ok){ L.st=j; L.stAt=Date.now(); saveL(); return j; } return L.st||null; })
      .catch(()=>{ pending=null; return L.st||null; });
    return pending;
  }
  function cached(){ return ON ? (L.st||null) : null; }

  /* ---- 하늘 게시판 글 보내기 ---- */
  function sky(t){
    if(!ON) return Promise.resolve({ok:false,msg:'off'});
    return fetch(URL_,{method:'POST',body:JSON.stringify({a:'sky',t}),headers:{'Content-Type':'text/plain;charset=utf-8'}})
      .then(r=>r.json()).catch(()=>({ok:false,msg:'net'}));
  }

  window.HQ={on:ON, once, add, mood, state, cached, sky, flush};
  if(ON){ once('visit'); state(); }
})();
