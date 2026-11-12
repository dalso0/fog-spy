/**
 * 회색 안개 작전 · 본부 서버 (구글 Apps Script + 구글 시트)
 *
 * 이 서버가 모으는 것
 *  - 날짜별 "합계 숫자"만 (접속한 휴대폰 수, 브리핑 완료 수, 지령 보고, 마음 날씨 등)
 *  - 하늘 게시판에 학생이 남긴 이름 없는 한 줄 (선생님이 '공개'로 바꿔야 다른 학생에게 보임)
 * 모으지 않는 것
 *  - 이름, 학번, 요원 코드, 기기 번호, IP 등 누구인지 알 수 있는 정보는 받지도 저장하지도 않습니다.
 *
 * 시트 탭 (처음 실행할 때 자동으로 만들어집니다)
 *  - 설정       : 관리 비밀번호, 공지 한 줄, 전교 정화 목표
 *  - 하늘게시판 : 번호 | 받은 시각 | 내용 | 상태(대기/공개/숨김) | 확인 필요
 *  - 통계       : 날짜 | 접속 | 브리핑 완료 | ... (서버가 자동 기록)
 *  - 음악       : 날짜 | 곡 제목 | 가수 | 늘곰 한마디 (비워 두면 앱에 들어 있는 곡이 나옴)
 *
 * 고친 뒤에는 꼭: 배포 → 배포 관리 → 연필(수정) → 버전: 새 버전 → 배포
 * ('새 배포'를 누르면 주소가 바뀌어 앱과 연결이 끊깁니다)
 */

var TZ = 'Asia/Seoul';
var SH = { cfg: '설정', sky: '하늘게시판', stats: '통계', songs: '음악' };

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
  ['breath', '호흡실 이용']
];
/* 하루에 한 휴대폰이 한 번만 올릴 수 있는 항목의 1회 최대치 (부풀리기 방지) */
var MAX_INC = { piece: 4, raid: 10, game: 6, breath: 5, heart: 1 };
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
    song: todaySong(today)
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
    if (dstr(v[i][0]) === today && v[i][1]) return { t: String(v[i][1]), a: String(v[i][2] || ''), note: String(v[i][3] || '') };
  }
  return null;
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
  if (op === 'sky') {
    withLock(function () { setSkyStatus(num(req.id), String(req.status || '')); });
    dropCache();
  } else if (op === 'notice') {
    setConfig('공지 한 줄', String(req.notice || '').replace(/[<>&]/g, '').slice(0, 60));
    dropCache();
  }
  return adminData();
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
  return {
    ok: true,
    now: nowStr(),
    notice: cfg.notice || '',
    goal: cfg.goal || 900,
    sheetUrl: SpreadsheetApp.getActive().getUrl(),
    metrics: METRICS,
    stats: st.rows,
    posts: posts
  };
}

/* ================= 시트 도우미 ================= */
function sheet(name) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); initSheet(name, sh); }
  return sh;
}
function initSheet(name, sh) {
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
  var v = sheet(SH.cfg).getDataRange().getValues(), c = {};
  v.forEach(function (r) {
    var k = String(r[0]).trim();
    if (k === '관리 비밀번호') c.pw = String(r[1]).trim();
    else if (k === '공지 한 줄') c.notice = String(r[1] || '').trim();
    else if (k === '전교 정화 목표') c.goal = num(r[1]) || 900;
  });
  return c;
}
function setConfig(key, val) {
  var sh = sheet(SH.cfg), v = sh.getDataRange().getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).trim() === key) { sh.getRange(i + 1, 2).setValue(val); return; }
  sh.appendRow([key, val, '']);
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
  [SH.cfg, SH.sky, SH.stats, SH.songs].forEach(sheet);
  var ss = SpreadsheetApp.getActive();
  var def = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
  ss.setSpreadsheetTimeZone(TZ);
  dropCache();
  Logger.log('준비 완료. 관리 비밀번호: ' + readConfig().pw);
}
