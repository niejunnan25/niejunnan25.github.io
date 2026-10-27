'use strict';

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
function node(tag, attributes = {}, content = '') {
  const n = document.createElementNS(NS, tag);
  Object.entries(attributes).forEach(([key, value]) => n.setAttribute(key, value));
  if (content) n.textContent = content;
  return n;
}
function latest(points, t) {
  let lo = 0, hi = points.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (points[mid].t <= t + 1e-9) lo = mid;
    else hi = mid - 1;
  }
  return points[lo];
}
function makeChart(svg, item, compact = false) {
  svg.replaceChildren();
  const w = compact ? 420 : 540, h = compact ? 76 : 235;
  const left = compact ? 2 : 40, right = compact ? 3 : 12, top = compact ? 5 : 14, bottom = compact ? 5 : 29;
  const x = t => left + (w - left - right) * t / item.duration;
  const y = p => top + (h - top - bottom) * (1 - p);
  for (const v of compact ? [0, 1] : [0, .25, .5, .75, 1]) {
    svg.append(node('line', {x1:left,x2:w-right,y1:y(v),y2:y(v),stroke:'#e3e8de','stroke-width':1}));
    if (!compact) svg.append(node('text',{x:left-9,y:y(v)+3,'text-anchor':'end',fill:'#788477','font-size':10},v.toFixed(v===0||v===1?0:2)));
  }
  if (!compact) {
    for (let i=0;i<=4;i++) {
      const t=item.duration*i/4;
      svg.append(node('text',{x:x(t),y:h-7,'text-anchor':'middle',fill:'#788477','font-size':10},`${t.toFixed(1)} s`));
    }
  }
  const d=item.points.map((p,i)=>`${i?'L':'M'}${x(p.t).toFixed(4)},${y(p.p).toFixed(4)}`).join(' ');
  svg.append(node('path',{d,fill:'none',stroke:'#177963','stroke-width':compact?1.9:2.1,'stroke-linejoin':'round'}));
  const cursor=node('line',{x1:x(0),x2:x(0),y1:top,y2:h-bottom,stroke:'#94a998','stroke-width':1,'stroke-dasharray':'3 4'});
  const dot=node('circle',{cx:x(0),cy:y(item.points[0].p),r:compact?3:4,fill:'#177963',stroke:'#fff','stroke-width':1.5});
  svg.append(cursor,dot);
  return {update(t){const p=latest(item.points,t); cursor.setAttribute('x1',x(p.t));cursor.setAttribute('x2',x(p.t));dot.setAttribute('cx',x(p.t));dot.setAttribute('cy',y(p.p));return p;}, timeAt(clientX){const rect=svg.getBoundingClientRect();return Math.max(0,Math.min(item.duration,((clientX-rect.left)*w/rect.width-left)/(w-left-right)*item.duration));}};
}

function initDemo(data) {
  const video=$('demo-video'), wrist=$('wrist-video'), slider=$('demo-seek');
  let item=data.cases[0], chart;
  function draw() {
    const t=Math.min(video.currentTime||0,item.duration);
    const p=chart.update(t);
    $('demo-score').textContent=p.p.toFixed(3);
    $('demo-time').textContent=`${p.t.toFixed(1)} s`;
    slider.value=t; slider.setAttribute('aria-valuetext',`${p.t.toFixed(1)} seconds; progress ${p.p.toFixed(3)}`);
  }
  function seek(t) {
    t=Math.min(Math.max(t,0),item.duration);
    video.currentTime=t;
    if (wrist.readyState>0) wrist.currentTime=t;
    draw();
  }
  function playWrist() {
    if ($('wrist-details').open && !video.paused) {
      if (wrist.readyState>0) wrist.currentTime=video.currentTime;
      wrist.play().catch(()=>{});
    }
  }
  const notes={
    success:'The model follows approach, grasp, transport and placement. Final progress is 0.974, with local fluctuations throughout the trajectory.',
    hesitation:'Between 6.0 and 11.2 s, repeated grasp attempts produce little progress. The curve rises after extraction, but the successful endpoint is underestimated at 0.604.',
    failure:'Progress drops from about 0.438 at 7.0 s to 0.178 at 7.5 s after the bowl falls. A false rise appears around 12 s; final progress is 0.242.',
    regression:'Model error: the robot drops the bowl and re-grasps it, but progress stays low and ends at 0.150. This case is retained to show a missed recovery.'
  };
  function select(id) {
    video.pause(); wrist.pause();
    item=data.cases.find(c=>c.id===id);
    for (const tab of document.querySelectorAll('[role="tab"]')) {
      const active=tab.dataset.case===id;
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    }
    $('demo-panel').setAttribute('aria-labelledby',`tab-${id}`);
    $('demo-task').textContent=item.task.charAt(0).toUpperCase()+item.task.slice(1)+'.';
    $('demo-outcome').textContent=`Source: ${item.source_outcome}`;
    $('demo-note').textContent=notes[id];
    document.querySelector('.case-interpretation').classList.toggle('is-error',id==='regression');
    const base=`assets/demos/${id}/`;
    video.poster=base+'start.png';video.src=base+'video.mp4';video.load();
    wrist.src=base+'wrist.mp4';wrist.load();
    $('demo-start').src=base+'start.png';$('demo-goal').src=base+'goal.png';
    $('raw-output').href=base+'predictions.json';
    $('case-uid').textContent=`Episode: ${item.uid} · recorded test split`;
    $('goal-uid').textContent=`Independent goal: ${item.goal_uid}`;
    slider.max=item.duration;slider.value=0;
    chart=makeChart($('demo-chart'),item);
    $('event-buttons').replaceChildren();
    let jumps=[[0,'Start'],[item.duration,'End']];
    if(id==='hesitation')jumps=[[6,'Grasp attempts · 6.0 s'],[11.2,'Continue · 11.2 s']];
    if(id==='failure')jumps=[[7,'After drop · 7.0 s'],[7.5,'Lower prediction · 7.5 s'],[12,'False rise · 12 s']];
    if(id==='regression')jumps=[[7,'Held · 7.0 s'],[7.6,'Drop · 7.6 s'],[15,'Re-grasp · 15.0 s']];
    for(const [t,label] of jumps){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>seek(t));$('event-buttons').append(b);}
    draw();
  }
  for(const tab of document.querySelectorAll('[role="tab"]')){
    tab.addEventListener('click',()=>select(tab.dataset.case));
    tab.addEventListener('keydown',e=>{
      const tabs=[...document.querySelectorAll('[role="tab"]')];let i=tabs.indexOf(tab);
      if(e.key==='ArrowRight')i=(i+1)%tabs.length;
      else if(e.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;
      else if(e.key==='Home')i=0;else if(e.key==='End')i=tabs.length-1;else return;
      e.preventDefault();tabs[i].focus();select(tabs[i].dataset.case);
    });
  }
  slider.addEventListener('input',()=>seek(Number(slider.value)));
  $('demo-chart').addEventListener('click',e=>seek(chart.timeAt(e.clientX)));
  video.addEventListener('timeupdate',()=>{draw();if($('wrist-details').open&&wrist.readyState>0&&Math.abs(wrist.currentTime-video.currentTime)>.2)wrist.currentTime=video.currentTime;});
  video.addEventListener('loadedmetadata',draw);
  video.addEventListener('play',playWrist);
  video.addEventListener('pause',()=>wrist.pause());
  video.addEventListener('ratechange',()=>{wrist.playbackRate=video.playbackRate;});
  video.addEventListener('seeked',()=>{if(wrist.readyState>0)wrist.currentTime=video.currentTime;draw();});
  $('wrist-details').addEventListener('toggle',()=>{if($('wrist-details').open){if(wrist.readyState>0)wrist.currentTime=video.currentTime;playWrist();}else wrist.pause();});
  // Initialization and case changes are synchronous; metadata events use only the active case.
  select(item.id);
  const hero=data.cases[0],heroChart=makeChart($('hero-chart'),hero,true),heroVideo=$('hero-video');
  function heroDraw(){const p=heroChart.update(heroVideo.currentTime||0);$('hero-score').textContent=p.p.toFixed(3);$('hero-time').textContent=`${p.t.toFixed(1)} s`;}
  heroVideo.addEventListener('timeupdate',heroDraw);heroDraw();
  if(!reducedMotion)heroVideo.play().catch(()=>{});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)heroVideo.pause();},{threshold:0}).observe(heroVideo);
  document.documentElement.dataset.ready='true';
}

for(const button of document.querySelectorAll('[data-copy]')){
  button.addEventListener('click',async()=>{
    const text=$(button.dataset.copy).textContent;
    try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copied';$('live-status').textContent='Copied to clipboard';setTimeout(()=>{button.textContent=old;},1600);}
    catch{const range=document.createRange();range.selectNodeContents($(button.dataset.copy));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('live-status').textContent='Text selected. Use your keyboard to copy.';}
  });
}
// Zoom relative to the available width; the scrollable stage also supports touch panning.
const figureStage=$('figure-stage'), figureImage=$('enlarged-figure');
let figureZoom=1, figureWidth=0;
function zoomFigure(value,reset=false){
  const fit=figureStage.clientWidth;
  if(!fit)return;
  const limit=Math.max(8,figureImage.naturalWidth/fit);
  figureZoom=Math.max(1,Math.min(value,limit));
  const oldWidth=figureWidth||fit, nextWidth=fit*figureZoom;
  const x=(figureStage.scrollLeft+fit/2)/oldWidth;
  const y=(figureStage.scrollTop+figureStage.clientHeight/2)/oldWidth;
  figureImage.style.width=`${nextWidth}px`;figureWidth=nextWidth;
  figureStage.scrollLeft=reset?0:x*nextWidth-fit/2;
  figureStage.scrollTop=reset?0:y*nextWidth-figureStage.clientHeight/2;
  $('figure-scale').textContent=`${figureZoom.toFixed(1)}×`;
  $('figure-zoom-out').disabled=figureZoom<=1;
  $('figure-zoom-in').disabled=figureZoom>=limit;
}
figureImage.addEventListener('load',()=>zoomFigure(figureZoom));
for(const button of document.querySelectorAll('[data-zoom]')){
  button.addEventListener('click',()=>{
    figureImage.src=button.dataset.zoom;figureImage.alt=button.dataset.caption;
    $('figure-caption').textContent=button.dataset.caption;
    $('figure-vector').href=button.dataset.zoom.replace(/\.webp$/,'.pdf');
    $('figure-dialog').showModal();zoomFigure(1,true);
  });
}
$('figure-zoom-in').addEventListener('click',()=>zoomFigure(figureZoom*1.5));
$('figure-zoom-out').addEventListener('click',()=>zoomFigure(figureZoom/1.5));
$('figure-fit').addEventListener('click',()=>zoomFigure(1,true));
$('figure-original').addEventListener('click',()=>zoomFigure(figureImage.naturalWidth/figureStage.clientWidth));
window.addEventListener('resize',()=>{if($('figure-dialog').open)zoomFigure(figureZoom);});
$('close-dialog').addEventListener('click',()=>$('figure-dialog').close());
$('figure-dialog').addEventListener('click',e=>{if(e.target===$('figure-dialog'))$('figure-dialog').close();});
fetch('data/site-data.json').then(r=>{if(!r.ok)throw Error(`Content request failed: ${r.status}`);return r.json();}).then(initDemo).catch(error=>{
  $('demo-note').textContent='The interactive demo could not load. Please reload the page or try again later.';
  $('live-status').textContent='Interactive demo unavailable.';console.error(error);
});
