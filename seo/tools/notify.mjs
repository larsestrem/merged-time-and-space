/* notify.mjs — shared "your alarm/timer went off" system-notification helper,
 * used by the timer and the alarm clock.
 *
 * NOTIFY_SW — a notifications-ONLY service worker (no fetch handler, so it
 *   never caches or intercepts requests — nothing can go stale). It shows the
 *   Stop action in the OS notification shade and relays a tap back to the page.
 *   Each section writes its own scoped copy (/timer/sw.js, /alarm-clock/sw.js).
 *
 * NOTIFY_JS — defines window.acNotify = { init(cfg,onStop), show(over), clear() }.
 *   Include once per page (before the code that calls it). init() registers the
 *   worker + asks permission (call it from a user gesture); show() posts the
 *   notification; clear() dismisses it; onStop() runs when Stop is tapped in
 *   the shade (or the plain notification is clicked). */

export const NOTIFY_SW = `/* timeandspace.science notifications — no caching, notifications only */
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
`;

export const NOTIFY_JS = `
window.acNotify=(function(){
  var reg=null, inited=false, onStop=null, C={ sw:"/sw.js", tag:"ac-notif", title:"\\u23f0 Alarm", body:"Tap Stop." };
  function init(cfg, stop){ if(stop) onStop=stop; if(cfg){ for(var k in cfg) C[k]=cfg[k]; }
    if(inited) return; inited=true;
    if(!("Notification" in window)) return;
    if("serviceWorker" in navigator){ try{
      navigator.serviceWorker.register(C.sw).then(function(r){ reg=r; })["catch"](function(){});
      navigator.serviceWorker.ready.then(function(r){ reg=r; })["catch"](function(){});
      navigator.serviceWorker.addEventListener("message",function(e){ if(e.data&&e.data.type==="ac-notif-stop"&&onStop) onStop(); });
    }catch(e){} }
    if(Notification.permission==="default"){ try{ Notification.requestPermission(); }catch(e){} }
  }
  function supported(){ return ("Notification" in window); }
  function show(over){ if(!supported()||Notification.permission!=="granted") return;
    var o={ body:C.body, tag:C.tag, renotify:true, requireInteraction:true, icon:"/favicon.svg", badge:"/favicon.svg" };
    if(over){ for(var k in over) o[k]=over[k]; }
    if(reg&&reg.showNotification){ try{ o.actions=[{action:"stop",title:"Stop"}]; reg.showNotification(C.title,o); return; }catch(e){} }
    try{ var n=new Notification(C.title,o); n.onclick=function(){ try{ window.focus(); }catch(e){} if(onStop) onStop(); try{ n.close(); }catch(e){} }; }catch(e){}
  }
  function clear(){ try{ if(reg&&reg.getNotifications){ reg.getNotifications({tag:C.tag}).then(function(ns){ ns.forEach(function(n){ n.close(); }); })["catch"](function(){}); } }catch(e){} }
  return { init:init, show:show, clear:clear, supported:supported };
})();
`;
