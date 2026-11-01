/* i03-pairs-shared-chart: success | failure pairs, one row per task, and ONE chart per row that overlays both
   progress curves (success blue, failure red, x = episode time in seconds at 1x). Two cursors follow the two videos;
   Dragging the chart seeks both videos to the same episode time.
   Curves are raw Event2Reward predictions (window.E2R_RP from assets/rv/rv-data.js). Annotated events sit in two
   strips under the plot (upper = success, lower = failure), so bands of the two episodes do not overlap.
   Rows play both clips together at one speed (data-speed), freeze on the last frame, then restart; only while >= 50 % visible. */
(() => {
  const reduced = RP.reduce;
  const HOLD_MS = 3200;
  const durOf = (id) => (RP.clip(id) || {}).dur || (RP.realClip(id) || {}).dur_1x || 0;
  const ensure = (v) => { if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); } };
  const ready = (v) => new Promise((res) => {
    if (v.readyState >= 3) return res();
    const done = () => { v.removeEventListener('canplay', done); res(); };
    v.addEventListener('canplay', done); setTimeout(done, 5000);
    ensure(v);
  });

  const NS = 'http://www.w3.org/2000/svg';
  const COL = { s: '#2557a7', f: '#c2413b' };
  const mk = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const clampV = (c, t) => RP.interp(c.pred, Math.min(t, c.dur));

  /* one chart, two clips; returns {set(k,t), seek, toggle} */
  function shared(fig) {
    const cs = RP.clip(fig.dataset.s), cf = RP.clip(fig.dataset.f);
    const svg = fig.querySelector('svg');
    const vals = fig.querySelectorAll('.sc-v');
    if (!cs || !cf) {
      svg.remove(); vals.forEach((v) => v.remove());
      const p = document.createElement('p'); p.className = 'cv-pending'; p.textContent = 'Curves pending.'; fig.append(p); return null;
    }
    const T = Math.max(cs.dur, cf.dur);
    const api = { t: { s: 0, f: 0 }, dur: T };
    let o, cur = {};
    function draw() {
      const w = Math.max(280, Math.round(fig.clientWidth || 520)), m = w < 420;
      const h = (m ? 210 : Math.round(Math.min(300, Math.max(240, w * 0.5)))) + 36;
      const LANE = 16, GAP = 2, laneH = 2 * LANE + GAP + 4;  // two event strips under the plot
      const pad = { t: 30, r: m ? 40 : 46, b: 10 + laneH, l: 36 };
      const X = pad.l, Y = pad.t, W = w - pad.l - pad.r, H = h - pad.t - pad.b;
      const px = (t) => X + Math.max(0, Math.min(T, t)) / T * W, py = (p) => Y + (1 - Math.max(0, Math.min(1, p))) * H;
      o = { w, h, X, Y, W, H, px, py };
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.innerHTML = '';
      svg.classList.add('rp-chart');
      for (const p of m ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]) {
        mk('line', { x1: X, x2: X + W, y1: py(p), y2: py(p), stroke: '#e9edf3' }, svg);
        mk('text', { x: X - 8, y: py(p) + 4, 'text-anchor': 'end', fill: '#7b8492', 'font-size': 12 }, svg).textContent = p === 0 || p === 1 ? p : m ? p.toFixed(1) : p.toFixed(2);
      }
      // no time axis: the cursors move with the videos, so absolute time adds nothing for the reader
      [[cs, 's'], [cf, 'f']].forEach(([c, k], row) => {
        const y = Y + H + 4 + row * (LANE + GAP);
        mk('circle', { cx: X - 8, cy: y + LANE / 2, r: 3.5, fill: COL[k] }, svg);
        for (const b of c.bands) {
          const s = RP.BAND[b.type]; if (!s) continue;
          const x0 = px(b.t0), bw = Math.max(2, px(b.t1) - x0);
          const r = mk('rect', { x: x0, y, width: bw, height: LANE, rx: 2, fill: s.fill, opacity: 0.42, class: 'sc-lane sc-lane-' + b.type }, svg);
          mk('title', {}, r).textContent = `${k === 's' ? 'Success' : 'Failure'}: ${s.label}, ${RP.fmt(b.t0)}–${RP.fmt(b.t1)} s`;
          // label centred in the strip; if it is too narrow, beside it (right, else left) when that space is free in this lane
          const tw = s.label.length * 6.4 + 10, spans = c.bands.filter((o) => o !== b).map((o) => [px(o.t0), px(o.t1)]);
          const free = (a, z) => a >= X - 2 && z <= X + W + pad.r && spans.every(([u, v]) => z <= u - 2 || a >= v + 2);
          let tx = null, anchor = 'start';
          if (tw < bw) { tx = x0 + bw / 2; anchor = 'middle'; }
          else if (free(x0 + bw + 2, x0 + bw + tw)) tx = x0 + bw + 6;
          else if (free(x0 - tw, x0 - 2)) { tx = x0 - 6; anchor = 'end'; }
          if (tx != null) mk('text', { x: tx, y: y + LANE - 4, 'text-anchor': anchor, fill: '#2b323b', 'font-size': 12, class: 'sc-lane-text' }, svg).textContent = s.label;
        }
      });
      const ends = [];
      for (const [k, c] of [['f', cf], ['s', cs]]) {
        const d = c.pred.map((p, i) => (i ? 'L' : 'M') + px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1)).join('');
        mk('path', { d, fill: 'none', stroke: COL[k], 'stroke-width': m ? 2.2 : 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'sc-line sc-line-' + k }, svg);
        const v = c.pred.at(-1)[1];
        if (c.dur < T - 0.5) mk('circle', { cx: px(c.dur), cy: py(v), r: 3, fill: '#fff', stroke: COL[k], 'stroke-width': 1.6 }, svg);
        ends.push({ k, x: px(c.dur), y: py(v), v, short: c.dur < T - 0.5, c });
      }
      // end labels: value at the end of each curve, nudged apart when they collide
      const [ef, es] = ends;
      if (Math.abs(ef.y - es.y) < 15 && Math.abs(ef.x - es.x) < 40) { if (ef.y >= es.y) ef.y = es.y + 15; else ef.y = es.y - 15; }
      for (const e of ends) {
        // a clip that ends early: label beside its open dot, on the side away from the other curve; short form on phones
        const txt = e.v.toFixed(2);
        const other = e.c === cs ? cf : cs, below = e.short && clampV(other, e.c.dur + T * 0.15) > e.v;
        mk('text', { x: e.short ? e.x + 7 : X + W + 5, y: !e.short ? e.y + 4 : below ? e.y + 17 : m ? e.y + 4 : e.y - 8, fill: COL[e.k], 'font-size': 12, 'font-weight': 600, 'text-anchor': 'start', class: 'sc-end' }, svg).textContent = txt;
      }
      for (const k of ['f', 's']) {
        const g = mk('g', { class: 'sc-cur sc-cur-' + k }, svg);
        const line = mk('line', { y1: Y, y2: Y + H, stroke: COL[k], 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.7 }, g);
        const dot = mk('circle', { r: m ? 4.5 : 5.5, fill: COL[k], stroke: '#fff', 'stroke-width': 2 }, g);
        cur[k] = { line, dot };
      }
      api.set('s', api.t.s); api.set('f', api.t.f);
    }
    api.set = (k, t) => {
      const c = k === 's' ? cs : cf; t = Math.max(0, Math.min(c.dur, t)); api.t[k] = t;
      const x = o.px(t), v = RP.interp(c.pred, t);
      cur[k].line.setAttribute('x1', x); cur[k].line.setAttribute('x2', x);
      cur[k].dot.setAttribute('cx', x); cur[k].dot.setAttribute('cy', o.py(v));
      vals[k === 's' ? 0 : 1].textContent = v.toFixed(2);
      svg.setAttribute('aria-valuenow', api.t.s.toFixed(1));
      svg.setAttribute('aria-valuetext', `${api.t.s.toFixed(1)} s; success ${RP.interp(cs.pred, api.t.s).toFixed(2)}, failure ${RP.interp(cf.pred, api.t.f).toFixed(2)}`);
    };
    draw();
    // interaction: drag / keys seek both videos to the same episode time
    svg.setAttribute('role', 'slider'); svg.setAttribute('tabindex', '0');
    svg.setAttribute('aria-label', svg.getAttribute('aria-label') + '. Drag or use the arrow keys to move both videos.');
    svg.setAttribute('aria-valuemin', '0'); svg.setAttribute('aria-valuemax', T.toFixed(1));
    let drag = false;
    const toT = (e) => { const r = svg.getBoundingClientRect(); const sx = (e.clientX - r.left) / r.width * o.w; return (sx - o.X) / o.W * T; };
    svg.addEventListener('pointerdown', (e) => { e.preventDefault(); drag = true; svg.setPointerCapture(e.pointerId); api.seek && api.seek(toT(e), 'down'); });
    svg.addEventListener('pointermove', (e) => { if (drag) api.seek && api.seek(toT(e), 'move'); });
    svg.addEventListener('pointerup', (e) => { if (drag) { drag = false; api.seek && api.seek(toT(e), 'up'); } });
    svg.addEventListener('pointercancel', () => { drag = false; });
    svg.addEventListener('keydown', (e) => {
      const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', ' '].includes(k)) return;
      e.preventDefault();
      if (k === ' ') { api.toggle && api.toggle(); return; }
      const step = e.shiftKey ? T / 10 : Math.max(0.2, T / 60), now = Math.max(api.t.s, api.t.f);
      api.seek && api.seek(k === 'Home' ? 0 : k === 'End' ? T : now + (k === 'ArrowRight' ? step : -step), 'key');
    });
    let lastW = 0;
    const ro = new ResizeObserver(() => { const w = Math.round(fig.clientWidth); if (w && Math.abs(w - lastW) > 2) { lastW = w; draw(); } });
    ro.observe(fig);
    api.dispose = () => ro.disconnect();
    return api;
  }

  document.querySelectorAll('.pr-row').forEach((row) => {
    const speed = parseFloat(row.dataset.speed) || 1;
    const tiles = [...row.querySelectorAll('.pr-tile')];
    const vids = tiles.map((t) => t.querySelector('video'));
    const ids = vids.map((v) => v.dataset.clip);
    let sc = shared(row.querySelector('.sc'));
    const KEY = ['s', 'f'];
        const toggle = row.querySelector('.pr-toggle'), replay = row.querySelector('.pr-replay');
    let started = false, userPaused = reduced, visible = false, timer = 0, raf = 0, token = 0;
    vids.forEach((v) => { v.defaultPlaybackRate = speed; v.playbackRate = speed; });

    tiles.forEach((t) => { const s = document.createElement('span'); s.className = 'pr-play'; s.setAttribute('aria-hidden', 'true'); t.querySelector('.pr-frame').append(s); });

    const ended = (v, i) => v.ended || (v.readyState >= 1 && v.currentTime >= Math.min(v.duration || 1e9, durOf(ids[i])) - 0.05);
    const playing = () => vids.some((v) => !v.paused && !v.ended);
    const setUI = () => {
      const p = playing();
      toggle.textContent = p ? 'Pause both' : 'Play both';
      toggle.setAttribute('aria-pressed', String(p));
      row.classList.toggle('is-idle', !p && userPaused && !vids.every(ended));
      row.dataset.state = p ? 'playing' : vids.every(ended) ? 'done' : started ? 'paused' : 'idle';
    };
    const draw = () => {
      if (sc) vids.forEach((v, i) => sc.set(KEY[i], v.currentTime));
      raf = playing() ? requestAnimationFrame(draw) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); setUI(); };

    async function start() {               // synced start from frame 0
      clearTimeout(timer); const my = ++token; started = true;
      vids.forEach((v) => v.pause());
      await Promise.all(vids.map(ready));
      if (my !== token) return;
      vids.forEach((v, i) => { v.playbackRate = speed; v.currentTime = 0; tiles[i].classList.remove('is-done'); });
      await Promise.all(vids.map((v) => v.play().catch(() => {})));
      kick();
    }
    function resume() {
      if (!started || vids.every(ended)) return start();
      vids.forEach((v, i) => { if (!ended(v, i)) { v.playbackRate = speed; v.play().catch(() => {}); } });
      kick();
    }
    function pause() { clearTimeout(timer); token++; vids.forEach((v) => v.pause()); setUI(); draw(); }

    vids.forEach((v, i) => {
      v.addEventListener('play', kick);
      v.addEventListener('pause', setUI);
      v.addEventListener('seeked', () => { if (sc) sc.set(KEY[i], v.currentTime); });
      v.addEventListener('ended', () => {
        tiles[i].classList.add('is-done'); draw(); setUI();
        if (vids.every(ended)) {
          clearTimeout(timer);
          timer = setTimeout(() => { if (visible && !userPaused && !reduced) start(); }, HOLD_MS);
        }
      });
    });

    function wire() {
      if (!sc) return;
      sc.seek = (t, phase) => {
        if (phase === 'down' || phase === 'key') { userPaused = true; pause(); }
        started = true;
        vids.forEach((v, i) => {
          ensure(v);
          const d = durOf(ids[i]), ti = Math.max(0, Math.min(d, t));
          sc.set(KEY[i], ti); tiles[i].classList.toggle('is-done', ti >= d - 0.12);
          const apply = () => { try { v.currentTime = Math.min(ti, (v.duration || d) - 0.04); } catch (e) {} };
          if (v.readyState >= 1) apply(); else v.addEventListener('loadedmetadata', apply, { once: true });
        });
        setUI();
      };
      sc.toggle = () => toggle.click();
    }
    wire();

    /* episode swap, driven by picker.js (window.E2R_ALTS / E2R_FAILS list the candidates per task); side 0 = success, 1 = failure */
    {
      const fig = row.querySelector('.sc');
      row.e2rCurrent = (side = 0) => ids[side];
      row.e2rSwap = (id, play = true, side = 0) => {
        if (!id || id === ids[side]) return;
        const v = vids[side];
        pause(); started = false;
        ids[side] = id; v.dataset.clip = id;
        v.poster = `assets/rv/poster/${id}.jpg`; v.querySelector('source').src = `assets/rv/full/${id}.mp4`;
        v.preload = 'none'; v.load(); tiles[side].classList.remove('is-done');
        if (sc) sc.dispose();
        const old = fig.querySelector('svg'), svg = old.cloneNode(false); old.replaceWith(svg);  // drop the old chart's listeners
        fig.dataset[side ? 'f' : 's'] = id; sc = shared(fig); wire();
        row.dispatchEvent(new CustomEvent('e2r:swap', { detail: { id, side } }));
        if (play && visible && !reduced) { userPaused = false; start(); } else setUI();
      };
    }
    toggle.addEventListener('click', () => {
      if (playing()) { userPaused = true; pause(); } else { userPaused = false; resume(); }
    });
    replay.addEventListener('click', () => { userPaused = false; start(); });
    tiles.forEach((t) => t.querySelector('.pr-frame').addEventListener('click', () => toggle.click()));

    new IntersectionObserver((es) => {
      for (const e of es) {
        visible = e.isIntersecting && e.intersectionRatio >= 0.49;
        if (visible) { if (!userPaused) resume(); }
        else { if (playing() || timer) pause(); if (!reduced) userPaused = false; }
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] }).observe(row.querySelector('.pr-pair'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (visible && !userPaused) resume(); });
    setUI();
  });

  /* legend for the event strips actually used on this page */
  const types = new Set();
  document.querySelectorAll('.sc').forEach((f) => [f.dataset.s, f.dataset.f].forEach((id) => (RP.clip(id) || { bands: [] }).bands.forEach((b) => types.add(b.type))));
  const lg = document.querySelector('.ep-bands');
  if (lg) lg.innerHTML = ['stall', 'regress', 'recover', 'nofurther'].filter((k) => types.has(k)).map((k) => `<span class="rp-lb-${k}">${RP.BAND[k].label}</span>`).join('');
})();
