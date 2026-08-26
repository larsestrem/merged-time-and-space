/* timeandspace.science notifications — no caching, notifications only */
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', function(event){
  event.notification.close();
  event.waitUntil((async function(){
    var wins = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    var target = wins[0];
    if(target){ try{ await target.focus(); }catch(e){} try{ target.postMessage({ type:'ac-notif-stop' }); }catch(e){} }
    else if(self.clients.openWindow){ try{ await self.clients.openWindow('/'); }catch(e){} }
  })());
});
