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

/* the note atop every classroom and lesson-plan page; data-ac marks it so
   build-inline can re-inject it idempotently */
export const classroomPauseNote = () =>
  `<p class="tool-msg tool-msg-warn cr-pause" data-ac="cr-pause" role="note"><strong>The classroom pages are being updated.</strong> We are making an update to the classroom and lesson-plan pages, expected in ${CLASSROOM_PAUSE_WHEN}. Lesson-plan submissions are paused until then — please check back.</p>`;
