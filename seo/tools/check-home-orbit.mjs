import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./build-home.mjs',import.meta.url),'utf8');
const literal=source.match(/const ORBIT_JS = (`[\s\S]*?`);/)[1];
const script=vm.runInNewContext(literal).replace(/^<script>|<\/script>$/g,'');
function model(reduced=false){
  const elements=new Map(), timers=new Map(), events={};let seq=0;
  for(const id of ['ho-wrap','ho-path','ho-moon','ho-note','ho-impact','ho-restart','ho-slow','ho-fast','ho-reset']){
    elements.set(id,{attrs:{},handlers:{},disabled:false,hidden:id==='ho-restart',classList:{add(){},remove(){}},focus(){},setAttribute(k,v){this.attrs[k]=String(v);},addEventListener(k,fn){this.handlers[k]=fn;}});
  }
  const document={hidden:false,getElementById:id=>elements.get(id),addEventListener:(k,fn)=>events[k]=fn};
  vm.runInNewContext(script,{document,window:{matchMedia:()=>({matches:reduced})},setInterval:fn=>{timers.set(++seq,fn);return seq;},clearInterval:id=>timers.delete(id)});
  return {elements,timers,document,click(id){elements.get(id).handlers.click({stopPropagation(){}});},tick(n){for(let i=0;i<n;i++)for(const fn of [...timers.values()])fn();},visibility(hidden){document.hidden=hidden;events.visibilitychange();}};
}
for(const clicks of [0,1,2,3]){
  const m=model();for(let i=0;i<clicks;i++)m.click('ho-slow');m.tick(1000);
  assert.equal(m.elements.get('ho-restart').hidden,true,'Nonintersecting orbit must survive');
}
for(const clicks of [4,5,12]){
  const m=model();for(let i=0;i<clicks;i++)m.click('ho-slow');m.tick(1000);
  assert.equal(m.elements.get('ho-restart').hidden,false,'Intersecting orbit must impact');
  assert.equal(m.timers.size,0);assert.equal(m.elements.get('ho-slow').disabled,true);
  const moon=m.elements.get('ho-moon');assert.ok(Math.abs(Math.hypot(+moon.attrs.cx-160,+moon.attrs.cy-100)-17.5)<.01,'Stop at surface contact');
  assert.equal(m.elements.get('ho-impact').attrs.visibility,'visible');
  const pos=JSON.stringify(moon.attrs);m.visibility(true);m.visibility(false);m.tick(100);
  assert.equal(m.timers.size,0);assert.equal(JSON.stringify(moon.attrs),pos,'Visibility must not resume impact');
  m.click('ho-restart');assert.equal(m.timers.size,1);assert.equal(m.elements.get('ho-restart').hidden,true);
  assert.equal(m.elements.get('ho-slow').disabled,false);assert.equal(moon.attrs.visibility,'visible');
  assert.equal(m.elements.get('ho-impact').attrs.visibility,'hidden');
  assert.equal(moon.attrs.cx,'230.00');m.tick(5);assert.notEqual(moon.attrs.cx,'230.00');
}
const reset=model();reset.click('ho-slow');reset.tick(10);reset.click('ho-reset');assert.equal(reset.elements.get('ho-moon').attrs.cx,'230.00');
assert.equal(model(true).timers.size,0,'Respect reduced-motion preference');
console.log('✓ home orbit: safe orbits, surface impacts, stopped state, visibility, restart, circle reset and reduced motion.');
