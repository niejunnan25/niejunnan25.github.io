/* Event2Reward homepage: progress-curve helpers for the real-robot episodes (data: assets/rv/rv-data.js). */
(function () {
  'use strict';
  const D = window.E2R_RP;
  const R = window.E2R_REAL;
  const NS = 'http://www.w3.org/2000/svg';
  const BASE = 'assets/rv/';
  const CURVE = {
    pred: { color: '#2557a7', width: 2.6, label: 'Event2Reward progress' },
    ref: { color: '#1d232b', width: 1.6, dash: '5 4', label: 'Annotated task progress' },
    time: { color: '#a0a8b4', width: 1.8, dash: '2 4', label: 'Normalized-time label' }
  };
  const BAND = {
    stall: { fill: '#d5a76a', op: 0.17, label: 'Progress stall' },
    regress: { fill: '#c2413b', op: 0.13, label: 'Regression' },
    recover: { fill: '#2f8f5b', op: 0.13, label: 'Recovery' },
    nofurther: { fill: '#8a93a0', op: 0.14, label: 'No further progress' }
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clip = (id) => D.clips[id];
  const realClip = (id) => R.clips.find((c) => c.id === id);
  const fmt = (t) => (t < 10 ? t.toFixed(1) : Math.round(t)) + '';

  function interp(pts, t) {
    if (!pts || !pts.length) return 0;
    if (t <= pts[0][0]) return pts[0][1];
    let lo = 0, hi = pts.length - 1;
    if (t >= pts[hi][0]) return pts[hi][1];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= t) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi];
    return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function chart(svg, id, opts) {
    const c = clip(id);
    let o, X, Y, W, H, cursor, dot, dot2, readout, lines = {};
    const api = { id, dur: c.dur, value: (t, k) => interp(c[k || 'pred'], t), listeners: [] };
    function draw(nopts) {
      o = Object.assign({
        w: 640, h: 280, pad: [26, 14, 40, 46], curves: ['pred'], bands: true, markers: true, axes: true,
        xlabel: 'Time (s, real time)', grid: [0, 0.25, 0.5, 0.75, 1], fill: false, interactive: true,
        markerSize: 12, tickSize: 12, endLabel: false, ylabel: false
      }, opts, nopts || {});
      opts = o;
      const [pt, pr, pb, pl] = o.pad;
      X = pl; Y = pt; W = o.w - pl - pr; H = o.h - pt - pb;
      svg.setAttribute('viewBox', `0 0 ${o.w} ${o.h}`);
      svg.setAttribute('preserveAspectRatio', 'none' === o.aspect ? 'none' : 'xMidYMid meet');
      svg.innerHTML = '';
      svg.classList.add('rp-chart');
      const px = (t) => X + Math.max(0, Math.min(c.dur, t)) / c.dur * W;
      const py = (p) => Y + (1 - Math.max(0, Math.min(1, p))) * H;
      api.px = px; api.py = py;
      if (o.bands) for (const b of c.bands) {
        const s = BAND[b.type]; if (!s) continue;
        const r = el('rect', { x: px(b.t0), y: Y, width: Math.max(1.5, px(b.t1) - px(b.t0)), height: H, fill: s.fill, opacity: s.op, class: 'rp-band rp-band-' + b.type }, svg);
        const ti = el('title', {}, r); ti.textContent = s.label + (b.what ? ': ' + b.what : '');
      }
      if (o.axes) {
        for (const p of o.grid) {
          el('line', { x1: X, x2: X + W, y1: py(p), y2: py(p), stroke: '#e9edf3' }, svg);
          const tx = el('text', { x: X - 9, y: py(p) + 4, 'text-anchor': 'end', fill: '#7b8492', 'font-size': o.tickSize }, svg);
          tx.textContent = p === 0 || p === 1 ? p : p.toFixed(2);
        }
        const step = c.dur > 40 ? 20 : c.dur > 20 ? 10 : c.dur > 8 ? 5 : 2;
        for (let t = 0; t <= c.dur + 0.01; t += step) {
          const tx = el('text', { x: px(t), y: Y + H + 20, 'text-anchor': 'middle', fill: '#7b8492', 'font-size': o.tickSize }, svg);
          tx.textContent = t;
        }
        if (o.xlabel) { const tx = el('text', { x: X + W / 2, y: o.h - 3, 'text-anchor': 'middle', fill: '#7b8492', 'font-size': o.tickSize }, svg); tx.textContent = o.xlabel; }
        if (o.ylabel) { const tx = el('text', { x: 12, y: Y + H / 2, 'text-anchor': 'middle', fill: '#7b8492', 'font-size': o.tickSize, transform: `rotate(-90 12 ${Y + H / 2})` }, svg); tx.textContent = o.ylabel; }
      } else {
        el('line', { x1: X, x2: X + W, y1: py(0), y2: py(0), stroke: '#dfe4eb' }, svg);
        el('line', { x1: X, x2: X + W, y1: py(1), y2: py(1), stroke: '#eef1f5', 'stroke-dasharray': '3 3' }, svg);
      }
      for (const k of o.curves) {
        const pts = c[k]; if (!pts) continue;
        const s = Object.assign({}, CURVE[k], (o.style || {})[k]);
        const d = pts.map((p, i) => (i ? 'L' : 'M') + px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1)).join('');
        if (o.fill && k === o.curves[0]) el('path', { d: d + `L${px(c.dur)} ${py(0)}L${X} ${py(0)}Z`, fill: s.color, opacity: 0.08 }, svg);
        lines[k] = el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.width, 'stroke-dasharray': s.dash || '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'rp-line rp-line-' + k }, svg);
      }
      if (o.markers) {
        const used = [];
        for (const m of c.markers) {
          const x = px(m.t);
          el('line', { x1: x, x2: x, y1: Y, y2: Y + H, stroke: m.kind === 'bad' ? '#c2413b' : '#8a96a8', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.7 }, svg);
          // label row: alternate rows when labels would overlap
          const wEst = m.label.length * o.markerSize * 0.56 + 6;
          let row = 0; while (used.some((u) => u.row === row && Math.abs(u.x - x) < (u.w + wEst) / 2)) row++;
          used.push({ x, w: wEst, row });
          const anchor = x + wEst / 2 > X + W ? 'end' : x - wEst / 2 < X ? 'start' : 'middle';
          const tx = el('text', { x: anchor === 'end' ? Math.min(x, X + W) : anchor === 'start' ? Math.max(x, X) : x, y: Y - 8 - row * (o.markerSize + 3), 'text-anchor': anchor, fill: m.kind === 'bad' ? '#a3332e' : '#4d5868', 'font-size': o.markerSize, class: 'rp-marker', 'data-t': m.t }, svg);
          tx.textContent = m.label;
        }
      }
      cursor = el('line', { x1: X, x2: X, y1: Y, y2: Y + H, stroke: '#667993', 'stroke-width': 1, 'stroke-dasharray': '4 4', class: 'rp-cursor' }, svg);
      const main = o.curves[0];
      dot = el('circle', { cx: X, cy: py(interp(c[main], 0)), r: o.dotR || 5.5, fill: (CURVE[main] || {}).color || '#2557a7', stroke: '#fff', 'stroke-width': 2, class: 'rp-dot' }, svg);
      if (o.endLabel) {
        const v = c[main].at(-1)[1];
        const tx = el('text', { x: X + W + 4, y: py(v) + 4, fill: '#2557a7', 'font-size': o.tickSize, 'font-weight': 600 }, svg); tx.textContent = v.toFixed(2);
      }
      api.set(api.t || 0);
    }
    api.set = function (t) {
      api.t = Math.max(0, Math.min(c.dur, t));
      const x = api.px(api.t), main = o.curves[0], v = interp(c[main], api.t);
      cursor.setAttribute('x1', x); cursor.setAttribute('x2', x);
      dot.setAttribute('cx', x); dot.setAttribute('cy', api.py(v));
      svg.setAttribute('aria-valuenow', api.t.toFixed(1));
      svg.setAttribute('aria-valuetext', `${api.t.toFixed(1)} s, progress ${v.toFixed(2)}`);
      api.listeners.forEach((f) => f(api.t, v));
    };
    api.on = (f) => api.listeners.push(f);
    api.redraw = draw;
    draw();
    if (o.interactive) {
      svg.setAttribute('role', 'slider'); svg.setAttribute('tabindex', '0');
      svg.setAttribute('aria-label', 'Episode time. Drag or use the arrow keys to move through the video.');
      svg.setAttribute('aria-valuemin', '0'); svg.setAttribute('aria-valuemax', c.dur.toFixed(1));
      let drag = false;
      const toT = (e) => { const r = svg.getBoundingClientRect(); const sx = (e.clientX - r.left) / r.width * o.w; return (sx - X) / W * c.dur; };
      svg.addEventListener('pointerdown', (e) => { e.preventDefault(); drag = true; svg.setPointerCapture(e.pointerId); api.seek && api.seek(toT(e), 'down'); });
      svg.addEventListener('pointermove', (e) => { if (drag) api.seek && api.seek(toT(e), 'move'); });
      svg.addEventListener('pointerup', (e) => { if (drag) { drag = false; api.seek && api.seek(toT(e), 'up'); } });
      svg.addEventListener('pointercancel', () => { drag = false; });
      svg.addEventListener('keydown', (e) => {
        const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', ' '].includes(k)) return;
        e.preventDefault();
        if (k === ' ') { api.toggle && api.toggle(); return; }
        const step = e.shiftKey ? c.dur / 10 : Math.max(0.2, c.dur / 60);
        api.seek && api.seek(k === 'Home' ? 0 : k === 'End' ? c.dur : api.t + (k === 'ArrowRight' ? step : -step), 'key');
      });
    }
    return api;
  }

  function src(id, kind) { return BASE + (kind || 'full') + '/' + id + (kind === 'poster' || kind === 'end' ? '.jpg' : '.mp4'); }

  function video(id, cls) {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.poster = src(id, 'poster'); v.src = src(id, 'full');
    v.className = cls || 'rp-video';
    const cc = clip(id) || realClip(id) || {};
    v.setAttribute('aria-label', `${cc.task_name || id}, ${cc.outcome || ''} episode`);
    return v;
  }

  /* sync a video (1x file, played at `speed`) with charts; returns controller */
  function bind(v, charts, o) {
    o = Object.assign({ speed: null, loop: true, hold: 1.4, onTime: null }, o);
    charts = [].concat(charts);
    const id = charts[0].id, c = clip(id);
    const speed = () => o.speed || c.speed;
    let raf = 0, holdT = 0, userPaused = false;
    const ctl = { video: v, charts, playing: false, userPaused: false };
    function tick() {
      const t = v.currentTime;
      charts.forEach((ch) => ch.set(t));
      o.onTime && o.onTime(t, interp(c.pred, t));
      if (!v.paused) raf = requestAnimationFrame(tick);
    }
    function ensure() { if (v.preload === 'none') { v.preload = 'auto'; v.load(); } }
    ctl.seek = function (t, phase) {
      ensure();
      if (phase === 'down' || phase === 'key') { ctl.wasPlaying = !v.paused; v.pause(); }
      t = Math.max(0, Math.min(c.dur, t));
      charts.forEach((ch) => ch.set(t));
      o.onTime && o.onTime(t, interp(c.pred, t));
      const apply = () => { try { v.currentTime = Math.min(t, (v.duration || c.dur) - 0.04); } catch (e) {} };
      if (v.readyState >= 1) apply(); else v.addEventListener('loadedmetadata', apply, { once: true });
    };
    ctl.play = function () {
      ensure(); v.playbackRate = speed(); clearTimeout(holdT);
      if (v.ended || v.currentTime >= c.dur - 0.05) v.currentTime = 0;
      const p = v.play(); if (p && p.catch) p.catch(() => {});
    };
    ctl.pause = function () { clearTimeout(holdT); v.pause(); };
    ctl.toggle = function () { if (v.paused) { ctl.userPaused = false; ctl.play(); } else { ctl.userPaused = true; ctl.pause(); } };
    ctl.setSpeed = function (s) { o.speed = s; v.playbackRate = s; };
    charts.forEach((ch) => { ch.seek = ctl.seek; ch.toggle = ctl.toggle; });
    v.addEventListener('play', () => { v.playbackRate = speed(); ctl.playing = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); o.onState && o.onState(true); });
    v.addEventListener('pause', () => { ctl.playing = false; tick(); o.onState && o.onState(false); });
    v.addEventListener('seeked', tick);
    v.addEventListener('loadedmetadata', () => { v.playbackRate = speed(); });
    v.addEventListener('ended', () => {
      tick();
      if (o.loop && !ctl.userPaused && ctl.visible !== false) holdT = setTimeout(() => { if (ctl.visible !== false && !ctl.userPaused) { v.currentTime = 0; ctl.play(); } }, o.hold * 1000);
    });
    v.addEventListener('click', ctl.toggle);
    return ctl;
  }

  /* play while >= 50 % visible; a user's pause sticks until the block leaves the screen */
  function autoplay(ctl, target) {
    if (reduce) { ctl.visible = true; return; }
    new IntersectionObserver((es) => {
      for (const e of es) {
        const vis = e.isIntersecting && e.intersectionRatio >= 0.5;
        ctl.visible = vis;
        if (vis && !ctl.userPaused) ctl.play();
        else if (!vis) { ctl.pause(); ctl.userPaused = false; }
      }
    }, { threshold: [0, 0.5, 1] }).observe(target || ctl.video);
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctl.pause(); else if (ctl.visible && !ctl.userPaused) ctl.play(); });
  }

  /* complete block: video + chart + readout + controls */
  function unit(host, id, o) {
    o = Object.assign({ layout: 'side', curves: ['pred'], autoplay: true, controls: true, legend: true, readout: true, chart: {} }, o);
    const c = clip(id) || (function () { const r = realClip(id); return r && { id, task_name: r.task_name, outcome: r.outcome, dur: r.dur_1x, speed: r.loop_speed, missing: true }; })();
    if (c && c.missing) {
      host.classList.add('rp-unit', 'rp-' + o.layout, 'rp-' + c.outcome);
      host.innerHTML = '';
      const vw = document.createElement('div'); vw.className = 'rp-vwrap'; const v = video(id); v.controls = true; vw.appendChild(v);
      const p = document.createElement('p'); p.className = 'rp-pending'; p.textContent = 'Curve pending.'; host.append(vw, p);
      return { ctl: null, chart: null, video: v, clip: c, host, missing: true };
    }
    host.classList.add('rp-unit', 'rp-' + o.layout, 'rp-' + c.outcome);
    host.innerHTML = '';
    const vw = document.createElement('div'); vw.className = 'rp-vwrap';
    const v = video(id); vw.appendChild(v);
    const badge = document.createElement('span'); badge.className = 'rp-badge rp-badge-' + c.outcome; badge.textContent = c.outcome === 'success' ? 'Success' : 'Failure'; vw.appendChild(badge);
    const sp = document.createElement('span'); sp.className = 'rp-speed'; sp.textContent = c.speed + '×'; vw.appendChild(sp);
    const ov = document.createElement('span'); ov.className = 'rp-ov'; ov.setAttribute('aria-hidden', 'true'); vw.appendChild(ov);
    const plot = document.createElement('div'); plot.className = 'rp-plot';
    let head = null, valEl = null;
    if (o.readout || o.legend) {
      head = document.createElement('div'); head.className = 'rp-head';
      if (o.legend) head.innerHTML = o.curves.map((k) => `<span class="rp-key rp-key-${k}"><i></i>${CURVE[k].label}</span>`).join('');
      if (o.readout) { valEl = document.createElement('output'); valEl.className = 'rp-val'; valEl.textContent = '0.00'; head.appendChild(valEl); }
      plot.appendChild(head);
    }
    const svg = document.createElementNS(NS, 'svg'); plot.appendChild(svg);
    const ch = chart(svg, id, Object.assign({ curves: o.curves }, o.chart));
    if (valEl) ch.on((t, p) => { valEl.textContent = p.toFixed(2); });
    host.appendChild(vw); host.appendChild(plot);
    let bar = null, btn = null, tm = null;
    const ctl = bind(v, ch, { speed: o.speed, onState: (on) => { host.classList.toggle('is-playing', on); if (btn) { btn.textContent = on ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', String(on)); } } });
    if (o.controls) {
      bar = document.createElement('div'); bar.className = 'rp-bar';
      btn = document.createElement('button'); btn.type = 'button'; btn.className = 'small-button rp-play'; btn.textContent = 'Play';
      btn.addEventListener('click', ctl.toggle);
      tm = document.createElement('output'); tm.className = 'rp-time';
      const upd = (t) => { tm.textContent = `${t.toFixed(1)} / ${c.dur.toFixed(1)} s`; };
      ch.on(upd); upd(0);
      const note = document.createElement('span'); note.className = 'rp-speednote'; note.textContent = `Plays at ${c.speed}×`;
      bar.append(btn, tm, note);
      host.appendChild(bar);
    }
    if (o.autoplay) autoplay(ctl, host);
    return { ctl, chart: ch, video: v, clip: c, host };
  }

  window.RP = { data: D, chart, bind, autoplay, unit, video, src, interp, clip, realClip, CURVE, BAND, reduce, fmt };
})();
