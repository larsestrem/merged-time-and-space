/* alarm-tones.mjs — the shared set of synthesized alarm tones (no audio files),
 * so the timer offers the same selection the alarm clock does.
 *
 * TONE_LIST    — [value, Label] pairs to build a picker (select/menu/etc.).
 * TONES_JS     — inline script exposing window.AC_TONES: name -> fn(ac), each
 *                takes a running AudioContext and plays one hit. The caller
 *                unlocks/resumes the context (a user gesture) before calling.
 *
 * The five core tones (beep/chime/mellow/bell/siren) mirror the alarm clock
 * widget; "rooster" is the timer's cock-a-doodle-doo (great for the egg timer). */

/* [value, Label] for each tone — build a <select>, a menu, radios, whatever. */
export const TONE_LIST = [
  ["beep", "Beep"],
  ["chime", "Chime"],
  ["mellow", "Mellow"],
  ["bell", "Bell"],
  ["siren", "Siren"],
  ["rooster", "Rooster"],
];

export const TONES_JS = `
(function(){
  function beep(ac){ var o=ac.createOscillator(),g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='square'; o.frequency.value=1000; g.gain.setValueAtTime(0.0001,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.4,ac.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+0.4); o.start(); o.stop(ac.currentTime+0.42); }
  function chime(ac){ var t=ac.currentTime; [880,1320].forEach(function(f,i){ var o=ac.createOscillator(),g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='sine'; o.frequency.value=f; var s=t+i*0.18; g.gain.setValueAtTime(0.0001,s); g.gain.exponentialRampToValueAtTime(0.35,s+0.02); g.gain.exponentialRampToValueAtTime(0.0001,s+0.4); o.start(s); o.stop(s+0.42); }); }
  function bell(ac){ var t=ac.currentTime, g=ac.createGain(); g.connect(ac.destination); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.4,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.7); [800,1600,2400,3200].forEach(function(f,i){ var o=ac.createOscillator(),og=ac.createGain(); o.type='sine'; o.frequency.value=f; og.gain.value=[0.5,0.3,0.15,0.08][i]; o.connect(og); og.connect(g); o.start(t); o.stop(t+0.72); }); }
  function siren(ac){ var t=ac.currentTime, o=ac.createOscillator(), g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='sawtooth'; o.frequency.setValueAtTime(700,t); o.frequency.linearRampToValueAtTime(1100,t+0.25); o.frequency.linearRampToValueAtTime(700,t+0.5); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.35,t+0.03); g.gain.setValueAtTime(0.35,t+0.47); g.gain.exponentialRampToValueAtTime(0.0001,t+0.55); o.start(t); o.stop(t+0.57); }
  function mellow(ac){ var t=ac.currentTime, o=ac.createOscillator(), o2=ac.createOscillator(), g=ac.createGain(), g2=ac.createGain(); o.type='sine'; o.frequency.value=523.25; o2.type='sine'; o2.frequency.value=784; g2.gain.value=0.35; o.connect(g); o2.connect(g2); g2.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.2,t+0.12); g.gain.exponentialRampToValueAtTime(0.0001,t+0.95); o.start(t); o2.start(t); o.stop(t+1); o2.stop(t+1); }
  /* A synthesized rooster crow. The previous version was two detuned sawtooths
   * through one wide bandpass (Q 1.1) with a 33 Hz square-wave tremolo wired
   * straight onto the gain — which is a recipe for a buzzing synth, not a bird:
   * a raw saw pair has none of a crow's noise content, one gentle bandpass
   * gives no vowel, and audio-rate square modulation of amplitude just sounds
   * like a broken speaker.
   *
   * This rebuilds it around how the sound is actually made:
   *   VOICED SOURCE  three detuned sawtooths through a tanh waveshaper. A
   *                  rooster's syrinx vibrates roughly and chaotically; the
   *                  soft clipping supplies the harsh upper harmonics that
   *                  make it squawk rather than hum.
   *   JITTER         the pitch is stepped every 12 ms with a few percent of
   *                  random wobble on top of the contour. Perfectly smooth
   *                  glides are the single biggest giveaway of a synthetic
   *                  animal sound.
   *   FORMANTS       three parallel resonant bandpasses sweeping through an
   *                  "uh - ah - oo" shape, which is what turns a buzz into a
   *                  vowel, PLUS a high-passed slice of the raw clipped source.
   *                  Formant bands alone leave a near-sine at the fundamental —
   *                  measured, it was 96% of the energy in two bins — and a
   *                  near-sine is a whistle, not a bird.
   *   BREATH         a white-noise layer through its own bandpass, loudest on
   *                  the final syllable, giving the rasp a real crow ends on.
   *   FOUR SYLLABLES cock (0.14s) - a (0.11s) - dooo (0.40s, highest and
   *                  longest) - doo (0.55s, falling and raspy), which is the
   *                  timing of an actual cock-a-doodle-doo. */
  function rooster(ac){
    var t=ac.currentTime, DUR=1.55, out=ac.createGain();
    out.gain.value=0.32; out.connect(ac.destination);

    /* --- two formant resonances in parallel --- */
    function formant(q,gain){ var f=ac.createBiquadFilter(); f.type='bandpass'; f.Q.value=q;
      var g=ac.createGain(); g.gain.value=gain; f.connect(g); g.connect(out); return f; }
    var F1=formant(3,1.3), F2=formant(4.5,0.55), F3=formant(5,0.3);
    /* uh -> ah (open, bright) -> oo (closing) */
    [[F1,[[820,0],[1100,0.34],[1250,0.62],[900,1.0],[700,1.5]]],
     [F2,[[1900,0],[2500,0.34],[2900,0.62],[2200,1.0],[1700,1.5]]],
     [F3,[[3200,0],[3500,0.34],[3700,0.62],[3100,1.0],[2800,1.5]]]].forEach(function(pair){
      var p=pair[0].frequency, pts=pair[1];
      p.setValueAtTime(pts[0][0],t);
      for(var i=1;i<pts.length;i++) p.linearRampToValueAtTime(pts[i][0],t+pts[i][1]);
    });

    /* --- voiced source: detuned saws -> soft clipper -> formants --- */
    var shaper=ac.createWaveShaper(), curve=new Float32Array(257);
    for(var i=0;i<257;i++){ var x=i/128-1; curve[i]=Math.tanh(x*5.5); }
    shaper.curve=curve; shaper.oversample='2x';
    shaper.connect(F1); shaper.connect(F2); shaper.connect(F3);
    /* narrow formant bands alone leave a near-sine at the fundamental, which is
       what made the old tone sound like a whistle. Keep a high-passed slice of
       the raw clipped source so the upper harmonics — the rasp — survive. */
    var hp=ac.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1300; hp.Q.value=0.7;
    var hpg=ac.createGain(); hpg.gain.value=0.24;
    shaper.connect(hp); hp.connect(hpg); hpg.connect(out);
    var vca=ac.createGain(); vca.gain.setValueAtTime(0.0001,t); vca.connect(shaper);
    var oscs=[];
    [0,-16,19].forEach(function(d){ var o=ac.createOscillator(); o.type='sawtooth'; o.detune.value=d; o.connect(vca); oscs.push(o); });

    /* --- pitch contour, stepped with jitter --- */
    var CONTOUR=[[0,470],[0.06,720],[0.14,690],[0.18,560],[0.29,600],
                 [0.34,880],[0.46,1080],[0.62,1040],[0.70,980],
                 [0.95,900],[1.20,700],[1.45,470]];
    function contourAt(x){
      for(var i=1;i<CONTOUR.length;i++) if(x<=CONTOUR[i][0]){
        var a=CONTOUR[i-1], b=CONTOUR[i], k=(x-a[0])/(b[0]-a[0]||1);
        return a[1]+(b[1]-a[1])*k; }
      return CONTOUR[CONTOUR.length-1][1];
    }
    oscs.forEach(function(o){
      for(var x=0;x<DUR;x+=0.012){
        var jitter=1+(Math.random()-0.5)*0.05;      /* ~5% roughness */
        o.frequency.setValueAtTime(contourAt(x)*jitter,t+x);
      }
    });

    /* --- breath / rasp: white noise, loudest at the end --- */
    var len=Math.floor(ac.sampleRate*DUR), buf=ac.createBuffer(1,len,ac.sampleRate), d=buf.getChannelData(0);
    for(var n=0;n<len;n++) d[n]=Math.random()*2-1;
    var noise=ac.createBufferSource(); noise.buffer=buf;
    var nf=ac.createBiquadFilter(); nf.type='bandpass'; nf.Q.value=1.6;
    nf.frequency.setValueAtTime(1800,t); nf.frequency.linearRampToValueAtTime(2600,t+0.7); nf.frequency.linearRampToValueAtTime(1500,t+1.5);
    var ng=ac.createGain(); ng.gain.setValueAtTime(0.0001,t);
    noise.connect(nf); nf.connect(ng); ng.connect(out);

    /* --- four syllables --- */
    var A=vca.gain, N=ng.gain;
    function syll(s,e,pk,noisePk){
      A.setValueAtTime(0.0001,t+s);
      A.exponentialRampToValueAtTime(pk,t+s+0.022);
      A.setValueAtTime(pk,t+e-0.06);
      A.exponentialRampToValueAtTime(0.0001,t+e);
      N.setValueAtTime(0.0001,t+s);
      N.exponentialRampToValueAtTime(Math.max(noisePk,0.0002),t+s+0.03);
      N.exponentialRampToValueAtTime(0.0001,t+e);
    }
    syll(0,    0.15, 0.42, 0.05);   /* cock  */
    syll(0.18, 0.30, 0.34, 0.04);   /* a     */
    syll(0.33, 0.74, 0.60, 0.07);   /* dooo  */
    syll(0.78, 1.45, 0.52, 0.16);   /* doo, raspiest */

    oscs.forEach(function(o){ o.start(t); o.stop(t+DUR); });
    noise.start(t); noise.stop(t+DUR);
  }
  window.AC_TONES={beep:beep,chime:chime,mellow:mellow,bell:bell,siren:siren,rooster:rooster};
})();`;
