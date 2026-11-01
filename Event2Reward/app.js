(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const modal = $('#figure-modal');
  let previousFocus;
  document.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => {
    previousFocus = button;
    $('#modal-image').src = 'assets/' + button.dataset.zoom;
    $('#modal-image').alt = button.dataset.title;
    $('#modal-title').textContent = button.dataset.title;
    $('#image-original').href = $('#modal-image').src;
    $('.modal-body').classList.remove('zoomed');
    $('#zoom-toggle').textContent = 'Zoom in';
    modal.showModal();
  }));
  $('#modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if(e.target === modal) {const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();} });
  modal.addEventListener('close', () => previousFocus?.focus({preventScroll:true}));
  $('#zoom-toggle').addEventListener('click', () => {
    const enlarged = $('.modal-body').classList.toggle('zoomed');
    $('#zoom-toggle').textContent = enlarged ? 'Fit to window' : 'Zoom in';
  });
  const panelLabels = {performance:'Performance',data:'Data and real robot rollouts',model:'The reward model',tasks:'Downstream tasks'};
  document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-panel]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    const p = button.dataset.panel;
    $('#detail-image').src = 'assets/fig1-'+p+'.webp';
    $('#detail-image').alt = 'Figure 1 · '+panelLabels[p];
    $('#detail-open').dataset.zoom = 'fig1-'+p+'.webp';
    $('#detail-open').dataset.title = 'Figure 1 · '+panelLabels[p];
    $('#detail-caption').textContent = 'An enlarged crop of the '+panelLabels[p].toLowerCase()+' panel in Figure 1. Original content and labels are preserved.';
  }));
  $('#copy-bib').addEventListener('click', async () => {
    try {await navigator.clipboard.writeText($('#bibtex').textContent);$('#copy-status').textContent='BibTeX copied.';}
    catch {const range=document.createRange();range.selectNodeContents($('#bibtex'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('#copy-status').textContent='Citation selected. Copy it with your keyboard.';}
  });
  if(document.body.classList.contains('layout-concise')) {
    const results=$('.results-details');
    const fold=document.createElement('details');fold.className='compact-results';
    const summary=document.createElement('summary');summary.textContent='View per-suite results and learning curves';fold.append(summary);results.before(fold);fold.append(results);
  }
})();
