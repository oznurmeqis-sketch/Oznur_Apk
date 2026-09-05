const CACHE="eleni-shell-v2";
const SHELL=["/","/index.html","/style.css","/script.js","/manifest.webmanifest","/favicon.ico","/favicon-32x32.png","/apple-touch-icon.png"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;
  if(url.pathname.startsWith("/gorsel/") || url.pathname==="/og-cover.webp") return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();if(res.ok)caches.open(CACHE).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req).then(r=>r||caches.match("/index.html"))));
});
