// Admin – content editing: the worlds in map order (drag, or the handle and the
// arrow keys; each opens to its lessons), the middle column (the picked world's
// form, or a new world / stage / review), a live preview, and the save area.
// The pink + beside the save button opens a menu: a world, a stage, a review.
// Demo: kept in this browser.
(function () {
  const { Worlds, UI } = window.Admin;
  let saved = Worlds.load();
  let list = JSON.parse(JSON.stringify(saved));
  let pickedId = (list[0] || {}).id;
  let mode = 'edit'; // 'edit' | 'world' | 'lesson' | 'review'
  let draft = null; // the new world / review being filled in
  const $ = (id) => document.getElementById(id);
  const items = $('w-items');
  const edit = $('w-edit');
  const live = $('w-live');
  const head = document.querySelector('.a-head');

  const bar = UI.saveBar({
    onSave: () => { Worlds.save(list); saved = JSON.parse(JSON.stringify(list)); },
    onCancel: () => { list = JSON.parse(JSON.stringify(saved)); if (!list.some((w) => w.id === pickedId)) pickedId = (list[0] || {}).id; mode = 'edit'; drawAll(); },
  });
  head.appendChild(bar.el);
  const changed = () => bar.setDirty(JSON.stringify(list) !== JSON.stringify(saved));
  const picked = () => list.find((w) => w.id === pickedId);
  const subOf = (w) => (w.review ? (w.kicker || 'עולם חזרה') : `${w.written} מתוך ${w.planned} שיעורים`);
  const imgSrc = (w, small) => (w.imgData || (w.img ? `assets/${small ? 'map/' : ''}${w.img}.webp` : ''));
  const pic = (w, cls) => (imgSrc(w, true) ? `<img class="${cls}" src="${imgSrc(w, true)}" alt="" onerror="this.onerror=null;this.src='assets/${w.img}.webp'">` : `<span class="${cls} ${cls}--none" aria-hidden="true"></span>`);

  /* ---------- the + menu, beside the save area ---------- */
  const plus = document.createElement('div');
  plus.className = 'w-plus';
  plus.innerHTML = `<button class="w-plus__btn" type="button" id="w-plus" aria-haspopup="menu" aria-expanded="false" aria-controls="w-plus-menu" aria-label="הוספה" title="הוספה"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
    <div class="w-plus__menu" id="w-plus-menu" role="menu" hidden>
      <button type="button" role="menuitem" data-new="world"><span class="w-plus__ic" aria-hidden="true">🏝️</span>הוספת עולם</button>
      <button type="button" role="menuitem" data-new="lesson"><span class="w-plus__ic" aria-hidden="true">📘</span>הוספת שלב</button>
      <button type="button" role="menuitem" data-new="review"><span class="w-plus__ic" aria-hidden="true">🔁</span>הוספת חזרה</button>
    </div>`;
  head.appendChild(plus);
  const plusBtn = $('w-plus');
  const menu = $('w-plus-menu');
  const menuItems = () => [...menu.querySelectorAll('[role="menuitem"]')];
  const openMenu = (focusFirst) => { menu.hidden = false; plusBtn.setAttribute('aria-expanded', 'true'); if (focusFirst) menuItems()[0].focus(); };
  const closeMenu = (back) => { menu.hidden = true; plusBtn.setAttribute('aria-expanded', 'false'); if (back) plusBtn.focus(); };
  plusBtn.addEventListener('click', () => (menu.hidden ? openMenu(false) : closeMenu(false)));
  plusBtn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); openMenu(true); } });
  menu.addEventListener('keydown', (e) => {
    const all = menuItems();
    const i = all.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); all[(i - 1 + all.length) % all.length].focus(); }
    if (e.key === 'Escape') closeMenu(true);
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !plus.contains(e.target)) closeMenu(false); });
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-new]');
    if (!b) return;
    closeMenu(false);
    startNew(b.dataset.new);
  });

  /* ---------- the list ---------- */
  const opened = new Set();
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  function drawList() {
    const pub = list.filter((w) => w.published).length;
    $('w-count').textContent = `${pub} מתוך ${list.length} מפורסמים`;
    items.innerHTML = list.map((w, k) => `<li class="w-item" data-id="${w.id}" aria-current="${mode === 'edit' && w.id === pickedId}">
        <button class="w-grip" type="button" draggable="true" data-grip aria-label="הזזת ${UI.esc(w.name)} – מקום ${k + 1} מתוך ${list.length}. חצים למעלה ולמטה להזזה" aria-describedby="w-howto">${UI.ICON.grip}</button>
        <span class="w-n" aria-hidden="true">${k + 1}</span>
        ${pic(w, 'w-pic')}
        <span class="w-body">
          <button class="w-pick" type="button" data-pick aria-current="${mode === 'edit' && w.id === pickedId}"><b>${UI.esc(w.name) || 'עולם בלי שם'}</b><small>${UI.esc(subOf(w))}</small></button>
          <span class="w-row">
            <span class="a-tag ${w.published ? 'a-tag--live' : 'a-tag--draft'}">${w.published ? 'מפורסם' : 'טיוטה'}</span>
            <button class="w-open" type="button" data-open aria-expanded="${opened.has(w.id)}" aria-label="${opened.has(w.id) ? 'סגירת' : 'פתיחת'} השיעורים של ${UI.esc(w.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
          </span>
        </span>
        ${opened.has(w.id) ? subList(w) : ''}
      </li>`).join('');
  }
  // a world opens to its lessons (a review world: what it goes over)
  function subList(w) {
    if (w.review) {
      return `<ul class="w-sub">
          <li><a class="w-sub__item" href="${w.page || 'review.html'}" target="_blank" rel="noopener"><span><b>${UI.esc(w.name)}</b><small>חזרה על שיעורים ${UI.esc(w.reviewOf || '')}</small></span>${ARROW}</a></li>
        </ul>`;
    }
    const rows = Array.from({ length: w.planned }, (_, k) => {
      const n = (w.firstLesson || 1) + k;
      const page = (w.lessonPages || [])[k];
      const name = (w.lessonNames || [])[k];
      const label = `שיעור ${n}${name ? ` · ${UI.esc(name)}` : ''}`;
      return page
        ? `<li><a class="w-sub__item" href="${page}" target="_blank" rel="noopener"><span><b>${label}</b><small>נכתב · נפתח בלשונית חדשה</small></span>${ARROW}</a></li>`
        : `<li><span class="w-sub__item is-empty"><span><b>${label}</b><small>טרם נכתב</small></span></span></li>`;
    }).join('');
    return `<ul class="w-sub">${rows}<li><button class="w-sub__add" type="button" data-add-lesson>+ הוספת שלב</button></li></ul>`;
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
    if (e.target.closest('[data-add-lesson]')) { startNew('lesson', li.dataset.id); return; }
    pickedId = li.dataset.id;
    mode = 'edit';
    drawAll();
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

  /* ---------- picture or animation of a world ---------- */
  // an image is shrunk and kept; an animation (WEBM / MP4) is shown here only –
  // a video is too big for the browser's storage, it goes up with the site's files
  function mediaField(w) {
    const src = w.imgData || (w.img ? `assets/${w.img}.webp` : '');
    return `<div class="a-field"><span>תמונה או אנימציה של האי</span>
        <div class="w-media">
          <label class="w-media__pic" for="f-media" aria-label="בחירת תמונה או אנימציה">${w.animUrl ? `<video src="${w.animUrl}" autoplay muted loop playsinline></video>` : src ? `<img src="${src}" alt="">` : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'}</label>
          <div>
            <label class="a-btn a-btn--ghost" for="f-media">${src || w.animUrl ? 'החלפה' : 'הוספת תמונה או אנימציה'}</label>
            <small class="a-help" style="display:block;margin-top:6px">${w.animName ? `אנימציה: ${UI.esc(w.animName)} – תעלה לאתר עם הקבצים` : 'PNG או WEBP שקוף; אנימציה: WEBM'}</small>
          </div>
          <input id="f-media" type="file" accept="image/*,video/webm,video/mp4" class="sr-only">
        </div></div>`;
  }
  function readMedia(file, target, done) {
    if (!file) return;
    if (file.type.startsWith('video/')) {
      target.animUrl = URL.createObjectURL(file);
      target.animName = file.name;
      done();
      return;
    }
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const W = Math.min(600, img.width);
      const H = Math.round(img.height * (W / img.width));
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      target.imgData = c.toDataURL('image/webp', 0.85);
      delete target.animUrl; delete target.animName;
      URL.revokeObjectURL(url);
      done();
    };
    img.src = url;
  }

  /* ---------- the middle column ---------- */
  const where = (sel) => `<label class="a-field"><span>מיקום במפה</span><select id="${sel}">
      <option value="0">בהתחלה</option>
      ${list.map((w, k) => `<option value="${k + 1}"${k === list.length - 1 ? ' selected' : ''}>אחרי ${UI.esc(w.name)}</option>`).join('')}
    </select><small class="a-help">איפה העולם יופיע במסלול האיים</small></label>`;

  function startNew(kind, worldId) {
    mode = kind;
    const nReviews = list.filter((w) => w.review).length;
    if (kind === 'world') draft = { id: `n${Date.now()}`, name: '', kicker: '', head1: '', head2: '', title: '', text: '', img: '', page: '', review: false, planned: 3, written: 0, lessonPages: [], lessonNames: [], firstLesson: 1, published: false };
    if (kind === 'review') draft = { id: `n${Date.now()}`, name: `חזרה ${nReviews + 1}`, kicker: '', head1: 'אי החזרות', head2: '', title: 'זמן לחזרה!', text: '', img: 'island-review-still', page: 'review.html', review: true, reviewOf: '', planned: 0, written: 0, lessonPages: [], lessonNames: [], published: false };
    if (kind === 'lesson') draft = { worldId: worldId || (list.find((w) => !w.review) || {}).id, name: '', at: null };
    drawAll();
    const first = edit.querySelector('input, select, textarea');
    if (first) first.focus();
  }

  function drawEdit() {
    if (mode === 'world') return drawNewWorld();
    if (mode === 'review') return drawNewReview();
    if (mode === 'lesson') return drawNewLesson();
    const w = picked();
    if (!w) { edit.innerHTML = '<div class="a-card"><p class="a-muted">אין עולמות. אפשר להוסיף עולם בכפתור +.</p></div>'; return; }
    const pct = w.planned ? Math.min(100, Math.round((w.written / w.planned) * 100)) : 0;
    edit.innerHTML = `<div class="a-card w-sections">
        <section aria-labelledby="w-title">
          <p class="w-kind">${w.review ? 'עולם חזרה' : 'עולם'}</p>
          <h2 class="w-name" id="w-title">${UI.esc(w.name) || 'עולם בלי שם'}</h2>
          <label class="a-field"><span>השם (במפה ובתפריט)</span><input id="f-name" value="${UI.esc(w.name)}"></label>
          <div class="a-grid w-heads">
            <label class="a-field"><span>הכותרת בדף העולם – שורה 1</span><input id="f-head1" value="${UI.esc(w.head1 || '')}"></label>
            <label class="a-field"><span>שורה 2</span><input id="f-head2" value="${UI.esc(w.head2 || '')}"></label>
          </div>
          <label class="a-field"><span>שורת משנה</span><input id="f-kicker" value="${UI.esc(w.kicker)}"><small class="a-help">למשל "שיעורים 2-4"</small></label>
          ${mediaField(w)}
        </section>
        <section aria-labelledby="sec-about">
          <h3 id="sec-about">חלון "אודות" במפה</h3>
          <label class="a-field"><span>כותרת ה"אודות" במפה</span><input id="f-title" value="${UI.esc(w.title)}"></label>
          <label class="a-field"><span>טקסט ה"אודות" במפה</span><textarea id="f-text">${UI.esc(w.text)}</textarea><small class="a-help">משפט או שניים: מה לומדים בעולם הזה</small></label>
        </section>
        <section aria-labelledby="sec-lessons">
          <h3 id="sec-lessons">שיעורים</h3>
          ${w.review ? `<label class="a-field"><span>על אילו שיעורים החזרה</span><input id="f-reviewof" dir="ltr" value="${UI.esc(w.reviewOf || '')}" placeholder="1-10"></label>` : `
          <div class="w-lessons">
            <div class="a-field"><span id="lbl-planned">כמה שיעורים מתוכננים בעולם</span>${UI.stepperHtml('f-planned', w.planned, 'כמה שיעורים מתוכננים בעולם', Math.max(1, w.written), 60)}<small class="a-help">למספור במפה, עד שכל השיעורים ייכתבו</small></div>
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

  function newFoot(label) {
    return `<div class="w-new__foot"><button class="a-btn a-btn--primary" type="submit">${label}</button><button class="a-btn a-btn--ghost" type="button" data-new-cancel>ביטול</button></div>`;
  }
  function drawNewWorld() {
    const d = draft;
    edit.innerHTML = `<form class="a-card w-sections w-new" id="w-new-form" novalidate>
        <section aria-labelledby="w-title">
          <p class="w-kind">עולם חדש</p>
          <h2 class="w-name" id="w-title">${UI.esc(d.name) || 'עולם חדש'}</h2>
          <label class="a-field"><span>שם העולם (במפה ובתפריט)</span><input id="n-name" value="${UI.esc(d.name)}" required></label>
          <div class="a-grid w-heads">
            <label class="a-field"><span>הכותרת בדף העולם – שורה 1</span><input id="n-head1" value="${UI.esc(d.head1)}"></label>
            <label class="a-field"><span>שורה 2</span><input id="n-head2" value="${UI.esc(d.head2)}"></label>
          </div>
          ${where('n-at')}
          ${mediaField(d)}
        </section>
        <section aria-labelledby="sec-about">
          <h3 id="sec-about">חלון "אודות" במפה</h3>
          <label class="a-field"><span>כותרת ה"אודות" במפה</span><input id="n-title" value="${UI.esc(d.title)}"></label>
          <label class="a-field"><span>טקסט ה"אודות" במפה</span><textarea id="n-text">${UI.esc(d.text)}</textarea></label>
        </section>
        <section aria-labelledby="sec-lessons">
          <h3 id="sec-lessons">שיעורים</h3>
          <div class="a-field"><span>כמה שיעורים מתוכננים בעולם</span>${UI.stepperHtml('n-planned', d.planned, 'כמה שיעורים מתוכננים בעולם', 1, 60)}<small class="a-help">למספור במפה, עד שכל השיעורים ייכתבו</small></div>
        </section>
        ${newFoot('יצירת העולם')}
      </form>`;
    refreshSteppers();
  }
  function drawNewReview() {
    const d = draft;
    edit.innerHTML = `<form class="a-card w-sections w-new" id="w-new-form" novalidate>
        <section aria-labelledby="w-title">
          <p class="w-kind">חזרה חדשה</p>
          <h2 class="w-name" id="w-title">${UI.esc(d.name) || 'חזרה חדשה'}</h2>
          <label class="a-field"><span>שם החזרה</span><input id="n-name" value="${UI.esc(d.name)}" required></label>
          <label class="a-field"><span>על אילו שיעורים החזרה</span><input id="n-reviewof" dir="ltr" value="${UI.esc(d.reviewOf)}" placeholder="1-10" required><small class="a-help">מספר השיעור הראשון והאחרון, למשל 1-21</small></label>
          ${where('n-at')}
          ${mediaField(d)}
        </section>
        <section aria-labelledby="sec-about">
          <h3 id="sec-about">חלון "אודות" במפה</h3>
          <label class="a-field"><span>כותרת ה"אודות" במפה</span><input id="n-title" value="${UI.esc(d.title)}"></label>
          <label class="a-field"><span>טקסט ה"אודות" במפה</span><textarea id="n-text">${UI.esc(d.text)}</textarea></label>
        </section>
        ${newFoot('יצירת החזרה')}
      </form>`;
  }
  function drawNewLesson() {
    const d = draft;
    const worlds = list.filter((w) => !w.review);
    const w = list.find((x) => x.id === d.worldId) || worlds[0];
    if (!w) { edit.innerHTML = '<div class="a-card"><p class="a-muted">אין עולמות שאפשר להוסיף להם שלב.</p></div>'; return; }
    const at = d.at == null ? w.planned : d.at;
    edit.innerHTML = `<form class="a-card w-sections w-new" id="w-new-form" novalidate>
        <section aria-labelledby="w-title">
          <p class="w-kind">שלב חדש</p>
          <h2 class="w-name" id="w-title">${UI.esc(d.name) || 'שלב חדש'}</h2>
          <label class="a-field"><span>באיזה עולם</span><select id="n-world">${worlds.map((x) => `<option value="${x.id}"${x.id === w.id ? ' selected' : ''}>${UI.esc(x.name)}</option>`).join('')}</select></label>
          <label class="a-field"><span>שם השלב</span><input id="n-name" value="${UI.esc(d.name)}" placeholder="למשל: קריאת משפטים" required></label>
          <label class="a-field"><span>מיקום בעולם</span><select id="n-at">
            <option value="0"${at === 0 ? ' selected' : ''}>בהתחלה</option>
            ${Array.from({ length: w.planned }, (_, k) => `<option value="${k + 1}"${at === k + 1 ? ' selected' : ''}>אחרי שיעור ${(w.firstLesson || 1) + k}</option>`).join('')}
          </select><small class="a-help">השלב יקבל את המספר שלו לפי המקום. דף השלב ייכתב בנפרד, ועד אז הוא "טרם נכתב".</small></label>
        </section>
        ${newFoot('הוספת השלב')}
      </form>`;
  }

  // wired once: the form is redrawn, the listener stays on its box
  const refreshSteppers = UI.wireSteppers(edit, (id, v) => {
    if (id === 'n-planned') { draft.planned = v; return; }
    picked().planned = v; drawList(); drawLessonsProgress(); drawPreview(); changed();
  });
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

  // typing updates the list, the preview and the save area at once
  edit.addEventListener('input', (e) => {
    const id = e.target.id;
    if (mode !== 'edit') {
      const key = { 'n-name': 'name', 'n-head1': 'head1', 'n-head2': 'head2', 'n-title': 'title', 'n-text': 'text', 'n-reviewof': 'reviewOf' }[id];
      if (!key) return;
      draft[key] = e.target.value;
      if (key === 'name') $('w-title').textContent = draft.name || ({ world: 'עולם חדש', review: 'חזרה חדשה', lesson: 'שלב חדש' })[mode];
      if (mode !== 'lesson') drawPreview();
      return;
    }
    const w = picked();
    const key = { 'f-name': 'name', 'f-head1': 'head1', 'f-head2': 'head2', 'f-kicker': 'kicker', 'f-title': 'title', 'f-text': 'text', 'f-reviewof': 'reviewOf' }[id];
    if (!w || !key) return;
    w[key] = e.target.value;
    if (key === 'reviewOf') w.kicker = `חזרה על שיעורים ${w.reviewOf}`;
    if (key === 'name') $('w-title').textContent = w.name || 'עולם בלי שם';
    drawList();
    drawPreview();
    changed();
  });
  edit.addEventListener('change', (e) => {
    if (e.target.id === 'f-media' || e.target.id === 'n-media') return;
    if (e.target.id === 'n-world') { draft.worldId = e.target.value; draft.at = null; drawNewLesson(); $('n-world').focus(); }
    if (e.target.id === 'n-at' && mode === 'lesson') draft.at = Number(e.target.value);
  });
  edit.addEventListener('change', (e) => {
    if (e.target.id !== 'f-media') return;
    const target = mode === 'edit' ? picked() : draft;
    readMedia(e.target.files && e.target.files[0], target, () => {
      if (mode === 'edit') { drawList(); changed(); }
      drawEdit();
      drawPreview();
    });
  });
  edit.addEventListener('click', (e) => {
    if (!e.target.closest('[data-new-cancel]')) return;
    mode = 'edit';
    draft = null;
    drawAll();
  });
  edit.addEventListener('submit', (e) => {
    if (e.target.id !== 'w-new-form') return;
    e.preventDefault();
    const name = ($('n-name').value || '').trim();
    if (!name) { $('n-name').focus(); return; }
    if (mode === 'lesson') {
      const w = list.find((x) => x.id === draft.worldId);
      const at = Number($('n-at').value);
      w.lessonNames = w.lessonNames || [];
      while (w.lessonNames.length < w.planned) w.lessonNames.push('');
      w.lessonNames.splice(at, 0, name);
      w.planned += 1;
      opened.add(w.id);
      pickedId = w.id;
      live.textContent = `השלב "${name}" נוסף ל${w.name}`;
    } else {
      if (mode === 'review' && !($('n-reviewof').value || '').trim()) { $('n-reviewof').focus(); return; }
      const at = Number($('n-at').value);
      const w = { ...draft, name };
      if (w.review) w.kicker = `חזרה על שיעורים ${w.reviewOf}`;
      delete w.animUrl; // a video stays here only; its name is kept
      list.splice(at, 0, w);
      pickedId = w.id;
      live.textContent = `${name} נוסף/ה במקום ${at + 1}`;
    }
    mode = 'edit';
    draft = null;
    drawAll();
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
    const w = mode === 'world' || mode === 'review' ? draft : mode === 'lesson' ? list.find((x) => x.id === draft.worldId) : picked();
    const map = $('w-map');
    const pub = $('w-pubbox');
    if (!w) { map.innerHTML = ''; pub.innerHTML = ''; return; }
    pub.innerHTML = mode !== 'edit' ? '' : `<div class="w-pub">
        ${UI.switchHtml('f-pub', w.published, 'מפורסם לתלמידים')}
        <p class="w-pub__text"><b>${w.published ? 'מפורסם' : 'טיוטה'}</b>${w.published ? 'העולם מופיע לתלמידים במפה' : 'העולם מוסתר מהתלמידים עד שיפורסם'}</p>
      </div>
      ${w.published && Worlds.isDemo(w) ? `<div class="a-note a-note--warn w-warn">${UI.ICON.warn}<p>העולם מפורסם, אבל בחלון ה"אודות" שלו עדיין יש טקסט דמו. כדאי להחליף אותו בטקסט האמיתי.</p></div>` : ''}`;
    const src = imgSrc(w, false);
    map.innerHTML = `${w.published ? '' : '<span class="a-tag a-tag--draft w-map__draft">טיוטה – לא מופיע לתלמידים</span>'}
      ${w.animUrl ? `<video class="w-map__island" src="${w.animUrl}" autoplay muted loop playsinline></video>` : src ? `<img class="w-map__island" src="${src}" alt="">` : '<div class="w-map__none">אין עדיין תמונה לעולם</div>'}
      <div class="w-map__bubble">
        <p class="w-map__name">${UI.esc(w.name) || '<span class="a-muted">(בלי שם)</span>'}</p>
        ${w.kicker ? `<p class="w-map__kicker">${UI.esc(w.kicker)}</p>` : ''}
        <p class="w-map__title">${UI.esc(w.title) || '<span class="a-muted">(בלי כותרת)</span>'}</p>
        <p class="w-map__text">${UI.esc(w.text) || '<span class="a-muted">(בלי טקסט)</span>'}</p>
      </div>`;
  }

  function drawAll() { drawList(); drawEdit(); drawPreview(); }
  drawAll();
})();
