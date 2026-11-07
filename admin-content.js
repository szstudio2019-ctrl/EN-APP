// Admin – content editing: the worlds in map order (drag, or the handle and the
// arrow keys), the picked world's form (names, the map's "about" window, the
// lessons), a live preview, and the sticky save bar. Demo: kept in this browser.
(function () {
  const { Worlds, UI } = window.Admin;
  let saved = Worlds.load();
  let list = JSON.parse(JSON.stringify(saved));
  let pickedId = (list[0] || {}).id;
  const $ = (id) => document.getElementById(id);
  const items = $('w-items');
  const edit = $('w-edit');
  const live = $('w-live');

  const bar = UI.saveBar({
    onSave: () => { Worlds.save(list); saved = JSON.parse(JSON.stringify(list)); },
    onCancel: () => { list = JSON.parse(JSON.stringify(saved)); if (!list.some((w) => w.id === pickedId)) pickedId = (list[0] || {}).id; drawAll(); },
  });
  document.querySelector('.a-head').appendChild(bar.el);
  const changed = () => bar.setDirty(JSON.stringify(list) !== JSON.stringify(saved));
  const picked = () => list.find((w) => w.id === pickedId);
  const subOf = (w) => (w.review ? (w.kicker || 'עולם חזרה') : `${w.written} מתוך ${w.planned} שיעורים`);
  const pic = (w, cls) => (w.img ? `<img class="${cls}" src="assets/map/${w.img}.webp" alt="" onerror="this.src='assets/${w.img}.webp'">` : `<span class="${cls} ${cls}--none" aria-hidden="true"></span>`);

  /* ---------- the list ---------- */
  function drawList() {
    const pub = list.filter((w) => w.published).length;
    $('w-count').textContent = `${pub} מתוך ${list.length} מפורסמים`;
    items.innerHTML = list.map((w, k) => `<li class="w-item" data-id="${w.id}" aria-current="${w.id === pickedId}">
        <button class="w-grip" type="button" draggable="true" data-grip aria-label="הזזת ${UI.esc(w.name)} – מקום ${k + 1} מתוך ${list.length}. חצים למעלה ולמטה להזזה" aria-describedby="w-howto">${UI.ICON.grip}</button>
        <span class="w-n" aria-hidden="true">${k + 1}</span>
        ${pic(w, 'w-pic')}
        <button class="w-pick" type="button" data-pick aria-current="${w.id === pickedId}"><b>${UI.esc(w.name) || 'עולם בלי שם'}</b><small>${UI.esc(subOf(w))}</small></button>
        <span class="a-tag ${w.published ? 'a-tag--live' : 'a-tag--draft'}">${w.published ? 'מפורסם' : 'טיוטה'}</span>
        <button class="w-open" type="button" data-open aria-expanded="${opened.has(w.id)}" aria-label="${opened.has(w.id) ? 'סגירת' : 'פתיחת'} השיעורים של ${UI.esc(w.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
        ${opened.has(w.id) ? subList(w) : ''}
      </li>`).join('');
  }
  // a world opens to its lessons (a review world: what it goes over)
  const opened = new Set();
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  function subList(w) {
    if (w.review) {
      return `<ul class="w-sub">
          <li><a class="w-sub__item" href="${w.page || 'review.html'}" target="_blank" rel="noopener"><span><b>${UI.esc(w.name)}</b><small>חזרה על שיעורים ${UI.esc(w.reviewOf || '')}</small></span>${ARROW}</a></li>
        </ul>`;
    }
    const rows = Array.from({ length: w.planned }, (_, k) => {
      const n = (w.firstLesson || 1) + k;
      const page = (w.lessonPages || [])[k];
      return page
        ? `<li><a class="w-sub__item" href="${page}" target="_blank" rel="noopener"><span><b>שיעור ${n}</b><small>נכתב · נפתח בלשונית חדשה</small></span>${ARROW}</a></li>`
        : `<li><span class="w-sub__item is-empty"><span><b>שיעור ${n}</b><small>טרם נכתב</small></span></span></li>`;
    }).join('');
    return `<ul class="w-sub">${rows}<li><button class="w-sub__add" type="button" data-add-lesson>+ הוספת שיעור</button></li></ul>`;
  }
  items.addEventListener('click', (e) => {
    const li = e.target.closest('.w-item');
    if (!li || e.target.closest('[data-grip]')) return;
    if (e.target.closest('.w-sub a')) return; // a lesson link opens its page
    if (e.target.closest('[data-open]')) {
      if (opened.has(li.dataset.id)) opened.delete(li.dataset.id); else opened.add(li.dataset.id);
      drawList();
      const b = items.querySelector(`.w-item[data-id="${li.dataset.id}"] [data-open]`);
      if (b) b.focus();
      return;
    }
    if (e.target.closest('[data-add-lesson]')) {
      const w = list.find((x) => x.id === li.dataset.id);
      w.planned += 1;
      pickedId = w.id;
      drawList(); drawEdit(); drawPreview(); changed();
      return;
    }
    pickedId = li.dataset.id;
    drawList();
    drawEdit();
    drawPreview();
  });

  // move a world from one place to another, and say so for screen readers
  function move(from, to) {
    if (to < 0 || to >= list.length || from === to) return;
    const [w] = list.splice(from, 1);
    list.splice(to, 0, w);
    drawList();
    live.textContent = `${w.name} הועבר/ה למקום ${to + 1} מתוך ${list.length}`;
    changed();
  }
  items.addEventListener('keydown', (e) => {
    const g = e.target.closest('[data-grip]');
    if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const id = g.closest('.w-item').dataset.id;
    const from = list.findIndex((w) => w.id === id);
    move(from, from + (e.key === 'ArrowUp' ? -1 : 1));
    items.querySelector(`.w-item[data-id="${id}"] [data-grip]`).focus();
  });

  // drag and drop by the handle
  let dragId = null;
  const clearOver = () => items.querySelectorAll('.is-over-before, .is-over-after').forEach((x) => x.classList.remove('is-over-before', 'is-over-after'));
  items.addEventListener('dragstart', (e) => {
    const g = e.target.closest('[data-grip]');
    if (!g) { e.preventDefault(); return; }
    const li = g.closest('.w-item');
    dragId = li.dataset.id;
    li.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
    try { e.dataTransfer.setDragImage(li, 20, 20); } catch (err) { /* older browsers */ }
  });
  items.addEventListener('dragover', (e) => {
    const li = e.target.closest('.w-item');
    if (!dragId || !li) return;
    e.preventDefault();
    clearOver();
    const r = li.getBoundingClientRect();
    li.classList.add(e.clientY < r.top + r.height / 2 ? 'is-over-before' : 'is-over-after');
  });
  items.addEventListener('drop', (e) => {
    const li = e.target.closest('.w-item');
    if (!dragId || !li) return;
    e.preventDefault();
    const from = list.findIndex((w) => w.id === dragId);
    let to = list.findIndex((w) => w.id === li.dataset.id);
    if (li.classList.contains('is-over-after')) to += 1;
    if (from < to) to -= 1;
    clearOver();
    move(from, to);
  });
  items.addEventListener('dragend', () => { dragId = null; clearOver(); items.querySelectorAll('.is-dragging').forEach((x) => x.classList.remove('is-dragging')); });

  $('w-add').addEventListener('click', () => {
    const w = { id: `n${Date.now()}`, name: 'עולם חדש', kicker: '', title: '', text: '', img: '', page: '', review: false, planned: 3, written: 0, published: false };
    list.push(w);
    pickedId = w.id;
    drawAll();
    changed();
    $('f-name').focus();
    $('f-name').select();
  });

  /* ---------- the form ---------- */
  function drawEdit() {
    const w = picked();
    if (!w) { edit.innerHTML = '<div class="a-card"><p class="a-muted">אין עולמות. אפשר להוסיף עולם מהרשימה.</p></div>'; return; }
    const pct = w.planned ? Math.min(100, Math.round((w.written / w.planned) * 100)) : 0;
    edit.innerHTML = `<div class="a-card w-sections">
        <section aria-labelledby="w-title">
          <h2 class="w-name" id="w-title">${UI.esc(w.name) || 'עולם בלי שם'}</h2>
          <label class="a-field"><span>שם העולם</span><input id="f-name" value="${UI.esc(w.name)}"><small class="a-help">מופיע ברשימות, בתפריט ובחלון ה"אודות"</small></label>
          <label class="a-field"><span>שורת משנה</span><input id="f-kicker" value="${UI.esc(w.kicker)}"><small class="a-help">למשל "שיעורים 2-4"</small></label>
        </section>
        <section aria-labelledby="sec-about">
          <h3 id="sec-about">חלון "אודות" במפה</h3>
          <label class="a-field"><span>כותרת</span><input id="f-title" value="${UI.esc(w.title)}"></label>
          <label class="a-field"><span>טקסט</span><textarea id="f-text">${UI.esc(w.text)}</textarea><small class="a-help">משפט או שניים: מה לומדים בעולם הזה</small></label>
        </section>
        <section aria-labelledby="sec-lessons">
          <h3 id="sec-lessons">שיעורים</h3>
          ${w.review ? '<p class="a-muted" style="margin:0">עולם חזרה: אין לו שיעורים משלו, הוא חוזר על השיעורים שלפניו.</p>' : `
          <div class="w-lessons">
            <div class="a-field"><span id="lbl-planned">כמות שיעורים מתוכננת</span>${UI.stepperHtml('f-planned', w.planned, 'כמות שיעורים מתוכננת', Math.max(1, w.written), 60)}</div>
            <div class="w-progress">
              <p>נכתבו ${w.written} מתוך ${w.planned}</p>
              <div class="a-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${w.planned}" aria-valuenow="${w.written}" aria-label="שיעורים שנכתבו"><i style="width:${pct}%"></i></div>
            </div>
          </div>
          ${w.page ? `<p style="margin:16px 0 0"><a class="a-link" href="${w.page}" target="_blank" rel="noopener">עריכת השיעורים</a> <span class="a-small a-muted">(נפתח בלשונית חדשה)</span></p>` : ''}`}
        </section>
      </div>`;
    refreshSteppers();
  }
  // wired once: the form is redrawn, the listener stays on its box
  const refreshSteppers = UI.wireSteppers(edit, (id, v) => { picked().planned = v; drawList(); drawLessonsProgress(); drawPreview(); changed(); });
  function drawLessonsProgress() {
    const w = picked();
    const box = edit.querySelector('.w-progress');
    if (!box || !w) return;
    const pct = w.planned ? Math.min(100, Math.round((w.written / w.planned) * 100)) : 0;
    box.querySelector('p').textContent = `נכתבו ${w.written} מתוך ${w.planned}`;
    const b = box.querySelector('.a-bar');
    b.setAttribute('aria-valuemax', w.planned);
    b.querySelector('i').style.width = `${pct}%`;
  }
  // typing updates the list, the preview and the save bar at once
  edit.addEventListener('input', (e) => {
    const w = picked();
    const map = { 'f-name': 'name', 'f-kicker': 'kicker', 'f-title': 'title', 'f-text': 'text' };
    const key = map[e.target.id];
    if (!w || !key) return;
    w[key] = e.target.value;
    if (key === 'name') $('w-title').textContent = w.name || 'עולם בלי שם';
    drawList();
    drawPreview();
    changed();
  });
  // publishing: under the map preview
  $('w-pubbox').addEventListener('change', (e) => {
    if (e.target.id !== 'f-pub') return;
    picked().published = e.target.checked;
    drawList();
    drawPreview();
    changed();
    $('f-pub').focus();
  });

  /* ---------- preview ---------- */
  function drawPreview() {
    const w = picked();
    const map = $('w-map');
    const pub = $('w-pubbox');
    if (!w) { map.innerHTML = ''; pub.innerHTML = ''; return; }
    pub.innerHTML = `<div class="w-pub">
        ${UI.switchHtml('f-pub', w.published, 'מפורסם לתלמידים')}
        <p class="w-pub__text"><b>${w.published ? 'מפורסם' : 'טיוטה'}</b>${w.published ? 'העולם מופיע לתלמידים במפה' : 'העולם מוסתר מהתלמידים עד שיפורסם'}</p>
      </div>
      ${w.published && Worlds.isDemo(w) ? `<div class="a-note a-note--warn w-warn">${UI.ICON.warn}<p>העולם מפורסם, אבל בחלון ה"אודות" שלו עדיין יש טקסט דמו. כדאי להחליף אותו בטקסט האמיתי.</p></div>` : ''}`;
    map.innerHTML = `${w.published ? '' : '<span class="a-tag a-tag--draft w-map__draft">טיוטה – לא מופיע לתלמידים</span>'}
      ${w.img ? `<img class="w-map__island" src="assets/${w.img}.webp" alt="">` : '<div class="w-map__none">אין עדיין תמונה לעולם</div>'}
      <div class="w-map__bubble">
        <p class="w-map__name">${UI.esc(w.name)}</p>
        ${w.kicker ? `<p class="w-map__kicker">${UI.esc(w.kicker)}</p>` : ''}
        <p class="w-map__title">${UI.esc(w.title) || '<span class="a-muted">(בלי כותרת)</span>'}</p>
        <p class="w-map__text">${UI.esc(w.text) || '<span class="a-muted">(בלי טקסט)</span>'}</p>
      </div>`;
  }

  function drawAll() { drawList(); drawEdit(); drawPreview(); }
  drawAll();
})();
