// Nur Rehberi — çevrimdışı çalışma ve güncelleme (iPhone ve web)
const SURUM="__SURUM__";const ANA="nur-"+SURUM,EK="nur-ek";
const ONBELLEK=["./","index.html","kuran.js","fonts.css","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/icon-180.png",__FONTLAR__];
self.addEventListener("install",e=>{e.waitUntil(caches.open(ANA).then(c=>c.addAll(ONBELLEK)))});
self.addEventListener("message",e=>{if(e.data==="skip")self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("nur-")&&k!==ANA&&k!==EK).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
  if(/version\.json|icerik\.json/.test(u.pathname)){e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&/\/(hadis|ses)\//.test(u.pathname)){const cp=res.clone();caches.open(EK).then(c=>c.put(e.request,cp))}return res})))});
