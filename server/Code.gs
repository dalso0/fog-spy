/**
 * 회색 안개 작전 · 본부 서버 (구글 Apps Script + 구글 시트)
 *
 * 이 서버가 모으는 것
 *  - 날짜별 "합계 숫자"만 (접속한 휴대폰 수, 브리핑 완료 수, 지령 보고, 마음 날씨 등)
 *  - 하늘 게시판에 학생이 남긴 이름 없는 한 줄 (선생님이 '공개'로 바꿔야 다른 학생에게 보임)
 *  - 횡스크롤 게임의 「오류·의견 보내기」로 온 이름 없는 글 (선생님만 보고, 학생 앱에는 나오지 않음)
 *  - 횡스크롤 게임의 색 방울 순위: 게임이 처음 열릴 때 제비뽑기로 정한 요원 코드(색+동물)와 판별 최고 방울 수,
 *    그리고 게임이 만든 아무 뜻 없는 기록 번호 (같은 폰의 기록을 이어 붙이는 데만 씀)
 * 모으지 않는 것
 *  - 이름, 학번, 반, 기기 번호, IP 등 누구인지 알 수 있는 정보는 받지도 저장하지도 않습니다.
 *    요원 코드는 학생이 고르는 글이 아니라 정해진 목록에서 뽑힌 말이라, 누가 어떤 코드인지는 학생 본인만 압니다.
 *
 * 시트 탭 (처음 실행할 때 자동으로 만들어집니다)
 *  - 설정       : 관리 비밀번호, 공지 한 줄, 전교 정화 목표, 표어 1~3주차(비워 두면 게임에 든 표어)
 *  - 하늘게시판 : 번호 | 받은 시각 | 내용 | 상태(대기/공개/숨김) | 확인 필요
 *  - 통계       : 날짜 | 접속 | 브리핑 완료 | ... (서버가 자동 기록)
 *  - 음악       : 날짜 | 곡 제목 | 가수 | 늘곰 한마디 (비워 두면 앱에 들어 있는 곡이 나옴)
 *  표어와 오늘의 곡은 관리실(admin.html)의 「게임 설정」 탭에서 보고 바꾸는 것이 가장 쉽습니다. 시트에 직접 적어도 됩니다.
 *  - 의견       : 번호 | 받은 시각 | 종류(오류/의견) | 내용 | 어디서(자동) | 상태(새 글/확인함/고침) | 확인 필요
 *  - 순위       : 기록 번호 | 요원 코드 | 방울 합계 | 판별 최고 | 숨김 | 처음 | 마지막 (첫 기록이 오면 생김)
 *
 * 고친 뒤에는 꼭: 배포 → 배포 관리 → 연필(수정) → 버전: 새 버전 → 배포
 * ('새 배포'를 누르면 주소가 바뀌어 앱과 연결이 끊깁니다)
 */

var TZ = 'Asia/Seoul';
var SH = { cfg: '설정', sky: '하늘게시판', stats: '통계', songs: '음악', fb: '의견', rank: '순위' };

/* 통계 열: [영문 키, 시트에 보이는 이름]  (순서를 바꾸지 말고, 새 항목은 맨 뒤에 추가) */
var METRICS = [
  ['visit', '접속(휴대폰 수)'],
  ['brief', '브리핑 완료'],
  ['ord_done', '지령 했다'],
  ['ord_alt', '지령 비슷하게'],
  ['ord_no', '지령 못 했다'],
  ['piece', '조각 획득'],
  ['decode', '암호 해독'],
  ['finale', '최종 작전'],
  ['m_sun', '날씨 맑음'],
  ['m_cloud', '날씨 구름'],
  ['m_fog', '날씨 안개'],
  ['m_rain', '날씨 비'],
  ['m_storm', '날씨 번개'],
  ['phone', '도움전화 화면'],
  ['risk', '걱정되는 말 감지'],
  ['sky', '하늘 글 접수'],
  ['heart', '라디오 좋아요'],
  ['raid', '정화 기여'],
  ['game', '미니게임 완료'],
  ['breath', '호흡실 이용'],
  ['vid', '세계관 영상 연 폰'],
  ['vid_end', '영상 끝까지 본 폰'],
  ['now_done', '10초 지령 했다'],
  ['now_skip', '10초 지령 건너뜀']
];
/* 하루에 한 휴대폰이 한 번만 올릴 수 있는 항목의 1회 최대치 (부풀리기 방지) */
var MAX_INC = { piece: 4, raid: 10, game: 6, breath: 5, heart: 1, now_done: 1, now_skip: 1 };
var MOOD_KEYS = ['m_sun', 'm_cloud', 'm_fog', 'm_rain', 'm_storm'];

var RISK = /죽고|죽을|죽어|죽는|자살|자해|극단|사라지고|없어지고|살기\s*싫|살고\s*싶지|끝내고\s*싶|힘들어서\s*못|때리|때려|맞았|맞고|괴롭|따돌|왕따|협박|무서워/;
var CONTACT = /\d{3,4}[-\s.]?\d{4}|@|카톡|인스타|insta|kakao|http|www\./i;

/* ================= 입구 ================= */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.a === 'ping') return out({ ok: true, now: nowStr() });
    return out(publicState());
  } catch (err) { return out({ ok: false, msg: String(err) }); }
}

function doPost(e) {
  var req = {};
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}') || {}; } catch (x) { req = {}; }
  try {
    var a = String(req.a || '');
    if (a === 'count') return out(withLock(function () { return addCounts(req.inc || {}); }));
    if (a === 'sky') return out(withLock(function () { return skyPost(req.t); }));
    if (a === 'fb') return out(withLock(function () { return fbPost(req); }));
    if (a === 'rank') return out(rankPost(req));
    if (a === 'admin') return out(admin(req));
    return out({ ok: false, msg: 'unknown' });
  } catch (err) { return out({ ok: false, msg: String(err) }); }
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { try { lock.releaseLock(); } catch (x) {} }
}

/* ================= 공개 상태 (학생 앱이 읽음) ================= */
function publicState() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('state');
  if (hit) return JSON.parse(hit);
  var cfg = readConfig();
  var st = statRows();
  var today = todayStr();
  var trow = st.byDate[today] || {};
  var raidTotal = 0;
  st.rows.forEach(function (r) { raidTotal += num(r.raid); });
  var moods = {};
  MOOD_KEYS.forEach(function (k) { moods[k.slice(2)] = Math.max(0, num(trow[k])); });
  var s = {
    ok: true,
    date: today,
    notice: cfg.notice || '',
    raid: { total: raidTotal, today: num(trow.raid), goal: cfg.goal || 900 },
    moods: moods,
    visitToday: num(trow.visit),
    sky: approvedSky(20),
    song: todaySong(today),
    mottos: cfg.mottos,
    orders: cfg.orders
  };
  cache.put('state', JSON.stringify(s), 60);
  return s;
}
function dropCache() { CacheService.getScriptCache().remove('state'); }

/* ================= 합계 올리기 ================= */
function addCounts(inc) {
  var add = {}, any = false;
  METRICS.forEach(function (m) {
    var k = m[0], v = Math.round(num(inc[k]));
    if (!v) return;
    var max = MAX_INC[k] || 1;
    var min = MOOD_KEYS.indexOf(k) >= 0 ? -1 : 0; /* 마음 날씨는 바꿀 때 이전 것을 -1 */
    v = Math.max(min, Math.min(max, v));
    if (v) { add[k] = v; any = true; }
  });
  if (!any) return { ok: true };
  var sh = sheet(SH.stats);
  var today = todayStr();
  var row = findDateRow(sh, today);
  if (!row) {
    var blank = [today];
    METRICS.forEach(function () { blank.push(0); });
    sh.appendRow(blank);
    row = sh.getLastRow();
    sh.getRange(row, 1).setNumberFormat('@').setValue(today);
  }
  var rng = sh.getRange(row, 2, 1, METRICS.length);
  var vals = rng.getValues()[0];
  METRICS.forEach(function (m, i) { if (add[m[0]]) vals[i] = Math.max(0, num(vals[i]) + add[m[0]]); });
  rng.setValues([vals]);
  return { ok: true };
}

/* ================= 하늘 게시판 ================= */
function skyPost(t) {
  t = String(t || '').replace(/[\u0000-\u001f<>&]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
  if (!t) return { ok: false, msg: 'empty' };
  /* 도배 방지: 10분에 학교 전체 80개까지, 같은 글 반복 거절 */
  var cache = CacheService.getScriptCache();
  var n = num(cache.get('skyN'));
  if (n >= 80) return { ok: false, msg: 'busy' };
  cache.put('skyN', String(n + 1), 600);
  var key = 'sky:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, t, Utilities.Charset.UTF_8));
  if (cache.get(key)) return { ok: true, dup: true };
  cache.put(key, '1', 3600);

  var flag = RISK.test(t) ? '걱정되는 말' : (CONTACT.test(t) ? '연락처·주소?' : '');
  var sh = sheet(SH.sky);
  var id = sh.getLastRow(); /* 머리줄 1줄 → 첫 글이 1번 */
  sh.appendRow([id, nowStr(), safeCell(t), '대기', flag]);
  addCounts(flag === '걱정되는 말' ? { sky: 1, risk: 1 } : { sky: 1 });
  return { ok: true };
}
function safeCell(t) { return /^[=+\-@]/.test(t) ? "'" + t : t; }

function approvedSky(limit) {
  var sh = sheet(SH.sky), last = sh.getLastRow();
  if (last < 2) return [];
  var v = sh.getRange(2, 1, last - 1, 5).getValues();
  var outv = [];
  for (var i = v.length - 1; i >= 0 && outv.length < limit; i--) {
    if (String(v[i][3]).trim() === '공개') outv.push(String(v[i][2]).replace(/^'/, ''));
  }
  return outv.reverse();
}

/* ================= 오늘의 곡 ================= */
function todaySong(today) {
  var sh = sheet(SH.songs), last = sh.getLastRow();
  if (last < 2) return null;
  var v = sh.getRange(2, 1, last - 1, 4).getValues();
  for (var i = 0; i < v.length; i++) {
    if (dstr(v[i][0]).replace(/^'/, '') === today && v[i][1]) return { t: String(v[i][1]).replace(/^'/, ''), a: String(v[i][2] || '').replace(/^'/, ''), note: String(v[i][3] || '') };
  }
  return null;
}

/* ================= 오류·의견 (횡스크롤 게임) ================= */
/* 걱정되는 말 검사. 게임(stage.html)과 같은 목록이다. 고칠 때는 두 곳을 글자까지 같게 고친다.
   FB_HARD: 사람이 걱정되는 말(죽고 싶다, 자해, 왕따, 아빠한테 맞았다, 형이 때려요). 게임이 보내기 전에 멈추고 도움전화를 보여 주므로,
     '걱정되는 말' 표시가 붙은 글은 그 검사를 거치지 않고 들어온 글이다.
   FB_SOFT: 게임 이야기에도 흔한 말(때려요, 맞았어요, 뺏겼어요, 끝내고 싶다). 글에 게임 안에서만 쓰는 낱말(FB_GAME)이 없으면 게임이 멈추고, 여기서는 '걱정되는 말'로 표시한다.
     게임 낱말과 함께 쓴 글은 게임 이야기로 보고 받되 '한 번 더 보기'로 표시한다. 다만 게임에서 늘 쓰는 '맞다'는 글에 사람이나 곳을 가리키는 낱말(FB_WHO)이 있을 때만 표시한다
     ('보스한테 맞았어요'는 표시 없음, '보스 깨는데 학교에서 맞았어요'는 한 번 더 보기).
   FB_OK: 뜻이 다른 것이 분명한 꼴('박자가 안 맞고', '저한테 맞는 난이도', '판을 빨리 끝내고 싶어요')은 FB_SOFT를 보기 전에 지운다.
   FB_NOT: '안 죽고 싶어요', '죽고 싶지 않아요'는 글에 게임 낱말이 있을 때만 게임 이야기로 본다. */
var FB_HARD = /자살(?!골|아|았)|쟈살|(?:^|[^가-힣])자\s살\s?(?:하|할|해|을|생각|충동|각)|자[^가-힣\s]{1,2}살|(?:^|[^가-힣])자해|[^가-힣\s]자해|[^혼하과각글숫문의피\s]자해(?:도|만|중|를|해|했|함)|자해\s?(?:해|했|함|하고|하는|하면|를|흉|충동|생각|자국)|죽[고구]\s?(?:만|는|도)?\s?(?:싶|시퍼|시픔|시프|십(?:다|어|음|은))|죽어\s?버리고\s?싶|죽을래|살기(?:가|도|는)?\s?(?:너무|진짜|정말)?\s?싫|사는\s?게\s?(?:너무\s?)?(?:싫|지옥|의미)|살\s?이유가?\s?없|살아서\s?뭐\s?[하해]|살아\s?있는\s?게\s?싫|살고\s?싶지|살고\s?싶진\s?[않안앉]|그만\s?살고\s?싶|태어나지\s?말걸|안\s?태어났으면|사라지고\s?싶|사라져\s?버리고\s?싶|없어지고\s?싶|없어져\s?버리고\s?싶|없어져야\s?(?:할|될)\s?것\s?같|(?:^|[^가-힣])(?:내가|제가|나만|저만|나는|저는|나도|저도|난|전)\s?(?:그냥\s?|차라리\s?)?(?:사라졌으면|없어졌으면|사라지면\s?좋|없어지면\s?좋|죽었으면\s?좋|죽었음\s?좋|죽으면\s?(?:좋|다들|모두|편|다\s?(?:편|좋|해결|끝나겠)))|나\s?같은\s?(?:건|거|애는|놈은)\s?(?:죽|없어|사라)|뒤지고\s?싶|디지고\s?싶|뒈지고\s?싶|ㅈㅅ\s?(?:하고\s?싶|할래|마렵|마려|각)|극단적(?:인)?\s?(?:선택|생각)|나쁜\s?생각(?:이|을|만)?\s?(?:들|나|해|하)|(?:^|[^가-힣])유서(?!\s?깊)|(?:손목|팔목|팔|허벅지)(?:을|를)?\s?(?:긋|그[었엇]|그을|그어|그음)|칼로\s?(?:[가-힣]+\s)?(?:긋|그[었엇]|그을|그어|그음)|(?:^|[^가-힣])목을?\s?(?:매|메)(?:고|달|서)|목숨을?\s?끊|번개탄|한강\s?(?:가고\s?싶|갈까|가야)|옥상[^.!?]*(?:뛰어|떨어지)|(?:뛰어내|떨어지)[^.!?]*옥상|(?:삶|인생)을?\s?끝내|(?:인생|삶|이번\s?생|망겜|지옥)[^.!?]*끝내\s?(?:버리)?고\s?싶|왕따(?!시(?:\s|$|ㅋ|ㅎ|만|하|큰|[.,!?~]))|왕[^가-힣\s]{1,2}따|(?:^|[^가-힣])은따|(?:^|[^가-힣])전따|(?:^|[^가-힣])따\s?(?:당|시[키켜킨킴켰])|따돌림|따돌임|따돌\s?당|협박|학폭|학교\s?폭력|가정\s?폭력|폭력을?\s?(?:당|써|쓰)|폭행|(?:^|[^가-힣])학대|아동\s?학대|학대\s?(?:당|를|받|해|했)|성추행|성폭[력행]|성희롱|몸을?\s?(?:[가-힣]+\s)?만[져지졌]|사진을?\s?(?:[가-힣]+\s)?(?:뿌[린리려렸]|퍼[뜨트]|유포)|삥\s?뜯|빵\s?셔틀|돈을?\s?(?:다\s|맨날\s)?(?:뜯|가져오[라래])|맞고\s?(?:살|다녀|다니|지내|자랐|컸)|맞으면서\s?(?:살|다녀|다니|지내|자랐|컸)|(?:(?:^|[^가-힣])(?:형|걔|걔네|쌤)|(?:사촌|동네|우리|친|큰|작은)\s?형|아빠|엄마|아버지|어머니|부모님|삼촌|할아버지|할머니|이모|고모|사촌|누나|오빠|언니|동생|선배|친구|애들|선생님|담임|일진|코치님?|감독님|관장님?)(?:들)?(?:한테|에게)(?:서)?\s?(?:[가-힣]+\s)?(?:맞(?!는\s?(?:난이도|수준|단계|레벨|속도|게임|판)|는지|대|다고|냐|나요|게\s(?!생[겼기]|[됐됨될되])|춰|추|춤)|두들겨|얻어|처맞|쳐맞)|(?:(?:^|[^가-힣])(?:형|걔|걔네|쌤)|(?:사촌|동네|우리|친|큰|작은)\s?형|아빠|엄마|아버지|어머니|부모님|삼촌|할아버지|할머니|이모|고모|사촌|누나|오빠|언니|동생|선배|친구|애들|선생님|담임|일진|코치님?|감독님|관장님?)(?:들)?(?:이|가|은|는)\s?(?:(?!보스|뭉치|장막|띵띵이|병아리|깃발|안개|방울|말랑이|몬스터|상자|블록|곰|적)[가-힣]+\s){0,2}(?:때[리려린렸림릴립렷]|괴롭[히혀힘힌힙혔혓]|따돌|뺏[어았]|팼|패요|패서|발로\s?[차찼])/;
var FB_SOFT = /끝내\s?(?:버리)?고\s?싶|괴롭[히혀힘힌힙혔혓]|따돌|때[리려린렸림릴립렷]|맞고|맞[았앗]|맞을까\s?봐|맞은\s?적이?\s?(?:있|많)|(?:한테|에게)\s?맞|(?:맨날|매일|날마다|마다|학교에서|집에서|학원에서|자꾸|계속|또|항상|매번)\s?맞(?!는\s?(?:난이도|수준|단계|레벨|속도|게임|판)|는지|게\s(?!생[겼기]|[됐됨될되])|춰|추|춤)|처맞|쳐맞|얻어\s?맞|두들겨|(?:이|가|를|을)\s?(?:막\s)?(?:팼|패요|패서|패고|팹니다)|발로\s?[차찼]|뺏[기겼어겨긴는김길겻으]|뺐[기겼겨긴김길겻]|빼앗|뛰어\s?내리고\s?싶|뛰어\s?내릴(?:까|래)|죽었으면\s?좋[겠겟]|죽었음\s?좋[겠겟]|죽으면\s?좋[겠겟]|죽을까|죽어\s?버[릴리렸려]|죽으려(?!면)|죽을려(?!면)|죽어야(?:지|겠|겟|\s?돼|\s?해)|죽는\s?게\s?(?:더\s|훨씬\s|차라리\s)?(?:낫|나[을아])|죽을\s?(?:거예요|겁니다|게요|준비|용기|계획)|죽으러|죽기로|죽지\s?못해|죽으면\s?편|죽어도\s?상관|죽인대|죽인다고|죽이겠다|죽여\s?버린|나가\s?죽으|쫓겨[났나날]|집에\s?못\s?들어|맞아서\s?(?:멍|병원|아파|피|울)|(?:뺨|싸대기|따귀|주먹|몽둥이|회초리)(?:을|를|으로|로)?\s?맞|맞기\s?싫|(?:가면|오면|마시면|취하면)\s?맞[아는음]|죽을\s?생각|죽는\s?방법|사라[졌졋]으면|없어[졌졋]으면|사라지면\s?좋|없어지면\s?좋|뒤질래|뒤질까|찐따라고/;
var FB_GAME = /보스|(?:^|[^고])뭉치|장막|띵띵이|병아리|깃발|안개|방울|말랑이|훈련장|점프|캐릭터|몬스터(?!\s?(?:사|마시|음료|한\s?캔))|스테이지|코인(?!\s?노래)|상자|블록(?!\s?당)|요원(?:이|을|를)\s|몹(?!시|쓸)|(?:^|[^가-힣])적(?:한테|에게|들(?:이|한테|에게))|(?:^|[^곰])곰(?!곰|이라고|\s?같다고|탱|처럼|돌이)/;
var FB_NOT = /안\s?죽고\s?싶(?!겠|냐|은(?!데)|을|았|었|던|다면|다고\s?하면)|죽고\s?(?:는\s?)?싶지[는도가]?\s?않(?!겠|냐|은(?!데)|을|았|었|던|다면|다고\s?하면)|죽고\s?싶진\s?않(?!겠|냐|은(?!데)|을|았|었|던|다면|다고\s?하면)/g;
var FB_OK = /(?:타이밍|박자|암호|정답|답|날짜|시간|순서|글자|비번|비밀번호|소리|싱크)(?:이|가|은|는|도|랑|이랑|하고)?\s?(?:다\s|딱\s|잘\s|안\s|전부\s)?맞[았고는아춰추음]|(?:이랑|랑|과|와)\s?안\s?맞[았는아고]|(?:한테|에게)\s?(?:딱\s|잘\s)?맞(?:는\s?(?:난이도|수준|단계|레벨|속도|게임|판)|는지|게\s(?!생[겼기]|[됐됨될되])|춰|추|춤)|(?:게임|겜|판|숙제|스테이지|작전|미션|지령|훈련)(?:을|를|은|는)?\s?(?:빨리|얼른|후딱|금방)?\s?끝내|왜\s?(?:자꾸\s?|계속\s?|맨날\s?|이렇게\s?)*죽을까(?=[요용여]|\s*[?？]|\s*$)|(?:자꾸|계속|바로|또|한\s?방에|시작하자마자|떨어지면|닿으면)\s?죽어\s?버[려리렸]|(?:난이도|속도|수준|게임|겜|판|모드)(?:이|가|은|는|도)?\s?(?:저|나|제)한테\s?(?:딱\s|잘\s)?맞[아았는]|안\s?죽는\s?방법|시간\s?(?:을\s?)?[뺏뺐]/g;
var FB_WHO = /아빠|엄마|아버지|어머니|부모|삼촌|할아버지|할머니|이모|고모|사촌|코치|감독님|관장|(?:^|[^인대모유원])형|누나|오빠|언니|동생|선배|후배|친구|애들|걔|쌤|선생|담임|일진|학교|교실|반에서|집에서|학원|화장실|복도/; /* 서버에서만 쓴다 */
var FB_PHONE = /\d{3,4}[-\s.]\d{4}/; /* 자동 정보 칸에는 '@'(화면 배율)가 늘 들어 있어서 CONTACT 대신 전화번호 꼴만 본다 */
var FB_STATUS = ['새 글', '확인함', '고침'];
function fbBlank(x) { return x.replace(/[\s\S]/g, ' '); }
function fbRisk(t) {
  t = String(t);
  var game = FB_GAME.test(t);
  if (FB_HARD.test(game ? t.replace(FB_NOT, fbBlank) : t)) return true;
  return !game && FB_SOFT.test(t.replace(FB_OK, fbBlank));
}
function fbLook(t) {
  var s = String(t).replace(FB_OK, fbBlank).replace(/안\s?맞[가-힣]*|(?:게|거|것|이게|버그|오류)\s?맞[가-힣]*|맞[아나]요\s*[?？]/g, fbBlank), who = FB_WHO.test(s); /* 옳다·알맞다는 뜻이 분명한 '맞다'는 지우고 본다 */
  if (who && /맞[아았고는을음]/.test(s)) return true;
  if (!who) s = s.replace(/[가-힣]*맞[가-힣]*/g, fbBlank);
  return FB_SOFT.test(s);
}
function fbFlag(t, c) {
  if (fbRisk(t) || FB_HARD.test(c)) return '걱정되는 말';
  if (fbLook(t)) return '한 번 더 보기';
  if (CONTACT.test(t) || FB_PHONE.test(c)) return '연락처·주소?';
  return '';
}
function fbClean(x) {
  return String(x == null ? '' : x).replace(/[\u0000-\u001f<>&]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}
function fbPost(req) {
  var t = fbClean(req.t), c = fbClean(req.c);
  var k = String(req.k || '') === '의견' ? '의견' : '오류';
  if (t.length < 2) return { ok: false, msg: 'empty' };
  var cache = CacheService.getScriptCache();
  /* 같은 글(종류·내용·자동 정보가 모두 같은 글)이 10분 안에 또 오면 한 번만 적고, 도배 세기에도 넣지 않는다
     (답이 늦어서 학생이 다시 누른 글을 거르려는 것). 자동 정보에는 판과 자리, 다시 한 횟수가 들어 있어서 다른 학생의 글은 거의 따로 적히지만,
     기종이 같은 폰으로 같은 자리에서 똑같은 글을 쓰면 한 줄만 남을 수 있다. 그래서 10분만 기억한다 */
  var key = 'fb:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, k + '|' + t + '|' + c, Utilities.Charset.UTF_8));
  if (cache.get(key)) return { ok: true, dup: true };
  /* 도배 방지: 학교 전체 10분에 40개까지. 하루 300개 세기는 캐시에 두기 때문에, 6시간 넘게 글이 없으면 0부터 다시 센다 */
  var now = new Date().getTime(), today = todayStr();
  var w = String(cache.get('fbW') || '').split('|'), n = num(w[0]), start = num(w[1]);
  if (!start || now - start > 600000) { n = 0; start = now; }
  var d = String(cache.get('fbD') || '').split('|'), dn = d[0] === today ? num(d[1]) : 0;
  if (n >= 40 || dn >= 300) return { ok: false, msg: 'busy' };

  var flag = fbFlag(t, c);
  var sh = fbSheet();
  sh.appendRow([fbNextId(sh), nowStr(), k, safeCell(t), safeCell(c), FB_STATUS[0], flag]);
  /* 시트에 적힌 다음에 '받은 글' 표시와 세기를 올린다 (쓰다가 실패한 글을 다시 보내면 그때 적히게) */
  cache.put(key, '1', 600);
  cache.put('fbW', (n + 1) + '|' + start, 900);
  cache.put('fbD', today + '|' + (dn + 1), 21600);
  if (flag === '걱정되는 말') { try { addCounts({ risk: 1 }); } catch (x) {} }
  return { ok: true };
}
/* 「의견」 탭을 돌려준다. 머리줄 없는 빈 탭이 먼저 있었으면 머리줄을 넣고, 머리줄이 지워져 첫 줄부터 글이면 한 줄을 끼워 넣는다 */
function fbSheet() {
  var sh = sheet(SH.fb), last = sh.getLastRow();
  if (last < 1) { initFb(sh); return sh; }
  var a1 = sh.getRange(1, 1).getValue();
  if (typeof a1 === 'number' || /^\d+$/.test(String(a1).trim())) { sh.insertRowBefore(1); initFb(sh); }
  return sh;
}
/* 새 번호는 번호 칸에서 가장 큰 수 + 1 (선생님이 시트를 정렬하거나 줄을 지워도, 아래에 메모를 적어도 번호가 겹치지 않게) */
function fbNextId(sh) {
  var last = sh.getLastRow(), max = 0;
  if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { var v = num(r[0]); if (v > max) max = v; });
  return Math.floor(max) + 1;
}
function setFbStatus(id, status) {
  if (FB_STATUS.indexOf(status) < 0 || !id) return;
  var sh = fbSheet(), last = sh.getLastRow();
  if (last < 2) return;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (num(ids[i][0]) === id) { sh.getRange(i + 2, 6).setValue(status); return; }
  }
}
/* 관리실에는 최근 limit개를 보내고, 그보다 앞의 글은 아직 안 본 글(상태가 '새 글')만 함께 보낸다 (모두 합쳐 limit의 두 배까지).
   다만 아직 안 본 '걱정되는 말' 글은 그 한도를 넘겨도 50개까지 더 보낸다 (글이 많이 쌓여도 묻히지 않게).
   보내지 않은 글은 시트에 그대로 있다. more: 보내지 않은 글 수, moreNew: 그 가운데 아직 안 본 글 수 */
function fbRows(limit) {
  var sh = fbSheet(), last = sh.getLastRow();
  if (last < 2) return { rows: [], more: 0, moreNew: 0 };
  var v = sh.getRange(2, 1, last - 1, 7).getValues(), rows = [], more = 0, moreNew = 0, seen = 0, extra = 0;
  for (var i = v.length - 1; i >= 0; i--) {
    var r = v[i], id = num(r[0]), t = String(r[3] == null ? '' : r[3]).replace(/^'/, '');
    if (!id && !t) continue; /* 글이 아닌 줄 (선생님이 다른 칸에 적은 메모 같은 것) */
    var status = String(r[5] || FB_STATUS[0]).trim(), flag = String(r[6] || '').trim();
    var fresh = status === FB_STATUS[0];
    seen++;
    if (seen > limit && !fresh) { more++; continue; }
    if (rows.length >= limit * 2) {
      if (flag !== '걱정되는 말' || extra >= 50) { more++; if (fresh) moreNew++; continue; }
      extra++;
    }
    rows.push({ id: id, at: dstr(r[1], true), k: String(r[2] || '오류'), t: t, c: String(r[4] == null ? '' : r[4]).replace(/^'/, ''), status: status, flag: flag });
  }
  rows.reverse();
  return { rows: rows, more: more, moreNew: moreNew };
}
function initFb(sh) {
  sh.getRange(1, 1, 1, 7).setValues([['번호', '받은 시각', '종류', '내용', '어디서(자동)', '상태', '확인 필요']]);
  /* 아래는 보기 좋게 꾸미는 것뿐이라, 실패해도 글 받기와 관리실은 그대로 돌아가게 한다 */
  try {
    sh.getRange('C:E').setNumberFormat('@'); /* '1-3' 같은 글이 날짜로 바뀌지 않게 */
    sh.getRange('A1:G1').setFontWeight('bold').setBackground('#ffe3d6');
    sh.setColumnWidth(2, 140); sh.setColumnWidth(4, 420); sh.setColumnWidth(5, 360); sh.setColumnWidth(7, 110);
    sh.setFrozenRows(1);
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(FB_STATUS, true).build();
    sh.getRange(2, 6, Math.max(1, sh.getMaxRows() - 1), 1).setDataValidation(rule);
  } catch (x) {}
}

/* ================= 색 방울 순위 (횡스크롤 게임) =================
   게임은 판을 깰 때마다 {기록 번호, 요원 코드, 판별 최고 방울 수}를 보낸다. 서버는 판별로 더 큰 쪽만 남기고(되풀이해서 쌓이지 않게),
   그 합으로 순위를 매긴다. 같은 판을 다시 해서 더 많이 모으면 그 판 기록만 바뀐다.
   - 요원 코드는 아래 두 목록을 붙인 말만 받는다. 다른 기록이 이미 쓰는 코드면 비어 있는 코드를 골라 돌려준다 (게임은 그 코드로 바꾼다).
   - 판별 최고 수는 RANK_CAP을 넘지 않게 자른다 (폰의 기록을 고쳐 부풀린 숫자 거르기). 판에 놓인 방울을 다 모아도 넘지 않을 만큼 넉넉히 잡았다.
   - 선생님이 관리실에서 숨긴 기록은 순위에서 빠진다.
   - view: 기록 없이 순위만 본다 (선생님 모드) */
var CODE_C = ['파란', '하늘', '초록', '연두', '노란', '주황', '빨간', '분홍', '보라', '남색', '하얀', '까만', '회색', '은빛', '금빛', '민트', '살구', '밤색', '청록', '무지개'];
var CODE_A = ['돌고래', '수달', '너구리', '고슴도치', '펭귄', '올빼미', '다람쥐', '여우', '판다', '코알라', '거북이', '고래', '해달', '참새', '두루미', '호랑이', '사슴', '토끼', '물개', '카멜레온', '나무늘보', '미어캣', '라쿤', '부엉이', '치타', '늑대', '까치', '문어', '도마뱀', '햄스터'];
/* 판 번호(0부터) → 한 판에서 받을 수 있는 방울의 위 끝. 목록에 없는 판(앞으로 생길 판)은 RANK_CAP_ELSE */
var RANK_CAP = [90, 80, 75, 35, 122, 30, 75, 70, 85, 30, 122];   // 2026-11-27 판별 상한 (게임 stage.html의 COIN_CAP과 같게)
var RANK_CAP_ELSE = 200, RANK_STAGES = 30;
function codeOk(c) {
  c = String(c || '');
  for (var i = 0; i < CODE_C.length; i++) if (c.indexOf(CODE_C[i]) === 0 && CODE_A.indexOf(c.slice(CODE_C[i].length)) >= 0) return true;
  return false;
}
function rankSheet() {
  var sh = sheet(SH.rank);
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, 7).setValues([['기록 번호', '요원 코드', '방울 합계', '판별 최고', '숨김', '처음', '마지막']]);
    try { sh.getRange('A1:G1').setFontWeight('bold').setBackground('#dff0e8'); sh.setFrozenRows(1); sh.getRange('A:B').setNumberFormat('@'); sh.getRange('D:D').setNumberFormat('@'); sh.setColumnWidth(4, 220); } catch (x) {}
  }
  return sh;
}
function rankRead(sh) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 7).getValues().map(function (r, i) {
    var b = {}; try { b = JSON.parse(String(r[3] || '{}')) || {}; } catch (x) { b = {}; }
    return { row: i + 2, id: String(r[0] || '').replace(/^'/, ''), code: String(r[1] || '').replace(/^'/, ''), sum: num(r[2]), best: b, hide: String(r[4] || '').trim() !== '', first: r[5], last: r[6] };
  }).filter(function (o) { return o.id; });
}
function rankBest(old, inc) {
  var b = {}, k, n;
  for (k in old) if (/^\d{1,2}$/.test(k)) b[k] = Math.min(Math.max(0, Math.floor(num(old[k]))), +k < RANK_CAP.length ? RANK_CAP[+k] : RANK_CAP_ELSE);   // 예전에 저장된 기록도 지금 상한으로 자른다
  if (inc && typeof inc === 'object') for (k in inc) {
    if (!/^\d{1,2}$/.test(k) || +k >= RANK_STAGES) continue;
    n = Math.max(0, Math.floor(num(inc[k])));
    n = Math.min(n, +k < RANK_CAP.length ? RANK_CAP[+k] : RANK_CAP_ELSE);
    if (!(k in b) || n > b[k]) b[k] = n;
  }
  return b;
}
function rankSum(b) { var t = 0; for (var k in b) t += b[k]; return t; }
/* 공동 순위: 합계가 같으면 같은 등수 (1, 2, 2, 4 …) */
function rankList(all) {
  var v = all.filter(function (o) { return !o.hide && o.sum > 0; });
  v.sort(function (a, b) { return b.sum - a.sum || a.row - b.row; }); /* 합계가 같으면 먼저 적힌 기록이 위 (등수는 같다) */
  var r = 0;
  for (var i = 0; i < v.length; i++) { if (i === 0 || v[i].sum !== v[i - 1].sum) r = i + 1; v[i].r = r; }
  return v;
}
function rankReply(all, me, extra) {
  var v = rankList(all), res = { ok: true, total: v.length, top: [] };
  for (var i = 0; i < v.length && i < 10; i++) res.top.push({ r: v[i].r, c: v[i].code, n: v[i].sum, me: !!me && v[i].id === me.id });
  if (me) {
    res.code = me.code; res.sum = me.sum;
    if (me.hide) res.hidden = true;
    else {
      for (var j = 0; j < v.length; j++) if (v[j].id === me.id) { res.r = v[j].r; break; }
      if (res.r > 10 && v.length >= 10) res.gap = v[9].sum - me.sum; /* 이만큼 더 모으면 10위와 같아진다 */
    }
  }
  for (var k in extra || {}) res[k] = extra[k];
  return res;
}
function rankPost(req) {
  var cache = CacheService.getScriptCache();
  if (req.view) {
    var c0 = cache.get('rankView');
    if (c0) return JSON.parse(c0);
    var res0 = rankReply(rankRead(rankSheet()), null);
    try { cache.put('rankView', JSON.stringify(res0), 30); } catch (x) {}
    return res0;
  }
  var id = String(req.id || '');
  if (!/^[a-z0-9]{12,24}$/.test(id)) return { ok: false, msg: 'id' };
  /* 같은 폰이 3초 안에 또 보내면 기다리게 한다 (버튼을 여러 번 누른 것) */
  if (cache.get('rk:' + id)) return { ok: false, msg: 'busy' };
  cache.put('rk:' + id, '1', 3);
  return withLock(function () {
    var sh = rankSheet(), all = rankRead(sh), me = null, used = {}, i;
    for (i = 0; i < all.length; i++) { if (all[i].id === id) me = all[i]; else used[all[i].code] = true; }
    var want = String(req.code || ''), changed = false;
    if (me) want = me.code; /* 한 번 적힌 기록의 코드는 바뀌지 않는다 */
    else if (!codeOk(want) || used[want]) { want = freeCode(used); changed = true; }
    var best = rankBest(me ? me.best : {}, req.best), sum = rankSum(best), now = nowStr();
    if (!me) {
      if (all.length >= 2000) return { ok: false, msg: 'full' };
      sh.appendRow([id, want, sum, JSON.stringify(best), '', now, now]);
      me = { row: sh.getLastRow(), id: id, code: want, sum: sum, best: best, hide: false, first: now };
      all.push(me);
    } else {
      sh.getRange(me.row, 3, 1, 2).setValues([[sum, JSON.stringify(best)]]);
      sh.getRange(me.row, 7).setValue(now);
      me.sum = sum; me.best = best;
    }
    cache.remove('rankView');
    return rankReply(all, me, changed ? { changed: true } : null);
  });
}
function freeCode(used) {
  for (var t = 0; t < 60; t++) {
    var c = CODE_C[Math.floor(Math.random() * CODE_C.length)] + CODE_A[Math.floor(Math.random() * CODE_A.length)];
    if (!used[c]) return c;
  }
  for (var i = 0; i < CODE_C.length; i++) for (var j = 0; j < CODE_A.length; j++) if (!used[CODE_C[i] + CODE_A[j]]) return CODE_C[i] + CODE_A[j];
  return CODE_C[0] + CODE_A[0] + String(Math.floor(Math.random() * 90) + 10);
}
function setRankHidden(id, hide) {
  if (!id) return;
  var sh = rankSheet(), all = rankRead(sh);
  for (var i = 0; i < all.length; i++) if (all[i].id === id) { sh.getRange(all[i].row, 5).setValue(hide ? '숨김' : ''); break; }
  CacheService.getScriptCache().remove('rankView');
}
/* 관리실: 숨긴 기록까지 모두 (등수는 숨기지 않은 기록끼리) */
function rankAll() {
  var all = rankRead(rankSheet()), v = rankList(all), rmap = {};
  v.forEach(function (o) { rmap[o.id] = o.r; });
  all.sort(function (a, b) { return b.sum - a.sum; });
  return all.map(function (o) { return { id: o.id, c: o.code, n: o.sum, r: rmap[o.id] || 0, hide: o.hide, b: o.best, last: dstr(o.last, true) }; });
}

/* ================= 선생님 관리 ================= */
function admin(req) {
  var cache = CacheService.getScriptCache();
  var fails = num(cache.get('adminFail'));
  if (fails >= 8) return { ok: false, msg: 'locked' }; /* 틀린 비밀번호 8번 → 10분 잠금 */
  var cfg = readConfig();
  if (!cfg.pw || String(req.pw || '') !== cfg.pw) {
    cache.put('adminFail', String(fails + 1), 600);
    return { ok: false, msg: 'pw' };
  }
  var op = String(req.op || 'load');
  if (op === 'rankHide') withLock(function () { setRankHidden(String(req.id || ''), !!req.hide); });
  if (op === 'fb') withLock(function () { setFbStatus(num(req.id), String(req.status || '')); });
  if (op === 'sky') {
    withLock(function () { setSkyStatus(num(req.id), String(req.status || '')); });
    dropCache();
  } else if (op === 'notice') {
    setConfig('공지 한 줄', String(req.notice || '').replace(/[<>&]/g, '').slice(0, 60));
    dropCache();
  } else if (op === 'game') {
    withLock(function () { saveGame(req); });
    dropCache();
  }
  return adminData();
}

/* ================= 게임 설정 (관리실 「게임 설정」 탭) ================= */
var MOTTO_KEYS = ['표어 1주차', '표어 2주차', '표어 3주차'];
var ORD_KEY = /^지령 (\d{4}-\d\d-\d\d) (내일|10초)$/;
function cleanLine(t, n) { return String(t == null ? '' : t).replace(/[\u0000-\u001f<>&]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); }
/* req.mottos: 세 주의 표어(빈 칸 = 게임 기본값). req.songs: [{d:'2026-11-23', t:'곡', a:'가수'}] (t가 비면 그날 줄을 지움 = 게임 기본값) */
function saveGame(req) {
  if (Array.isArray(req.mottos)) {
    MOTTO_KEYS.forEach(function (k, i) {
      if (req.mottos[i] === undefined || req.mottos[i] === null) return;
      setConfig(k, safeCell(cleanLine(req.mottos[i], 30)), (i + 1) + '주차 판 출발 지점 간판. 비우면 게임에 든 표어');
    });
  }
  if (req.notice !== undefined && req.notice !== null) setConfig('공지 한 줄', cleanLine(req.notice, 60));
  /* req.orders: [{d:'2026-11-30', k:'next'|'now', t:'제목', x:'설명'}]. 설정 탭에 「지령 2026-11-30 내일」·「지령 2026-11-30 10초」 줄로 「제목 | 설명」을 적는다. t가 비면 줄을 지움(= 게임에 든 지령) */
  if (Array.isArray(req.orders)) {
    req.orders.slice(0, 60).forEach(function (o) {
      var d = String((o && o.d) || ''), kk = o && o.k === 'now' ? '10초' : o && o.k === 'next' ? '내일' : '';
      if (!/^\d{4}-\d\d-\d\d$/.test(d) || !kk) return;
      var key = '지령 ' + d + ' ' + kk, tt = cleanLine(o.t, 20).replace(/\|/g, ' '), xx = cleanLine(o.x, 90).replace(/\|/g, ' ');
      if (!tt) delConfig(key);
      else setConfig(key, safeCell(tt + ' | ' + xx), kk === '10초' ? '그 판 중간 깃발에서 뜨는 10초 지령. 지우면 게임에 든 지령' : '그 판을 끝내면 받는 내일의 지령(다음 판 시작 때 보고). 지우면 게임에 든 지령');
    });
  }
  if (Array.isArray(req.songs)) {
    var sh = sheet(SH.songs);
    req.songs.slice(0, 120).forEach(function (o) {
      var d = String((o && o.d) || '');
      if (!/^\d{4}-\d\d-\d\d$/.test(d)) return;
      var t = cleanLine(o.t, 40), a = cleanLine(o.a, 20);
      var last = sh.getLastRow(), rows = [];
      if (last >= 2) {
        var v = sh.getRange(2, 1, last - 1, 1).getValues();
        for (var i = 0; i < v.length; i++) if (dstr(v[i][0]) === d) rows.push(i + 2);
      }
      if (!t) { for (var j = rows.length - 1; j >= 0; j--) sh.deleteRow(rows[j]); return; }
      if (rows.length) {
        sh.getRange(rows[0], 2, 1, 2).setValues([[safeCell(t), safeCell(a)]]);
        for (var k = rows.length - 1; k >= 1; k--) sh.deleteRow(rows[k]); /* 같은 날짜가 두 줄이면 첫 줄만 남김 */
      } else {
        sh.appendRow(["'" + d, safeCell(t), safeCell(a), '']);
      }
    });
    var n = sh.getLastRow();
    if (n > 2) sh.getRange(2, 1, n - 1, 4).sort(1);
  }
}
function songRows() {
  var sh = sheet(SH.songs), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 3).getValues().map(function (r) {
    return { d: dstr(r[0]).replace(/^'/, ''), t: String(r[1] || '').replace(/^'/, ''), a: String(r[2] || '').replace(/^'/, '') };
  }).filter(function (o) { return o.d && o.t; });
}

function setSkyStatus(id, status) {
  if (['대기', '공개', '숨김'].indexOf(status) < 0 || !id) return;
  var sh = sheet(SH.sky), last = sh.getLastRow();
  if (last < 2) return;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (num(ids[i][0]) === id) { sh.getRange(i + 2, 4).setValue(status); return; }
  }
}

function adminData() {
  var cfg = readConfig();
  var sh = sheet(SH.sky), last = sh.getLastRow();
  var posts = last < 2 ? [] : sh.getRange(2, 1, last - 1, 5).getValues().map(function (r) {
    return { id: num(r[0]), at: dstr(r[1], true), t: String(r[2]).replace(/^'/, ''), status: String(r[3] || '대기').trim(), flag: String(r[4] || '') };
  });
  var st = statRows();
  var res = {
    ok: true,
    now: nowStr(),
    notice: cfg.notice || '',
    goal: cfg.goal || 900,
    game: 1, /* 「게임 설정」 탭을 아는 서버 */
    ord: 1, /* 판별 지령을 고칠 수 있는 서버 */
    mottos: cfg.mottos,
    orders: cfg.orders,
    songs: songRows(),
    sheetUrl: SpreadsheetApp.getActive().getUrl(),
    metrics: METRICS,
    stats: st.rows,
    posts: posts
  };
  /* 의견 목록을 못 읽어도 관리실의 다른 탭은 그대로 열리게 한다 */
  try { var f = fbRows(200); res.fb = f.rows; res.fbMore = f.more; res.fbMoreNew = f.moreNew; } catch (x) { res.fb = []; res.fbErr = String(x); }
  try { res.rank = rankAll(); } catch (x) { res.rank = []; res.rankErr = String(x); }
  return res;
}

/* ================= 시트 도우미 ================= */
function sheet(name) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); initSheet(name, sh); }
  return sh;
}
function initSheet(name, sh) {
  if (name === SH.fb) return initFb(sh);
  if (name === SH.cfg) {
    sh.getRange(1, 1, 5, 3).setValues([
      ['항목', '값', '설명'],
      ['관리 비밀번호', randomPw(), '관리 화면에 들어갈 때 씀. 바꿔도 됨(6자 이상 권장). 학생에게 알려 주지 마세요.'],
      ['공지 한 줄', '', '학생 앱 첫 화면 위에 뜸. 비우면 안 보임. 관리 화면에서도 바꿀 수 있음.'],
      ['전교 정화 목표', 900, '수사보드 전교 정화 작전 막대의 목표 숫자'],
      ['만든 날', nowStr(), '']
    ]);
    sh.setColumnWidth(1, 130); sh.setColumnWidth(2, 200); sh.setColumnWidth(3, 420);
    sh.getRange('A1:C1').setFontWeight('bold').setBackground('#fff1c9');
    sh.setFrozenRows(1);
  } else if (name === SH.sky) {
    sh.getRange(1, 1, 1, 5).setValues([['번호', '받은 시각', '내용', '상태', '확인 필요']]);
    sh.getRange('A1:E1').setFontWeight('bold').setBackground('#d7ecfb');
    sh.setColumnWidth(2, 140); sh.setColumnWidth(3, 300); sh.setColumnWidth(5, 110);
    sh.setFrozenRows(1);
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(['대기', '공개', '숨김'], true).build();
    sh.getRange('D2:D2000').setDataValidation(rule);
  } else if (name === SH.stats) {
    var head = ['날짜'];
    METRICS.forEach(function (m) { head.push(m[1]); });
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e3f4e1').setWrap(true);
    sh.setFrozenRows(1); sh.setFrozenColumns(1);
    sh.getRange('A:A').setNumberFormat('@');
  } else if (name === SH.songs) {
    sh.getRange(1, 1, 1, 4).setValues([['날짜(2026-11-16 형식)', '곡 제목', '가수', '늘곰 한마디']]).setFontWeight('bold').setBackground('#f3e3f7');
    sh.setColumnWidth(1, 160); sh.setColumnWidth(2, 200); sh.setColumnWidth(4, 360);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@');
  }
}
function readConfig() {
  var v = sheet(SH.cfg).getDataRange().getValues(), c = { mottos: ['', '', ''], orders: {} };
  v.forEach(function (r) {
    var k = String(r[0]).trim(), om = ORD_KEY.exec(k);
    if (om) {
      var s = String(r[1] || '').replace(/^'/, ''), i = s.indexOf('|'), tt = cleanLine(i < 0 ? s : s.slice(0, i), 20), xx = cleanLine(i < 0 ? '' : s.slice(i + 1), 90);
      if (tt) { (c.orders[om[1]] = c.orders[om[1]] || {})[om[2] === '10초' ? 'now' : 'next'] = [tt, xx]; }
      return;
    }
    if (k === '관리 비밀번호') c.pw = String(r[1]).trim();
    else if (k === '공지 한 줄') c.notice = String(r[1] || '').trim();
    else if (k === '전교 정화 목표') c.goal = num(r[1]) || 900;
    else if (MOTTO_KEYS.indexOf(k) >= 0) c.mottos[MOTTO_KEYS.indexOf(k)] = String(r[1] || '').replace(/^'/, '').trim();
  });
  return c;
}
function delConfig(key) {
  var sh = sheet(SH.cfg), v = sh.getDataRange().getValues();
  for (var i = v.length - 1; i >= 0; i--) if (String(v[i][0]).trim() === key) sh.deleteRow(i + 1);
}
function setConfig(key, val, note) {
  var sh = sheet(SH.cfg), v = sh.getDataRange().getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === key) { sh.getRange(i + 1, 2).setValue(val); return; }
  sh.appendRow([key, val, note || '']);
}
function statRows() {
  var sh = sheet(SH.stats), last = sh.getLastRow(), rows = [], byDate = {};
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, METRICS.length + 1).getValues().forEach(function (r) {
      var o = { date: dstr(r[0]) };
      METRICS.forEach(function (m, i) { o[m[0]] = num(r[i + 1]); });
      if (o.date) { rows.push(o); byDate[o.date] = o; }
    });
  }
  return { rows: rows, byDate: byDate };
}
function findDateRow(sh, d) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var v = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = v.length - 1; i >= 0; i--) if (dstr(v[i][0]) === d) return i + 2;
  return 0;
}
function num(x) { var n = Number(x); return isFinite(n) ? n : 0; }
function todayStr() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function nowStr() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'); }
function dstr(x, withTime) {
  if (x instanceof Date) return Utilities.formatDate(x, TZ, withTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  return String(x || '').trim();
}
function randomPw() {
  var w = ['안개', '하늘', '늘곰', '숨소리', '한입', '조각', '본부', '요원'];
  return w[Math.floor(Math.random() * w.length)] + String(Math.floor(1000 + Math.random() * 9000));
}

/* ================= 처음 한 번 실행 ================= */
/** 편집기 위쪽에서 'setup'을 고르고 ▶실행을 누르세요. 탭이 만들어지고 관리 비밀번호가 '설정' 탭에 적힙니다. */
function setup() {
  [SH.cfg, SH.sky, SH.stats, SH.songs, SH.fb].forEach(sheet);
  var ss = SpreadsheetApp.getActive();
  var def = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
  ss.setSpreadsheetTimeZone(TZ);
  dropCache();
  Logger.log('준비 완료. 관리 비밀번호: ' + readConfig().pw);
}
