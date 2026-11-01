/* Episode picker for the real-robot rows: numbered buttons beside Play/Replay, one group for the success video and,
   where a task has several, one for the failure video. Only the chosen video (and its curve) changes.
   Relies on row.e2rSwap(id, play, side) / row.e2rCurrent(side) from extra.js and on window.E2R_ALTS (assets/rv/s32-data.js),
   window.E2R_FAILS and window.E2R_FCAPS (assets/rv/fail-data.js). */
(() => {
  const ALTS = window.E2R_ALTS || {}, FAILS = window.E2R_FAILS || {}, FCAPS = window.E2R_FCAPS || {};
  document.querySelectorAll('.sc-row').forEach((row) => {
    if (!row.e2rSwap) return;
    const task = row.dataset.task, cap = row.querySelector('.pr-failure figcaption');
    const pickers = document.createElement('div');
    pickers.className = 'pk-groups';
    [[ALTS[task], 0, 'Success episode'], [FAILS[task], 1, 'Failure episode']].forEach(([list, side, label]) => {
      if (!list || !list.length) return;
      row.e2rSwap(list[0], false, side);  // default recording for this task
      if (side === 1 && cap && FCAPS[list[0]]) cap.innerHTML = `<strong>Failure.</strong> ${FCAPS[list[0]]}`;
      if (list.length < 2) return;  // a single recording needs no buttons
      const box = document.createElement('div');
      box.className = 'pk-num'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', label);
      box.innerHTML = `<span>${label}</span>`;
      const buttons = list.map((id, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'small-button'; b.textContent = String(i + 1); b.dataset.id = id;
        b.addEventListener('click', () => row.e2rSwap(id, true, side));
        box.append(b);
        return b;
      });
      const sync = () => {
        const cur = row.e2rCurrent(side);
        buttons.forEach((b) => { const on = b.dataset.id === cur; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
        if (side === 1 && cap && FCAPS[cur]) cap.innerHTML = `<strong>Failure.</strong> ${FCAPS[cur]}`;
      };
      row.addEventListener('e2r:swap', sync);
      sync();
      pickers.append(box);
    });
    if (pickers.children.length) row.querySelector('.pr-ctrl').prepend(pickers);
  });
})();
