(function(){
  var h24=document.getElementById('cv-h24'), m24=document.getElementById('cv-m24'),
      h12=document.getElementById('cv-h12'), m12=document.getElementById('cv-m12'),
      ap=document.getElementById('cv-ap');
  if(!h24||!m24||!h12||!m12||!ap) return;
  var out24=document.getElementById('cv-out24'), out12=document.getElementById('cv-out12'),
      say=document.getElementById('cv-say'), nowBtn=document.getElementById('cv-now');
  var ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  var TENS=['','','twenty','thirty','forty','fifty'];
  function pad(n){ return (n<10?'0':'')+n; }
  function word(n){ return n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?'-'+ONES[n%10]:''); }
  function pairWord(n){ return n<10?'zero '+ONES[n]:word(n); }
  function part(h){ return h<5?'at night':h<12?'in the morning':h<18?'in the afternoon':h<21?'in the evening':'at night'; }
  function say24(h,m){ return m===0?pairWord(h)+' hundred hours':pairWord(h)+' '+pairWord(m); }
  function say12(h,m){
    if(h===0&&m===0) return 'twelve midnight';
    if(h===12&&m===0) return 'twelve noon';
    var t=h%12||12, p=part(h);
    if(m===0) return word(t)+" o'clock "+p;
    if(m===30) return 'half past '+word(t)+' '+p;
    return word(t)+' '+(m<10?'oh '+ONES[m]:word(m))+' '+p;
  }
  /* h,m are the one truth; both sides and both read-outs are drawn from them */
  function render(h,m){
    var t=h%12||12, a=h<12?'AM':'PM';
    h24.value=String(h); m24.value=String(m);
    h12.value=String(t); m12.value=String(m); ap.value=a;
    out24.textContent=pad(h)+':'+pad(m);
    out12.textContent=t+':'+pad(m)+'\u00a0'+a;
    /* guarded: a compact instance may leave pieces out */
    if(say) say.textContent='Said aloud: \u201c'+say24(h,m)+'\u201d on the 24-hour clock, \u201c'+say12(h,m)+'\u201d on the 12-hour one.';
  }
  function from24(){ render(+h24.value, +m24.value); }
  function from12(){
    var t=+h12.value%12, h=ap.value==='PM'?t+12:t;
    render(h, +m12.value);
  }
  h24.addEventListener('change',from24); m24.addEventListener('change',from24);
  h12.addEventListener('change',from12); m12.addEventListener('change',from12);
  ap.addEventListener('change',from12);
  if(nowBtn){
    nowBtn.hidden=false;
    nowBtn.addEventListener('click',function(){ var n=new Date(); render(n.getHours(), n.getMinutes()); });
  }
  from24();
})();
