/* site-flags.mjs — the switches the owner flips for the whole site.
 *
 * CLASSROOM_PAUSED (owner's call, September 2026). The classroom pages are
 * being reworked, and the message e-mail was not reaching the owner, so until
 * the update ships nothing on the site may invite a teacher to send anything
 * that would then go unanswered. While this is true:
 *   - Classroom leaves the section tabs (section-nav) and the hamburger, and
 *     "Submit a Lesson Plan" leaves the menu and the footer (build-inline);
 *   - the site-idea box under every page, the home page's collaboration form
 *     and both classroom forms are not emitted;
 *   - every remaining link to /classroom/ or the submit page is unwrapped to
 *     plain text by build-inline, so no page routes a teacher to the pause;
 *   - every page under /classroom/ opens with classroomPauseNote().
 * Nothing is deleted: flip this to false and rebuild, and all of it returns. */
export const CLASSROOM_PAUSED = true;
export const CLASSROOM_PAUSE_WHEN = "October or November";

/* MESSAGE_FORMS_PAUSED (same call, same day): the other three doors into the
 * same inbox — /report/, /suggest-event/ and /wrong-date/ — lose their forms
 * (wrapped in an inert <template>, not deleted) and every link to them,
 * including "Report abuse", "Suggest an event" and "Wrong date?" in the
 * footers. Each page opens with messageFormsNote() instead. */
export const MESSAGE_FORMS_PAUSED = true;

/* the note atop every classroom and lesson-plan page; data-ac marks it so
   build-inline can re-inject it idempotently */
export const classroomPauseNote = (rel = "") =>
  `<p class="tool-msg tool-msg-warn cr-pause" data-ac="cr-pause" role="note">${rel === "classroom/index.html" ? "The classroom guides are being updated, and lesson-plan submissions are paused. You can still explore the simulations and use the activities on their pages." : rel.includes("seasons-grades-7-8/") ? "This grades 7–8 seasons lesson is being updated. You can still use the seasons simulator to compare daylight and Sun angles through the year." : rel.includes("solar-system-grades-3-4/") ? "This grades 3–4 solar-system lesson is being updated. You can still use the solar-system simulator to compare the planets’ paths around the Sun." : "Lesson-plan submissions are paused while the classroom pages are updated. Please check back for reopening information."}</p>`;

/* the note atop /report/, /suggest-event/ and /wrong-date/ while their forms are paused */
export const messageFormsNote = () =>
  `<p class="tool-msg tool-msg-warn mf-pause" data-ac="mf-pause" role="note"><strong>This form is temporarily offline.</strong> We are updating how messages reach us, expected in ${CLASSROOM_PAUSE_WHEN}. Nothing sent through it right now would reach a person, so it has been taken down until then — please check back.</p>`;
