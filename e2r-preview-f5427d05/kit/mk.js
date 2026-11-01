/* Method kit for the r12 pages: explains absolute + relative supervision on real LIBERO executions.
   Data: window.MK_DATA (mk-data.js: episodes with per-frame Event2Reward progress and the supervised relation),
         window.MK_CAPS (captions.js: one-line caption + moments per episode, optional).
   API (all render into a container element):
     MK.DEF[cat]                 text for a category: name, outcome, definition, label, relation, penalty, supervision
     MK.player(el, opts)         video + annotated progress chart; returns {show(id), stop(), el}
         opts.layers: {time, ref, window, sampled, rule, moments} (true by default, false hides); timeAlways: draw t/T on every episode; timeCats: ['stall'] draws it for those kinds
         opts.compact: smaller chart; opts.autoplay: play when >= 50 % visible (default true)
     MK.picker(el, cat, onPick)  numbered buttons for every episode of a category; returns {set(id)}
     MK.keyframes(el, id)        reference / comparison / recovery frames with what each one means
     MK.card(el, opts)           complete "model card": category tabs 1–5, definition, key frames, episode buttons, player
     MK.cats                     ['success','stall','regression','nofurther','unrecovered']
   Paths are relative to the page: kit at ../kit/. Videos play at 2x. */
(() => {
  'use strict';
  const D = window.MK_DATA, CAPS = window.MK_CAPS || {};
  const KIT = (document.currentScript && document.currentScript.src.replace(/[^/]*$/, '')) || '../kit/';
  const RATE = 2, NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cats = ['success', 'stall', 'regression', 'nofurther', 'unrecovered'];
  const COL = { blue: '#2557a7', ref: '#1d232b', win: { stall: '#d5a76a', regression: '#c2413b', nofurther: '#8a93a0', unrecovered: '#c2413b' }, rule: '#b3261e', time: '#8a93a0' };
  // wording follows the paper (Section 3.2, Table "Execution events and the progress relations they support", Appendix losses)
  const DEF = {
    success: { n: 1, name: 'Successful execution', outcome: 'Success', supervision: 'Absolute',
      definition: 'A normal successful execution with no annotated event.',
      label: 'No event is marked. Every frame gets a temporal label from its position in time.',
      relation: 'Progress grows with elapsed time: 0 at the start, 1 at completion.',
      penalty: 'y_t = (t − t₀) / (t_S − t₀), trained with cross-entropy', glyph: 'y = t / T' },
    stall: { n: 2, name: 'Progress stall', outcome: 'Success', supervision: 'Relative',
      definition: 'A local interval without observable task advancement.',
      label: 'The annotator marks the reference state a, where the stall begins, and r, where progress resumes.',
      relation: 'Inside the interval, progress stays approximately equal to the reference.',
      penalty: '[ |p_t − p_a| − ε ]₊², ε = 0.02', glyph: 'p_t ≈ p_a' },
    regression: { n: 3, name: 'Regression and recovery', outcome: 'Success', supervision: 'Relative',
      definition: 'An achieved task state is lost and subsequently restored.',
      label: 'The annotator marks a, the last state before the loss, and r, the first state that restores it.',
      relation: 'States during the loss have lower progress than both a and r.',
      penalty: '[ p_t − min(p_a, p_r) + m_e ]₊², m_e = min(0.1, ½ min(p_a, p_r))', glyph: 'p_t < min(p_a, p_r)' },
    nofurther: { n: 4, name: 'No further progress', outcome: 'Failure', supervision: 'Relative',
      definition: 'The rest of the execution shows no advancement beyond a reference state before recording ends.',
      label: 'The annotator marks a, the last state with meaningful progress.',
      relation: 'Every later state has progress no greater than the reference.',
      penalty: '[ p_t − p_a ]₊²', glyph: 'p_t ≤ p_a' },
    unrecovered: { n: 5, name: 'Unrecovered regression', outcome: 'Failure', supervision: 'Relative',
      definition: 'An achieved task state is lost and remains unrecovered when recording ends.',
      label: 'The annotator marks a, the last state before the loss.',
      relation: 'States after the loss have lower progress than the reference.',
      penalty: '[ p_t − p_a + m ]₊², m = 0.1', glyph: 'p_t < p_a' },
  };
  const ep = (id) => D.episodes[id];
  const sec = (e, f) => f / e.fps;
  const cap = (id) => (CAPS[id] && CAPS[id].caption) || '';
  const mk = (t, a, p) => { const x = document.createElementNS(NS, t); for (const k in a) x.setAttribute(k, a[k]); if (p) p.append(x); return x; };
  const h = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; };
  const media = (id, ext) => `${KIT}media/${id}${ext}`;
  const at = (e, t) => { const f = Math.max(0, Math.min(e.n - 1, t * e.fps)), i = Math.floor(f), j = Math.min(e.n - 1, i + 1); return e.pred[i] + (e.pred[j] - e.pred[i]) * (f - i); };
  const ruleOf = (e) => {  // the line the relation compares against, over the comparison window
    const r = e.relation; if (!r) return null; const pa = e.pred[r.ref];
    if (r.kind === 'stall') return { lo: pa - 0.02, hi: pa + 0.02, text: 'p_a ± 0.02' };
    if (r.kind === 'regression') { const pr = e.pred[r.ref2], m = Math.min(0.1, 0.5 * Math.min(pa, pr)); return { y: Math.min(pa, pr) - m, text: 'below min(p_a, p_r) − m' }; }
    if (r.kind === 'nofurther') return { y: pa, text: 'not above p_a' };
    if (r.kind === 'unrecovered') return { y: pa - 0.1, text: 'below p_a − 0.1' };
  };

  function player(host, opts = {}) {
    const L = Object.assign({ time: true, timeAlways: false, ref: true, window: true, sampled: true, rule: true, moments: true }, opts.layers || {});
    const showTime = (x) => (x.label && L.time) || L.timeAlways || (L.timeCats || []).includes(x.cat);
    const el = h('div', 'mk-player' + (opts.compact ? ' mk-compact' : ''));
    el.innerHTML = `<div class="mk-v"><video muted playsinline preload="none"></video></div><div class="mk-c">
      <div class="mk-head"><span class="mk-key"><i></i>Event2Reward progress</span><span class="mk-key mk-key-time" hidden><i></i>Time-based label</span><span class="mk-key mk-key-ref" hidden><i></i>Annotated points</span><output class="mk-val">0.00</output></div>
      <svg class="mk-chart" role="slider" tabindex="0" aria-label="Episode time. Drag or use the arrow keys to move through the video."></svg>
      <p class="mk-cap"></p><div class="mk-ctrl"><button type="button" class="small-button">Play</button></div></div>`;
    host.append(el);
    const v = el.querySelector('video'), svg = el.querySelector('svg'), val = el.querySelector('.mk-val'), btn = el.querySelector('button');
    let e = null, g = null, cur, dot, raf = 0, user = reduced || opts.autoplay === false, visible = false, hold = 0;
    v.defaultPlaybackRate = RATE;
    function draw() {
      const w = Math.max(280, Math.round(svg.parentElement.clientWidth || 560)), small = w < 440;
      const top = 30, bottom = 46, H0 = opts.compact ? (small ? 150 : 180) : (small ? 200 : 260), h0 = top + H0 + bottom;
      const X = 34, W = w - X - 10, Y = top, H = H0;
      const px = (t) => X + Math.max(0, Math.min(e.dur, t)) / e.dur * W, py = (p) => Y + (1 - Math.max(0, Math.min(1, p))) * H;
      g = { w, X, W, px, py }; svg.setAttribute('viewBox', `0 0 ${w} ${h0}`); svg.innerHTML = '';
      for (const p of small ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]) {
        mk('line', { x1: X, x2: X + W, y1: py(p), y2: py(p), stroke: '#e9edf3' }, svg);
        mk('text', { x: X - 7, y: py(p) + 4, 'text-anchor': 'end', fill: '#7b8492', 'font-size': 12 }, svg).textContent = p === 0 || p === 1 ? p : p.toFixed(2);
      }
      const r = e.relation, lab = [];  // labels placed below the plot, kept apart
      // second annotated point: the recovery state, or for a stall the frame where progress resumes (closes the window, not compared)
      const end = r ? (r.ref2 != null ? r.ref2 : r.kind === 'stall' ? r.window[1] : null) : null;
      const put = (x, text, col, row = 0) => lab.push({ x, text, col, row });
      // shading spans the annotated interval, a to r (or a to the end of recording); the sampled frames lie inside it
      const xa = r ? px(sec(e, r.ref)) : 0, xe = r ? px(sec(e, end != null ? end : r.window[1])) : 0;
      if (r && L.window) {
        const x0 = xa, x1 = xe;
        mk('rect', { x: x0, y: Y, width: Math.max(2, x1 - x0), height: H, fill: COL.win[r.kind], opacity: 0.12 }, svg);
        mk('rect', { x: x0, y: Y + H + 6, width: Math.max(2, x1 - x0), height: 6, rx: 2, fill: COL.win[r.kind], opacity: 0.5 }, svg);
        put((x0 + x1) / 2, 'annotated interval', '#4d5868', 1);
      }
      if (r && L.rule) {
        const x0 = xa, x1 = xe, R = ruleOf(e);
        if (R.lo != null) mk('rect', { x: x0, y: py(R.hi), width: x1 - x0, height: Math.max(1.5, py(R.lo) - py(R.hi)), fill: COL.rule, opacity: 0.18 }, svg);
        else mk('line', { x1: x0, x2: x1, y1: py(R.y), y2: py(R.y), stroke: COL.rule, 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }, svg);
      }
      if (showTime(e)) mk('line', { x1: px(0), y1: py(0), x2: px(e.dur), y2: py(1), stroke: COL.time, 'stroke-width': 1.8, 'stroke-dasharray': '6 5' }, svg);
      mk('path', { d: e.pred.map((p, i) => (i ? 'L' : 'M') + px(i / e.fps).toFixed(1) + ' ' + py(p).toFixed(1)).join(''), fill: 'none', stroke: COL.blue, 'stroke-width': 2.3, 'stroke-linejoin': 'round' }, svg);
      if (r && L.sampled) for (const f of r.sampled) mk('circle', { cx: px(sec(e, f)), cy: py(e.pred[f]), r: 3.4, fill: '#fff', stroke: COL.win[r.kind], 'stroke-width': 1.6 }, svg);
      if (r && L.ref) {
        const refs = [[r.ref, 'a']]; if (end != null) refs.push([end, 'r']);
        for (const [f, k] of refs) {
          const x = px(sec(e, f)), y = py(e.pred[f]);
          mk('line', { x1: x, x2: x, y1: Y, y2: Y + H, stroke: COL.ref, 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.6 }, svg);
          const open = k === 'r' && r.ref2 == null;  // stall end: drawn hollow, it is not a reference
          mk('circle', { cx: x, cy: y, r: open ? 5 : 6, fill: open ? '#fff' : COL.ref, stroke: open ? COL.ref : '#fff', 'stroke-width': open ? 2.2 : 2 }, svg);
          mk('text', { x, y: Y - 10, 'text-anchor': 'middle', fill: COL.ref, 'font-size': 13, 'font-weight': 700 }, svg).textContent = small ? k : k === 'a' ? 'a · reference' : open ? 'r · progress resumes' : 'r · recovery';
        }
        if (r.loss != null) { const x = px(sec(e, r.loss)); mk('line', { x1: x, x2: x, y1: Y, y2: Y + H, stroke: COL.rule, 'stroke-dasharray': '2 3' }, svg); put(x, 'loss', COL.rule, 0); }
      }
      if (showTime(e)) put(px(e.dur) - 40, e.label ? 'y = t / T' : 'time-based label', COL.time, 0);
      if (L.moments && !small && CAPS[e.id]) for (const m of CAPS[e.id].moments || []) {
        if (r && (Math.abs(m.frame - r.ref) < 6 || (end != null && Math.abs(m.frame - end) < 6))) continue;
        put(px(sec(e, m.frame)), m.label, '#4d5868', 0);
      }
      // place bottom labels in two rows, skipping ones that would overlap
      const used = [];
      for (const l of lab) {
        const wl = l.text.length * 6.5 + 8, x = Math.max(X + wl / 2, Math.min(X + W - wl / 2, l.x));
        const clash = (row) => used.some((u) => u.row === row && Math.abs(u.x - x) < (u.w + wl) / 2);
        const row = !clash(l.row) ? l.row : !clash(1 - l.row) ? 1 - l.row : -1;
        if (row < 0) continue;
        used.push({ x, w: wl, row });
        mk('text', { x, y: Y + H + 26 + row * 15, 'text-anchor': 'middle', fill: l.col, 'font-size': 12 }, svg).textContent = l.text;
      }
      cur = mk('line', { y1: Y, y2: Y + H, stroke: '#c4ccd7', 'stroke-width': 1 }, svg);  // playback cursor: light and solid, unlike the annotation lines
      dot = mk('circle', { r: 5, fill: COL.blue, stroke: '#fff', 'stroke-width': 2 }, svg);
      set(v.currentTime || 0);
    }
    function set(t) {
      if (!e) return; t = Math.min(e.dur, t); const p = at(e, t), x = g.px(t);
      cur.setAttribute('x1', x); cur.setAttribute('x2', x); dot.setAttribute('cx', x); dot.setAttribute('cy', g.py(p));
      val.textContent = p.toFixed(2); svg.setAttribute('aria-valuenow', t.toFixed(1)); svg.setAttribute('aria-valuetext', `${t.toFixed(1)} s, progress ${p.toFixed(2)}`);
    }
    const tick = () => { set(v.currentTime); raf = v.paused ? 0 : requestAnimationFrame(tick); };
    const play = () => { clearTimeout(hold); v.playbackRate = RATE; if (v.ended) v.currentTime = 0; const q = v.play(); if (q) q.catch(() => {}); };
    v.addEventListener('play', () => { btn.textContent = 'Pause'; v.playbackRate = RATE; if (!raf) raf = requestAnimationFrame(tick); });
    v.addEventListener('pause', () => { btn.textContent = 'Play'; set(v.currentTime); });
    v.addEventListener('seeked', () => set(v.currentTime));
    v.addEventListener('ended', () => { if (visible && !user) hold = setTimeout(() => { if (visible && !user) { v.currentTime = 0; play(); } }, 2200); });
    const toggle = () => { if (v.paused) { user = false; play(); } else { user = true; clearTimeout(hold); v.pause(); } };
    btn.addEventListener('click', toggle); v.addEventListener('click', toggle);
    const seek = (t) => { user = true; clearTimeout(hold); v.pause(); t = Math.max(0, Math.min(e.dur, t)); set(t); if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
      const go = () => { v.currentTime = Math.min(t, (v.duration || e.dur) - 0.03); }; if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true }); };
    let drag = false;
    const tpos = (ev) => { const b = svg.getBoundingClientRect(); return ((ev.clientX - b.left) / b.width * g.w - g.X) / g.W * e.dur; };
    svg.addEventListener('pointerdown', (ev) => { ev.preventDefault(); drag = true; svg.setPointerCapture(ev.pointerId); seek(tpos(ev)); });
    svg.addEventListener('pointermove', (ev) => { if (drag) seek(tpos(ev)); });
    svg.addEventListener('pointerup', () => { drag = false; }); svg.addEventListener('pointercancel', () => { drag = false; });
    svg.addEventListener('keydown', (ev) => { const k = ev.key; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', ' '].includes(k)) return; ev.preventDefault(); if (k === ' ') return toggle();
      seek(k === 'Home' ? 0 : k === 'End' ? e.dur : v.currentTime + (k === 'ArrowRight' ? 1 : -1) * e.dur / 40); });
    let lastW = 0; new ResizeObserver(() => { const w = svg.parentElement.clientWidth; if (e && w && Math.abs(w - lastW) > 2) { lastW = w; draw(); } }).observe(svg.parentElement);
    new IntersectionObserver((es) => { for (const x of es) { visible = x.isIntersecting && x.intersectionRatio >= 0.5; if (visible) { if (!user) play(); } else { clearTimeout(hold); v.pause(); if (!reduced && opts.autoplay !== false) user = false; } } }, { threshold: [0, 0.5, 1] }).observe(v);
    return { el, video: v, seek, get id() { return e && e.id; },
      show(id, autoplay = false) {
        clearTimeout(hold); v.pause(); e = ep(id);
        el.querySelector('.mk-key-time').hidden = !showTime(e); el.querySelector('.mk-key-ref').hidden = !(e.relation && L.ref);
        el.querySelector('.mk-cap').textContent = cap(id);
        v.poster = media(id, '.jpg'); v.src = media(id, '.mp4'); v.preload = 'none';
        svg.setAttribute('aria-valuemin', '0'); svg.setAttribute('aria-valuemax', e.dur.toFixed(1)); draw(); set(0);
        if (autoplay && !reduced) { user = false; v.load(); play(); }
      }, stop() { clearTimeout(hold); v.pause(); } };
  }

  function picker(host, cat, onPick) {
    const box = h('div', 'mk-pick'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', DEF[cat].name + ' episodes');
    box.append(h('span', 'mk-pick-l', 'Episode'));
    const bs = D.order[cat].map((id, i) => { const b = h('button', 'small-button', String(i + 1)); b.type = 'button'; b.dataset.id = id; b.addEventListener('click', () => { set(id); onPick(id); }); box.append(b); return b; });
    const set = (id) => bs.forEach((b) => { const on = b.dataset.id === id; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    host.append(box); return { el: box, set };
  }

  function keyframes(host, id) {
    const e = ep(id), r = e.relation, wrap = h('div', 'mk-keys');
    const add = (f, title, note) => { const fig = h('figure', 'mk-k'); const img = h('img'); img.src = media(`${id}-k${f}`, '.jpg'); img.alt = ''; img.loading = 'lazy'; img.width = 320; img.height = 320;
      const c = h('figcaption'); c.append(h('b', null, title), h('span', null, ` ${note} · progress ${e.pred[f].toFixed(2)}`)); fig.append(img, c); wrap.append(fig); };
    if (!r) { add(0, 'Start', 'y = 0'); add(Math.floor((e.n - 1) / 2), 'Halfway', 'y = 0.5'); add(e.n - 1, 'Completion', 'y = 1'); }
    else {
      const mid = Math.floor((r.window[0] + r.window[1]) / 2);
      add(r.ref, 'a · reference', 'the annotated state');
      add(mid, 'Inside the window', { stall: '≈ a', regression: 'lower than a and r', nofurther: 'not above a', unrecovered: 'lower than a' }[r.kind]);
      if (r.ref2 != null) add(r.ref2, 'r · recovery', 'the state is restored');
      else if (r.kind === 'stall') add(r.window[1], 'r · progress resumes', 'still ≈ a');
      else add(e.n - 1, 'End of recording', { nofurther: 'still not above a', unrecovered: 'still lower than a' }[r.kind]);
    }
    host.append(wrap); return wrap;
  }

  function card(host, opts = {}) {
    const el = h('div', 'mk-card'); host.append(el);
    const tabs = h('div', 'mk-tabs'); tabs.setAttribute('role', 'tablist'); el.append(tabs);
    const body = h('div', 'mk-body'); el.append(body);
    const info = h('div', 'mk-info'), stage = h('div', 'mk-stage'); body.append(info, stage);
    const pickHost = h('div', 'mk-pickhost'), keysHost = h('div', 'mk-keyshost');
    const p = player(stage, opts.player || {}); stage.prepend(pickHost); if (opts.keyframes !== false) stage.append(keysHost);
    let cat = null, pk = null;
    const pick = (id, auto) => { p.show(id, auto); if (pk) pk.set(id); if (opts.keyframes !== false) { keysHost.innerHTML = ''; keyframes(keysHost, id); } };
    const tbs = cats.map((c) => { const d = DEF[c], b = h('button', 'mk-tab'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.innerHTML = `<span class="mk-n">${d.n}</span><span class="mk-tn">${d.name}</span><span class="mk-tag mk-${d.supervision.toLowerCase()}">${d.supervision}</span>`;
      b.addEventListener('click', () => go(c, true)); tabs.append(b); return b; });
    function go(c, auto) {
      cat = c; const d = DEF[c];
      tbs.forEach((b, i) => { const on = cats[i] === c; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
      info.innerHTML = '';
      info.append(h('p', 'mk-out', `${d.supervision} supervision · ${d.outcome === 'Success' ? 'successful' : 'failed'} executions`), h('h4', null, d.name), h('p', 'mk-def', d.definition));
      const dl = h('dl', 'mk-dl');
      dl.append(h('dt', null, 'What is annotated'), h('dd', null, d.label), h('dt', null, 'What it implies'), h('dd', null, d.relation), h('dt', null, 'Training signal'), h('dd', 'mk-pen', d.penalty));
      info.append(h('p', 'mk-glyph', d.glyph), dl);
      pickHost.innerHTML = ''; pk = picker(pickHost, c, (id) => pick(id, true));
      pick(D.order[c][opts.first && opts.first[c] != null ? opts.first[c] : 0], auto);
    }
    go(opts.start || 'stall', false);
    return { el, go, player: p };
  }

  window.MK = { DEF, cats, player, picker, keyframes, card, ep, media, ruleOf };
})();
