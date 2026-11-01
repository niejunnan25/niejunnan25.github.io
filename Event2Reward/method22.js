/* M22 Method panel with the r13 V05 text (Q&A columns, no red marks). Text tables: r13/kit/text13.js; logic: r13/kit/page13.js. */
window.M13 = {"points": "qa"};
/* Text for the r13 Method variants (v01–v05), English and Chinese. Read by page13.js; the section text is in build13.py. */
window.M13_TEXT = {
  en: {
    short: { success: ['Success', 'Success'], stall: ['Progress stall', 'Stall'], regression: ['Regression + recovery', 'Regression'], nofurther: ['No further progress', 'No further'], unrecovered: ['Unrecovered regression', 'Unrecovered'] },
    tag: { success: 'Absolute supervision · successful executions', stall: 'Relative supervision · from executions that succeed', regression: 'Relative supervision · from executions that succeed', nofurther: 'Relative supervision · from failed executions', unrecovered: 'Relative supervision · from failed executions' },
    name: { success: 'Successful execution', stall: 'Progress stall', regression: 'Regression and recovery', nofurther: 'No further progress', unrecovered: 'Unrecovered regression' },
    def: {
      success: 'A normal successful execution. No event is marked; every frame is labelled with its time.',
      stall: 'For a while, the task does not advance. The annotator marks a, where the stall begins, and r, where progress resumes.',
      regression: 'Something already achieved is lost, then restored. The annotator marks a, the last state before the loss, and r, where it is restored.',
      nofurther: 'After some point the task never advances again before recording ends. The annotator marks a, the last state with real progress.',
      unrecovered: 'Something already achieved is lost and is never restored. The annotator marks a, the last state before the loss.' },
    ineq: { success: '$y_t = t / T$\n0 at the start, 1 at completion', stall: '$p_t \\approx p_a$ for $t$ between $a$ and $r$',
      regression: '$p_t < \\min(p_a, p_r)$\nfor $t$ between $a$ and $r$', nofurther: '$p_t \\le p_a$\nfor every $t$ after $a$', unrecovered: '$p_t < p_a$\nfor every $t$ after $a$' },
    a: { success: ['Start', 'The first frame; its label is 0.'], stall: ['a · reference', 'Where the stall begins.'], regression: ['a · reference', 'The last state before the loss.'],
      nofurther: ['a · reference', 'The last state with real progress.'], unrecovered: ['a · reference', 'The last state before the loss.'] },
    r: { success: ['Completion', 'The frame where the task is done; its label is 1.'], stall: ['r · progress resumes', 'Where the stall ends. It only closes the interval; nothing is compared with r.'],
      regression: ['r · recovery', 'The first state where it is restored. It is a second reference.'], nofurther: ['End of recording', 'Nothing to mark: the interval runs to the end.'],
      unrecovered: ['End of recording', 'Nothing to mark: the state is still lost when recording ends.'] },
    req: { success: 'Progress grows with time, from 0 at the start to 1 at completion.', stall: 'Every frame between a and r stays about level with a.',
      regression: 'Every frame between a and r is lower than both a and r.', nofurther: 'No frame after a is higher than a.', unrecovered: 'Every frame after a is lower than a.' },
    interval: (t0, t1, n, two) => `${t0}–${t1} s. During training, ${n} frames are drawn at random from it and compared with ${two ? 'a and r' : 'a'}; the hollow dots show one draw.`,
    time: (n, dur) => `All ${n} frames (${dur} s) get a target from their time. This is the only absolute target.`,
    head: { interval: 'Interval', time: 'Time label', ar: 'Annotated points', req: 'What must hold' },
    qa: ['What is marked?', 'What must hold?', 'How is it used?'],
    rows: ['Marked', 'Must hold', 'Training'],
    still: { start: 'Start', half: 'Halfway', done: 'Completion', a: 'a · reference', inside: 'Inside', rRes: 'r · resumes', rRec: 'r · recovery', end: 'End' },
    pred: 'prediction', notMet: 'not met',
    sign: 'Signs: what the annotation requires. Numbers: Event2Reward’s prediction.',
    task: (t) => `“${t[0].toUpperCase() + t.slice(1)}”`,
    jump: (t, s) => `${t}: jump the video to ${s} s`,
  },
  zh: {
    short: { success: ['成功', '成功'], stall: ['进度停滞', '停滞'], regression: ['退步 + 恢复', '退步'], nofurther: ['不再进展', '不再进展'], unrecovered: ['退步未恢复', '未恢复'] },
    tag: { success: '绝对监督 · 成功的执行', stall: '相对监督 · 来自最终成功的执行', regression: '相对监督 · 来自最终成功的执行', nofurther: '相对监督 · 来自失败的执行', unrecovered: '相对监督 · 来自失败的执行' },
    name: { success: '成功执行', stall: '进度停滞', regression: '退步并恢复', nofurther: '不再进展', unrecovered: '退步未恢复' },
    def: {
      success: '一次正常的成功执行。不标注事件，每一帧按时间得到标签。',
      stall: '有一段时间，任务没有推进。标注员标出 a（停滞开始）和 r（进度重新推进）。',
      regression: '已经做到的状态丢了，后来又恢复。标注员标出 a（丢失前的最后状态）和 r（恢复的那一刻）。',
      nofurther: '从某一刻起，直到录制结束，任务再也没有推进。标注员标出 a（最后一次有实质进展的状态）。',
      unrecovered: '已经做到的状态丢了，而且没有恢复。标注员标出 a（丢失前的最后状态）。' },
    ineq: { success: '$y_t = t / T$\n开始为 0，完成为 1', stall: '对 $a$ 与 $r$ 之间的 $t$：$p_t \\approx p_a$',
      regression: '$p_t < \\min(p_a, p_r)$\n对 $a$ 与 $r$ 之间的 $t$', nofurther: '$p_t \\le p_a$\n对 $a$ 之后的每个 $t$', unrecovered: '$p_t < p_a$\n对 $a$ 之后的每个 $t$' },
    a: { success: ['开始', '第一帧，标签为 0。'], stall: ['a · 参考点', '停滞开始的地方。'], regression: ['a · 参考点', '丢失前的最后状态。'],
      nofurther: ['a · 参考点', '最后一次有实质进展的状态。'], unrecovered: ['a · 参考点', '丢失前的最后状态。'] },
    r: { success: ['完成', '任务完成的那一帧，标签为 1。'], stall: ['r · 恢复推进', '停滞结束的地方。它只用来结束区间，不和 r 比较。'],
      regression: ['r · 恢复点', '状态恢复的第一刻。它是第二个参考点。'], nofurther: ['录制结束', '不用标：区间一直到结束。'],
      unrecovered: ['录制结束', '不用标：结束时状态仍然丢失。'] },
    req: { success: '进度随时间增长：开始为 0，完成为 1。', stall: 'a 与 r 之间的每一帧，都和 a 差不多。',
      regression: 'a 与 r 之间的每一帧，都低于 a 和 r。', nofurther: 'a 之后没有任何一帧高于 a。', unrecovered: 'a 之后的每一帧，都低于 a。' },
    interval: (t0, t1, n, two) => `${t0}–${t1} s。训练时每次从中随机抽 ${n} 帧，和 ${two ? 'a、r' : 'a'} 比较；空心点是其中一次。`,
    time: (n, dur) => `全部 ${n} 帧（${dur} s）按时间得到目标值。这是唯一的绝对目标。`,
    head: { interval: '区间', time: '时间标签', ar: '标注点', req: '要求' },
    qa: ['标了什么？', '要求什么？', '怎么用？'],
    rows: ['标注', '要求', '训练'],
    still: { start: '开始', half: '中途', done: '完成', a: 'a · 参考点', inside: '区间内', rRes: 'r · 恢复推进', rRec: 'r · 恢复点', end: '结束' },
    pred: '预测', notMet: '未满足', sep: '',
    sign: '符号：标注要求的关系。数字：Event2Reward 的预测。',
    task: (t) => `“${(window.M13_TASKS || {})[t] || t}”`,
    jump: (t, s) => `${t}：视频跳到 ${s} s`,
  },
};
/* r13 Method variants: the M22 one-screen panel with reworked text. window.M13 picks the layout of the text under the
   chart (points: 'three' | 'two' | 'rows' | 'one' | 'qa'), red marks on stills whose prediction breaks the relation
   (red), and a sign/number legend above the stills (sign). Text: text13.js, by <html lang>. */
(() => {
  'use strict';
  if (!window.MK || !document.getElementById('m22-panel')) return;
  const V = window.M13 || {}, T = window.M13_TEXT[document.documentElement.lang.startsWith('zh') ? 'zh' : 'en'];
  const D = window.MK_DATA, $ = (s) => document.getElementById(s);
  const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SIGN = { success: ['<', '<'], stall: ['≈', '≈'], regression: ['>', '<'], nofurther: ['≥', '≥'], unrecovered: ['>', '>'] };
  const subs = (x) => x.replace(/_(\w)/g, '<sub>$1</sub>').replace(/\n/g, '<br>');
  // formulas: $…$ segments (and .tex spans in the section) are typeset with KaTeX when it is loaded
  const KX = window.katex, tex = (s, display) => KX.renderToString(s, { throwOnError: false, displayMode: !!display });
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const math = (x) => (KX ? x.split('\n').map((l) => l.split('$').map((s, i) => (i % 2 ? tex(s) : s.trim() ? `<span class="m13-t">${esc(s)}</span>` : s)).join('')).join('<br>') : subs(x.replace(/\$/g, '')));
  const GLYPH = { success: 'y = t / T', stall: 'p_t \\approx p_a', regression: 'p_t < \\min(p_a, p_r)', nofurther: 'p_t \\le p_a', unrecovered: 'p_t < p_a' };
  if (KX) document.querySelectorAll('#method .tex').forEach((el) => { el.innerHTML = tex(el.textContent); });
  const s1 = (f, e) => (f / e.fps).toFixed(1);
  const end = (r) => (r.ref2 != null ? r.ref2 : r.window[1]);
  // does the prediction at frame f break the relation? (same rule as the red line or band on the chart)
  const broken = (e, f) => {
    const r = e.relation, pa = e.pred[r.ref], p = e.pred[f];
    if (r.kind === 'stall') return Math.abs(p - pa) > 0.02;
    if (r.kind === 'regression') { const pr = e.pred[r.ref2], m = Math.min(0.1, 0.5 * Math.min(pa, pr)); return p > Math.min(pa, pr) - m; }
    if (r.kind === 'nofurther') return p > pa;
    return p > pa - 0.1;
  };
  const stills = (e) => {  // [frame, title, compared with the reference?]
    const r = e.relation, S = T.still;
    if (!r) return [[0, S.start], [Math.floor((e.n - 1) / 2), S.half], [e.n - 1, S.done]];
    const mid = Math.floor((r.window[0] + r.window[1]) / 2);
    const third = r.ref2 != null ? [r.ref2, S.rRec, false] : r.kind === 'stall' ? [r.window[1], S.rRes, true] : [e.n - 1, S.end, true];
    return [[r.ref, S.a, false], [mid, S.inside, true], third];
  };

  const panel = $('m22-panel'), head = $('m22-head'), keys = $('m22-keys'), pts = $('m22-points'), pickHost = $('m22-pick');
  const compact = innerHeight < 820 || innerWidth < 600;
  const p = MK.player($('m22-chart'), { compact });
  $('m22-video').append(p.el.querySelector('.mk-v'), p.el.querySelector('.mk-ctrl'));
  const svg = () => $('m22-chart').querySelector('.mk-chart');
  if (V.sign) keys.before(h('p', 'm13-sign', T.sign));

  function keep() {  // after a switch: keep the chart in view below the sticky header; if the whole panel fits, show all of it
    const nav = document.querySelector('.nav'), top = (nav ? nav.getBoundingClientRect().bottom : 0) + 6;
    const P = panel.getBoundingClientRect(), C = svg().getBoundingClientRect(), Hd = head.getBoundingClientRect().height, vh = innerHeight - 6;
    let dy = 0;
    if (P.height <= vh - top) { if (P.top < top) dy = P.top - top; else if (P.bottom > vh) dy = P.bottom - vh; }
    else { const a = Math.min(C.top, keys.getBoundingClientRect().top); if (C.bottom > vh) dy = C.bottom - vh; if (a - dy < top + Hd) dy = a - top - Hd; }
    if (Math.abs(dy) > 2) scrollTo({ top: scrollY + dy, behavior: reduced ? 'auto' : 'smooth' });
  }

  const tabs = MK.cats.map((c) => {
    const d = MK.DEF[c], b = h('button', 'm22-kind'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.cat = c;
    b.setAttribute('aria-label', T.name[c]); b.append(h('span', 'm22-kn', `${d.n}. ${T.short[c][0]}`), Object.assign(h('span', 'm22-ks'), { innerHTML: `<b>${d.n}</b>${T.short[c][1]}` }), Object.assign(h('span', 'm22-kg'), { innerHTML: KX ? tex(GLYPH[c]) : subs(d.glyph) }));
    b.addEventListener('click', () => { go(c, true); keep(); }); $('m22-kinds').append(b); return b;
  });

  const col = (title, ...body) => { const x = h('div', 'm22-pt'); if (title) x.append(h('b', null, title)); for (const t of body) x.append(typeof t === 'string' ? h('p', null, t) : t); return x; };
  const ar = (c) => { const x = h('p', 'm13-ar'); for (const [t, d] of [T.a[c], T.r[c]]) { x.append(h('b', null, t + ' '), h('span', null, d), h('br')); } x.lastChild.remove(); return x; };
  function points(e) {
    const c = e.cat, r = e.relation;
    const use = r ? T.interval(s1(r.ref, e), s1(end(r), e), r.sampled.length, r.ref2 != null) : T.time(e.n, e.dur.toFixed(1));
    const useHead = r ? T.head.interval : T.head.time;
    pts.innerHTML = ''; pts.className = 'm22-points m13-' + (V.points || 'three');
    if (V.points === 'two') pts.append(col(T.head.ar, ar(c)), col(useHead, T.req[c] + (T.sep ?? ' ') + use));
    else if (V.points === 'qa') pts.append(col(T.qa[0], ar(c)), col(T.qa[1], T.req[c]), col(T.qa[2], use));
    else if (V.points === 'rows') { for (const [k, v] of [[T.rows[0], ar(c)], [T.rows[1], T.req[c]], [T.rows[2], use]]) pts.append(h('b', null, k), typeof v === 'string' ? h('p', null, v) : v); }
    else if (V.points === 'one') pts.append(h('p', null, T.req[c] + (T.sep ?? ' ') + use));
    else pts.append(col(...T.a[c]), col(...T.r[c]), col(useHead, use));
  }

  function show(id, auto) {
    const e = MK.ep(id), sg = SIGN[e.cat]; p.show(id, auto); if (pk) pk.set(id);
    $('m22-task').textContent = T.task(e.task);
    keys.innerHTML = ''; keys.dataset.cat = e.cat;
    stills(e).forEach(([f, title, cmp], i) => {
      if (i) { const s = h('span', 'm22-s', sg[i - 1]); s.setAttribute('aria-hidden', 'true'); keys.append(s); }
      const b = h('button', 'm22-still'); b.type = 'button'; b.setAttribute('aria-label', T.jump(title, s1(f, e)));
      const img = h('img'); img.src = MK.media(`${id}-k${f}`, '.jpg'); img.alt = ''; img.width = 448; img.height = 448;
      const c = h('span', 'm22-cap'); c.append(h('b', null, title), h('span', null, `${s1(f, e)} s`));
      const v = h('span', 'm22-val'); v.append(h('span', null, T.pred), h('strong', null, e.pred[f].toFixed(2)));
      if (V.red && cmp && broken(e, f)) { v.classList.add('m13-bad'); v.append(h('em', null, T.notMet)); }
      b.append(img, c, v); b.addEventListener('click', () => { p.seek(f / e.fps); keys.querySelectorAll('.m22-still').forEach((x) => x.classList.toggle('is-on', x === b)); });
      keys.append(b);
    });
    points(e);
  }
  let pk;
  function go(c, auto) {
    tabs.forEach((b) => { const on = b.dataset.cat === c; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
    $('m22-tag').textContent = T.tag[c]; $('m22-name').textContent = T.name[c]; $('m22-deftext').textContent = T.def[c];
    $('m22-ineq').innerHTML = math(T.ineq[c]);
    pickHost.innerHTML = ''; pk = MK.picker(pickHost, c, (id) => { show(id, true); keep(); });
    show(D.order[c][0], auto);
  }
  go('regression', false);  // opens on 3. Regression + recovery (user 11-02)
})();
