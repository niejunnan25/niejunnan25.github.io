/* Round-10 candidate glue: mounts LC charts from data attributes and adds touch / viewport handling.
   [data-lc-grid]  data-src (file in lc/data), data-cols, data-height, data-xmax (cut x range), data-compact, data-ours (method id drawn as Event2Reward)
   [data-lc-bars]  data-src, data-height
   [data-suite-btn] (k03) table rows that open a suite grid in [data-suite-panel] */
(function () {
  'use strict';
  const OURS = '#2557a7';
  // one colour per baseline across every figure on the page (lc.js palette values)
  const BASE = { Sparse: '#9aa3ae', Robometer: '#c28b3c', 'Robo-Dopamine': '#7a5ea8' };
  const cache = {};
  const load = (f) => (cache[f] ||= fetch('lc/data/' + f).then((r) => r.json()));

  function interp(xs, ys, x) {
    let i = 1; while (i < xs.length && xs[i] < x) i++;
    if (i >= xs.length) return ys[ys.length - 1];
    return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  }
  // cut every series at xmax (adds an interpolated end point when needed); values are untouched
  function cut(fig, xmax) {
    if (!xmax) return fig;
    return Object.assign({}, fig, { panels: fig.panels.map((p) => Object.assign({}, p, { series: Object.fromEntries(Object.entries(p.series).map(([k, s]) => {
      const n = s.x.filter((x) => x <= xmax).length, o = { x: s.x.slice(0, n) };
      for (const key of ['mean', 'lo', 'hi']) if (s[key]) o[key] = s[key].slice(0, n);
      if (s.x[n - 1] < xmax && n < s.x.length) { o.x.push(xmax); for (const key of ['mean', 'lo', 'hi']) if (s[key]) o[key].push(interp(s.x, s[key], xmax)); }
      return [k, o];
    })) })) });
  }
  function prep(fig, el) {
    fig = cut(fig, +el.dataset.xmax || 0);
    const ours = el.dataset.ours;
    fig = Object.assign({}, fig, { methods: fig.methods.map((m) => (m.id === ours ? Object.assign({}, m, { color: OURS }) : BASE[m.label.split(' (')[0]] ? Object.assign({}, m, { color: BASE[m.label.split(' (')[0]] }) : m)) });
    return fig;
  }
  function markOurs(el) {
    const id = el.dataset.ours; if (!id) return;
    load(el.dataset.src).then((fig) => {
      const i = fig.methods.findIndex((m) => m.id === id);
      const k = el.querySelectorAll('.lc-key')[i]; if (k) k.classList.add('is-ours');
    });
  }

  /* touch: a tap shows the tooltip of that panel; it stays until the next tap elsewhere */
  function touchify(host) {
    host.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') e.stopPropagation(); }, true);
    host.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      const svg = e.target.closest('.lc-svg'); if (!svg || svg.closest('.lc-bars')) return;
      clearOthers(svg);
      svg.dispatchEvent(new PointerEvent('pointermove', { clientX: e.clientX, clientY: e.clientY, pointerType: 'touch', bubbles: true }));
    });
    // keep tooltips inside the viewport
    const clamp = () => requestAnimationFrame(() => host.querySelectorAll('.lc-tip:not([hidden])').forEach((t) => {
      const r = t.getBoundingClientRect(), vw = document.documentElement.clientWidth;
      let dx = 0; if (r.right > vw - 6) dx = vw - 6 - r.right; if (r.left + dx < 6) dx = 6 - r.left;
      if (dx) t.style.left = (parseFloat(t.style.left) || 0) + dx + 'px';
    }));
    host.addEventListener('pointermove', clamp); host.addEventListener('pointerover', clamp); host.addEventListener('pointerdown', clamp);
  }
  let lastTouched = null;
  function clearOthers(keep) {
    if (lastTouched && lastTouched !== keep) {
      if (lastTouched.matches('.lc-svg') && !lastTouched.closest('.lc-bars')) lastTouched.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
      else { const t = lastTouched.closest('.lc-box') && lastTouched.closest('.lc-box').querySelector('.lc-tip'); if (t) t.hidden = true; }
    }
    lastTouched = keep;
  }
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const svg = e.target.closest('.lc-svg');
    if (!svg) clearOthers(null); else if (svg.closest('.lc-bars')) clearOthers(svg);
  });

  function mountGrid(el) {
    return load(el.dataset.src).then((fig) => {
      const g = LC.grid(el, prep(fig, el), { cols: +el.dataset.cols || 4, height: (innerWidth <= 520 && +el.dataset.heightMobile) || +el.dataset.height || 190, compact: el.hasAttribute('data-compact') });
      markOurs(el); touchify(el); el.dataset.ready = '1';
      return g;
    });
  }
  /* bars: one chart of all tasks; below 560 px two stacked charts (3 tasks each) sharing the first legend */
  function mountBars(el) {
    return load(el.dataset.src).then((raw) => {
      const fig = prep(raw, el), h = +el.dataset.height || 300;
      let mode = null;
      const build = () => {
        const narrow = el.clientWidth < 560;
        if (narrow === mode) return; mode = narrow;
        el.innerHTML = ''; el.classList.toggle('is-split', narrow);
        const ids = fig.panels.map((p) => p.id);
        const groups = narrow ? [ids.slice(0, Math.ceil(ids.length / 2)), ids.slice(Math.ceil(ids.length / 2))] : [ids];
        const parts = groups.map((g, i) => {
          const d = document.createElement('div'); d.className = 'cand-bars-part'; el.appendChild(d);
          const api = LC.bars(d, fig, { height: narrow ? Math.round(h * 0.8) : h, panels: g });
          if (i) d.querySelector('.lc-legend').style.display = 'none';
          return d;
        });
        if (parts.length > 1) {
          const keys = (d) => [...d.querySelectorAll('.lc-key')];
          keys(parts[0]).forEach((k, i) => {
            k.addEventListener('click', () => parts.slice(1).forEach((d) => keys(d)[i].click()));
            k.addEventListener('mouseenter', () => parts.slice(1).forEach((d) => keys(d)[i].dispatchEvent(new MouseEvent('mouseenter'))));
            k.addEventListener('mouseleave', () => parts.slice(1).forEach((d) => keys(d)[i].dispatchEvent(new MouseEvent('mouseleave'))));
          });
        }
        el.dataset.ready = '1';
      };
      build(); touchify(el);
      new ResizeObserver(() => build()).observe(el);
      return fig;
    });
  }
  // text filled from data (never typed by hand)
  function fillFacts() {
    document.querySelectorAll('[data-fact]').forEach((n) => {
      const [file, what] = n.dataset.fact.split(':');
      load(file).then((fig) => {
        const s = Object.values(fig.panels[0].series)[0];
        const key = Object.keys(s).find((q) => /^runs_successes_of_\d+$/.test(q));
        if (what === 'runs') n.textContent = String(s[key].length);
        if (what === 'episodes') n.textContent = key.match(/\d+$/)[0];
      });
    });
  }

  /* k03: suite rows open the suite grid beneath the table */
  function suites() {
    const btns = [...document.querySelectorAll('[data-suite-btn]')];
    if (!btns.length) return;
    const panel = document.querySelector('[data-suite-panel]');
    const host = panel.querySelector('[data-suite-grid]'), title = panel.querySelector('[data-suite-title]');
    let open = null;
    const set = (b) => {
      btns.forEach((x) => { const on = x === b; x.setAttribute('aria-expanded', String(on)); x.closest('tr').classList.toggle('is-open', on); });
      if (!b) { panel.hidden = true; open = null; return; }
      open = b; panel.hidden = false; title.textContent = b.dataset.label;
      host.dataset.src = b.dataset.src; host.dataset.xmax = b.dataset.xmax || ''; host.dataset.suite = b.dataset.suite;
      mountGrid(host);
    };
    btns.forEach((b) => {
      b.addEventListener('click', (e) => { e.stopPropagation(); set(open === b ? null : b); });
      b.closest('tr').addEventListener('click', () => b.click());
    });
    panel.querySelector('[data-suite-close]').addEventListener('click', () => { const b = open; set(null); if (b) b.focus(); });
  }

  function init() {
    document.querySelectorAll('[data-lc-grid]').forEach(mountGrid);
    document.querySelectorAll('[data-lc-bars]').forEach(mountBars);
    fillFacts(); suites();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
