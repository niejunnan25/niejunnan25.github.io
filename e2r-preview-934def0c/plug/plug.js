/* Event2Reward round 12: shared plug-run film component.
 *
 *   <link rel="stylesheet" href="../plug.css">
 *   <script src="../media/timeline.js"></script>   (defines window.PLUG)
 *   <script src="../plug.js"></script>
 *   const film = PlugFilm.mount(el, {media: 'front-169', base: '../media/'});
 *
 * Builds (inside el, or into the slot elements you pass): video stage, control row (play · scrubber · clock),
 * info row (phase · streak), 37-tile trial bar, key-moment buttons. The video carries footage only; everything
 * else here is HTML, synced to the video through PLUG.frames ([video_t, clock_s]).
 *
 * Options (all optional except media):
 *   media        'front-169' | 'front-43' | 'wrist-43' | 'pair'
 *   base         path to p12/media/ (default '../media/')
 *   poster       'start' | 'criterion'                       (default 'start')
 *   autoplay     true: play while >= 50 % visible (never under prefers-reduced-motion)   (default true)
 *   follow       [videoElement, ...] extra <video>s kept in sync (same frame timeline, e.g. wrist-43)
 *   video        an existing <video> to use instead of creating one
 *   slots        {stage, controls, info, bar, moments}: elements to render each part into; a part set to false is skipped
 *   scrubber     show the thin scrubber in the control row (default true)
 *   barScrub     drag on the trial bar scrubs (default true); a click without drag seeks to that trial's start
 *   proportional tile widths proportional to each trial's real duration, reset included (default false)
 *   legend, groups, bracket   show legend / "Warm-up · Autonomous" labels / "10 in a row" bracket (default true)
 *   clockLabel   text after the clock (default 'since trial 1')
 *   moments      true | false | [{key:'first'|'criterion', label:'...'}]
 *   label        aria-label for the video
 * Returns a controller: {root, video, data, play(), pause(), toggle(), seek(t), seekTrial(k), seekMoment(key),
 *   clockAt(t), timeAt(clock), state(), on(fn)}. Every update also dispatches 'plug:tick' on root (detail = state()).
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var ICON = {
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3.2v11H3.5zM9.3 2.5h3.2v11H9.3z"/></svg>',
    replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5a5.5 5.5 0 1 1-5.2 3.7l1.6.6A3.8 3.8 0 1 0 8 4.2v2.3L4.6 3.4 8 .3z"/></svg>'
  };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function mmss(s) {
    s = Math.max(0, Math.round(s));  // round like the criterion time 15:16 (915.8 s)
    var m = Math.floor(s / 60), r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }
  function interp(xs, ys, x) {          // xs increasing
    var n = xs.length;
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    var a = xs[lo], b = xs[hi];
    return b === a ? ys[lo] : ys[lo] + (ys[hi] - ys[lo]) * (x - a) / (b - a);
  }

  function mount(root, opts) {
    opts = opts || {};
    var P = opts.data || window.PLUG;
    if (!P) throw new Error('PlugFilm: window.PLUG missing (load media/timeline.js first)');
    var base = opts.base || 'assets/plug/';
    var media = opts.media || 'front-169';
    var slots = opts.slots || {};
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var autoplay = opts.autoplay !== false && !reduce;
    var T = P.trials, N = T.length;
    var FT = P.frames.map(function (f) { return f[0]; }), FC = P.frames.map(function (f) { return f[1]; });
    var liveEnd = P.criterion.seek_t;                    // frames after this are the end hold
    var LT = [], LC = [];
    for (var i = 0; i < FT.length; i++) if (FT[i] < liveEnd) { LT.push(FT[i]); LC.push(FC[i]); }
    var firstAuto = T.findIndex(function (t) { return t.phase === 'autonomous'; });

    function clockAt(t) { return interp(FT, FC, t); }
    function timeAt(c) { return interp(LC, LT, c); }
    // each trial's span on the video for the bar: its reset (trial 1: 0) up to the next trial's reset (last: end)
    var span = T.map(function (t, k) {
      return [k === 0 ? 0 : t.video.reset, k + 1 < N ? T[k + 1].video.reset : P.duration];
    });

    root.classList.add('plug');
    var part = function (name) { return slots[name] === false ? null : (slots[name] || root); };

    // ---- stage
    var video = opts.video, stage = null, big = null, hit = null;
    var stageHost = part('stage');
    if (!video) {
      video = document.createElement('video');
      video.src = base + media + '.mp4';
    }
    video.muted = true; video.defaultMuted = true; video.playsInline = true;
    video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('preload', 'metadata');
    video.removeAttribute('controls'); video.controls = false; video.loop = false;
    if (!video.getAttribute('poster')) video.poster = base + media + '-' + (opts.poster || 'start') + '.jpg';
    var dims = P.files[media];
    if (dims) { video.width = dims[0]; video.height = dims[1]; }
    if (opts.label) video.setAttribute('aria-label', opts.label);
    if (stageHost) {
      stage = el('div', 'plug-stage');
      if (video.parentNode) video.parentNode.insertBefore(stage, video);
      stage.appendChild(video);
      big = el('div', 'plug-big', ICON.play);
      hit = el('button', 'plug-hit');
      hit.type = 'button'; hit.setAttribute('aria-label', 'Play or pause the training run');
      stage.appendChild(big); stage.appendChild(hit);
      if (!stage.parentNode) stageHost.appendChild(stage);
    }
    var follow = (opts.follow || []).slice();
    follow.forEach(function (v) {
      v.muted = true; v.playsInline = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.setAttribute('preload', 'metadata'); v.controls = false; v.removeAttribute('controls');
    });

    // ---- controls
    var play = null, scrub = null, sfill = null, knob = null, clockB = null;
    var ch = part('controls');
    if (ch) {
      var row = el('div', 'plug-controls');
      play = el('button', 'plug-play', ICON.play); play.type = 'button'; play.setAttribute('aria-label', 'Play');
      row.appendChild(play);
      if (opts.scrubber !== false) {
        scrub = el('div', 'plug-scrub'); scrub.tabIndex = 0;
        scrub.setAttribute('role', 'slider'); scrub.setAttribute('aria-label', 'Position in the training run');
        scrub.setAttribute('aria-valuemin', '0'); scrub.setAttribute('aria-valuemax', String(Math.round(P.criterion.clock)));
        sfill = el('div', 'plug-scrub-fill'); knob = el('div', 'plug-scrub-knob');
        scrub.appendChild(sfill); scrub.appendChild(knob); row.appendChild(scrub);
      } else {
        row.appendChild(el('div', 'plug-spacer')).style.flex = '1';
      }
      var ck = el('div', 'plug-clock');
      clockB = el('b', null, '00:00');
      ck.appendChild(clockB); ck.appendChild(el('span', null, opts.clockLabel == null ? 'since trial 1' : opts.clockLabel));
      ck.setAttribute('aria-live', 'off');
      row.appendChild(ck);
      ch.appendChild(row);
    }

    // ---- info
    var phaseEl = null, streakEl = null;
    var ih = part('info');
    if (ih) {
      var info = el('div', 'plug-info');
      phaseEl = el('span', 'plug-phase', 'Assisted warm-up');
      streakEl = el('span', 'plug-streak', '<b>0 / 10</b> in a row');
      info.appendChild(phaseEl); info.appendChild(streakEl);
      ih.appendChild(info);
    }

    // ---- bar
    var bar = null, tiles = [], fills = [], bracket = null, groups = null;
    var bh = part('bar');
    if (bh) {
      bar = el('div', 'plug-bar' + (opts.proportional ? ' plug-prop' : ''));
      bar.tabIndex = 0; bar.setAttribute('role', 'slider');
      bar.setAttribute('aria-label', 'Trials 1 to ' + N + '; arrow keys move between trials');
      bar.setAttribute('aria-valuemin', '1'); bar.setAttribute('aria-valuemax', String(N));
      var row2 = el('div', 'plug-tiles');
      T.forEach(function (t, k) {
        var b = el('button', 'plug-tile is-' + (t.phase === 'warmup' ? 'warmup' : (t.success ? 'success' : 'fail')) + (k === firstAuto - 1 ? ' is-g1' : ''));
        b.type = 'button'; b.tabIndex = -1;
        b.setAttribute('aria-label', 'Trial ' + t.trial);
        b.dataset.trial = t.trial;
        var f = el('i'); b.appendChild(f); fills.push(f);
        row2.appendChild(b); tiles.push(b);
      });
      if (opts.bracket !== false) {
        bracket = el('div', 'plug-bracket', '<span>' + P.streak + ' in a row</span>');
        bar.appendChild(bracket);
      }
      bar.appendChild(row2);
      if (opts.groups !== false) {
        groups = el('div', 'plug-groups', '<span class="g-warm">Warm-up</span><span class="g-auto">Autonomous</span>');
        bar.appendChild(groups);
      }
      bh.appendChild(bar);
      if (opts.legend !== false) {
        var lg = el('div', 'plug-legend',
          '<span><i class="lg-warm"></i>assisted warm-up</span><span><i class="lg-fail"></i>autonomous attempt</span>' +
          '<span><i class="lg-success"></i>autonomous success</span>');
        bh.appendChild(lg);
      }
    }

    // ---- key moments
    var mh = part('moments');
    var mlist = opts.moments === false ? [] : (Array.isArray(opts.moments) ? opts.moments :
      [{ key: 'first', label: 'First autonomous success' }, { key: 'criterion', label: '10 in a row · <b>' + P.criterion.clock_mmss + '</b>' }]);
    if (mh && mlist.length) {
      var mr = el('div', 'plug-moments');
      mlist.forEach(function (m) {
        var b = el('button', 'plug-moment', m.label); b.type = 'button'; b.dataset.moment = m.key;
        b.addEventListener('click', function () { seekMoment(m.key); });
        mr.appendChild(b);
      });
      mh.appendChild(mr);
    }

    // ---- layout of proportional widths, bracket and group labels
    function layout() {
      if (!bar) return;
      if (opts.proportional) {
        var W = bar.querySelector('.plug-tiles').clientWidth;
        var gap = parseFloat(getComputedStyle(tiles[0]).marginRight) || 0;
        var ggap = parseFloat(getComputedStyle(tiles[firstAuto - 1]).marginRight) || 0;
        var free = W - gap * (N - 2) - ggap;
        var tot = span[N - 1][1] - span[0][0];
        tiles.forEach(function (b, k) { b.style.width = Math.max(2, free * (span[k][1] - span[k][0]) / tot) + 'px'; });
      }
      var br = bar.getBoundingClientRect();
      var x = function (k, edge) { var r = tiles[k].getBoundingClientRect(); return (edge ? r.right : r.left) - br.left; };
      if (bracket) {
        var a = N - P.streak;
        bracket.style.left = x(a, 0) + 'px'; bracket.style.width = (x(N - 1, 1) - x(a, 0)) + 'px';
      }
      if (groups) {
        var gw = groups.querySelector('.g-warm'), ga = groups.querySelector('.g-auto');
        gw.style.left = '0px'; gw.style.width = x(firstAuto - 1, 1) + 'px';
        ga.style.left = x(firstAuto, 0) + 'px'; ga.style.width = (x(N - 1, 1) - x(firstAuto, 0)) + 'px';
      }
    }

    // ---- state
    function stateAt(t) {
      var c = clockAt(t), done = 0, streak = 0, cur = 0;
      for (var k = 0; k < N; k++) {
        if (t + 1e-4 >= T[k].video.end) {
          done = k + 1;
          if (T[k].phase === 'autonomous') streak = T[k].success ? streak + 1 : 0;
        }
        if (t + 1e-4 >= span[k][0]) cur = k;
      }
      var crit = t + 1e-4 >= P.criterion.video_t;
      return { t: t, clock: c, clockText: mmss(c), trial: T[cur].trial, done: done, streak: Math.min(streak, P.streak),
        phase: T[cur].phase, criterion: crit, playing: !video.paused && !video.ended,
        inTrial: Math.min(1, Math.max(0, (t - T[cur].video.start) / Math.max(1e-3, T[cur].video.end - T[cur].video.start))) };
    }
    var listeners = [], last = {};
    function render() {
      var t = video.currentTime || 0, s = stateAt(t);
      root.classList.toggle('is-criterion', s.criterion);
      root.classList.toggle('is-playing', s.playing);
      if (clockB && last.clockText !== s.clockText) clockB.textContent = s.clockText;
      if (scrub) {
        var u = Math.min(1, t / P.duration) * 100;
        sfill.style.width = u + '%'; knob.style.left = u + '%';
        scrub.setAttribute('aria-valuenow', String(Math.round(s.clock)));
        scrub.setAttribute('aria-valuetext', s.clockText + ' since trial 1');
      }
      if (phaseEl && (last.phase !== s.phase || last.criterion !== s.criterion))
        phaseEl.textContent = s.criterion ? 'Criterion reached' : (s.phase === 'warmup' ? 'Assisted warm-up' : 'Autonomous');
      if (streakEl && last.streak !== s.streak) streakEl.innerHTML = '<b>' + s.streak + ' / ' + P.streak + '</b> in a row';
      if (bar) {
        for (var k = 0; k < N; k++) {
          var isDone = k < s.done, isCur = (k === s.trial - 1) && !s.criterion;
          tiles[k].classList.toggle('is-done', isDone);
          tiles[k].classList.toggle('is-current', isCur);
          fills[k].style.width = isCur && !isDone ? (s.inTrial * 100) + '%' : '0';
        }
        bar.setAttribute('aria-valuenow', String(s.trial));
        var tt = T[s.trial - 1];
        bar.setAttribute('aria-valuetext', 'Trial ' + tt.trial + ', ' + (tt.phase === 'warmup' ? 'assisted warm-up' :
          (s.trial - 1 < s.done ? (tt.success ? 'success' : 'not successful') : 'in progress')));
      }
      if (play && last.playing !== s.playing) {
        var ended = video.ended || t >= P.duration - 0.05;
        play.innerHTML = s.playing ? ICON.pause : (ended ? ICON.replay : ICON.play);
        play.setAttribute('aria-label', s.playing ? 'Pause' : (ended ? 'Replay' : 'Play'));
      }
      last = s;
      for (var j = 0; j < listeners.length; j++) listeners[j](s);
      root.dispatchEvent(new CustomEvent('plug:tick', { detail: s }));
    }
    var raf = 0;
    function loop() { render(); syncFollow(false); raf = video.paused ? 0 : requestAnimationFrame(loop); }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    function syncFollow(hard) {
      follow.forEach(function (v) {
        if (hard || Math.abs(v.currentTime - video.currentTime) > 0.12) { try { v.currentTime = video.currentTime; } catch (e) { } }
        if (video.paused && !v.paused) v.pause();
        if (!video.paused && v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () { }); }
      });
    }

    // ---- actions
    var userPaused = false, visible = false;
    function doPlay() {
      root.classList.add('has-played');
      if (video.ended || video.currentTime >= P.duration - 0.05) video.currentTime = 0;
      var p = video.play(); if (p && p.catch) p.catch(function () { });
      syncFollow(true);
    }
    function doPause() { video.pause(); syncFollow(true); }
    function toggle() { if (video.paused || video.ended) { userPaused = false; doPlay(); } else { userPaused = true; doPause(); } }
    function seek(t) {
      t = Math.max(0, Math.min(P.duration - 0.001, t));
      video.currentTime = t; syncFollow(true); render();
    }
    function seekTrial(k) { k = Math.max(1, Math.min(N, k)); root.classList.add('has-played'); seek(k === 1 ? 0 : T[k - 1].video.start); }
    function seekMoment(key) {
      root.classList.add('has-played');
      if (key === 'first') seek(P.firstAutoSuccess.start_video_t);
      else if (key === 'criterion') { seek(P.criterion.seek_t); }
      else if (key === 'start') seek(0);
    }

    if (play) play.addEventListener('click', toggle);
    if (hit) hit.addEventListener('click', toggle);
    ['play', 'playing'].forEach(function (e) { video.addEventListener(e, function () { kick(); render(); }); });
    ['pause', 'seeked', 'timeupdate', 'loadedmetadata', 'ended'].forEach(function (e) {
      video.addEventListener(e, function () { if (video.paused) render(); if (e === 'pause' || e === 'ended') syncFollow(true); });
    });

    // keyboard: space toggles anywhere inside (except on other buttons); arrows on the bar move between trials
    root.addEventListener('keydown', function (e) {
      if (e.key !== ' ' && e.code !== 'Space') return;
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.isContentEditable) return;  // native activation
      e.preventDefault(); toggle();
    });
    if (bar) {
      bar.addEventListener('keydown', function (e) {
        var k = last.trial || 1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); seekTrial(last.criterion ? N : k + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); seekTrial(last.criterion ? N : k - 1); }
        else if (e.key === 'Home') { e.preventDefault(); seekTrial(1); }
        else if (e.key === 'End') { e.preventDefault(); seekMoment('criterion'); }
      });
      // pointer: click a tile -> that trial's start; drag across the bar -> scrub
      var down = null;
      var tAtX = function (cx) {
        for (var k = 0; k < N; k++) {
          var r = tiles[k].getBoundingClientRect(), nx = k + 1 < N ? tiles[k + 1].getBoundingClientRect().left : r.right;
          if (cx < nx || k === N - 1) {
            var u = Math.max(0, Math.min(1, (cx - r.left) / Math.max(1, nx - r.left)));
            return span[k][0] + u * (span[k][1] - span[k][0]);
          }
        }
        return 0;
      };
      bar.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        down = { x: e.clientX, drag: false, wasPlaying: !video.paused };
        bar.setPointerCapture(e.pointerId);
      });
      bar.addEventListener('pointermove', function (e) {
        if (!down || opts.barScrub === false) return;
        if (!down.drag && Math.abs(e.clientX - down.x) > 5) { down.drag = true; if (down.wasPlaying) video.pause(); }
        if (down.drag) { root.classList.add('has-played'); seek(tAtX(e.clientX)); }
      });
      var up = function (e) {
        if (!down) return;
        var d = down; down = null;
        if (d.drag) { if (d.wasPlaying) doPlay(); return; }
        var tile = e.target.closest && e.target.closest('.plug-tile');
        if (!tile) { var hitT = document.elementFromPoint(e.clientX, e.clientY); tile = hitT && hitT.closest && hitT.closest('.plug-tile'); }
        if (tile) seekTrial(+tile.dataset.trial);
      };
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', function () { down = null; });
    }
    if (scrub) {
      var sdown = null;
      var tAtS = function (cx) { var r = scrub.getBoundingClientRect(); return Math.max(0, Math.min(1, (cx - r.left) / r.width)) * P.duration; };
      scrub.addEventListener('pointerdown', function (e) {
        sdown = { wasPlaying: !video.paused }; if (!video.paused) video.pause();
        scrub.setPointerCapture(e.pointerId); root.classList.add('has-played'); seek(tAtS(e.clientX));
      });
      scrub.addEventListener('pointermove', function (e) { if (sdown) seek(tAtS(e.clientX)); });
      var sup = function () { if (sdown && sdown.wasPlaying) doPlay(); sdown = null; };
      scrub.addEventListener('pointerup', sup); scrub.addEventListener('pointercancel', sup);
      scrub.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
        if (d) { e.preventDefault(); root.classList.add('has-played'); seek(video.currentTime + d); }
        else if (e.key === 'Home') { e.preventDefault(); seek(0); }
        else if (e.key === 'End') { e.preventDefault(); seekMoment('criterion'); }
      });
    }

    // visibility: play while >= 50 % visible (unless the user paused or reduced motion), always pause off-screen
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          visible = en.isIntersecting && en.intersectionRatio >= 0.5;
          if (!visible) { if (!video.paused) doPause(); }
          else if (autoplay && !userPaused && video.paused && !(video.ended || video.currentTime >= P.duration - 0.05)) doPlay();
        });
      }, { threshold: [0, 0.5] });
      io.observe(stage || video);
    }
    window.addEventListener('resize', layout);
    if (window.ResizeObserver && bar) new ResizeObserver(layout).observe(bar);
    layout(); render();

    var api = {
      root: root, video: video, data: P, play: function () { userPaused = false; doPlay(); }, pause: function () { userPaused = true; doPause(); },
      toggle: toggle, seek: seek, seekTrial: seekTrial, seekMoment: seekMoment, clockAt: clockAt, timeAt: timeAt,
      state: function () { return stateAt(video.currentTime || 0); }, on: function (fn) { listeners.push(fn); fn(last); }, layout: layout,
      fmt: mmss
    };
    root.plug = api;
    return api;
  }

  window.PlugFilm = { mount: mount, fmt: mmss };
})();
