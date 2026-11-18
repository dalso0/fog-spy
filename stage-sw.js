/* 회색 안개 작전(stage.html) 전용 서비스 워커.
   등록만 한다. 파일을 휴대폰에 저장(캐시)하지 않고, 알림도 쓰지 않는다.
   - 운영 중에는 게임을 자주 고치므로, 저장해 두면 고친 내용이 학생 폰에 늦게 반영된다. 그래서 늘 인터넷에서 새로 받는다.
   - 범위는 stage.html 하나뿐이다 (등록할 때 scope: './stage.html'). 예전 앱(index.html)과 관리실(admin.html)은 이 워커와 상관없다.
   - fetch 처리기를 두지 않아 모든 요청은 브라우저가 평소대로 처리한다.
   나중에 오프라인 실행(기념판)을 붙일 때 여기에 캐시를 더한다 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
