/* Failure candidates (selected-model curves, unsmoothed). Adds clips to E2R_RP, lists them per task, captions by id. */
Object.assign(window.E2R_RP.clips, {});
window.E2R_FAILS = {"buttons": [], "vegetables": ["vegetables-5"]};
window.E2R_FCAPS = {"vegetables-5": "The plate tips, the cabbage is never placed, and the pepper ends up on the rim."};
/* authors' alignment (11-01): vegetables-5 "no further progress" starts at 60.0 s, when the pepper is released on the rim
   (official annotation: 61.67 s, an endpoint placed inside the static segment) */
(window.E2R_RP.clips['vegetables-5'].bands.find((b) => b.type === 'nofurther') || {}).t0 = 60.0;
