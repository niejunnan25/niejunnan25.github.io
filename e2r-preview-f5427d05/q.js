/* q51-q55 shared helpers (window.QM): Q09 results-first + Q14 live clock.
   Every number comes from window.PLUG (media/timeline.js); paper reference = PLUG.sparseMinutes.
   - QM.film(root, {media, stage, label}): plug.js film, opened paused at the criterion (poster, bar complete, clock 15:16);
     no autoplay until the first play, then it plays while >= 50 % visible (unless the reader paused).
     Nothing is drawn on the footage: plug.js's centre icon and hit area are hidden (CSS); a click on the video toggles.
   - QM.bind(root, film): fills [data-q=clock|sub|phase|trial|n|streak|k|crit|sparse] inside root on every tick.
   - QM.toggle(host, film), QM.buttons(host, film): play/pause and the three result buttons.
   - QM.bar(host, film, {mode:'dur'|'axis', axisMax}): to-scale trial bar (plug-tile classes, so the shared tests apply).
       'dur'  tile width = trial duration (clock end - start), equal small gaps;
       'axis' tiles placed on a clock axis 0..axisMax: trial k spans its start to trial k+1's start.
   - QM.ruler(host, film): static 0-45 min tick ruler, Event2Reward 15:16 (blue) and Sparse rewards 45 min (grey tick). */
(function () {
  'use strict';
  var P = window.PLUG, T = P.trials, N = T.length;
  var firstAuto = T.findIndex(function (t) { return t.phase === 'autonomous'; });   // index of trial 11
  var streakFrom = N - P.streak;                                                   // index of trial 28
  var dur = function (t) { return t.clock.end - t.clock.start; };
  var kind = function (t) { return t.phase === 'warmup' ? 'warmup' : (t.success ? 'success' : 'fail'); };
  var SUM = T.reduce(function (a, t) { return a + dur(t); }, 0);
  var CRIT = P.criterion.clock, SPARSE = P.sparseMinutes * 60;
  var ICON = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3.2v11H3.5zM9.3 2.5h3.2v11H9.3z"/></svg>',
    replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5a5.5 5.5 0 1 1-5.2 3.7l1.6.6A3.8 3.8 0 1 0 8 4.2v2.3L4.6 3.4 8 .3z"/></svg>'
  };
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function mss(c) { c = Math.max(0, Math.round(c)); var m = Math.floor(c / 60), s = c % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  var narrow = window.matchMedia('(max-width:600px)');

  // ---------- film: results first
  function film(root, o) {
    var f = PlugFilm.mount(root, {
      media: o.media, poster: o.auto ? 'start' : 'criterion', autoplay: false, moments: false, legend: false, label: o.label,
      slots: { stage: o.stage, controls: false, info: false, bar: false, moments: false }
    });
    var v = f.video, reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fresh = !o.auto, played = !!o.auto, want = !!o.auto, visible = false, left = false;
    if (o.auto) f.seek(0);                            // o.auto: start at trial 1 and play while visible (no result-first state)
    else { f.seek(P.criterion.seek_t); root.classList.add('is-fresh'); }  // open on the result: criterion frame, every tile filled, 15:16
    f.isFresh = function () { return fresh; };
    f.leaveFresh = function () { if (fresh) { fresh = false; root.classList.remove('is-fresh'); } };
    f.atEnd = function () { return v.ended || v.currentTime >= P.duration - 0.05; };
    f.watch = function () { f.leaveFresh(); f.seek(0); f.play(); };
    f.toggleRun = function () { if (fresh) return f.watch(); f.toggle(); };
    v.addEventListener('play', function () { played = true; want = true; f.leaveFresh(); });
    v.addEventListener('pause', function () { if (visible) want = false; });        // off-screen pauses keep `want`
    v.addEventListener('ended', function () { want = false; });
    v.addEventListener('click', function () { f.toggleRun(); });
    v.style.cursor = 'pointer';
    root.addEventListener('keydown', function (e) {       // space on the fresh page starts from trial 1, not the end hold
      if ((e.key === ' ' || e.code === 'Space') && fresh && !/^(BUTTON|A)$/.test(e.target.tagName)) { e.preventDefault(); e.stopPropagation(); f.watch(); }
    }, true);
    // after the first play: normal autoplay rules (play while >= 50 % visible, never under reduced motion)
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        visible = en.isIntersecting && en.intersectionRatio >= 0.5;
        if (!en.isIntersecting) left = true;
        if (o.auto && visible && left && f.atEnd() && !reduce) { left = false; want = true; f.seek(0); }  // seen again after the end: replay
        if (visible && played && want && !reduce && v.paused && !f.atEnd()) f.play();
      });
    }, { threshold: [0, 0.5] }).observe(v);
    window.film = f;
    return f;
  }

  // ---------- live text
  function bind(root, f) {
    var q = function (k) { return [].slice.call(root.querySelectorAll('[data-q="' + k + '"]')); };
    var set = function (k, txt) { q(k).forEach(function (n) { if (n.textContent !== txt) n.textContent = txt; }); };
    set('n', String(N)); set('k', String(P.streak)); set('crit', P.criterion.clock_mmss); set('sparse', String(P.sparseMinutes));
    f.on(function (s) {
      if (!s || s.t == null) return;
      set('clock', mss(s.clock));
      set('sub', s.criterion ? 'until ' + P.streak + ' autonomous successes in a row' : 'since trial 1');
      set('phase', s.criterion ? 'Criterion reached' : (s.phase === 'warmup' ? 'Assisted warm-up' : 'Autonomous'));
      set('trial', String(s.trial)); set('streak', String(s.streak));
    });
    q('clock').forEach(function (n) { n.setAttribute('aria-hidden', 'true'); });
  }

  // ---------- play / pause
  function toggle(host, f) {
    var b = el('button', 'qm-toggle', ICON.play); b.type = 'button';
    b.addEventListener('click', function () { f.toggleRun(); });
    var lastK = '';
    f.on(function (s) {
      if (!s || s.t == null) return;
      var k = s.playing ? 'pause' : (f.atEnd() ? 'replay' : 'play');
      if (k === lastK) return; lastK = k;
      b.innerHTML = ICON[k];
      b.setAttribute('aria-label', s.playing ? 'Pause' : (f.isFresh() ? 'Play the whole run from trial 1' : (k === 'replay' ? 'Replay' : 'Play')));
    });
    host.appendChild(b);
    return b;
  }

  // ---------- result buttons: watch from trial 1 / first autonomous success / 10 in a row (trial 37 into the criterion)
  function buttons(host, f, o) {
    o = o || {};
    var box = el('div', 'qm-btns');
    var defs = [
      ['watch', ICON.play + '<span>Watch the whole run</span>', 'qm-btn qm-primary'],
      ['first', '<span>First autonomous success</span>', 'qm-btn'],
      ['crit', '<span>' + P.streak + ' in a row' + (o.critTime === false ? '' : ' · <b>' + P.criterion.clock_mmss + '</b>') + '</span>', 'qm-btn']
    ];
    function act(k) {
      if (k === 'watch') return f.watch();
      f.leaveFresh();
      if (k === 'first') f.seekMoment('first'); else f.seekTrial(N);
      f.play();
    }
    defs.forEach(function (d) {
      var b = el('button', d[2], d[1]); b.type = 'button'; b.dataset.act = d[0];
      b.addEventListener('click', function () {
        // on narrow screens the buttons can sit below the video: bring it into view first (the player pauses off-screen)
        var r = f.video.getBoundingClientRect(), vis = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
        if (vis >= r.height * 0.6) return act(d[0]);
        f.video.scrollIntoView({ block: 'center', behavior: 'instant' });
        requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () { act(d[0]); }, 60); }); });
      });
      box.appendChild(b);
    });
    host.appendChild(box);
    return box;
  }

  // ---------- to-scale trial bar
  function bar(host, f, o) {
    o = o || {};
    var axis = o.mode === 'axis', AX = o.axisMax || CRIT;
    var wrap = el('div', 'qm-tl' + (axis ? ' is-axis' : ''));
    var row = el('div', 'qm-tiles');
    row.tabIndex = 0; row.setAttribute('role', 'slider');
    row.setAttribute('aria-label', 'Trials 1 to ' + N + ', drawn to scale; arrow keys move between trials');
    row.setAttribute('aria-valuemin', '1'); row.setAttribute('aria-valuemax', String(N));
    var tiles = [], fills = [];
    var slotEnd = function (k) { return k + 1 < N ? T[k + 1].clock.start : T[k].clock.end; };
    T.forEach(function (t, k) {
      var b = el('button', 'plug-tile is-' + kind(t) + (k === firstAuto - 1 ? ' is-g1' : '')); b.type = 'button'; b.tabIndex = -1;
      b.dataset.trial = t.trial;
      b.setAttribute('aria-label', 'Trial ' + t.trial + ', ' + (t.phase === 'warmup' ? 'assisted warm-up' : (t.success ? 'autonomous success' : 'autonomous attempt')));
      var i = el('i'); b.appendChild(i); fills.push(i);
      row.appendChild(b); tiles.push(b);
    });
    function place() {
      T.forEach(function (t, k) {
        var b = tiles[k];
        if (axis) {
          b.style.left = (100 * t.clock.start / AX) + '%';
          b.style.width = 'calc(' + (100 * (slotEnd(k) - t.clock.start) / AX) + '% - var(--qm-gap))';
        } else {
          b.style.width = 'calc((100% - ' + (N - 2) + ' * var(--qm-gap) - var(--qm-ggap)) * ' + (dur(t) / SUM).toFixed(6) + ')';
        }
      });
    }
    place();
    wrap.appendChild(row);
    // phase brackets under the tiles
    var ph = el('div', 'qm-phases');
    var PH = [
      ['warm', 0, firstAuto - 1, 'Assisted warm-up', 'Assisted'],
      ['auto', firstAuto, streakFrom - 1, 'Autonomous attempts', 'Autonomous'],
      ['streak', streakFrom, N - 1, P.streak + ' in a row', P.streak + ' in a row']
    ].map(function (d) {
      var s = el('span', 'qm-ph qm-ph-' + d[0], '<em data-long="' + d[3] + '" data-short="' + d[4] + '">' + d[3] + '</em>');
      ph.appendChild(s); return { el: s, a: d[1], b: d[2], long: d[3], short: d[4] };
    });
    wrap.appendChild(ph);
    if (o.legend !== false) {
      var lg = el('div', 'qm-legend',
        '<span><i class="lg-warm"></i><em class="l">assisted warm-up</em><em class="s">assisted</em></span>' +
        '<span><i class="lg-fail"></i><em class="l">autonomous attempt</em><em class="s">attempt</em></span>' +
        '<span><i class="lg-success"></i><em class="l">autonomous success</em><em class="s">success</em></span>' +
        '<span class="qm-scale"><em class="l">' + (axis ? 'tiles placed in time' : 'tile width = time per trial') + '</em><em class="s">' + (axis ? 'placed in time' : 'width = duration') + '</em></span>');
      wrap.appendChild(lg);
    }
    host.appendChild(wrap);
    function layout() {
      PH.forEach(function (p) {
        var l = tiles[p.a].offsetLeft, r = tiles[p.b].offsetLeft + tiles[p.b].offsetWidth;
        p.el.style.left = l + 'px'; p.el.style.width = (r - l) + 'px';
        var em = p.el.firstChild; em.textContent = narrow.matches ? p.short : p.long;
      });
    }
    if (window.ResizeObserver) new ResizeObserver(layout).observe(row); else window.addEventListener('resize', layout);
    layout();
    // live state
    f.on(function (s) {
      if (!s || s.t == null) return;
      for (var k = 0; k < N; k++) {
        var done = k < s.done, cur = (k === s.trial - 1) && !s.criterion;
        tiles[k].classList.toggle('is-done', done);
        tiles[k].classList.toggle('is-current', cur);
        fills[k].style.width = cur && !done ? (s.inTrial * 100) + '%' : '0';
      }
      wrap.classList.toggle('is-criterion', s.criterion);
      row.setAttribute('aria-valuenow', String(s.trial));
    });
    // pointer: click a tile -> that trial's start; drag -> scrub through the trials
    var down = null;
    function tAt(cx) {
      var k = 0;
      for (var j = 0; j < N; j++) { var r = tiles[j].getBoundingClientRect(); if (cx >= r.left) k = j; }
      var rr = tiles[k].getBoundingClientRect(), u = Math.max(0, Math.min(1, (cx - rr.left) / Math.max(1, rr.width)));
      var a = k === 0 ? 0 : T[k].video.start, b = k + 1 < N ? T[k + 1].video.start : T[k].video.end;
      return a + u * (b - a);
    }
    row.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = { x: e.clientX, drag: false, playing: !f.video.paused };
      row.setPointerCapture(e.pointerId);
    });
    row.addEventListener('pointermove', function (e) {
      if (!down) return;
      if (!down.drag && Math.abs(e.clientX - down.x) > 5) { down.drag = true; f.leaveFresh(); if (down.playing) f.video.pause(); }
      if (down.drag) f.seek(tAt(e.clientX));
    });
    row.addEventListener('pointerup', function (e) {
      if (!down) return;
      var d = down; down = null;
      f.leaveFresh();
      if (d.drag) { if (d.playing) f.play(); return; }
      var hit = document.elementFromPoint(e.clientX, e.clientY), tile = hit && hit.closest && hit.closest('.plug-tile');
      if (tile) f.seekTrial(+tile.dataset.trial);
    });
    row.addEventListener('pointercancel', function () { down = null; });
    row.addEventListener('keydown', function (e) {
      var s = f.state(), k = s.criterion ? N : s.trial;
      var go = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (go) { e.preventDefault(); f.leaveFresh(); f.seekTrial(s.criterion && go > 0 ? N : k + go); }
      else if (e.key === 'Home') { e.preventDefault(); f.leaveFresh(); f.seekTrial(1); }
      else if (e.key === 'End') { e.preventDefault(); f.seekMoment('criterion'); }
    });
    return {
      el: wrap, row: row, tiles: tiles, layout: layout,
      setAxisMax: function (m) { AX = m; place(); layout(); },
      x: function (clock) { return row.offsetLeft + row.clientWidth * clock / AX; }       // axis mode: px from wrap's left
    };
  }

  // ---------- static 0-45 min tick ruler
  function ruler(host, f, o) {
    o = o || {};
    var M = P.sparseMinutes, pc = function (sec) { return (100 * sec / SPARSE).toFixed(3) + '%'; };
    var ticks = '';
    for (var m = 0; m <= M; m += 5) {
      var major = m % 15 === 0;
      ticks += '<span class="qm-rt' + (major ? ' is-major' : '') + '" style="left:' + pc(m * 60) + '">' + (major ? '<em>' + m + (m === M ? ' min' : '') + '</em>' : '') + '</span>';
    }
    var box = el('figure', 'qm-ruler');
    box.innerHTML =
      '<div class="qm-rlab"><span class="qm-rlab-e2r" style="width:' + pc(CRIT) + '"><b>Event2Reward</b> ' + P.criterion.clock_mmss + '</span>' +
      '<span class="qm-rlab-sparse"><b>Sparse rewards</b> ' + M + ' min</span></div>' +
      '<div class="qm-rtrack"><span class="qm-rrun" style="width:' + pc(CRIT) + '"></span><span class="qm-rhead"></span>' +
      '<span class="qm-rsparse" style="left:' + pc(SPARSE) + '"></span></div>' +
      '<div class="qm-rticks">' + ticks + '</div>' +
      (o.caption ? '<figcaption>' + o.caption + '</figcaption>' : '');
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'Time to ' + P.streak + ' autonomous successes in a row, on a 0 to ' + M + ' minute axis: Event2Reward ' +
      P.criterion.clock_mmss + ', sparse rewards ' + M + ' minutes.');
    host.appendChild(box);
    var head = box.querySelector('.qm-rhead');
    f.on(function (s) { if (s && s.clock != null) head.style.left = pc(Math.min(s.clock, CRIT)); });
    return box;
  }

  window.QM = { film: film, bind: bind, toggle: toggle, buttons: buttons, bar: bar, ruler: ruler, mss: mss, el: el, narrow: narrow,
    CRIT: CRIT, SPARSE: SPARSE, N: N, T: T, ICON: ICON };
})();

/* q53 clock with reference: front-43 film left; right column = live clock, then a Q18-style pair of thin bars on one
   minute scale (Sparse rewards 45 min, grey; Event2Reward 15:16, blue, filling live with the clock), the pair sits on the column's bottom edge. Autoplays from trial 1 (no result-first buttons).
   To-scale trial bar below. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var P = window.PLUG, root = $('q53');
  var film = QM.film(root, { auto: true, media: 'front-32', stage: $('q53-stage'), label: 'Complete plug-insertion training run, front camera, from trial 1 to ten autonomous successes in a row' });
  QM.bind(root, film);
  QM.toggle($('q53-toggle'), film);
  QM.bar($('q53-bar'), film);
  // the pair of bars: one minute scale 0..sparse minutes
  var M = P.sparseMinutes, pc = function (sec) { return (100 * sec / (M * 60)).toFixed(3) + '%'; };
  var ticks = '';
  for (var m = 0; m <= M; m += 15) ticks += '<span style="left:' + pc(m * 60) + '">' + m + (m === M ? ' min' : '') + '</span>';
  var fig = $('q53-pair');
  fig.innerHTML =
    '<figcaption>Time to ' + P.streak + ' autonomous successes in a row</figcaption>' +
    '<div class="q53-row is-sparse"><span class="q53-name">Sparse rewards</span><span class="q53-track"><i style="width:100%"></i><em style="left:100%">' + M + ' min</em></span></div>' +
    '<div class="q53-row is-e2r"><span class="q53-name">Event2Reward</span><span class="q53-track"><s style="width:' + pc(QM.CRIT) + '"></s><i id="q53-fill"></i>' +
      '<em style="left:' + pc(QM.CRIT) + '">' + Math.round(QM.CRIT / 60) + ' min</em></span></div>' +
    '<div class="q53-axis"><span class="q53-name"></span><span class="q53-ticks">' + ticks + '</span></div>';
  fig.setAttribute('role', 'img');
  fig.setAttribute('aria-label', 'Time to ' + P.streak + ' autonomous successes in a row: sparse rewards ' + M + ' minutes, Event2Reward ' + P.criterion.clock_mmss + '.');
  // streak: k / 10 autonomous successes in a row, one cell per success (the criterion lights all of them)
  var sk = $('q53-streak'), K = P.streak, cells = [];
  sk.innerHTML = '<p class="q53-streak-head"><span>In a row</span><b><span id="q53-k">0</span> / ' + K + '</b></p><div class="q53-cells" aria-hidden="true"></div>';
  var row = sk.querySelector('.q53-cells'), kEl = $('q53-k');
  for (var j = 0; j < K; j++) { var c = document.createElement('i'); row.appendChild(c); cells.push(c); }
  sk.setAttribute('role', 'status');
  var lastK = -1;
  film.on(function (s) {
    if (!s || s.t == null) return;
    var k = s.criterion ? K : Math.min(K, s.streak || 0);
    if (k === lastK) return; lastK = k;
    kEl.textContent = String(k);
    cells.forEach(function (c, j) { c.classList.toggle('is-on', j < k); });
    sk.classList.toggle('is-full', k >= K);
  });
  var fill = $('q53-fill');
  film.on(function (s) { if (s && s.clock != null) fill.style.width = pc(Math.min(s.clock, QM.CRIT)); });
})();
