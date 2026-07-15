// 節奏捕手 Service Worker — 自動更新版。
// 策略：HTML/導覽走 network-first（有網路永遠拿最新版，離線退回快取）；
//       其他靜態資源走 stale-while-revalidate（先給快取、背景更新）。
// 因此改 app 內容後「部署即更新」，使用者不必重裝或手動清快取；
// 只有調整快取結構本身時才需要把版本號 +1。
const CACHE = "beat-catcher-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 判斷是否為 HTML 文件請求（導覽或 Accept 含 text/html）。
function isHtmlRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // 只處理同源的 GET；blob:/data:（上傳音檔）與跨源請求直接放行。
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (isHtmlRequest(req)) {
    // network-first：有網路就拿最新 HTML 並更新快取；離線時退回快取。
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // 其他資源：stale-while-revalidate — 先回快取（快），背景抓新版寫回快取。
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
