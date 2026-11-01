/* Interactive learning-curve charts for the Event2Reward homepage candidates (plain SVG, no library).
   Data: figure JSON from assets/data/curves/*.json
     {figure, x_label, y_label, methods:[{id,label}], panels:[{id,title,series:{mid:{x,mean,lo,hi}}}]}

   LC.grid(host, fig, opts)  small multiples with one shared legend and a crosshair synced across panels
     opts: {panels:[ids] (default all), cols:4, height:190, methods:[ids], focus:id (method drawn on top),
            onPanel(panel) (click a panel), legend:true, tooltip:true, xfmt, yfmt}
   LC.chart(host, fig, panelId, opts)  one larger chart (same options) -> {setPanel(id)}
   Methods can be switched on/off from the legend; the state is shared by all panels of one grid. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  // Event2Reward in the page blue; baselines muted and distinct (validated for contrast on white)
  const PALETTE = ['#9aa3ae', '#c28b3c', '#7a5ea8', '#2f8f7a', '#c2413b', '#5b7fbf'];
  const OURS = '#2557a7';
  const mk = (tag, at, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const isOurs = (m) => /event2reward|ours/i.test(m.id + ' ' + m.label) && !/w\/o|without|only|ablat/i.test(m.label);
  const kfmt = (v) => (v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : String(v));

  function colors(fig) {
    const out = {}; let k = 0;
    fig.methods.forEach((m) => { out[m.id] = m.color || (isOurs(m) ? OURS : PALETTE[k++ % PALETTE.length]); });
    return out;
  }
  function yScaleMax(fig) {
    let mx = 0;
    fig.panels.forEach((p) => Object.values(p.series).forEach((s) => (s.hi || s.mean).forEach((v) => { mx = Math.max(mx, v); })));
    return mx <= 1.0001 ? 1 : 100;
  }
  function nice(maxX) {
    const steps = [1, 2, 2.5, 5, 10];
    const raw = maxX / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const st = steps.map((s) => s * mag).find((s) => s >= raw) || raw;
    const t = []; for (let v = 0; v <= maxX + 1e-9; v += st) t.push(v); return t;
  }
  function interp(xs, ys, x) {
    if (x <= xs[0]) return ys[0]; const n = xs.length; if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    return ys[lo] + (ys[hi] - ys[lo]) * (x - xs[lo]) / (xs[hi] - xs[lo]);
  }

  function legend(host, fig, col, state, onChange) {
    const L = document.createElement('div'); L.className = 'lc-legend'; L.setAttribute('role', 'group'); L.setAttribute('aria-label', 'Methods (click to show or hide)');
    fig.methods.forEach((m) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'lc-key' + (isOurs(m) ? ' is-ours' : '');
      b.innerHTML = `<i style="background:${col[m.id]}"></i>${m.label}`;
      b.setAttribute('aria-pressed', String(state.on[m.id]));
      b.addEventListener('click', () => { state.on[m.id] = !state.on[m.id]; b.setAttribute('aria-pressed', String(state.on[m.id])); onChange(); });
      b.addEventListener('mouseenter', () => { state.hl = m.id; onChange(true); });
      b.addEventListener('mouseleave', () => { state.hl = null; onChange(true); });
      L.appendChild(b);
    });
    host.appendChild(L);
    return L;
  }

  /* one panel: returns {draw(), cross(xval|null)} */
  function panel(box, fig, p, col, state, o) {
    const svg = mk('svg', { class: 'lc-svg', role: 'img', 'aria-label': `${p.title}: ${fig.y_label} vs ${fig.x_label}` }, box);
    const tip = document.createElement('div'); tip.className = 'lc-tip'; tip.hidden = true; box.appendChild(tip);
    const Y1 = state.ymax;
    let g = null;
    const xs = Object.values(p.series)[0].x, X1 = Math.max(...Object.values(p.series).map((s) => s.x[s.x.length - 1]));
    const api = {};
    api.draw = () => {
      const w = Math.max(200, Math.round(box.clientWidth || 260)), h = o.height;
      const pad = { t: 8, r: 10, b: o.compact ? 22 : 34, l: o.ylabel ? 44 : 34 };
      const X = pad.l, Y = pad.t, W = w - pad.l - pad.r, H = h - pad.t - pad.b;
      const px = (x) => X + x / X1 * W, py = (y) => Y + (1 - y / Y1) * H;
      g = { X, Y, W, H, px, py, w, h };
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.innerHTML = '';
      for (const f of [0, 0.25, 0.5, 0.75, 1]) {
        mk('line', { x1: X, x2: X + W, y1: py(f * Y1), y2: py(f * Y1), stroke: f ? '#eef1f5' : '#d9dee6' }, svg);
        if (f === 0 || f === 0.5 || f === 1) mk('text', { x: X - 6, y: py(f * Y1) + 4, 'text-anchor': 'end', class: 'lc-tick' }, svg).textContent = Math.round(f * Y1);
      }
      const ticks = nice(X1);
      ticks.forEach((t, i) => { if (o.compact && i % 2) return; mk('text', { x: px(t), y: Y + H + 15, 'text-anchor': i === 0 ? 'start' : t >= X1 * 0.98 ? 'end' : 'middle', class: 'lc-tick' }, svg).textContent = (o.xfmt || kfmt)(t); });
      if (!o.compact) mk('text', { x: X + W / 2, y: h - 2, 'text-anchor': 'middle', class: 'lc-axis' }, svg).textContent = fig.x_label;
      if (o.ylabel) mk('text', { x: 9, y: Y + H / 2, 'text-anchor': 'middle', class: 'lc-axis', transform: `rotate(-90 9 ${Y + H / 2})` }, svg).textContent = o.ylabel;
      const order = fig.methods.map((m) => m.id).sort((a, b) => (a === state.top) - (b === state.top));
      for (const id of order) {
        const s = p.series[id]; if (!s || !state.on[id]) continue;
        const dim = state.hl && state.hl !== id ? 0.18 : 1;
        if (s.lo && s.hi) {
          const cl = (v) => Math.max(0, Math.min(Y1, v));
          const up = s.x.map((x, i) => `${px(x).toFixed(1)},${py(cl(s.hi[i])).toFixed(1)}`);
          const dn = s.x.map((x, i) => `${px(x).toFixed(1)},${py(cl(s.lo[i])).toFixed(1)}`).reverse();
          mk('polygon', { points: up.concat(dn).join(' '), fill: col[id], opacity: 0.12 * dim }, svg);
        }
        const d = s.x.map((x, i) => (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(s.mean[i]).toFixed(1)).join('');
        mk('path', { d, fill: 'none', stroke: col[id], 'stroke-width': id === state.top ? 2.6 : 1.8, opacity: dim, 'stroke-linejoin': 'round', class: 'lc-line' }, svg);
      }
      g.cursor = mk('line', { y1: Y, y2: Y + H, stroke: '#667993', 'stroke-dasharray': '3 3', opacity: 0 }, svg);
      g.dots = mk('g', {}, svg);
    };
    api.cross = (xv) => {
      if (!g) return;
      g.dots.innerHTML = '';
      if (xv == null) { g.cursor.setAttribute('opacity', 0); tip.hidden = true; return; }
      xv = Math.max(0, Math.min(X1, xv));
      const x = g.px(xv); g.cursor.setAttribute('x1', x); g.cursor.setAttribute('x2', x); g.cursor.setAttribute('opacity', 0.8);
      const rows = [];
      fig.methods.forEach((m) => {
        const s = p.series[m.id]; if (!s || !state.on[m.id]) return;
        const v = interp(s.x, s.mean, xv);
        mk('circle', { cx: x, cy: g.py(v), r: 3.2, fill: col[m.id], stroke: '#fff', 'stroke-width': 1.4 }, g.dots);
        rows.push([m, v]);
      });
      if (o.tooltip === false || !state.tipPanel || state.tipPanel !== p.id) { tip.hidden = true; return; }
      rows.sort((a, b) => b[1] - a[1]);
      tip.innerHTML = `<b>${(o.xfmt || kfmt)(Math.round(xv))} ${o.xunit || 'steps'}</b>` + rows.map(([m, v]) => `<span><i style="background:${col[m.id]}"></i>${m.label}<em>${v.toFixed(1)}</em></span>`).join('');
      tip.hidden = false;
      const bw = box.clientWidth, left = x / g.w * bw;
      tip.style.left = (left > bw * 0.55 ? left - tip.offsetWidth - 10 : left + 10) + 'px';
    };
    const toX = (e) => { const r = svg.getBoundingClientRect(); return ((e.clientX - r.left) / r.width * g.w - g.X) / g.W * X1; };
    svg.addEventListener('pointermove', (e) => { state.tipPanel = p.id; state.sync(toX(e) / X1); });
    svg.addEventListener('pointerleave', () => { state.tipPanel = null; state.sync(null); });
    if (o.onPanel) { box.classList.add('is-clickable'); svg.addEventListener('click', () => o.onPanel(p)); }
    api.X1 = X1;
    return api;
  }

  function toPct(fig) {
    if (fig._pct) return fig;
    const f = yScaleMax(fig) === 1 ? 100 : 1;
    const sc = (a) => a && a.map((v) => v * f);
    const out = Object.assign({}, fig, { _pct: true, panels: fig.panels.map((p) => Object.assign({}, p, { series: Object.fromEntries(Object.entries(p.series).map(([k, s]) => [k, { x: s.x, mean: sc(s.mean), lo: sc(s.lo), hi: sc(s.hi) }])) })) });
    return out;
  }

  function grid(host, fig, o) {
    fig = toPct(fig);
    o = Object.assign({ cols: 4, height: 190, legend: true, tooltip: true }, o);
    const col = colors(fig);
    const state = { on: {}, hl: null, top: (fig.methods.find(isOurs) || {}).id, ymax: 100, tipPanel: null };
    fig.methods.forEach((m) => { state.on[m.id] = !o.methods || o.methods.includes(m.id); });
    host.classList.add('lc');
    host.innerHTML = '';
    const panels = (o.panels ? o.panels.map((id) => fig.panels.find((p) => p.id === id)) : fig.panels).filter(Boolean);
    const apis = [];
    const redraw = (light) => { apis.forEach((a) => a.draw()); if (state.last != null) state.sync(state.last); };
    if (o.legend) legend(host, fig, col, state, redraw);
    const G = document.createElement('div'); G.className = 'lc-grid'; G.style.setProperty('--cols', o.cols); host.appendChild(G);
    state.sync = (f) => { state.last = f; apis.forEach((a) => a.cross(f == null ? null : f * a.X1)); };
    panels.forEach((p) => {
      const cell = document.createElement('figure'); cell.className = 'lc-cell';
      const t = document.createElement('figcaption'); t.className = 'lc-title'; t.textContent = p.title; t.title = p.instruction || p.title;
      cell.appendChild(t);
      const box = document.createElement('div'); box.className = 'lc-box'; cell.appendChild(box);
      G.appendChild(cell);
      apis.push(panel(box, fig, p, col, state, o));
    });
    let lastW = 0;
    new ResizeObserver(() => { const w = G.clientWidth; if (Math.abs(w - lastW) > 2) { lastW = w; redraw(); } }).observe(G);
    redraw();
    return { state, redraw, colors: col };
  }

  function chart(host, fig, panelId, o) {
    o = Object.assign({ height: 300 }, o);
    let cur = panelId, g;
    const make = () => { g = grid(host, fig, Object.assign({}, o, { panels: [cur], cols: 1 })); };
    make();
    return { setPanel(id) { const on = g.state.on; cur = id; make(); Object.assign(g.state.on, on); g.redraw(); host.querySelectorAll('.lc-key').forEach((b, i) => b.setAttribute('aria-pressed', String(on[fig.methods[i].id]))); } };
  }


  /* LC.bars(host, fig, opts): grouped bars (one group per panel), whiskers = mean ± sd, hover a bar for its runs.
     fig.panels[].series[mid] = {mean, sd, whisker:[lo,hi], runs_successes_of_20:[...]}   opts: {panels, height, legend} */
  function bars(host, fig, o) {
    o = Object.assign({ height: 300, legend: true }, o);
    const col = colors(fig);
    const state = { on: {}, hl: null };
    fig.methods.forEach((m) => { state.on[m.id] = true; });
    host.classList.add('lc', 'lc-bars'); host.innerHTML = '';
    const panels = (o.panels ? o.panels.map((id) => fig.panels.find((p) => p.id === id)) : fig.panels).filter(Boolean);
    const box = document.createElement('div'); box.className = 'lc-box';
    const svg = mk('svg', { class: 'lc-svg', role: 'img', 'aria-label': fig.caption || 'Success rates' }, box);
    const tip = document.createElement('div'); tip.className = 'lc-tip'; tip.hidden = true; box.appendChild(tip);
    const draw = () => {
      const w = Math.max(300, Math.round(box.clientWidth || 600)), h = o.height, narrow = w < 560;
      const pad = { t: 22, r: 6, b: narrow ? 46 : 34, l: 34 };
      const X = pad.l, Y = pad.t, W = w - pad.l - pad.r, H = h - pad.t - pad.b;
      const py = (v) => Y + (1 - Math.min(110, v) / 100) * H;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.innerHTML = '';
      for (const v of [0, 25, 50, 75, 100]) {
        mk('line', { x1: X, x2: X + W, y1: py(v), y2: py(v), stroke: v ? '#eef1f5' : '#d9dee6' }, svg);
        mk('text', { x: X - 6, y: py(v) + 4, 'text-anchor': 'end', class: 'lc-tick' }, svg).textContent = v;
      }
      const ms = fig.methods.filter((m) => state.on[m.id]);
      const gw = W / panels.length, bw = Math.min(26, (gw * 0.78) / Math.max(1, ms.length));
      panels.forEach((p, gi) => {
        const cx = X + gw * (gi + 0.5), x0 = cx - (bw * ms.length) / 2;
        const lab = mk('text', { x: cx, y: Y + H + 16, 'text-anchor': 'middle', class: 'lc-axis lc-group' }, svg);
        if (narrow) { const [a, ...b] = p.title.split(' '); lab.textContent = a; mk('text', { x: cx, y: Y + H + 30, 'text-anchor': 'middle', class: 'lc-axis' }, svg).textContent = b.join(' '); }
        else lab.textContent = p.title;
        ms.forEach((m, k) => {
          const s = p.series[m.id], x = x0 + k * bw, dim = state.hl && state.hl !== m.id ? 0.25 : 1;
          const r = mk('rect', { x: x + 1, y: py(s.mean), width: bw - 2, height: Math.max(0.5, py(0) - py(s.mean)), rx: 2, fill: col[m.id], opacity: dim, class: 'lc-bar' }, svg);
          const [lo, hi] = s.whisker || [s.mean - s.sd, s.mean + s.sd];
          mk('line', { x1: x + bw / 2, x2: x + bw / 2, y1: py(Math.max(0, lo)), y2: py(hi), stroke: '#3d4652', 'stroke-width': 1, opacity: dim }, svg);
          const hit = mk('rect', { x, y: Y, width: bw, height: H, fill: 'transparent' }, svg);
          hit.addEventListener('pointerenter', () => {
            const runs = (s.runs_successes_of_20 || []).map((n) => n + '/20').join(', ');
            tip.innerHTML = `<b>${p.title}</b><span><i style="background:${col[m.id]}"></i>${m.label}<em>${(+s.mean).toFixed(1)}%</em></span>` + (runs ? `<span class="lc-runs">Runs: ${runs}</span>` : '');
            tip.hidden = false;
            const left = (x + bw / 2) / w * box.clientWidth;
            tip.style.left = (left > box.clientWidth * 0.6 ? left - tip.offsetWidth - 8 : left + 8) + 'px';
          });
          hit.addEventListener('pointerleave', () => { tip.hidden = true; });
        });
      });
    };
    if (o.legend) legend(host, fig, col, state, draw);
    host.appendChild(box);
    let lastW = 0;
    new ResizeObserver(() => { const w = box.clientWidth; if (Math.abs(w - lastW) > 2) { lastW = w; draw(); } }).observe(box);
    draw();
    return { state, redraw: draw };
  }

  window.LC = { grid, chart, bars, colors, kfmt };
})();
