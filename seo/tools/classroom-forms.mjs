/* classroom-forms.mjs — the two teacher forms, and the copy around them.
 *
 * WHY A MODULE. /classroom/ carries them, three subject pages link to them,
 * and every lesson page points at them. One source means the promise made on
 * the hub is the promise made everywhere, and the day the empty-state plaque
 * stops being true it stops being true in one place.
 *
 * WHAT THE TWO DOORS ARE FOR. The site already had a form: "ask us to build a
 * simulator". It asks a teacher to imagine something that does not exist,
 * which is the hardest possible first move, and in the time it has been up
 * nobody has walked through it. These two ask for something the teacher
 * ALREADY HAS — the lesson they ran last week, and the questions their class
 * asked while they ran it. That is the whole design.
 *
 * WHAT WE PROMISE AND WHAT WE DO NOT. We promise to read it, to credit the
 * teacher if we use it, and to say when it is live. We do NOT promise to
 * publish everything: a form that implies automatic publication is a form
 * that will eventually make a liar of the site. Same rule the sponsorship
 * pages were rewritten under — no commitments the owner cannot keep.
 *
 * CHILD SAFETY IS A FIELD LIST, NOT A PARAGRAPH. There is no field on either
 * form that a student's name belongs in, the checkboxes say so, and the copy
 * says what happens if one arrives anyway. No accounts, no student form, no
 * uploads, no public comments — see the DO NOT list at the foot of this file.
 */
import { esc } from "./lib.mjs";

export const CLASSROOM_PATH = "/classroom/";
/* THE FORMS LIVE ON THEIR OWN PAGE. The owner's call, and the right one for a
 * nav item: the hamburger menu is a list of destinations, and "Submit a
 * lesson plan" deserves to BE one — a page that makes the collaboration case
 * in full — rather than a jump to an anchor halfway down the hub. The hub
 * keeps the pitch and points here. */
export const SUBMIT_PATH = "/classroom/submit-a-lesson/";
export const LESSON_FORM_HASH = `${SUBMIT_PATH}#lesson`;
export const QUESTIONS_HASH = `${SUBMIT_PATH}#questions`;

/* The five bands the lesson catalog is already built on. Same strings, so a
   submission arrives labelled the way the site labels its own shelves. */
const BANDS = ["K–2", "3–4", "5–6", "7–8", "High school"];
const SUBJECTS = ["Astronomy", "Earth science", "Time", "Other"];

/* ---- the empty-state plaque ---------------------------------------------
 * COUNT-DRIVEN, and deliberately a function, so the day the first lesson goes
 * up this becomes a number rather than a sentence somebody has to remember to
 * delete. "Zero teachers have sent anything" is true today and must never be
 * the permanent copy — a page that says nobody has done this is a page that
 * argues against itself. */
export function plaque(n = 0, credit = "") {
  if (!n) {
    return `    <p class="cr-plaque"><strong>Yours would be the first teacher-written lesson on the site.</strong>
      The timed plans already here were written in-house. We rewrite what you send, credit you the way you ask, and email you when it is live.</p>`;
  }
  return `    <p class="cr-plaque"><strong>${n} teacher-written lesson${n === 1 ? "" : "s"}</strong> on the site${credit ? ` — ${esc(credit)}` : ""}. Send the next one.</p>`;
}

/* the gold button, wherever a page wants to point at the form */
export const submitCta = (label = "Submit a lesson plan", href = LESSON_FORM_HASH) =>
  `<a class="btn cr-cta" href="${href}">${esc(label)}</a>`;

/* ---- the child-safety line ----------------------------------------------
 * STATES WHAT IS COLLECTED, not a compliance badge. Saying "COPPA compliant"
 * is a legal claim; saying "we hold no data from anyone under 13 because
 * there is no field for it" is a fact a reader can check against the forms
 * above it, which is the more useful sentence and the more honest one. */
export const SAFETY_NOTE = `    <p class="hint cr-safety"><strong>Nothing here collects anything from a child.</strong>
      There are no student accounts, no student forms, no uploads and no public comments — the only address this
      site ever holds is the teacher's, and it is used to reply to the teacher. Questions are published as
      “a 5th-grade class asked…”, never with a name. If a student's name reaches us in a paste, we delete it
      before anything is written. Location, where a page offers it, is optional and stays on the device.
      <a href="/privacy">Privacy</a>.</p>`;

/* ---- Form A: submit a lesson plan (primary) ------------------------------ */
export const lessonForm = `  <div class="card cr-ask" id="lesson">
    <h2>Submit a lesson plan</h2>
    <p><strong>Not a proposal, not a wish</strong> — the thing you taught last term, in whatever state it is in:
      a Doc, a scanned worksheet, five bullet points, a plan with the timings still wrong. This costs you a
      copy-and-paste.</p>

    <h3>What happens to it</h3>
    <ul class="bullets">
      <li>A person reads it. Nothing is published automatically, and nothing goes up without a reply to you first.</li>
      <li>We rewrite it in the site's voice and wire every step to a live view, the way the existing
        <a href="/classroom/lessons/">lesson plans</a> are built. The science is checked; the shape stays yours.</li>
      <li>You are credited the way you asked to be — <em>“from a lesson by Ms Thomas, Paradise Elementary”</em> —
        and we email you when it is live. If we cannot use it, we say so rather than leaving you waiting.</li>
    </ul>

    <form id="lp-form" novalidate>
      <label for="lp-email">Your email</label>
      <input id="lp-email" type="email" required placeholder="A school address is fine">
      <div class="hint">Required, because a lesson we cannot ask a question about is a lesson we cannot convert. Used to reply to you and nothing else — never shared, never added to a list.</div>

      <label for="lp-credit">Name to credit</label>
      <input id="lp-credit" type="text" maxlength="90" required placeholder="e.g. Ms Thomas, or Ms Thomas's 5th grade class">

      <label for="lp-place">Town or region <span class="cr-opt">— optional</span></label>
      <input id="lp-place" type="text" maxlength="90" placeholder="e.g. Paradise, CA">

      <label for="lp-school">School <span class="cr-opt">— optional, and kept off the page unless you ask for it</span></label>
      <input id="lp-school" type="text" maxlength="90" placeholder="e.g. Paradise Elementary School">

      <label for="lp-band">Grade band</label>
      <select id="lp-band">${BANDS.map((b) => `<option>${esc(b)}</option>`).join("")}</select>

      <label for="lp-topic">Topic</label>
      <select id="lp-topic">${SUBJECTS.map((s) => `<option>${esc(s)}</option>`).join("")}</select>

      <label for="lp-ngss">NGSS code <span class="cr-opt">— optional</span></label>
      <input id="lp-ngss" type="text" maxlength="40" placeholder="e.g. MS-ESS1-1">

      <fieldset class="cr-fs">
        <legend>Is the lesson built around a question?</legend>
        <label class="cr-check"><input type="radio" name="lp-q" value="one" checked> Yes — one driving question</label>
        <label class="cr-check"><input type="radio" name="lp-q" value="many"> Yes — several</label>
        <label class="cr-check"><input type="radio" name="lp-q" value="no"> Not really</label>
      </fieldset>

      <label for="lp-driving" id="lp-driving-lab">The question, or questions</label>
      <textarea id="lp-driving" rows="3" maxlength="800" placeholder="e.g. Why is it summer here and winter in Sydney on the same day?"></textarea>

      <label for="lp-body">The lesson</label>
      <textarea id="lp-body" rows="12" maxlength="18000" required placeholder="Paste it. Rough is fine — bullet points, timings, the worksheet questions, what usually goes wrong. If it lives in a Doc, paste the text; we do not need the formatting."></textarea>
      <div class="hint">Up to about 18,000 characters — several pages. Longer than that, email us and we will take it another way.</div>

    <p class="notice">If you are under 13, do not send us your name, email, or any other personal information. If you are under 18, please get a parent or guardian's permission before using this form.</p>
      <label class="cr-check"><input type="checkbox" id="lp-age" required> <span>I am 13 or older, and if I am under 18 I have a parent or guardian's permission to send this.</span></label>
      <label class="cr-check"><input type="checkbox" id="lp-rights"> <span>I have the right to share this. You may adapt it for the site and credit me as agreed.</span></label>
      <label class="cr-check"><input type="checkbox" id="lp-nokids"> <span>This does not include student names, photos, emails or class lists.</span></label>
      <p class="hint">AI-assisted drafts are fine — we rewrite anyway. You are responsible for the facts, and for not
        pasting a paid curriculum you do not own. We do not need originality; we need permission to adapt.</p>

      <input id="lp-hp" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <div class="row" style="margin-top:16px"><button class="btn" id="lp-send" type="submit">Send the lesson</button></div>
      <p id="lp-note" class="hint"></p>
    </form>
${SAFETY_NOTE}
  </div>
`;

/* ---- Form B: questions from the class ------------------------------------
 * A SECOND DOOR, NOT A STUDENT PORTAL. The teacher is the sender, every time.
 * It is here because a class's questions are the cheapest thing a teacher can
 * give us and the most useful thing we can receive: the site's whole lesson
 * catalog is organised by question, and we cannot invent the ones a real
 * ten-year-old asks. */
export const questionsForm = `  <div class="card cr-ask" id="questions">
    <h2>Send the questions your class asked</h2>
    <p>Easier than a lesson plan, and worth as much. Every lesson on this site is built around a question, and
      the good ones are never the ones an adult would have written — <em>why is the night sky dark?</em>,
      <em>does the moon follow the car?</em>, <em>if gravity pulls everything, why doesn't the moon fall on us?</em>
      Those came from children.</p>
    <p>Send us what your class asked and we will try to answer each one inside a lesson, on a page you can bring
      back to them. Published as <em>“a 5th-grade class asked…”</em> — never with a student's name.</p>

    <form id="cq-form" novalidate>
      <label for="cq-email">Your email</label>
      <input id="cq-email" type="email" required placeholder="A school address is fine">

      <label for="cq-credit">Name to credit <span class="cr-opt">— optional; we default to “a [grade] class”</span></label>
      <input id="cq-credit" type="text" maxlength="90" placeholder="e.g. Mr Smith's 5th grade class">

      <label for="cq-band">Grade band</label>
      <select id="cq-band">${BANDS.map((b) => `<option>${esc(b)}</option>`).join("")}</select>

      <label for="cq-topic">What are you about to teach? <span class="cr-opt">— optional</span></label>
      <input id="cq-topic" type="text" maxlength="120" placeholder="e.g. moon phases, next month">

      <label for="cq-body">The questions — one per line</label>
      <textarea id="cq-body" rows="8" maxlength="4000" required placeholder="Why is space black if the sun is so bright?&#10;Why doesn't the moon fall on us?&#10;Where does the sun go at night?"></textarea>

    <p class="notice">If you are under 13, do not send us your name, email, or any other personal information. If you are under 18, please get a parent or guardian's permission before using this form.</p>
      <label class="cr-check"><input type="checkbox" id="cq-age" required> <span>I am 13 or older, and if I am under 18 I have a parent or guardian's permission to send this.</span></label>
      <label class="cr-check"><input type="checkbox" id="cq-teacher"> <span>I am the teacher. These questions are from my class, and there are no student names in them.</span></label>

      <input id="cq-hp" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      <div class="row" style="margin-top:16px"><button class="btn" id="cq-send" type="submit">Send the questions</button></div>
      <p id="cq-note" class="hint"></p>
    </form>
  </div>
`;

/* ---- the script that drives both ----------------------------------------
 * ONE HANDLER, TWO FORMS. Both post the same shape to /api/report with a
 * different `reason`, which is how the owner's inbox sorts them — and the
 * endpoint gives those two reasons a bigger `details` cap, because a pasted
 * lesson is not a bug report.
 *
 * VALIDATION IS OURS, not the browser's (`novalidate`): the required
 * checkboxes need a message that says WHICH box, and the driving-question
 * textarea is required only when the radio above it says there is one. The
 * fields are still marked `required` so assistive technology reads them that
 * way; only the browser's own bubble is suppressed. */
export const FORMS_JS = `<script>(function(){
function $(id){return document.getElementById(id)}
function val(id){var e=$(id); return e?(e.value||"").trim():""}
function post(reason, details, email, hp, btn, note, ok){
  btn.disabled=true; note.className="hint"; note.textContent="Sending\\u2026";
  fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({url:location.href, reason:reason, details:details, email:email, website:hp})})
    .then(function(r){ return r.json().catch(function(){return{}}) })
    .then(function(d){
      if(d&&d.ok){ note.className="hint cr-ok"; note.textContent=ok; }
      else { btn.disabled=false; note.className="hint cr-err"; note.textContent="Something went wrong \\u2014 please try again, or email us."; }
    })
    .catch(function(){ btn.disabled=false; note.className="hint cr-err"; note.textContent="Network error \\u2014 please try again."; });
}
function fail(note,btn,msg,focus){ note.className="hint cr-err"; note.textContent=msg; btn.disabled=false; if(focus&&$(focus)) $(focus).focus(); }
var EM=/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;

/* ---- Form A ---- */
var lf=$("lp-form");
if(lf){
  /* the driving-question box is only required while the radio says there is
     one, and its label says so rather than the reader finding out on submit */
  var radios=lf.querySelectorAll('input[name="lp-q"]'), dv=$("lp-driving"), dl=$("lp-driving-lab");
  function syncQ(){
    var v="one", i;
    for(i=0;i<radios.length;i++) if(radios[i].checked) v=radios[i].value;
    var need=(v!=="no");
    dv.required=need; dv.disabled=!need;
    dl.innerHTML=need?(v==="many"?"The questions":"The question")
      :'The question, or questions <span class="cr-opt">\\u2014 not needed</span>';
  }
  for(var i=0;i<radios.length;i++) radios[i].addEventListener("change",syncQ);
  syncQ();

  lf.addEventListener("submit",function(ev){
    ev.preventDefault();
    var note=$("lp-note"), btn=$("lp-send");
    if(!EM.test(val("lp-email"))) return fail(note,btn,"We need an email we can reply to.","lp-email");
    if(!val("lp-credit")) return fail(note,btn,"Tell us the name to credit \\u2014 yours, or your class's.","lp-credit");
    if(dv.required && !val("lp-driving")) return fail(note,btn,"Add the driving question, or change the answer above to \\u201cNot really\\u201d.","lp-driving");
    if(val("lp-body").length<40) return fail(note,btn,"Paste the lesson itself \\u2014 even rough notes are enough to work from.","lp-body");
    if(!$("lp-age")||!$("lp-age").checked) return fail(note,btn,"Please confirm the age notice.","lp-age");
    if(!$("lp-rights").checked) return fail(note,btn,"We need the rights box ticked before we can adapt it.","lp-rights");
    if(!$("lp-nokids").checked) return fail(note,btn,"Please confirm there are no student names or photos in it.","lp-nokids");
    var d="CREDIT: "+val("lp-credit")
      +"\\nPLACE: "+(val("lp-place")||"\\u2014")
      +"\\nSCHOOL: "+(val("lp-school")||"\\u2014")+" (off the page unless asked)"
      +"\\nBAND: "+val("lp-band")+"   TOPIC: "+val("lp-topic")+"   NGSS: "+(val("lp-ngss")||"\\u2014")
      +"\\nDRIVING QUESTION(S): "+(val("lp-driving")||"\\u2014")
      +"\\nRIGHTS: yes   NO STUDENT DATA: yes"
      +"\\n\\n--- THE LESSON ---\\n"+val("lp-body");
    post("Lesson plan", d, val("lp-email"), $("lp-hp").value, btn, note,
      "\\u2713 Thank you \\u2014 a person will read this and reply to you. If we build it, you are credited on it.");
  });
}

/* ---- Form B ---- */
var qf=$("cq-form");
if(qf){
  qf.addEventListener("submit",function(ev){
    ev.preventDefault();
    var note=$("cq-note"), btn=$("cq-send");
    if(!EM.test(val("cq-email"))) return fail(note,btn,"We need an email we can reply to.","cq-email");
    if(val("cq-body").length<8) return fail(note,btn,"Add at least one question.","cq-body");
    if(!$("cq-age")||!$("cq-age").checked) return fail(note,btn,"Please confirm the age notice.","cq-age");
    if(!$("cq-teacher").checked) return fail(note,btn,"Please confirm you are the teacher sending these.","cq-teacher");
    var d="CREDIT: "+(val("cq-credit")||"a "+val("cq-band")+" class")
      +"\\nBAND: "+val("cq-band")+"   ABOUT TO TEACH: "+(val("cq-topic")||"\\u2014")
      +"\\nTEACHER CONFIRMED, NO STUDENT NAMES: yes"
      +"\\n\\n--- QUESTIONS ---\\n"+val("cq-body");
    post("Class questions", d, val("cq-email"), $("cq-hp").value, btn, note,
      "\\u2713 Thank you \\u2014 we read every one. We will try to answer each question inside a lesson.");
  });
}
})();</script>`;
