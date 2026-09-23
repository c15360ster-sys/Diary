// 인생기록표 PWA 서비스워커
// 전략: HTML(내비게이션)은 항상 네트워크 우선 → 배포 즉시 반영. 오프라인이면 캐시 폴백.
//       그 외 정적 리소스(아이콘 등)만 캐시에 보관.
const CACHE = 'diary-pwa-v3';

self.addEventListener('install', e => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 페이지에서 즉시 갱신을 요청할 수 있게 (선택적)
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function isHtmlRequest(req) {
  if (req.mode === 'navigate') return true;
  const url = new URL(req.url);
  return url.pathname.endsWith('/') || url.pathname.endsWith('.html');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase 등 외부 요청은 그대로 통과

  if (isHtmlRequest(req)) {
    // HTML: 네트워크 우선, 캐시 미보관 폴백만 (항상 최신 배포 반영)
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 정적 리소스: 네트워크 우선 + 캐시 폴백 (기존 동작 유지)
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
