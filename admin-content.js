// Admin – content editing: the worlds in map order (drag, or the handle and the
// arrow keys; each opens to its lessons), the middle column (the picked world's
// form, or a new world / stage / review), a live preview, and the save area.
// The pink + beside the save button opens a menu: a world, a stage, a review.
// Demo: kept in this browser.
(function () {
  const { Worlds, UI } = window.Admin;
  let saved = Worlds.load();
  saved.forEach((w) => { delete w.animUrl; delete w.bgVideoUrl; }); // a video's address lasts only until the page closes
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
  plus.innerHTML = `<button class="w-plus__btn" type="button" id="w-plus" aria-haspopup="menu" aria-expanded="false" aria-controls="w-plus-menu" ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>הוספה</span></button>
    <div class="w-plus__menu" id="w-plus-menu" role="menu" hidden>
      <button type="button" role="menuitem" data-new="world"><span class="w-plus__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 15h18l-3 3.5H6z"/><path d="M9 21l1-2.5M15 21l-1-2.5"/><path d="M12 15V8"/><path d="M12 8c-1.5-2-4-2.3-5.5-1.2M12 8c1.5-2 4-2.3 5.5-1.2M12 8c-.6-2.2.4-4 2-4.8"/></svg></span>הוספת עולם</button>
      <button type="button" role="menuitem" data-new="lesson"><span class="w-plus__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z"/><path d="M12 6.5v13"/></svg></span>הוספת שלב</button>
      <button type="button" role="menuitem" data-new="review"><span class="w-plus__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg></span>הוספת חזרה</button>
    </div>`;
  head.appendChild(plus);
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'a-btn w-delete';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg><span>מחיקה</span>';
  plus.after(delBtn);
  delBtn.addEventListener('click', () => {
    const w = mode === 'edit' && picked();
    if (!w) return;
    if (!confirm(`למחוק את "${w.name || 'האי'}"? אפשר לבטל עד השמירה.`)) return;
    const at = list.findIndex((x) => x.id === w.id);
    list.splice(at, 1);
    pickedId = (list[Math.min(at, list.length - 1)] || {}).id;
    drawAll(); changed();
  });
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
      return `<li><button class="w-sub__item${page ? '' : ' is-empty'}" type="button" data-sub-lesson="${k}"><span><b>${label}</b><small>${page ? 'נכתב' : 'טרם נכתב'} · עריכה</small></span>${ARROW}</button></li>`;
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
    const sub = e.target.closest('[data-sub-lesson]');
    if (sub) {
      mode = 'edit'; draft = null;
      pickedId = li.dataset.id;
      secTab = 'lessons';
      lessonOpen = Number(sub.dataset.subLesson);
      drawAll();
      const t = edit.querySelector(`[data-ldesc="${lessonOpen}"]`);
      if (t) t.focus();
      return;
    }
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
  // the island page's background picture
  const BG = {
    'letters.html': 'assets/world-letters-bg.webp', 'doctor.html': 'assets/doctor-world-bg.jpg', 'smiles.html': 'assets/world-smiles-bg.webp',
    'single.html': 'assets/world-single-bg.webp', 'blending.html': 'assets/world-blending-bg.webp', 'whistling.html': 'assets/world-whistling-bg.webp',
    'magic.html': 'assets/world-magic-bg.webp', 'sounds.html': 'assets/world-sounds-bg.webp', 'review.html': 'assets/world-review-bg-hd.webp',
  };
  const bgOf = (w) => w.bgData || BG[w.page] || '';
  function bgField(w) {
    const src = bgOf(w);
    const has = src || w.bgVideoUrl;
    return `<div class="a-field w-bgfield"><span>תמונה או וידאו ברקע של דף האי</span>
        <div class="w-media">
          <label class="w-media__pic w-media__pic--bg" for="f-bg" aria-label="בחירת תמונה או וידאו לרקע">${w.bgVideoUrl ? `<video src="${w.bgVideoUrl}" autoplay muted loop playsinline></video>` : src ? `<img src="${src}" alt="">` : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="9" r="1.5"/></svg>'}</label>
          <div>
            <label class="a-btn a-btn--ghost" for="f-bg">${has ? 'החלפה' : 'הוספת תמונה או וידאו'}</label>
            <small class="a-help" style="display:block;margin-top:6px">${w.bgVideoName ? `וידאו: ${UI.esc(w.bgVideoName)} – יעלה לאתר עם הקבצים` : 'רחב, 1920×1080 · JPG או WEBP; וידאו: MP4 או WEBM'}</small>
          </div>
          <input id="f-bg" type="file" accept="image/*,video/mp4,video/webm" class="sr-only">
        </div></div>`;
  }
  function readBg(file, target, done) {
    if (!file) return;
    // a video is shown here only: it is too big for the browser's storage (its name is kept)
    if (file.type.startsWith('video/')) {
      target.bgVideoUrl = URL.createObjectURL(file);
      target.bgVideoName = file.name;
      delete target.bgData;
      done();
      return;
    }
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const W = Math.min(1280, img.width);
      const H = Math.round(img.height * (W / img.width));
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      target.bgData = c.toDataURL('image/webp', 0.8);
      delete target.bgVideoUrl; delete target.bgVideoName;
      URL.revokeObjectURL(url);
      done();
    };
    img.src = url;
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

  // the picked island's name joins the page title: "עריכת איים – <name>"
  function setH1(name) {
    const h1 = document.querySelector('.a-head h1');
    if (!h1) return;
    let span = h1.querySelector('.a-h1-island');
    if (!span) { span = document.createElement('span'); span.className = 'a-h1-island'; h1.appendChild(span); }
    span.textContent = name ? ` – ${name}` : '';
  }
  // tabs over the middle column: its parts (the island's details, media, the map's "about", lessons)
  const SECS = [['details', 'פרטי האי'], ['media', 'מדיה'], ['about', 'חלון "אודות" במפה'], ['lessons', 'שיעורים']];
  let secTab = 'details';
  let lessonOpen = -1;
  function wTabs() {
    return `<div class="w-tabs" role="tablist" aria-label="חלקי העריכה">
        ${SECS.map(([k, t]) => `<button type="button" role="tab" data-wtab="${k}" aria-selected="${secTab === k}">${t}</button>`).join('')}
      </div>`;
  }
  function lessonsPart(w) {
    if (w.review) return `<label class="a-field"><span>על אילו שיעורים החזרה</span><input id="f-reviewof" dir="ltr" value="${UI.esc(w.reviewOf || '')}" placeholder="1-10"></label>`;
    const pct = w.planned ? Math.min(100, Math.round((w.written / w.planned) * 100)) : 0;
    const rows = Array.from({ length: w.planned }, (_, k) => {
      const n = (w.firstLesson || 1) + k;
      const page = (w.lessonPages || [])[k];
      const open = lessonOpen === k;
      const desc = (w.lessonDescs || [])[k] || '';
      return `<li class="w-lrow${open ? ' is-open' : ''}">
          <b class="w-lrow__n">שיעור ${n}</b>
          <input data-lname="${k}" value="${UI.esc((w.lessonNames || [])[k] || '')}" placeholder="שם השיעור (לא חובה)" aria-label="השם של שיעור ${n}">
          ${page ? `<span class="a-tag a-tag--live">נכתב</span><a class="w-lrow__open" href="${page}?view=admin" target="_blank" rel="noopener" aria-label="פתיחת שיעור ${n} (בלשונית חדשה)" title="פתיחת השיעור"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></a>`
            : `<span class="a-tag a-tag--draft">טרם נכתב</span><button class="w-lrow__del" type="button" data-lesson-del="${k}" aria-label="מחיקת שיעור ${n}" title="מחיקה"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg></button>`}
          <button class="w-lrow__edit" type="button" data-lesson-edit="${k}" aria-expanded="${open}" aria-label="עריכת שיעור ${n}" title="עריכה"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>
          ${open ? `<div class="w-lrow__more">
              <label class="a-field"><span>תיאור השיעור</span><textarea data-ldesc="${k}" placeholder="מה לומדים בשיעור הזה">${UI.esc(desc)}</textarea></label>
              ${page ? `<div class="w-lrow__links"><a class="a-btn a-btn--ghost" href="${page}?view=admin" target="_blank" rel="noopener">פתיחת השיעור</a></div>` : '<small class="a-help">השיעור עוד לא נכתב – הוא יופיע במפה כשייכתב</small>'}
            </div>` : ''}
        </li>`;
    }).join('');
    return `<div class="w-progress">
          <p>נכתבו ${w.written} מתוך ${w.planned}</p>
          <div class="a-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${w.planned}" aria-valuenow="${w.written}" aria-label="שיעורים שנכתבו"><i style="width:${pct}%"></i></div>
        </div>
        <ol class="w-lrows">${rows}</ol>
        <button class="a-btn a-btn--ghost w-ladd" type="button" data-wtab-add>+ הוספת שיעור</button>`;
  }
  function drawEdit() {
    if (mode === 'world') { setH1(''); return drawNewWorld(); }
    if (mode === 'review') { setH1(''); return drawNewReview(); }
    if (mode === 'lesson') { setH1(''); return drawNewLesson(); }
    const w = picked();
    if (!w) { setH1(''); edit.innerHTML = '<div class="a-card"><p class="a-muted">אין עולמות. אפשר להוסיף עולם בכפתור +.</p></div>'; return; }
    setH1(w.name);
    const part = {
      details: `<label class="a-field"><span>השם (במפה ובתפריט)</span><input id="f-name" value="${UI.esc(w.name)}"></label>
          <div class="a-grid w-heads">
            <label class="a-field"><span>הכותרת בדף העולם – שורה 1</span><input id="f-head1" value="${UI.esc(w.head1 || '')}"></label>
            <label class="a-field"><span>שורה 2</span><input id="f-head2" value="${UI.esc(w.head2 || '')}"></label>
          </div>
          <label class="a-field"><span>שורת משנה</span><input id="f-kicker" value="${UI.esc(w.kicker)}"><small class="a-help">למשל "שיעורים 2-4"</small></label>`,
      media: `${mediaField(w)}${bgField(w)}`,
      about: `<label class="a-field"><span>כותרת ה"אודות" במפה</span><input id="f-title" value="${UI.esc(w.title)}"></label>
          <label class="a-field"><span>טקסט ה"אודות" במפה</span><textarea id="f-text">${UI.esc(w.text)}</textarea><small class="a-help">משפט או שניים: מה לומדים בעולם הזה</small></label>`,
      lessons: lessonsPart(w),
    }[secTab];
    edit.innerHTML = wTabs() + `<div class="a-card w-sections w-tabbed" role="tabpanel"><section>${part}</section></div>`;
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
          ${bgField(d)}
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

  edit.addEventListener('click', (e) => {
    if (mode !== 'edit') return;
    const w = picked();
    if (!w) return;
    const t = e.target.closest('[data-wtab]');
    if (t) { secTab = t.dataset.wtab; drawEdit(); drawPreview(); const b = edit.querySelector(`[data-wtab="${secTab}"]`); if (b) b.focus(); return; }
    if (e.target.closest('[data-wtab-add]')) {
      w.lessonNames = w.lessonNames || [];
      while (w.lessonNames.length < w.planned) w.lessonNames.push('');
      w.planned += 1;
      w.lessonNames.push('');
      drawList(); drawEdit(); drawPreview(); changed();
      const f = edit.querySelector(`[data-lname="${w.planned - 1}"]`); if (f) f.focus();
      return;
    }
    const ed = e.target.closest('[data-lesson-edit]');
    if (ed) {
      const k = Number(ed.dataset.lessonEdit);
      lessonOpen = lessonOpen === k ? -1 : k;
      drawEdit();
      const t = edit.querySelector(`[data-ldesc="${k}"]`) || edit.querySelector(`[data-lesson-edit="${k}"]`);
      if (t) t.focus();
      return;
    }
    const del = e.target.closest('[data-lesson-del]');
    if (del) {
      const k = Number(del.dataset.lessonDel);
      if (!confirm(`למחוק את שיעור ${(w.firstLesson || 1) + k}?`)) return;
      w.lessonNames = w.lessonNames || [];
      w.lessonNames.splice(k, 1);
      if (w.lessonDescs) w.lessonDescs.splice(k, 1);
      lessonOpen = -1;
      w.planned = Math.max(w.written, w.planned - 1);
      drawList(); drawEdit(); drawPreview(); changed();
    }
  });
  // typing updates the list, the preview and the save area at once
  edit.addEventListener('input', (e) => {
    const id = e.target.id;
    if (e.target.dataset.ldesc != null && mode === 'edit') {
      const w = picked();
      w.lessonDescs = w.lessonDescs || [];
      while (w.lessonDescs.length < w.planned) w.lessonDescs.push('');
      w.lessonDescs[Number(e.target.dataset.ldesc)] = e.target.value;
      changed();
      return;
    }
    if (e.target.dataset.lname != null && mode === 'edit') {
      const w = picked();
      w.lessonNames = w.lessonNames || [];
      while (w.lessonNames.length < w.planned) w.lessonNames.push('');
      w.lessonNames[Number(e.target.dataset.lname)] = e.target.value;
      drawList(); changed();
      return;
    }
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
    if (key === 'name') setH1(w.name);
    drawList();
    drawPreview();
    changed();
  });
  edit.addEventListener('change', (e) => {
    if (e.target.id === 'f-media' || e.target.id === 'n-media' || e.target.id === 'f-bg') return;
    if (e.target.id === 'n-world') { draft.worldId = e.target.value; draft.at = null; drawNewLesson(); $('n-world').focus(); }
    if (e.target.id === 'n-at' && mode === 'lesson') draft.at = Number(e.target.value);
  });
  edit.addEventListener('change', (e) => {
    if (e.target.id !== 'f-bg') return;
    const target = mode === 'edit' ? picked() : draft;
    readBg(e.target.files && e.target.files[0], target, () => {
      if (mode === 'edit') changed();
      drawEdit();
      drawPreview();
      const b = $('f-bg'); if (b) b.focus();
    });
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
      delete w.bgVideoUrl;
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
        ${w.page ? `<a class="w-eye" href="${w.page}?view=admin" target="_blank" rel="noopener" title="צפייה באי כמו תלמיד/ה" aria-label="צפייה ב${UI.esc(w.name)} כמו תלמיד/ה (בלשונית חדשה)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></a>` : ''}
      </div>
      ${w.published && Worlds.isDemo(w) ? `<div class="a-note a-note--warn w-warn">${UI.ICON.warn}<p>העולם מפורסם, אבל בחלון ה"אודות" שלו עדיין יש טקסט דמו. כדאי להחליף אותו בטקסט האמיתי.</p></div>` : ''}`;
    const src = imgSrc(w, false);
    const pic = (cls) => (w.animUrl ? `<video class="${cls}" src="${w.animUrl}" autoplay muted loop playsinline></video>` : src ? `<img class="${cls}" src="${src}" alt="">` : '<div class="w-map__none">אין עדיין תמונה לאי</div>');
    const draftTag = w.published ? '' : '<span class="a-tag a-tag--draft w-map__draft">טיוטה – לא מופיע לתלמידים</span>';
    // what the preview shows follows the tab: the island's page, the map, or the lessons with the zebra
    const view = mode !== 'edit' ? 'map' : ({ details: 'page', media: 'page', about: 'map', lessons: 'lesson' })[secTab];
    $('w-prev-title').lastChild.textContent = ({ map: 'תצוגת מפה', page: 'דף האי', lesson: 'שיעור ותרגול' })[view];
    map.className = `w-map w-map--${view}`;
    if (view === 'page') {
      const bg = bgOf(w);
      map.innerHTML = `${draftTag}<div class="w-page"${bg ? ` style="background-image:url('${bg}')"` : ''}>
          ${w.bgVideoUrl ? `<video class="w-page__video" src="${w.bgVideoUrl}" autoplay muted loop playsinline></video>` : ''}
          <p class="w-page__h"><span>${UI.esc(w.head1 || '')}</span><b>${UI.esc(w.head2 || '')}</b></p>
          ${w.kicker ? `<p class="w-page__k">${UI.esc(w.kicker)}</p>` : ''}
          ${pic('w-page__island')}
        </div>`;
      return;
    }
    if (view === 'lesson') {
      const rows = w.review ? `<li>חזרה על שיעורים ${UI.esc(w.reviewOf || '')}</li>` : Array.from({ length: w.planned }, (_, k) => {
        const name = (w.lessonNames || [])[k];
        const done = !!(w.lessonPages || [])[k];
        return `<li class="${done ? 'is-done' : ''}"><b>שיעור ${(w.firstLesson || 1) + k}</b>${name ? ` · ${UI.esc(name)}` : ''}<small>${done ? 'נכתב' : 'טרם נכתב'}</small></li>`;
      }).join('');
      map.innerHTML = `<div class="w-lesson">
          <img class="w-lesson__zebra" src="assets/zebra.webp" alt="">
          <p class="w-lesson__name">${UI.esc(w.name)}</p>
          <ol class="w-lesson__list">${rows}</ol>
        </div>`;
      return;
    }
    // the map: the island on the dashed wavy path, its "about" bubble under it
    map.innerHTML = `${draftTag}
      <svg class="w-map__path" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true"><path d="M-10 70 C 40 20, 90 20, 150 62 S 260 110, 310 50"/></svg>
      ${pic('w-map__island')}
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
