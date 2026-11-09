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
      const n = k + 1;
      const page = (w.lessonPages || [])[k];
      const name = (w.lessonNames || [])[k];
      const label = `שלב ${n}${name ? ` · ${UI.esc(name)}` : ''}`;
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
      viewTab = 'edit';
      step = 3;
      stagesFor = li.dataset.id;
      openStage = Number(sub.dataset.subLesson);
      openRow = 'lessons:0';
      stageMsg.clear();
      drawAll();
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
  // full width: two tabs (editing, viewing); editing goes in four steps with dots and back / next
  const STEPS = ['פרטי האי', 'טקסטים', 'מדיה', 'שלבים'];
  let step = 0;
  let viewTab = 'edit';
  let openStage = -1;
  let openRow = null;
  let stagesFor = null;
  const stageMsg = new Set();
  const viewTabs = () => `<div class="w-tabs" role="tablist" aria-label="עריכה וצפייה">
      <button type="button" role="tab" data-wtab="edit" aria-selected="${viewTab === 'edit'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>עריכה</button>
      <button type="button" role="tab" data-wtab="view" aria-selected="${viewTab === 'view'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>צפייה</button>
    </div>`;
  const stepsBar = () => `<ol class="w-steps">${STEPS.map((t, k) => `<li class="${k < step ? 'is-done' : ''}">
      <button type="button" data-go="${k}"${k === step ? ' aria-current="step"' : ''}><i aria-hidden="true">${k + 1}</i><span>${t}</span></button>
    </li>`).join('')}</ol>`;
  const stepNav = () => `<div class="w-stepnav">
      <button class="a-btn a-btn--ghost" type="button" data-go="${step - 1}"${step === 0 ? ' disabled' : ''}>חזור</button>
      <div class="w-stepnav__end">${step < STEPS.length - 1
        ? `<button class="a-btn w-draft" type="button" data-save-draft>שמור כטיוטה</button><button class="a-btn a-btn--primary" type="button" data-go="${step + 1}">הבא</button>`
        : '<button class="a-btn a-btn--primary" type="button" data-save-now>שמירה</button>'}</div>
    </div>`;
  /* ---------- the stages: each opens to its lessons and its practices (two-level accordion) ---------- */
  // read from what the island already has; nothing is written until something is edited
  const PRACTICE_OF = {
    'letters-lesson.html': 'letters-practice.html', 'vowels-lesson.html': '', 'lesson.html': 'practice.html',
    'doctor3-lesson.html': 'doctor3-practice.html', 'single-lesson.html': 'single-practice.html',
  };
  const practiceOf = (page) => (page in PRACTICE_OF ? PRACTICE_OF[page] : page.replace('-lesson.html', '.html'));
  const TEMPLATE_NAMES = ['אותיות', 'מילים', 'מילים עם הברות', 'משפטים', 'חזרות'];
  const blankPart = (name) => ({ name: name || '', desc: '', template: '', status: 'missing', page: '' });
  const blankStage = (name) => ({ published: false, lessons: [blankPart(name)], practices: [blankPart()] });
  function seedStage(w, k) {
    const page = (w.lessonPages || [])[k] || '';
    const s = blankStage((w.lessonNames || [])[k]);
    s.lessons[0].desc = (w.lessonDescs || [])[k] || '';
    if (page) {
      s.published = true; // already open to the students
      s.lessons[0].page = page;
      s.lessons[0].status = 'written';
      const p = practiceOf(page);
      if (p) { s.practices[0].page = p; s.practices[0].status = 'written'; }
    }
    return s;
  }
  function stagesOf(w) {
    const list = (w.stages || []).slice();
    for (let k = list.length; k < w.planned; k += 1) list.push(seedStage(w, k));
    return list;
  }
  // the stages to change: from here on they are kept with the island
  function editStages(w) { w.stages = stagesOf(w); return w.stages; }
  const allWritten = (arr) => arr.length > 0 && arr.every((p) => p.status === 'written');
  const isReady = (s) => allWritten(s.lessons) && allWritten(s.practices);
  function missingText(s) {
    const noL = !allWritten(s.lessons);
    const noP = !allWritten(s.practices);
    if (noL && noP) return 'חסרים שיעור ותרגול לפרסום';
    if (noL) return 'חסר שיעור לפרסום';
    return noP ? 'חסר תרגול לפרסום' : '';
  }
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const EYE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const TRASH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg>';
  const PLUS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  function stageRow(s, k, kind, i, isLast) {
    const it = s[kind][i];
    const word = kind === 'lessons' ? 'שיעור' : 'תרגול';
    const key = `${k}:${kind}:${i}`;
    const id = `${k}-${kind}-${i}`;
    const next = kind === 'lessons' ? 'שמור והמשך לתרגול' : (isLast ? '' : 'שמור והמשך לשלב הבא');
    const canDelete = !it.page && s[kind].length > 1;
    return `<div class="w-row" data-row="${key}">
        <div class="w-row__head" data-row-head="${key}">
          <b>${word} ${i + 1}</b>
          <input data-st-name="${key}" value="${UI.esc(it.name)}" placeholder="שם ה${word} (לא חובה)" aria-label="השם של ${word} ${i + 1} בשלב ${k + 1}">
          <span class="a-tag ${it.status === 'written' ? 'a-tag--live' : 'a-tag--draft'}">${it.status === 'written' ? 'נכתב' : 'חסר'}</span>
          ${it.page ? `<a class="w-lrow__open" href="${it.page}?view=admin" target="_blank" rel="noopener" aria-label="צפייה ב${word} ${i + 1} (בלשונית חדשה)" title="צפייה">${EYE_ICON}</a>` : '<span class="w-row__gap"></span>'}
          ${canDelete ? `<button class="w-lrow__del" type="button" data-row-del="${key}" aria-label="מחיקת ${word} ${i + 1}" title="מחיקה">${TRASH_ICON}</button>` : '<span class="w-row__gap"></span>'}
          <button class="w-row__add" type="button" data-row-add="${key}" aria-label="הוספת ${word} בשלב ${k + 1}" title="הוספת ${word}">${PLUS_ICON}</button>
          <button class="w-chev" type="button" aria-expanded="false" aria-label="פתיחה וסגירה של ${word} ${i + 1}">${CHEV}</button>
        </div>
        <div class="w-fold"><div class="w-fold__in"><div class="w-row__fields">
          <div class="a-grid">
            <label class="a-field"><span>תבנית</span><select id="tp-${id}" data-st-field="${key}:template"><option value="">לא נבחרה</option>${TEMPLATE_NAMES.map((t) => `<option value="${t}"${it.template === t ? ' selected' : ''}>תבנית ${t}</option>`).join('')}</select></label>
            <label class="a-field"><span>סטטוס</span><select id="st-${id}" data-st-field="${key}:status"><option value="missing"${it.status === 'written' ? '' : ' selected'}>חסר</option><option value="written"${it.status === 'written' ? ' selected' : ''}>נכתב</option></select></label>
          </div>
          <label class="a-field"><span>תיאור ה${word}</span><textarea data-st-desc="${key}" placeholder="מה לומדים כאן">${UI.esc(it.desc)}</textarea></label>
          <div class="w-row__btns">
            <button class="a-btn w-draft" type="button" data-row-save="${key}:close">שמור וסגור</button>
            ${next ? `<button class="a-btn a-btn--primary" type="button" data-row-save="${key}:next">${next}</button>` : ''}
          </div>
        </div></div></div>
      </div>`;
  }
  function stageCard(s, k, isLast) {
    const msg = stageMsg.has(k) ? missingText(s) : '';
    if (!msg) stageMsg.delete(k);
    const empty = [...s.lessons, ...s.practices].every((p) => !p.page);
    const rows = (kind) => s[kind].map((_, i) => stageRow(s, k, kind, i, isLast)).join('');
    return `<li class="w-st" data-st="${k}">
        <div class="w-st__head" data-st-head="${k}">
          <b>שלב ${k + 1}</b>
          <span class="w-st__end">
            ${msg ? `<span class="w-st__msg" role="status">${msg}</span>` : ''}
            <span class="w-st__state${s.published ? ' is-live' : ''}">${s.published ? 'פורסם' : 'טיוטה'}</span>
            ${UI.switchHtml(`st-pub-${k}`, s.published, `פרסום שלב ${k + 1}`)}
            ${empty ? `<button class="w-lrow__del" type="button" data-st-del="${k}" aria-label="מחיקת שלב ${k + 1}" title="מחיקה">${TRASH_ICON}</button>` : ''}
            <button class="w-chev" type="button" aria-expanded="false" aria-label="פתיחה וסגירה של שלב ${k + 1}">${CHEV}</button>
          </span>
        </div>
        <div class="w-fold"><div class="w-fold__in">
          <h4 class="w-st__title">שיעורים</h4>${rows('lessons')}
          <hr class="w-st__line">
          <h4 class="w-st__title">תרגולים</h4>${rows('practices')}
        </div></div>
      </li>`;
  }
  function lessonsPart(w) {
    if (w.review) return `<label class="a-field"><span>על אילו שיעורים החזרה</span><input id="f-reviewof" dir="ltr" value="${UI.esc(w.reviewOf || '')}" placeholder="1-10"></label>`;
    const stages = stagesOf(w);
    if (stagesFor !== w.id) { // another island: its first unfinished stage opens
      stagesFor = w.id;
      openStage = stages.findIndex((s) => !isReady(s));
      openRow = null;
      stageMsg.clear();
    }
    return `<ol class="w-stages">${stages.map((s, k) => stageCard(s, k, k === stages.length - 1)).join('')}</ol>
        <button class="a-btn a-btn--ghost w-ladd" type="button" data-wtab-add>+ הוספת שלב</button>`;
  }
  // one open at each level; only classes change, so the height animates
  function applyOpen() {
    edit.querySelectorAll('[data-st]').forEach((el) => {
      const on = Number(el.dataset.st) === openStage;
      el.classList.toggle('is-open', on);
      el.querySelector('.w-st__head .w-chev').setAttribute('aria-expanded', String(on));
    });
    edit.querySelectorAll('[data-row]').forEach((el) => {
      const [k, kind, i] = el.dataset.row.split(':');
      const on = Number(k) === openStage && `${kind}:${i}` === openRow;
      el.classList.toggle('is-open', on);
      el.querySelector('.w-chev').setAttribute('aria-expanded', String(on));
    });
  }
  function revealOpen() {
    setTimeout(() => {
      const el = edit.querySelector('[data-row].is-open') || edit.querySelector('[data-st].is-open');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 270);
  }
  function saveNow() {
    if (bar.isDirty()) bar.el.querySelector('[data-save]').click();
    live.textContent = 'השינויים נשמרו';
  }
  function drawEdit() {
    if (mode === 'world') { setH1(''); return drawNewWorld(); }
    if (mode === 'review') { setH1(''); return drawNewReview(); }
    if (mode === 'lesson') { setH1(''); return drawNewLesson(); }
    const w = picked();
    if (!w) { setH1(''); edit.innerHTML = '<div class="a-card"><p class="a-muted">אין עולמות. אפשר להוסיף עולם בכפתור +.</p></div>'; return; }
    setH1(w.name);
    if (viewTab === 'view') {
      const bg = bgOf(w);
      edit.innerHTML = viewTabs() + `<div class="a-card w-tabbed w-viewcard" role="tabpanel"><h2 class="sr-only" id="w-title">צפייה בעמוד הראשי של האי</h2>${w.page
        ? `<iframe class="w-frame" src="${w.page}" title="העמוד הראשי של ${UI.esc(w.name)}"></iframe>`
        : `<div class="w-page w-page--wide"${bg ? ` style="background-image:url('${bg}')"` : ''}><p class="w-page__h"><span>${UI.esc(w.head1 || '')}</span><b>${UI.esc(w.head2 || '')}</b></p><p class="w-page__k">לאי הזה עוד אין עמוד באתר</p></div>`}</div>`;
      drawPreview();
      return;
    }
    const part = [
      `          <label class="a-field"><span>השם (במפה ובתפריט)</span><input id="f-name" value="${UI.esc(w.name)}"></label>
          <div class="a-grid w-heads">
            <label class="a-field"><span>הכותרת בדף העולם – שורה 1</span><input id="f-head1" value="${UI.esc(w.head1 || '')}"></label>
            <label class="a-field"><span>שורה 2</span><input id="f-head2" value="${UI.esc(w.head2 || '')}"></label>
          </div>
          <label class="a-field"><span>שורת משנה</span><input id="f-kicker" value="${UI.esc(w.kicker)}"><small class="a-help">למשל "שיעורים 2-4"</small></label>
          <div class="w-pubin" id="w-pubin"></div>`,
      `<label class="a-field"><span>כותרת ה"אודות" במפה</span><input id="f-title" value="${UI.esc(w.title)}"></label>
          <label class="a-field"><span>טקסט ה"אודות" במפה</span><textarea id="f-text">${UI.esc(w.text)}</textarea><small class="a-help">משפט או שניים: מה לומדים בעולם הזה</small></label>
          <div class="w-pubbox" id="w-warnbox"></div>`,
      `<div class="w-media-grid">${mediaField(w)}${bgField(w)}</div>`,
      lessonsPart(w),
    ][step];
    edit.innerHTML = viewTabs() + `<div class="a-card w-sections w-tabbed" role="tabpanel"><h2 class="sr-only" id="w-title">עריכת ${UI.esc(w.name)}</h2>${stepsBar()}<section>${part}</section>${stepNav()}</div>`;
    applyOpen();
    drawPreview();
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
    if (t) { viewTab = t.dataset.wtab; drawEdit(); const b = edit.querySelector(`[data-wtab="${viewTab}"]`); if (b && e.detail === 0) b.focus(); return; }
    const st = e.target.closest("[data-go]");
    if (st) { step = Number(st.dataset.go); drawEdit(); edit.scrollTop = 0; const b = edit.querySelector('[aria-current="step"]'); if (b && e.detail === 0) b.focus(); return; }
    // saving is at the end of the steps; "שמור כטיוטה" keeps the island hidden from the students
    const sv = e.target.closest('[data-save-draft],[data-save-now]');
    if (sv) {
      if (sv.hasAttribute('data-save-draft')) { w.published = false; drawList(); drawPreview(); changed(); }
      if (bar.isDirty()) bar.el.querySelector('[data-save]').click();
      const label = sv.textContent;
      sv.textContent = 'נשמר ✓';
      live.textContent = 'השינויים נשמרו';
      setTimeout(() => { sv.textContent = label; }, 1500);
      return;
    }
    if (e.target.closest('[data-wtab-add]')) {
      const stages = editStages(w);
      stages.push(blankStage());
      w.planned = stages.length;
      w.lessonNames = w.lessonNames || [];
      while (w.lessonNames.length < w.planned) w.lessonNames.push('');
      openStage = stages.length - 1;
      openRow = 'lessons:0';
      drawList(); drawEdit(); changed();
      const f = edit.querySelector(`[data-st-name="${openStage}:lessons:0"]`); if (f) f.focus();
      revealOpen();
      return;
    }
    const delStage = e.target.closest('[data-st-del]');
    if (delStage) {
      const k = Number(delStage.dataset.stDel);
      if (!confirm(`למחוק את שלב ${k + 1}?`)) return;
      const stages = editStages(w);
      stages.splice(k, 1);
      if (w.lessonNames) w.lessonNames.splice(k, 1);
      if (w.lessonDescs) w.lessonDescs.splice(k, 1);
      w.planned = stages.length;
      openStage = -1; openRow = null;
      stageMsg.clear();
      drawList(); drawEdit(); changed();
      return;
    }
    const addRow = e.target.closest('[data-row-add]');
    if (addRow) {
      const [k, kind, i] = addRow.dataset.rowAdd.split(':');
      editStages(w)[Number(k)][kind].splice(Number(i) + 1, 0, blankPart());
      openStage = Number(k);
      openRow = `${kind}:${Number(i) + 1}`;
      drawEdit(); changed();
      const f = edit.querySelector(`[data-st-name="${k}:${openRow}"]`); if (f) f.focus();
      return;
    }
    const delRow = e.target.closest('[data-row-del]');
    if (delRow) {
      const [k, kind, i] = delRow.dataset.rowDel.split(':');
      if (!confirm(`למחוק את ${kind === 'lessons' ? 'השיעור' : 'התרגול'} הזה?`)) return;
      editStages(w)[Number(k)][kind].splice(Number(i), 1);
      openRow = null;
      drawEdit(); changed();
      return;
    }
    const rowSave = e.target.closest('[data-row-save]');
    if (rowSave) {
      const [k, kind, , how] = rowSave.dataset.rowSave.split(':');
      if (how === 'close') openRow = null;
      else if (kind === 'lessons') openRow = 'practices:0';
      else { openStage = Number(k) + 1; openRow = 'lessons:0'; }
      applyOpen();
      saveNow();
      revealOpen();
      return;
    }
    // a click on a head opens or closes it; its name field, eye and switch do not
    if (e.target.closest('input,textarea,select,a,label')) return;
    const rh = e.target.closest('[data-row-head]');
    if (rh) {
      const [, kind, i] = rh.dataset.rowHead.split(':');
      const v = `${kind}:${i}`;
      openRow = openRow === v ? null : v;
      applyOpen();
      return;
    }
    const sh = e.target.closest('[data-st-head]');
    if (sh) {
      const k = Number(sh.dataset.stHead);
      openStage = openStage === k ? -1 : k;
      openRow = null;
      applyOpen();
    }
  });
  // publishing a stage, and a lesson's or practice's template and status
  edit.addEventListener('change', (e) => {
    if (mode !== 'edit') return;
    const w = picked();
    if (!w) return;
    const t = e.target;
    if (t.id && t.id.startsWith('st-pub-')) {
      const k = Number(t.id.slice(7));
      if (t.checked && !isReady(stagesOf(w)[k])) {
        t.checked = false; // a stage is published only when all of it is written
        stageMsg.add(k);
        drawEdit();
      } else {
        editStages(w)[k].published = t.checked;
        stageMsg.delete(k);
        drawEdit(); changed();
      }
      const b = $(t.id); if (b) b.focus();
      return;
    }
    if (t.dataset.stField) {
      const [k, kind, i, field] = t.dataset.stField.split(':');
      editStages(w)[Number(k)][kind][Number(i)][field] = t.value;
      drawEdit(); changed();
      const b = $(t.id); if (b) b.focus();
    }
  });
  // typing updates the list, the preview and the save area at once
  edit.addEventListener('input', (e) => {
    const id = e.target.id;
    if ((e.target.dataset.stName || e.target.dataset.stDesc) && mode === 'edit') {
      const w = picked();
      const isName = !!e.target.dataset.stName;
      const [k, kind, i] = (e.target.dataset.stName || e.target.dataset.stDesc).split(':');
      editStages(w)[Number(k)][kind][Number(i)][isName ? 'name' : 'desc'] = e.target.value;
      if (kind === 'lessons' && i === '0') {
        const key = isName ? 'lessonNames' : 'lessonDescs';
        w[key] = w[key] || [];
        while (w[key].length < w.planned) w[key].push('');
        w[key][Number(k)] = e.target.value;
        if (isName) drawList();
      }
      changed();
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
      if (w.stages) w.stages.splice(at, 0, blankStage(name));
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

  // publishing: a switch at the top, beside the save button
  const pubTop = document.createElement('div');
  pubTop.className = 'w-pubtop';
  pubTop.hidden = true;
  // the page's buttons sit on the tabs' row, just above the white card; הוספה at the far left
  const actions = document.createElement('div');
  actions.className = 'w-actions';
  actions.append(bar.el, pubTop, delBtn, plus);
  document.querySelector('.w-layout').appendChild(actions);
  edit.addEventListener('change', (e) => {
    if (e.target.id !== 'f-pub') return;
    picked().published = e.target.checked;
    drawList();
    drawPreview();
    changed();
    $('f-pub').focus();
  });

  /* ---------- the publish switch and the demo-text warning ---------- */
  function drawPreview() {
    const w = picked();
    pubTop.hidden = mode !== 'edit' || !w;
    if (pubTop.hidden) return;
    // the publish switch sits in the island's details; only the eye stays on top
    const pubIn = $('w-pubin');
    if (pubIn) pubIn.innerHTML = `<div class="w-pub">${UI.switchHtml('f-pub', w.published, 'מפורסם לתלמידים')}<p class="w-pub__text"><b>${w.published ? 'מפורסם' : 'טיוטה'}</b>${w.published ? 'האי מופיע לתלמידים במפה' : 'האי מוסתר מהתלמידים עד שיפורסם'}</p></div>`;
    pubTop.innerHTML = `${w.page ? `<a class="w-eye" href="${w.page}?view=admin" target="_blank" rel="noopener" title="צפייה באי כמו תלמיד/ה" aria-label="צפייה ב${UI.esc(w.name)} כמו תלמיד/ה (בלשונית חדשה)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></a>` : ''}`;
    const warn = $('w-warnbox');
    if (warn) warn.innerHTML = w.published && Worlds.isDemo(w) ? `<div class="a-note a-note--warn w-warn">${UI.ICON.warn}<p>העולם מפורסם, אבל בחלון ה"אודות" שלו עדיין יש טקסט דמו. כדאי להחליף אותו בטקסט האמיתי.</p></div>` : '';
  }

  function drawAll() { drawList(); drawEdit(); drawPreview(); }
  drawAll();
})();
