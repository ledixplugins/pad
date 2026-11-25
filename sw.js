const V='aurapad-v21';
const SHELL=['./','index.html','style.css','app.js','stagelab.js','pager.js','catalog.json','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET'||new URL(r.url).origin!==location.origin) return;
  const isAudio=/\/(audio|sf)\//.test(r.url);
  if(isAudio){ // cache-first
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{ if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));} return res; })));
  } else { // rede primeiro, cache como reserva (app atualiza sozinho quando online)
    e.respondWith(fetch(r).then(res=>{ if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));} return res; }).catch(()=>caches.match(r)));
  }
});
