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

  // a new island (not saved yet) goes through the steps in order; an island already saved can jump to any step
  const fresh = new Set();
  const reached = {};
  // the archive: a deleted island or stage goes here (kept with the islands when saving) and can come back
  const ARCH_KEY = 'en-app:admin-worlds-arch';
  const loadArch = () => {
    try { const a = JSON.parse(localStorage.getItem(ARCH_KEY)); if (a && Array.isArray(a.islands) && Array.isArray(a.stages)) return a; } catch (err) { /* nothing kept */ }
    return { islands: [], stages: [] };
  };
  let archSaved = loadArch();
  archSaved.parts = archSaved.parts || [];
  let arch = JSON.parse(JSON.stringify(archSaved));
  let showArch = false;
  const bar = UI.saveBar({
    onSave: () => { Worlds.save(list); saved = JSON.parse(JSON.stringify(list)); localStorage.setItem(ARCH_KEY, JSON.stringify(arch)); archSaved = JSON.parse(JSON.stringify(arch)); fresh.clear(); },
    onCancel: () => { list = JSON.parse(JSON.stringify(saved)); arch = JSON.parse(JSON.stringify(archSaved)); if (!list.some((w) => w.id === pickedId)) pickedId = (list[0] || {}).id; mode = 'edit'; drawAll(); },
  });
  head.appendChild(bar.el);
  const changed = () => bar.setDirty(JSON.stringify(list) !== JSON.stringify(saved) || JSON.stringify(arch) !== JSON.stringify(archSaved));
  const COPY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
  const BACK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14l-4-4 4-4"/><path d="M5 10h9.5a5 5 0 0 1 0 10H11"/></svg>';
  const ARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/></svg>';
  const dateOf = (t) => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
  // the last step's "שמירה" shows the shared save button's state (no changes / saving / saved)
  function syncSaveNow() {
    const b = edit.querySelector('[data-save-now]');
    if (!b) return;
    const st = bar.save.status();
    const w = picked();
    // "שמירה ופרסום": open when there are changes, or when the island is not published yet
    const ready = st === 'dirty' || (st === 'idle' && w && !w.published);
    b.dataset.status = ready ? 'dirty' : st;
    b.disabled = !ready;
    b.innerHTML = st === 'saving' ? '<span class="a-savebtn__spin" aria-hidden="true"></span>שומר…' : st === 'saved' ? 'נשמר ✓' : 'שמירה ופרסום';
  }
  bar.save.onStatus(() => syncSaveNow());
  const picked = () => list.find((w) => w.id === pickedId);
  // a review's subtitle names the islands it goes over: every island since the review before it
  // ("חזרה על אי X ואי Y"); it follows the order of the list, until the subtitle is written by hand
  const joinHe = (a) => (a.length < 2 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} ו${a[a.length - 1]}`);
  function autoKicker(w) {
    const i = list.findIndex((x) => x.id === w.id);
    const names = [];
    for (let j = i - 1; j >= 0 && !list[j].review; j -= 1) names.unshift(list[j].name || 'אי בלי שם');
    return names.length ? `חזרה על ${joinHe(names)}` : 'אי חזרה';
  }
  const isAutoKicker = (w) => w.kickerAuto || !w.kicker || /^חזרה על שיעורים/.test(w.kicker);
  function syncReviewKickers() {
    list.forEach((w) => { if (w.review && isAutoKicker(w)) { w.kicker = autoKicker(w); w.kickerAuto = true; } });
  }
  syncReviewKickers();
  saved = JSON.parse(JSON.stringify(list));
  const subOf = (w) => (w.review ? (w.kicker || 'אי חזרה') : `${w.written} מתוך ${w.planned} שיעורים`);
  const imgSrc = (w, small) => (w.imgData || (w.img ? `assets/${small ? 'map/' : ''}${w.img}.webp` : ''));
  const pic = (w, cls) => (imgSrc(w, true) ? `<img class="${cls}" src="${imgSrc(w, true)}" alt="" onerror="this.onerror=null;this.src='assets/${w.img}.webp'">` : `<span class="${cls} ${cls}--none" aria-hidden="true"></span>`);

  /* ---------- the + menu, beside the save area ---------- */
  const plus = document.createElement('div');
  plus.className = 'w-plus';
  plus.innerHTML = `<button class="w-plus__btn" type="button" id="w-plus" aria-haspopup="menu" aria-expanded="false" aria-controls="w-plus-menu" ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>הוספה</span></button>
    <div class="w-plus__menu" id="w-plus-menu" role="menu" hidden>
      <button type="button" role="menuitem" data-new="world"><span class="w-plus__ic" aria-hidden="true"><svg class="is-fill" viewBox="0 0 64 52"><path d="M33 20c-1-6 2-11 6-14 0 4 3 7 7 8-4 1-9 3-13 6z"/><path d="M27 21c-2-4-1-8 2-10 0 3 2 5 4 6-2 1-4 2-6 4z"/><path d="M4 25c0-3 12-6 28-6s28 3 28 6c0 2-2 3-5 4l-7 9-6 3-4 9-5-8-6-1-5-6-7-3c-6-2-11-3-11-7z"/></svg></span>הוספת אי</button>
      <button type="button" role="menuitem" data-new="review"><span class="w-plus__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12c-2-2.7-3.6-4.5-6-4.5a4.5 4.5 0 0 0 0 9c2.4 0 4-1.8 6-4.5zm0 0c2 2.7 3.6 4.5 6 4.5a4.5 4.5 0 0 0 0-9c-2.4 0-4 1.8-6 4.5z"/></svg></span>הוספת חזרה</button>
    </div>`;
  head.appendChild(plus);
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'a-btn w-delete w-tipped';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg><span class="w-tip w-tip--l" aria-hidden="true">מחיקה – האי עובר לארכיון</span>';
  delBtn.setAttribute('aria-label', 'מחיקת האי – עובר לארכיון');
  plus.after(delBtn);
  // deleting moves the island to the archive (it can come back from there)
  delBtn.addEventListener('click', () => {
    const w = mode === 'edit' && picked();
    if (!w) return;
    const at = list.findIndex((x) => x.id === w.id);
    list.splice(at, 1);
    arch.islands.unshift({ w, at: Date.now() });
    // the island before it opens (the first one, if it was first), at its first step
    pickedId = (list[Math.max(0, at - 1)] || {}).id;
    step = 0; viewTab = 'edit';
    drawAll(); changed();
    live.textContent = `${w.name || 'האי'} עבר/ה לארכיון`;
    showToast(() => { const i = arch.islands.findIndex((a) => a.w.id === w.id); if (i >= 0) arch.islands.splice(i, 1); list.splice(Math.min(at, list.length), 0, w); pickedId = w.id; drawAll(); changed(); live.textContent = 'האי הוחזר'; }, 'האי נמחק בהצלחה ונשמר בארכיון');
  });
  // duplicating: a copy (a draft) right after the island, open for editing
  const dupBtn = document.createElement('button');
  dupBtn.type = 'button';
  dupBtn.className = 'a-btn w-delete w-dup w-tipped';
  dupBtn.innerHTML = `${COPY_ICON}<span class="w-tip w-tip--l" aria-hidden="true">שכפול האי</span>`;
  dupBtn.setAttribute('aria-label', 'שכפול האי');
  dupBtn.addEventListener('click', () => {
    const w = mode === 'edit' && picked();
    if (!w) return;
    const c = JSON.parse(JSON.stringify(w));
    c.id = `n${Date.now()}`;
    c.name = `${w.name || 'אי'} (עותק)`;
    c.published = false;
    list.splice(list.findIndex((x) => x.id === w.id) + 1, 0, c);
    pickedId = c.id;
    drawAll(); changed();
    const li = items.querySelector(`[data-id="${c.id}"]`);
    if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    live.textContent = `נוצר עותק: ${c.name}`;
  });
  const plusBtn = $('w-plus');
  const menu = $('w-plus-menu');
  const menuItems = () => [...menu.querySelectorAll('[role="menuitem"]')];
  const openMenu = (focusFirst) => { menu.hidden = false; plusBtn.setAttribute('aria-expanded', 'true'); if (focusFirst) menuItems()[0].focus(); };
  const closeMenu = (back) => { menu.hidden = true; plusBtn.setAttribute('aria-expanded', 'false'); if (back) plusBtn.focus(); };
  plusBtn.addEventListener('click', () => (menu.hidden ? openMenu(false) : closeMenu(false)));
  let hoverOut = 0;
  plus.addEventListener('mouseenter', () => { clearTimeout(hoverOut); if (menu.hidden) openMenu(false); });
  plus.addEventListener('mouseleave', () => { hoverOut = setTimeout(() => { if (!menu.hidden && !plus.contains(document.activeElement)) closeMenu(false); }, 250); });
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
    addNow(b.dataset.new);
  });
  // a new world / review goes to the end of the list, opens for editing, and the list scrolls to it
  function addNow(kind) {
    startNew(kind);
    const w = { ...draft, name: draft.name || 'אי חדש' };
    list.push(w);
    fresh.add(w.id);
    reached[w.id] = 0;
    pickedId = w.id;
    mode = 'edit';
    draft = null;
    step = 0;
    viewTab = 'edit';
    drawAll();
    changed();
    const li = items.querySelector(`[data-id="${w.id}"]`);
    if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const f = $('f-name');
    if (f) { f.focus(); f.select(); }
    live.textContent = `${w.name} נוסף/ה בסוף הרשימה`;
  }
  // the button sits in the islands panel's head, beside its title
  const listTitle = $('w-list-title');
  const listHead = document.createElement('div');
  listHead.className = 'w-list__head';
  listTitle.replaceWith(listHead);
  // "ארכיון" beside "הוספה": the list switches to the deleted islands and stages
  const archBtn = document.createElement('button');
  archBtn.type = 'button';
  archBtn.className = 'w-archbtn';
  archBtn.setAttribute('aria-pressed', 'false');
  const tools = document.createElement('span');
  tools.className = 'w-list__tools';
  tools.append(archBtn, plus);
  listHead.append(listTitle, tools);
  const listBox = listHead.closest('.w-list');
  if (listBox) listBox.addEventListener('scroll', () => listBox.classList.toggle('is-scrolled', listBox.scrollTop > 2), { passive: true });
  const paintArchBtn = () => {
    const n = arch.islands.length + arch.stages.length + (arch.parts || []).length;
    archBtn.setAttribute('aria-pressed', String(showArch));
    archBtn.innerHTML = showArch ? `${BACK_ICON}<span>חזרה לאיים</span>` : `${ARCH_ICON}<span>ארכיון</span>${n ? `<i>${n}</i>` : ''}`;
    listTitle.textContent = showArch ? 'ארכיון' : 'האיים';
    plus.hidden = showArch;
  };
  archBtn.addEventListener('click', () => { showArch = !showArch; drawList(); archBtn.focus(); });

  /* ---------- the list ---------- */
  const opened = new Set();
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  function drawList() {
    const pub = list.filter((w) => w.published).length;
    syncReviewKickers();
    $('w-count').textContent = `${pub} מתוך ${list.length} מפורסמים`;
    paintArchBtn();
    if (showArch) { items.innerHTML = archList(); return; }
    items.innerHTML = list.map((w, k) => `<li class="w-item" data-id="${w.id}" data-sort-group="isl" aria-current="${mode === 'edit' && w.id === pickedId}">
        <button class="w-grip" type="button" data-drag data-grip aria-label="גרירת ${UI.esc(w.name)} – מקום ${k + 1} מתוך ${list.length}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
        <span class="w-n" aria-hidden="true">${k + 1}</span>
        ${pic(w, 'w-pic')}
        <span class="w-body">
          <button class="w-pick" type="button" data-pick aria-current="${mode === 'edit' && w.id === pickedId}"><b>${UI.esc(w.name) || 'אי בלי שם'}</b><small>${UI.esc(subOf(w))}</small></button>
          <span class="w-row">
            <span class="a-tag ${w.published ? 'a-tag--live' : 'a-tag--draft'}">${w.published ? 'מפורסם' : 'טיוטה'}</span>
            <button class="w-morebtn" type="button" data-more aria-label="אפשרויות ל${UI.esc(w.name)}" aria-haspopup="menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
            <button class="w-open" type="button" data-open aria-expanded="${opened.has(w.id)}" aria-label="${opened.has(w.id) ? 'סגירת' : 'פתיחת'} השיעורים של ${UI.esc(w.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
          </span>
        </span>
        ${opened.has(w.id) ? subList(w) : ''}
      </li>`).join('');
  }
  // the archive: deleted islands, then deleted stages, each with a round "החזרה" button
  function archList() {
    const BACK_TIP = { i: 'האי חוזר לסוף רשימת האיים', s: 'השלב חוזר לסוף האי שלו', p: 'חוזר לסוף השלב שלו' };
    const back = (key, what) => `<button class="w-arch__back w-tipped" type="button" data-restore="${key}" aria-label="החזרת ${UI.esc(what)}">${BACK_ICON}<span class="w-tip w-tip--l" aria-hidden="true">החזרה – ${BACK_TIP[key[0]]}</span></button>`;
    const isl = arch.islands.map((a, i) => `<li class="w-arch">
        ${pic(a.w, 'w-pic')}
        <span class="w-arch__body"><b>${UI.esc(a.w.name) || 'אי בלי שם'}</b><small>${a.w.review ? 'חזרה' : 'אי'} · נמחק ב־${dateOf(a.at)}</small></span>
        ${back(`i:${i}`, a.w.name || 'האי')}
      </li>`).join('');
    const sts = arch.stages.map((a, i) => {
      const nm = stName(a.stage);
      return `<li class="w-arch">
        <span class="w-arch__ic" aria-hidden="true">${ARCH_ICON}</span>
        <span class="w-arch__body"><b>שלב${a.n ? ` ${a.n}` : ''}${nm ? ` · ${UI.esc(nm)}` : ''}</b><small>מתוך ${UI.esc(a.worldName || 'אי')} · נמחק ב־${dateOf(a.at)}</small></span>
        ${back(`s:${i}`, 'השלב')}
      </li>`;
    }).join('');
    const prts = (arch.parts || []).map((a, i) => {
      const word = a.kind === 'lessons' ? 'שיעור' : 'תרגול';
      return `<li class="w-arch">
        <span class="w-arch__ic" aria-hidden="true">${ARCH_ICON}</span>
        <span class="w-arch__body"><b>${word}${a.part.name ? ` · ${UI.esc(a.part.name)}` : ''}</b><small>שלב ${a.k + 1} ב${UI.esc(a.worldName || 'אי')} · נמחק ב־${dateOf(a.at)}</small></span>
        ${back(`p:${i}`, `ה${word}`)}
      </li>`;
    }).join('');
    if (!isl && !sts && !prts) return '<li class="w-arch__empty">הארכיון ריק. אי, שלב, שיעור או תרגול שנמחקים מגיעים לכאן, ואפשר להחזיר אותם.</li>';
    return `${isl ? `<li class="w-arch__h">איים</li>${isl}` : ''}${sts ? `<li class="w-arch__h">שלבים</li>${sts}` : ''}${prts ? `<li class="w-arch__h">שיעורים ותרגולים</li>${prts}` : ''}`;
  }
  function restore(key) {
    const [kind, n] = key.split(':');
    const i = Number(n);
    if (kind === 'i') {
      const [a] = arch.islands.splice(i, 1);
      list.push(a.w);
      live.textContent = `${a.w.name || 'האי'} חזר/ה לסוף רשימת האיים`;
    } else if (kind === 'p') {
      const a = arch.parts[i];
      const w = list.find((x) => x.id === a.worldId);
      if (!w) { alert(`האי "${a.worldName || ''}" נמצא בארכיון. צריך להחזיר קודם את האי.`); return; }
      const st = editStages(w);
      const to = st[Math.min(a.k, st.length - 1)];
      if (!to) { alert('לאי הזה אין שלבים. צריך להוסיף שלב קודם.'); return; }
      arch.parts.splice(i, 1);
      to[a.kind].push(a.part);
      live.textContent = `${a.kind === 'lessons' ? 'השיעור' : 'התרגול'} חזר לסוף שלב ${st.indexOf(to) + 1}`;
    } else {
      const a = arch.stages[i];
      const w = list.find((x) => x.id === a.worldId);
      if (!w) { alert(`האי "${a.worldName || ''}" של השלב נמצא בארכיון. צריך להחזיר קודם את האי.`); return; }
      arch.stages.splice(i, 1);
      const stages = editStages(w);
      stages.push(a.stage);
      w.planned = stages.length;
      w.lessonNames = w.lessonNames || [];
      while (w.lessonNames.length < stages.length - 1) w.lessonNames.push('');
      w.lessonNames.push(a.name || '');
      if (w.lessonDescs) w.lessonDescs.push(a.desc || '');
      live.textContent = `השלב חזר לסוף ${w.name || 'האי'}`;
    }
    drawAll(); changed();
  }
  // a world opens to its lessons (a review world: what it goes over)
  const subOpen = new Set();
  function subList(w) {
    if (w.review) {
      return `<ul class="w-sub">
          <li><a class="w-sub__item" href="${w.page || 'review.html'}" target="_blank" rel="noopener"><span><b>${UI.esc(w.name)}</b><small>חזרה על שיעורים ${UI.esc(w.reviewOf || '')}</small></span>${ARROW}</a></li>
        </ul>`;
    }
    // each stage's arrow opens its lessons and practices under it
    const rows = stagesOf(w).map((st, k) => {
      const key = `${w.id}:${k}`;
      const isOpen = subOpen.has(key);
      const name = stName(st);
      const label = `שלב ${k + 1}${name ? ` · ${UI.esc(name)}` : ''}`;
      const part = (kind, word) => st[kind].map((p, i) => `<li><button class="w-sub2__item" type="button" data-sub-lesson="${k}"><span>${word} ${i + 1}${p.name ? ` · ${UI.esc(p.name)}` : ''}</span><small>${isWritten(p) ? 'נכתב' : 'חסר'}</small></button></li>`).join('');
      return `<li data-sort-group="stg:${w.id}">
          <div class="w-subrow">
            <button class="w-handle" type="button" data-drag data-grip aria-label="גרירת שלב ${k + 1}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
            <button class="w-sub__item${isReady(st) ? '' : ' is-empty'}" type="button" data-sub-lesson="${k}"><span><b>${label}</b>${stageBars(st)}</span></button>
            <button class="w-morebtn" type="button" data-more aria-label="אפשרויות לשלב ${k + 1}" aria-haspopup="menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
            <button class="w-sub__chev" type="button" data-sub-toggle="${k}" aria-expanded="${isOpen}" aria-label="פתיחת השיעורים והתרגולים של שלב ${k + 1}">${ARROW}</button>
          </div>
          ${isOpen ? `<ul class="w-sub2">${part('lessons', 'שיעור')}${part('practices', 'תרגול')}</ul>` : ''}
        </li>`;
    }).join('');
    return `<ul class="w-sub">${rows}<li class="w-sub__addli"><button class="w-addrow" type="button" data-add-lesson><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת שלב</button></li></ul>`;
  }
  items.addEventListener('click', (e) => {
    if (e.target.closest('[data-drag],[data-more]')) return;
    const rb = e.target.closest('[data-restore]');
    if (rb) { restore(rb.dataset.restore); return; }
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
    const subT = e.target.closest('[data-sub-toggle]');
    if (subT) {
      const key = `${li.dataset.id}:${subT.dataset.subToggle}`;
      if (subOpen.has(key)) subOpen.delete(key); else subOpen.add(key);
      drawList();
      const b = items.querySelector(`.w-item[data-id="${li.dataset.id}"] [data-sub-toggle="${subT.dataset.subToggle}"]`);
      if (b && e.detail === 0) b.focus();
      return;
    }
    const sub = e.target.closest('[data-sub-lesson]');
    if (sub) {
      mode = 'edit'; draft = null;
      pickedId = li.dataset.id;
      viewTab = 'edit';
      step = 3;
      stagesFor = li.dataset.id;
      openStage = Number(sub.dataset.subLesson);
      stageMsg.clear();
      drawAll();
      return;
    }
    pickedId = li.dataset.id;
    mode = 'edit';
    drawAll();
  });



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
    </select><small class="a-help">איפה האי יופיע במסלול האיים</small></label>`;

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
  let stagesFor = null;
  const stageMsg = new Set();
  const viewTabs = () => `<div class="w-tabs" role="tablist" aria-label="עריכה וצפייה">
      <button type="button" role="tab" data-wtab="edit" aria-selected="${viewTab === 'edit'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>עריכה</button>
      <button type="button" role="tab" data-wtab="view" aria-selected="${viewTab === 'view'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>צפייה</button>
    </div>`;
  const stepsBar = () => `<ol class="w-steps">${STEPS.map((t, k) => `<li class="${k < step ? 'is-done' : ''}">
      <button type="button" data-go="${k}"${k === step ? ' aria-current="step"' : ''}${fresh.has(pickedId) && k > (reached[pickedId] || 0) ? ' disabled' : ''}><i aria-hidden="true">${k + 1}</i><span>${t}</span></button>
    </li>`).join('')}</ol>`;
  // the page's explanation, in an ⓘ beside the island's name
  const info = document.body.dataset.info ? `<span class="a-info"><button class="a-info__btn" type="button" aria-describedby="a-info-tip" aria-label="הסבר על העמוד"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg></button><span class="a-info__tip" id="a-info-tip" role="tooltip">${UI.esc(document.body.dataset.info)}</span></span>` : '';
  // one row on top of the card: the island's name, the stepper in the middle, the switch and the buttons at the end
  const topRow = (w, middle) => `<div class="w-toprow"><div class="w-toprow__name"><b aria-hidden="true">${UI.esc(w.name)}</b></div><div class="w-toprow__mid">${middle}</div><div class="w-toprow__end">${viewTabs()}</div></div>`;
  // the page's buttons (cancel, delete, +) move into that row; without it they go back above the card
  const placeActions = () => { const slot = edit.querySelector('.w-toprow__end') || edit.querySelector('.w-new'); (slot || document.querySelector('.w-layout')).appendChild(actions); };
  const stepNav = () => `<div class="w-stepnav">
      <button class="a-btn a-btn--ghost" type="button" data-go="${step - 1}"${step === 0 ? ' disabled' : ''}>חזור</button>
      <div class="w-stepnav__end">${step < STEPS.length - 1
        ? `<button class="a-btn w-draft" type="button" data-save-draft>שמור כטיוטה</button><button class="a-btn a-btn--primary" type="button" data-go="${step + 1}">הבא</button>`
        : '<button class="a-savebtn" type="button" data-save-now>שמירה ופרסום</button>'}</div>
    </div>`;
  /* ---------- the stages: each opens to its lessons and its practices (two-level accordion) ---------- */
  // read from what the island already has; nothing is written until something is edited
  const PRACTICE_OF = {
    'letters-lesson.html': 'letters-practice.html', 'vowels-lesson.html': '', 'lesson.html': 'practice.html',
    'doctor3-lesson.html': 'doctor3-practice.html', 'single-lesson.html': 'single-practice.html',
  };
  const practiceOf = (page) => (page in PRACTICE_OF ? PRACTICE_OF[page] : page.replace('-lesson.html', '.html'));
  const TEMPLATE_NAMES = ['הסבר', 'הסבר בלשוניות', 'שיר האותיות', 'אותיות', 'מילים', 'מילים עם הברות', 'משפטים', 'חזרות'];
  const blankPart = (name) => ({ name: name || '', desc: '', template: '', page: '' });
  const blankStage = (name) => ({ published: false, lessons: [blankPart(name)], practices: [blankPart()] });
  const stName = (st) => (st.lessons[0] || {}).name || st.name || '';
  function seedStage(w, k) {
    const page = (w.lessonPages || [])[k] || '';
    const s = blankStage((w.lessonNames || [])[k]);
    s.lessons[0].desc = (w.lessonDescs || [])[k] || '';
    if (page) {
      s.published = true; // already open to the students
      s.lessons[0].page = page;
      if (page === 'letters-lesson.html') { s.lessons[0].template = 'שיר האותיות'; s.lessons[0].code = 'abc-1-song'; }
      const p = practiceOf(page);
      if (p) s.practices[0].page = p;
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
  const isWritten = (p) => !!p.page || !!(p.desc || '').trim() || !!(p.song && (p.song.title || p.song.fileName));
  const allWritten = (arr) => arr.length > 0 && arr.every(isWritten);
  // a part the stage has none of ("בלי מסך שיעור" / "בלי תרגול") does not hold it back
  const partOk = (arr) => !arr.length || allWritten(arr);
  const isReady = (s) => (s.lessons.length + s.practices.length > 0) && partOk(s.lessons) && partOk(s.practices);
  // a stage's progress in 4 bars (grey, light pink when done): a name, lessons written, practices written, published
  function stageBars(st) {
    const parts = [
      ['שם לשלב', !!stName(st)],
      ['שיעורים נכתבו', allWritten(st.lessons)],
      ['תרגולים נכתבו', allWritten(st.practices)],
      ['פורסם', !!st.published],
    ];
    const done = parts.filter((p) => p[1]).length;
    const tip = parts.map(([t, ok]) => `${ok ? '✓' : '○'} ${t}`).join(' · ');
    return `<span class="w-bars" role="img" aria-label="${done} מתוך 4 הושלמו: ${tip}" title="${tip}">${parts.map(([, ok]) => `<i class="${ok ? 'is-done' : ''}"></i>`).join('')}</span>`;
  }
  function missingText(s) {
    const noL = !partOk(s.lessons);
    const noP = !partOk(s.practices);
    if (noL && noP) return 'חסרים שיעור ותרגול לפרסום';
    if (noL) return 'חסר שיעור לפרסום';
    return noP ? 'חסר תרגול לפרסום' : '';
  }
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const EYE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const TRASH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg>';
  const PLUS_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  /* ---------- the "שיר האותיות" template: the song and when each letter is heard ---------- */
  const SONG_TEMPLATE = 'שיר האותיות';
  const ABC_TIMES = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27];
  const songUrls = new Map(); // uploads and recordings last until the page closes
  const urlKey = (key, name) => `${picked().id}:${key}${name ? `:${name}` : ''}`;
  function songDefaults(it) {
    const first = it.page === 'letters-lesson.html';
    return {
      title: first ? 'האי של זיהוי אותיות' : '',
      red: first ? 'שיעור היכרות עם סרגל האותיות' : '',
      tab: first ? 'שיר ה-abc · כל האותיות' : '',
      button: '', coins: '', empty: false,
      says: first ? 'שירו איתי את שיר ה-abc! צפו בסרטון – כל אות קופצת בזמן הנכון. לחצו על אות כדי לשמוע איך היא נשמעת.' : '',
      reads: first ? 'שירו איתי את שיר ה-abc! צפו בסרטון. כל אות קופצת בזמן הנכון. לחצו על אות כדי לשמוע אותה.' : '',
      file: first ? 'assets/abc-song.mp4' : '',
      letters: 'abcdefghijklmnopqrstuvwxyz'.split('').map((l, n) => ({ l, t: ABC_TIMES[n] })),
    };
  }
  const songOf = (it) => it.song || songDefaults(it);
  // the song to change: from here on it is kept with the lesson
  function editSong(key) {
    const [k, kind, i] = key.split(':');
    const part = editStages(picked())[Number(k)][kind][Number(i)];
    part.song = songOf(part);
    return part.song;
  }
  const songAudio = (key) => edit.querySelector(`[data-song-audio="${key}"]`);
  function songLetterRow(key, s, n) {
    const row = s.letters[n];
    const has = songUrls.has(urlKey(key, row.l));
    return `<li class="w-abc" data-sg-row="${key}:${n}">
        <button class="w-abc__grip" type="button" draggable="true" data-sg-grip="${key}:${n}" aria-label="הזזת האות ${UI.esc(row.l)}. חצים למעלה ולמטה להזזה">${UI.ICON.grip}</button>
        <input class="w-abc__l" dir="ltr" lang="en" maxlength="3" data-sgl="${key}:${n}:l" value="${UI.esc(row.l)}" aria-label="האות">
        <input class="w-abc__t" dir="ltr" type="number" min="0" step="0.1" data-sgl="${key}:${n}:t" value="${UI.esc(String(row.t))}" aria-label="השנייה של ${UI.esc(row.l)} בשיר">
        <button class="w-abc__b" type="button" data-sg-stamp="${key}:${n}" title="הרגע הנוכחי בשיר" aria-label="קביעת הרגע של ${UI.esc(row.l)} לפי השיר"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg></button>
        <button class="w-abc__b" type="button" data-sg-play="${key}:${n}" title="ניגון מהרגע של האות" aria-label="ניגון מהרגע של ${UI.esc(row.l)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg></button>
        <span class="w-abc__has${has ? ' is-on' : ''}">${has ? 'יש' : 'אין'}</span>
        <button class="w-abc__b" type="button" data-sg-mic="${key}:${n}" title="הקלטה של האות" aria-label="הקלטה של ${UI.esc(row.l)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
        <label class="w-abc__b" title="העלאת קובץ קול של האות" aria-label="העלאת קובץ קול של ${UI.esc(row.l)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V6M8 10l4-4 4 4M5 18h14"/></svg><input class="sr-only" type="file" accept="audio/*" data-sg-laudio="${key}:${n}"></label>
        <button class="w-abc__b w-abc__b--del" type="button" data-sg-del="${key}:${n}" title="מחיקה" aria-label="מחיקת ${UI.esc(row.l)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg></button>
      </li>`;
  }
  function songFields(key, it) {
    const s = songOf(it);
    const url = songUrls.get(urlKey(key)) || s.file;
    const text = (f, label, help) => `<label class="a-field"><span>${label}</span><input data-sg="${key}:${f}" value="${UI.esc(s[f])}">${help ? `<small class="a-help">${help}</small>` : ''}</label>`;
    const area = (f, label) => `<label class="a-field"><span>${label}</span><textarea data-sg="${key}:${f}">${UI.esc(s[f])}</textarea></label>`;
    return `${text('title', 'כותרת')}
        <div class="a-grid">${text('red', 'השורה האדומה מתחת לכותרת')}${text('tab', 'השורה השנייה בלשונית')}</div>
        <div class="a-grid">${text('button', 'הכפתור בסוף המסך', 'ריק = הנוסח הרגיל')}${text('coins', 'מטבעות על סיום המסך', 'ריק = לפי הגדרות המטבעות')}</div>
        <label class="w-song__empty"><input type="checkbox" data-sg-empty="${key}"${s.empty ? ' checked' : ''}><span><b>שלב ריק</b> – התלמיד רואה רק את הכותרת והכפתורים, בלי התוכן. מסמנים כשעוד אין תוכן למסך.</span></label>
        ${area('says', 'מה הזברה אומרת (מעל השיר)')}
        ${area('reads', 'מה הזברה מקריאה')}
        <div class="a-field"><span>קובץ השיר</span>
          <div class="w-song__file">
            <label class="w-abc__b" title="העלאת שיר" aria-label="העלאת קובץ שיר"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V6M8 10l4-4 4 4M5 18h14"/></svg><input class="sr-only" type="file" accept="audio/*,video/mp4,video/webm" data-sg-file="${key}"></label>
            <span dir="ltr">${UI.esc(s.fileName || (s.file || '').split('/').pop() || 'אין קובץ')}</span>
          </div>
          <small class="a-help">שיר חדש: אחרי ההעלאה בודקים את הזמנים של האותיות (למטה) ושומרים.</small>
        </div>
        <div class="w-song__box">
          <h4 class="w-st__title">התוכן של המסך · שיר האותיות</h4>
          <p class="a-help">כל אות עם הרגע בשיר שבו שרים אותה (בשניות). מנגנים את השיר כאן, ולוחצים על השעון ליד אות כשהיא נשמעת, והזמן נקבע לבד. המשולש מנגן מהרגע של האות.</p>
          ${url ? `<audio class="w-song__player" controls preload="metadata" src="${url}" data-song-audio="${key}"></audio>` : '<p class="a-muted">עוד אין קובץ שיר</p>'}
          <ol class="w-abcs">${s.letters.map((_, n) => songLetterRow(key, s, n)).join('')}</ol>
          <button class="w-sub__add" type="button" data-sg-add="${key}">+ אות</button>
        </div>`;
  }
  function moveLetter(key, from, to) {
    if (to < 0) return;
    const s = editSong(key);
    if (to >= s.letters.length) return;
    s.letters.splice(to, 0, s.letters.splice(from, 1)[0]);
    drawEdit(); changed();
    const g = edit.querySelector(`[data-sg-grip="${key}:${to}"]`); if (g) g.focus();
  }
  function setSongUrl(key, name, file) {
    const k = urlKey(key, name);
    if (songUrls.has(k)) URL.revokeObjectURL(songUrls.get(k));
    songUrls.set(k, URL.createObjectURL(file));
  }
  let songDrag = null;
  let recording = null;
  function wireSong() {
    edit.addEventListener('input', (e) => {
      if (mode !== 'edit') return;
      const t = e.target;
      if (t.dataset.sg) {
        const p = t.dataset.sg.split(':');
        editSong(p.slice(0, 3).join(':'))[p[3]] = t.value;
        changed();
      } else if (t.dataset.sgl) {
        const p = t.dataset.sgl.split(':');
        editSong(p.slice(0, 3).join(':')).letters[Number(p[3])][p[4]] = p[4] === 't' ? (t.value === '' ? '' : Number(t.value)) : t.value;
        changed();
      }
    });
    edit.addEventListener('change', (e) => {
      if (mode !== 'edit') return;
      const t = e.target;
      if (t.dataset.sgEmpty) { editSong(t.dataset.sgEmpty).empty = t.checked; changed(); return; }
      const file = t.files && t.files[0];
      if (!file) return;
      if (t.dataset.sgFile) {
        const s = editSong(t.dataset.sgFile);
        setSongUrl(t.dataset.sgFile, '', file);
        s.fileName = file.name;
        drawEdit(); changed();
      } else if (t.dataset.sgLaudio) {
        const p = t.dataset.sgLaudio.split(':');
        const key = p.slice(0, 3).join(':');
        setSongUrl(key, editSong(key).letters[Number(p[3])].l, file);
        drawEdit(); changed();
      }
    });
    edit.addEventListener('click', async (e) => {
      if (mode !== 'edit') return;
      const q = (name) => { const b = e.target.closest(`[data-${name}]`); return b ? b.getAttribute(`data-${name}`) : null; };
      const parts = (v) => { const p = v.split(':'); return [p.slice(0, 3).join(':'), Number(p[3])]; };
      let v;
      if ((v = q('sg-add'))) {
        const s = editSong(v);
        s.letters.push({ l: '', t: '' });
        drawEdit(); changed();
        const f = edit.querySelector(`[data-sgl="${v}:${s.letters.length - 1}:l"]`); if (f) f.focus();
      } else if ((v = q('sg-del'))) {
        const [key, n] = parts(v);
        const s = editSong(key);
        if (!confirm(`למחוק את האות ${s.letters[n].l}?`)) return;
        s.letters.splice(n, 1);
        drawEdit(); changed();
      } else if ((v = q('sg-stamp'))) {
        const [key, n] = parts(v);
        const a = songAudio(key);
        if (!a) return;
        const sec = Math.round(a.currentTime * 10) / 10;
        editSong(key).letters[n].t = sec;
        edit.querySelector(`[data-sgl="${key}:${n}:t"]`).value = sec;
        changed();
      } else if ((v = q('sg-play'))) {
        const [key, n] = parts(v);
        const a = songAudio(key);
        if (!a) return;
        a.currentTime = Number(songOf(partAt(key)).letters[n].t) || 0;
        a.play();
      } else if ((v = q('sg-mic'))) {
        const b = e.target.closest('[data-sg-mic]');
        if (recording) { recording.stop(); return; }
        const [key, n] = parts(v);
        let stream;
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (err) { live.textContent = 'אין גישה למיקרופון'; alert('אין גישה למיקרופון'); return; }
        const rec = new MediaRecorder(stream);
        const chunks = [];
        rec.ondataavailable = (ev) => chunks.push(ev.data);
        rec.onstop = () => {
          stream.getTracks().forEach((tr) => tr.stop());
          recording = null;
          setSongUrl(key, editSong(key).letters[n].l, new Blob(chunks, { type: rec.mimeType }));
          drawEdit(); changed();
        };
        recording = rec;
        rec.start();
        b.classList.add('is-rec');
      }
    });
    edit.addEventListener('keydown', (e) => {
      const g = e.target.closest('[data-sg-grip]');
      if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      const p = g.dataset.sgGrip.split(':');
      const n = Number(p[3]);
      moveLetter(p.slice(0, 3).join(':'), n, e.key === 'ArrowUp' ? n - 1 : n + 1);
    });
    edit.addEventListener('dragstart', (e) => {
      const g = e.target.closest('[data-sg-grip]');
      if (!g) return;
      songDrag = g.dataset.sgGrip;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', songDrag);
    });
    edit.addEventListener('dragover', (e) => {
      const r = songDrag && e.target.closest('[data-sg-row]');
      if (!r) return;
      e.preventDefault();
      edit.querySelectorAll('.w-abc.is-over').forEach((x) => x.classList.remove('is-over'));
      r.classList.add('is-over');
    });
    edit.addEventListener('drop', (e) => {
      const r = songDrag && e.target.closest('[data-sg-row]');
      if (!r) return;
      e.preventDefault();
      const a = songDrag.split(':');
      const to = Number(r.dataset.sgRow.split(':')[3]);
      songDrag = null;
      moveLetter(a.slice(0, 3).join(':'), Number(a[3]), to);
    });
    edit.addEventListener('dragend', () => { songDrag = null; edit.querySelectorAll('.w-abc.is-over').forEach((x) => x.classList.remove('is-over')); });
  }
  function partAt(key) {
    const [k, kind, i] = key.split(':');
    return stagesOf(picked())[Number(k)][kind][Number(i)];
  }
  function stageRow(s, k, kind, i) {
    const it = s[kind][i];
    const word = kind === 'lessons' ? 'שיעור' : 'תרגול';
    const key = `${k}:${kind}:${i}`;
    const id = `${k}-${kind}-${i}`;
    const canDelete = !it.page && s[kind].length > 1;
    return `<div class="w-row" data-row="${key}" data-sort-group="prt:${k}:${kind}">
        <div class="w-row__head">
          <button class="w-handle" type="button" data-drag aria-label="גרירת ${word} ${i + 1}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
          <b>${word} ${i + 1}</b>
          <input data-st-name="${key}" value="${UI.esc(it.name)}" placeholder="שם ה${word} (לא חובה)" aria-label="השם של ${word} ${i + 1} בשלב ${k + 1}">
          <span class="a-tag ${isWritten(it) ? 'a-tag--live' : 'a-tag--draft'}">${isWritten(it) ? 'נכתב' : 'חסר'}</span>
          ${it.page ? `<a class="w-lrow__open" href="${it.page}?view=admin" target="_blank" rel="noopener" aria-label="צפייה ב${word} ${i + 1} (בלשונית חדשה)" title="צפייה">${EYE_ICON}</a>` : '<span class="w-row__gap"></span>'}
          ${canDelete ? `<button class="w-lrow__del" type="button" data-row-del="${key}" aria-label="מחיקת ${word} ${i + 1}" title="מחיקה">${TRASH_ICON}</button>` : '<span class="w-row__gap"></span>'}
          <button class="w-morebtn" type="button" data-more aria-label="אפשרויות ל${word} ${i + 1}" aria-haspopup="menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
          <button class="w-row__add" type="button" data-row-add="${key}" aria-label="הוספת ${word} בשלב ${k + 1}" title="הוספת ${word}">${PLUS_ICON}</button>
        </div>
        <div class="w-row__chips"><span>${word}</span><span>תבנית: ${UI.esc(it.template || 'לא נבחרה')}</span>${it.code || it.page ? `<span dir="ltr">${UI.esc(it.code || it.page.replace('.html', ''))}</span>` : ''}</div>
        <div class="w-row__fields">
          <div class="a-grid">
            <label class="a-field"><span>תבנית</span><select id="tp-${id}" data-st-field="${key}:template"><option value="">לא נבחרה</option>${TEMPLATE_NAMES.map((t) => `<option value="${t}"${it.template === t ? ' selected' : ''}>תבנית ${t}</option>`).join('')}</select></label>
          </div>
          ${it.template === SONG_TEMPLATE ? songFields(key, it) : `<label class="a-field"><span>תיאור ה${word}</span><textarea data-st-desc="${key}" placeholder="מה לומדים כאן">${UI.esc(it.desc)}</textarea></label>`}
        </div>
      </div>`;
  }
  const addScreen = (k, kind) => `<button class="w-addrow w-addscreen" type="button" data-row-add="${k}:${kind}:-1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>מסך ${kind === 'lessons' ? 'שיעור' : 'תרגול'}</button>`;
  function stageCard(s, k, isLast) {
    const msg = stageMsg.has(k) ? missingText(s) : '';
    if (!msg) stageMsg.delete(k);
    const rows = (kind) => s[kind].map((_, i) => stageRow(s, k, kind, i)).join('');
    return `<li class="w-st" data-st="${k}">
        <div class="w-st__head" data-st-head="${k}">
          <b>שלב ${k + 1}</b>
          <span class="w-st__end">
            ${msg ? `<span class="w-st__msg" role="status">${msg}</span>` : ''}
            <span class="w-st__state${s.published ? ' is-live' : ''}">${s.published ? 'פורסם' : 'טיוטה'}</span>
            ${UI.switchHtml(`st-pub-${k}`, s.published, `פרסום שלב ${k + 1}`)}
            <button class="w-lrow__del w-st__dup w-tipped" type="button" data-st-dup="${k}" aria-label="שכפול שלב ${k + 1}">${COPY_ICON}<span class="w-tip w-tip--l" aria-hidden="true">שכפול השלב</span></button>
            <button class="w-lrow__del w-tipped" type="button" data-st-del="${k}" aria-label="מחיקת שלב ${k + 1} – עובר לארכיון">${TRASH_ICON}<span class="w-tip w-tip--l" aria-hidden="true">מחיקה – השלב עובר לארכיון</span></button>
            <button class="w-chev" type="button" aria-expanded="false" aria-label="פתיחה וסגירה של שלב ${k + 1}">${CHEV}</button>
          </span>
        </div>
        <div class="w-fold"><div class="w-fold__in">
          <h4 class="w-st__title">שיעורים</h4>${rows('lessons') || addScreen(k, 'lessons')}
          <hr class="w-st__line">
          <h4 class="w-st__title">תרגולים</h4>${rows('practices') || addScreen(k, 'practices')}
          <div class="w-row__btns">
            <button class="a-btn w-draft" type="button" data-st-save="${k}:close">שמור וסגור</button>
            ${isLast ? '' : `<button class="a-btn a-btn--primary" type="button" data-st-save="${k}:next">שמור והמשך לשלב הבא</button>`}
          </div>
        </div></div>
      </li>`;
  }
  function lessonsPart(w) {
    if (w.review) return `<label class="a-field"><span>על אילו שיעורים החזרה</span><input id="f-reviewof" dir="ltr" value="${UI.esc(w.reviewOf || '')}" placeholder="1-10"></label>`;
    const stages = stagesOf(w);
    if (stagesFor !== w.id) { // another island: its first unfinished stage opens
      stagesFor = w.id;
      openStage = stages.findIndex((s) => !isReady(s));
      stageMsg.clear();
    }
    // a tile for every stage (edit · duplicate · delete); the stage being edited opens under the tiles
    const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
    const tile = (st, k) => `<li class="w-tile${k === openStage ? ' is-open' : ''}" data-tile="${k}" data-sort-group="til:${w.id}">
        <button class="w-handle w-tile__grip" type="button" data-drag aria-label="גרירת שלב ${k + 1}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
        <button class="w-tile__main" type="button" data-st-edit="${k}" aria-label="עריכת שלב ${k + 1}">
          <span class="w-tile__top"><b>שלב ${k + 1}</b><span class="a-tag ${st.published ? 'a-tag--live' : 'a-tag--draft'}">${st.published ? 'פורסם' : 'טיוטה'}</span></span>
          <small>${UI.esc(stName(st)) || 'בלי שם'}</small>
          ${stageBars(st)}
        </button>
        <span class="w-tile__acts">
          <button class="w-morebtn" type="button" data-more aria-label="אפשרויות לשלב ${k + 1}" aria-haspopup="menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
          <button class="w-lrow__del w-tipped" type="button" data-st-edit="${k}" aria-label="עריכת שלב ${k + 1}">${EDIT_ICON}<span class="w-tip w-tip--l" aria-hidden="true">עריכה</span></button>
          <button class="w-lrow__del w-st__dup w-tipped" type="button" data-st-dup="${k}" aria-label="שכפול שלב ${k + 1}">${COPY_ICON}<span class="w-tip w-tip--l" aria-hidden="true">שכפול השלב</span></button>
          <button class="w-lrow__del w-tipped" type="button" data-st-del="${k}" aria-label="מחיקת שלב ${k + 1} – עובר לארכיון">${TRASH_ICON}<span class="w-tip w-tip--l" aria-hidden="true">מחיקה – השלב עובר לארכיון</span></button>
        </span>
      </li>`;
    return `<ul class="w-tiles">${stages.map(tile).join('')}<li class="w-tile w-tile--add"><button class="w-addrow" type="button" data-wtab-add><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת שלב</button></li></ul>
        <ol class="w-stages w-stages--tiles">${stages.map((s, k) => stageCard(s, k, k === stages.length - 1)).join('')}</ol>
        <button class="w-ladd w-addrow" type="button" data-wtab-add hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת שלב</button>`;
  }
  // one open at each level; only classes change, so the height animates
  function applyOpen() {
    edit.querySelectorAll('[data-tile]').forEach((el) => el.classList.toggle('is-open', Number(el.dataset.tile) === openStage));
    edit.querySelectorAll('[data-st]').forEach((el) => {
      const on = Number(el.dataset.st) === openStage;
      el.classList.toggle('is-open', on);
      el.querySelector('.w-st__head .w-chev').setAttribute('aria-expanded', String(on));
    });
  }
  function revealOpen() {
    setTimeout(() => {
      const el = edit.querySelector('[data-st].is-open');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 270);
  }
  function saveNow() {
    if (bar.isDirty()) bar.el.querySelector('[data-save]').click();
    live.textContent = 'השינויים נשמרו';
  }
  function posField(w) {
    const at = list.findIndex((x) => x.id === w.id);
    const others = list.filter((x) => x.id !== w.id);
    const prev = at > 0 ? list[at - 1].id : '';
    return `<label class="a-field"><span>מיקום במסלול האיים</span><select id="f-pos">
        <option value=""${prev ? '' : ' selected'}>ראשון במסלול</option>
        ${others.map((x) => `<option value="${x.id}"${x.id === prev ? ' selected' : ''}>אחרי ${UI.esc(x.name || 'אי בלי שם')}</option>`).join('')}
      </select></label>`;
  }
  function drawEdit() {
    // the buttons step out of the card before it is redrawn (placeActions puts them back in its top row)
    document.querySelector('.w-layout').appendChild(actions);
    // a new world / review / stage form: the page's buttons go inside its white card (top corner)
    if (mode === 'world') { setH1(''); drawNewWorld(); placeActions(); return; }
    if (mode === 'review') { setH1(''); drawNewReview(); placeActions(); return; }
    if (mode === 'lesson') { setH1(''); drawNewLesson(); placeActions(); return; }
    const w = picked();
    if (!w) { setH1(''); edit.innerHTML = '<div class="a-card"><p class="a-muted">אין איים. אפשר להוסיף אי בכפתור "+ הוספה".</p></div>'; return; }
    setH1(w.name);
    if (viewTab === 'view') {
      const bg = bgOf(w);
      edit.innerHTML = `<div class="a-card w-tabbed w-viewcard" role="tabpanel">${topRow(w, '')}<h2 class="sr-only" id="w-title">צפייה בעמוד הראשי של האי</h2>${w.page
        ? `<iframe class="w-frame" src="${w.page}" title="העמוד הראשי של ${UI.esc(w.name)}"></iframe>`
        : `<div class="w-page w-page--wide"${bg ? ` style="background-image:url('${bg}')"` : ''}><p class="w-page__h"><span>${UI.esc(w.head1 || '')}</span><b>${UI.esc(w.head2 || '')}</b></p><p class="w-page__k">לאי הזה עוד אין עמוד באתר</p></div>`}</div>`;
      placeActions();
      drawPreview();
      return;
    }
    const part = [
      `          <div class="a-grid w-namepos">
            <label class="a-field"><span>השם (במפה ובתפריט)</span><input id="f-name" value="${UI.esc(w.name)}"></label>
            ${posField(w)}
          </div>
          <div class="a-grid w-heads">
            <label class="a-field"><span>הכותרת בדף האי – שורה 1</span><input id="f-head1" value="${UI.esc(w.head1 || '')}"></label>
            <label class="a-field"><span>שורה 2</span><input id="f-head2" value="${UI.esc(w.head2 || '')}"></label>
          </div>
          <div class="w-pubin" id="w-pubin"></div>`,
      `<label class="a-field"><span>כותרת ה"אודות" במפה</span><input id="f-title" value="${UI.esc(w.title)}"></label>
          <label class="a-field"><span>טקסט ה"אודות" במפה</span><textarea id="f-text">${UI.esc(w.text)}</textarea><small class="a-help">משפט או שניים: מה לומדים באי הזה</small></label>
          <div class="w-pubbox" id="w-warnbox"></div>`,
      `<div class="w-media-grid">${mediaField(w)}${bgField(w)}</div>`,
      lessonsPart(w),
    ][step];
    edit.innerHTML = `<div class="a-card w-sections w-tabbed" role="tabpanel">${topRow(w, stepsBar())}<h2 class="sr-only" id="w-title">עריכת ${UI.esc(w.name)}</h2><section>${part}</section>${stepNav()}</div>`;
    placeActions();
    syncSaveNow();
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
          <p class="w-kind">אי חדש</p>
          <h2 class="w-name" id="w-title">${UI.esc(d.name) || 'אי חדש'}</h2>
          <label class="a-field"><span>שם האי (במפה ובתפריט)</span><input id="n-name" value="${UI.esc(d.name)}" required></label>
          <div class="a-grid w-heads">
            <label class="a-field"><span>הכותרת בדף האי – שורה 1</span><input id="n-head1" value="${UI.esc(d.head1)}"></label>
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
          <div class="a-field"><span>כמה שיעורים מתוכננים באי</span>${UI.stepperHtml('n-planned', d.planned, 'כמה שיעורים מתוכננים באי', 1, 60)}<small class="a-help">למספור במפה, עד שכל השיעורים ייכתבו</small></div>
        </section>
        ${newFoot('יצירת האי')}
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
  const LESSON_TPL = [['הסבר', 'הסבר'], ['הסבר בלשוניות', 'הסבר בלשוניות'], ['שיר האותיות', 'שיר האותיות'], ['none', 'בלי מסך שיעור']];
  const PRACTICE_TPL = [['אותיות', 'אותיות'], ['מילים', 'מילים'], ['מילים עם הברות', 'מילים בהברות'], ['משפטים', 'משפטים'], ['none', 'בלי תרגול']];
  const radios = (name, opts, cur) => `<div class="w-radios" role="radiogroup">${opts.map(([v, t]) => `<label class="w-radio"><input type="radio" name="${name}" value="${v}"${v === cur ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>`;
  function drawNewLesson() {
    const d = draft;
    const w = list.find((x) => x.id === d.worldId) || list.find((x) => !x.review);
    if (!w) { edit.innerHTML = '<div class="a-card"><p class="a-muted">אין איים שאפשר להוסיף להם שלב.</p></div>'; return; }
    d.worldId = w.id;
    edit.innerHTML = `<form class="a-card w-sections w-new w-newstage" id="w-new-form" novalidate>
        <section aria-labelledby="w-title">
          <p class="w-kind">${UI.esc(w.name)}</p>
          <h2 class="w-name" id="w-title">שלב חדש</h2>
          <label class="a-field"><span>שם השלב</span><input id="n-name" value="${UI.esc(d.name)}" placeholder="למשל: האות של הרופאה" required></label>
          <fieldset class="a-field w-tplset"><legend>מסך השיעור – לפי איזו תבנית?</legend>${radios('n-ltpl', LESSON_TPL, d.ltpl || 'הסבר')}</fieldset>
          <fieldset class="a-field w-tplset"><legend>התרגול – לפי איזו תבנית?</legend>${radios('n-ptpl', PRACTICE_TPL, d.ptpl || 'אותיות')}</fieldset>
          <p class="a-help w-newstage__note">השלב נוצר כטיוטה, עם המסכים שבחרת. אחר כך ממלאים את התוכן ומפרסמים. אפשר להוסיף מסכים גם אחר כך (+ מסך).</p>
        </section>
        ${newFoot('יצירת השלב')}
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
    if (e.target.closest('[data-drag],[data-more]')) return;
    const w = picked();
    if (!w) return;
    const t = e.target.closest('[data-wtab]');
    if (t) { viewTab = t.dataset.wtab; drawEdit(); const b = edit.querySelector(`[data-wtab="${viewTab}"]`); if (b && e.detail === 0) b.focus(); return; }
    const st = e.target.closest("[data-go]");
    if (st) { step = Number(st.dataset.go); if (fresh.has(w.id)) reached[w.id] = Math.max(reached[w.id] || 0, step); drawEdit(); edit.scrollTop = 0; const b = edit.querySelector('[aria-current="step"]'); if (b && e.detail === 0) b.focus(); return; }
    // saving is at the end of the steps; "שמור כטיוטה" keeps the island hidden from the students
    const sv = e.target.closest('[data-save-draft],[data-save-now]');
    if (sv) {
      if (sv.hasAttribute('data-save-draft')) { w.published = false; drawList(); drawPreview(); changed(); }
      // the last step saves and publishes
      if (sv.hasAttribute('data-save-now') && !w.published) { w.published = true; drawList(); drawPreview(); changed(); }
      // the shared save button does the saving (spinner, "נשמר ✓", or a note if it failed)
      bar.save.run();
      live.textContent = 'השינויים נשמרו';
      return;
    }
    if (e.target.closest('[data-wtab-add]')) { startNew('lesson', w.id); return; }
    const delStage = e.target.closest('[data-st-del]');
    if (delStage) {
      const k = Number(delStage.dataset.stDel);
      const stages = editStages(w);
      const [gone] = stages.splice(k, 1);
      arch.stages.unshift({ worldId: w.id, worldName: w.name, n: k + 1, stage: gone, name: (w.lessonNames || [])[k] || '', desc: (w.lessonDescs || [])[k] || '', at: Date.now() });
      if (w.lessonNames) w.lessonNames.splice(k, 1);
      if (w.lessonDescs) w.lessonDescs.splice(k, 1);
      w.planned = stages.length;
      openStage = -1;
      stageMsg.clear();
      drawList(); drawEdit(); changed();
      live.textContent = `שלב ${k + 1} עבר לארכיון`;
      showToast(() => { const i = arch.stages.indexOf(arch.stages.find((a) => a.stage === gone)); if (i >= 0) arch.stages.splice(i, 1); const st = editStages(w); st.splice(k, 0, gone); w.lessonNames = pad(w.lessonNames || [], st.length - 1); w.lessonNames.splice(k, 0, ''); w.planned = st.length; drawAll(); changed(); live.textContent = 'השלב הוחזר'; }, 'השלב נמחק בהצלחה ונשמר בארכיון');
      return;
    }
    const dupStage = e.target.closest('[data-st-dup]');
    if (dupStage) {
      const k = Number(dupStage.dataset.stDup);
      const stages = editStages(w);
      const c = JSON.parse(JSON.stringify(stages[k]));
      c.published = false;
      stages.splice(k + 1, 0, c);
      if (w.lessonNames) w.lessonNames.splice(k + 1, 0, w.lessonNames[k] || '');
      if (w.lessonDescs) w.lessonDescs.splice(k + 1, 0, w.lessonDescs[k] || '');
      w.planned = stages.length;
      openStage = k + 1;
      stageMsg.clear();
      drawList(); drawEdit(); changed();
      live.textContent = `נוצר עותק של שלב ${k + 1} (שלב ${k + 2})`;
      revealOpen();
      return;
    }
    const addRow = e.target.closest('[data-row-add]');
    if (addRow) {
      const [k, kind, i] = addRow.dataset.rowAdd.split(':');
      editStages(w)[Number(k)][kind].splice(Number(i) + 1, 0, blankPart());
      openStage = Number(k);
      drawEdit(); changed();
      const f = edit.querySelector(`[data-st-name="${k}:${kind}:${Number(i) + 1}"]`); if (f) f.focus();
      return;
    }
    const delRow = e.target.closest('[data-row-del]');
    if (delRow) {
      const [k, kind, i] = delRow.dataset.rowDel.split(':');
      const word = kind === 'lessons' ? 'השיעור' : 'התרגול';
      const [part] = editStages(w)[Number(k)][kind].splice(Number(i), 1);
      arch.parts = arch.parts || [];
      const entry = { worldId: w.id, worldName: w.name, k: Number(k), kind, part, at: Date.now() };
      arch.parts.unshift(entry);
      drawAll(); changed();
      live.textContent = `${word} עבר לארכיון`;
      showToast(() => { const j = arch.parts.indexOf(entry); if (j >= 0) arch.parts.splice(j, 1); const st = editStages(w); if (st[Number(k)]) st[Number(k)][kind].splice(Number(i), 0, part); drawAll(); changed(); live.textContent = `${word} הוחזר`; }, `${word} נמחק בהצלחה ונשמר בארכיון`);
      return;
    }
    const stEdit = e.target.closest('[data-st-edit]');
    if (stEdit) {
      const k = Number(stEdit.dataset.stEdit);
      openStage = openStage === k ? -1 : k;
      applyOpen();
      revealOpen();
      return;
    }
    const stSave = e.target.closest('[data-st-save]');
    if (stSave) {
      const [k, how] = stSave.dataset.stSave.split(':');
      openStage = how === 'next' ? Number(k) + 1 : -1;
      applyOpen();
      saveNow();
      revealOpen();
      return;
    }
    // a click on the stage's head opens or closes it; its switch does not
    if (e.target.closest('input,textarea,select,a,label')) return;
    const sh = e.target.closest('[data-st-head]');
    if (sh) {
      const k = Number(sh.dataset.stHead);
      openStage = openStage === k ? -1 : k;
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
      if (!isName) {
        const st = stagesOf(w)[Number(k)];
        const part = st[kind][Number(i)];
        const tag = edit.querySelector(`[data-row="${k}:${kind}:${i}"] .a-tag`);
        tag.className = `a-tag ${isWritten(part) ? 'a-tag--live' : 'a-tag--draft'}`;
        tag.textContent = isWritten(part) ? 'נכתב' : 'חסר';
        const note = edit.querySelector(`[data-st="${k}"] .w-st__msg`);
        if (note) { const text = missingText(st); if (text) note.textContent = text; else { note.remove(); stageMsg.delete(Number(k)); } }
      }
      changed();
      return;
    }
    if (mode !== 'edit') {
      const key = { 'n-name': 'name', 'n-head1': 'head1', 'n-head2': 'head2', 'n-title': 'title', 'n-text': 'text', 'n-reviewof': 'reviewOf' }[id];
      if (!key) return;
      draft[key] = e.target.value;
      if (key === 'name') $('w-title').textContent = draft.name || ({ world: 'אי חדש', review: 'חזרה חדשה', lesson: 'שלב חדש' })[mode];
      if (mode !== 'lesson') drawPreview();
      return;
    }
    const w = picked();
    // moving the island to its new place on the path
    if (id === 'f-pos' && w) {
      const from = list.findIndex((x) => x.id === w.id);
      list.splice(from, 1);
      const to = e.target.value ? list.findIndex((x) => x.id === e.target.value) + 1 : 0;
      list.splice(to, 0, w);
      drawList(); drawEdit(); changed();
      const sel = $('f-pos'); if (sel) sel.focus();
      const li = items.querySelector(`[data-id="${w.id}"]`); if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      live.textContent = `${w.name} הועבר/ה למקום ${to + 1}`;
      return;
    }
    const key = { 'f-name': 'name', 'f-head1': 'head1', 'f-head2': 'head2', 'f-kicker': 'kicker', 'f-title': 'title', 'f-text': 'text', 'f-reviewof': 'reviewOf' }[id];
    if (!w || !key) return;
    w[key] = e.target.value;
    if (key === 'kicker') w.kickerAuto = !w.kicker.trim();
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
      const pickV = (n) => (edit.querySelector(`input[name="${n}"]:checked`) || {}).value || 'none';
      const lt = pickV('n-ltpl');
      const pt = pickV('n-ptpl');
      const stages = editStages(w);
      stages.push({ published: false, name, lessons: lt === 'none' ? [] : [{ ...blankPart(name), template: lt }], practices: pt === 'none' ? [] : [{ ...blankPart(), template: pt }] });
      w.lessonNames = w.lessonNames || [];
      while (w.lessonNames.length < stages.length - 1) w.lessonNames.push('');
      w.lessonNames.push(name);
      w.planned = stages.length;
      opened.add(w.id);
      pickedId = w.id;
      step = 3; viewTab = 'edit'; stagesFor = w.id; openStage = stages.length - 1; stageMsg.clear();
      live.textContent = `השלב "${name}" נוצר כטיוטה ב${w.name}`;
    } else {
      if (mode === 'review' && !($('n-reviewof').value || '').trim()) { $('n-reviewof').focus(); return; }
      const at = Number($('n-at').value);
      const w = { ...draft, name };
      if (w.review) w.kickerAuto = true;
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
  actions.append(bar.el, pubTop, dupBtn, delBtn);
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
    if (warn) warn.innerHTML = w.published && Worlds.isDemo(w) ? `<div class="a-note a-note--warn w-warn">${UI.ICON.warn}<p>האי מפורסם, אבל בחלון ה"אודות" שלו עדיין יש טקסט דמו. כדאי להחליף אותו בטקסט האמיתי.</p></div>` : '';
  }

  wireSong();
  /* ---------- order: drag by the ⋮⋮ handle, the keyboard (space · arrows · space), or the ⋯ menu ----------
     groups: "isl" the islands · "stg:<id>" / "til:<id>" an island's stages (list / tiles) · "prt:<k>:<kind>" a stage's lessons or practices.
     A new order is kept at once (it doesn't wait for "שמירה"), with "ביטול" for 5 seconds. */
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const mv = (arr, from, to) => { const [x] = arr.splice(from, 1); arr.splice(to, 0, x); };
  const pad = (arr, n) => { while (arr.length < n) arr.push(''); return arr; };
  const groupEls = (g) => [...document.querySelectorAll('[data-sort-group]')].filter((el) => el.dataset.sortGroup === g);
  const followList = (arr) => { const pos = new Map(list.map((w, i) => [w.id, i])); arr.sort((x, y) => (pos.has(x.id) ? pos.get(x.id) : 1e9) - (pos.has(y.id) ? pos.get(y.id) : 1e9)); };
  function opStage(arr, wid, from, to) {
    const w = arr.find((x) => x.id === wid);
    if (!w) return;
    const st = editStages(w);
    if (from >= st.length || to >= st.length) return;
    mv(st, from, to);
    w.lessonNames = pad(w.lessonNames || [], st.length); mv(w.lessonNames, from, to);
    if (w.lessonDescs) { pad(w.lessonDescs, st.length); mv(w.lessonDescs, from, to); }
  }
  function opPart(arr, wid, k, kind, from, toK, to) {
    const w = arr.find((x) => x.id === wid);
    if (!w) return;
    const st = editStages(w);
    if (!st[k] || !st[toK] || from >= st[k][kind].length) return;
    const [p] = st[k][kind].splice(from, 1);
    st[toK][kind].splice(Math.min(to, st[toK][kind].length), 0, p);
  }
  // the toast: "הסדר עודכן" + "ביטול"
  const toast = document.createElement('div');
  toast.className = 'w-toast';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  document.body.appendChild(toast);
  let toastT = 0;
  function showToast(undo, text) {
    clearTimeout(toastT);
    toast.innerHTML = `<span>${text || 'הסדר עודכן'}</span><button type="button">ביטול</button>`;
    toast.hidden = false;
    toast.querySelector('button').addEventListener('click', () => { clearTimeout(toastT); toast.hidden = true; undo(); });
    toastT = setTimeout(() => { toast.hidden = true; }, 5000);
  }
  // keep the new order now: in the page and in what is saved, so the "יש שינויים" bar doesn't light up
  function commitOrder(op, msg) {
    const snap = { list: clone(list), saved: clone(saved), open: openStage };
    op(list, false);
    op(saved, true);
    drawAll();
    saved.forEach((sv) => { const l = list.find((x) => x.id === sv.id); if (sv.review && l && l.kickerAuto && isAutoKicker(sv)) { sv.kicker = l.kicker; sv.kickerAuto = true; } });
    Worlds.save(saved);
    changed();
    live.textContent = msg;
    showToast(() => { list = snap.list; saved = snap.saved; openStage = snap.open; Worlds.save(saved); drawAll(); changed(); live.textContent = 'הסדר הוחזר כמו שהיה'; });
  }
  // the rows slide to their new places
  function flip(g, before, from, to) {
    const order = before.map((_, i) => i);
    mv(order, from, to);
    groupEls(g).forEach((el, j) => {
      const r0 = before[order[j]];
      if (!r0) return;
      const r1 = el.getBoundingClientRect();
      const dx = r0.left - r1.left;
      const dy = r0.top - r1.top;
      if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)' });
    });
  }
  function moveIn(g, from, to, opts = {}) {
    if (from === to || to < 0) return;
    const before = groupEls(g).map((el) => el.getBoundingClientRect());
    if (to >= before.length) return;
    if (opts.lifted) before[from] = opts.lifted;
    const [kind, a, b] = g.split(':');
    const n = before.length;
    if (kind === 'isl') {
      const w = list[from];
      commitOrder((arr, isSaved) => (isSaved ? followList(arr) : mv(arr, from, to)), `${w.name || 'האי'} עבר/ה למקום ${to + 1} מתוך ${n}`);
    } else if (kind === 'stg' || kind === 'til') {
      const remap = (i) => (i === from ? to : from < i && i <= to ? i - 1 : to <= i && i < from ? i + 1 : i);
      if (openStage >= 0) openStage = remap(openStage);
      stageMsg.clear();
      [...subOpen].forEach((key) => { const [id, k] = key.split(':'); if (id === a) { subOpen.delete(key); subOpen.add(`${id}:${remap(Number(k))}`); } });
      commitOrder((arr) => opStage(arr, a, from, to), `שלב ${from + 1} עבר למקום ${to + 1} מתוך ${n}`);
    } else if (kind === 'prt') {
      const word = b === 'lessons' ? 'שיעור' : 'תרגול';
      commitOrder((arr) => opPart(arr, pickedId, Number(a), b, from, Number(a), to), `${word} ${from + 1} עבר למקום ${to + 1} מתוך ${n}`);
    }
    flip(g, before, from, to);
    if (opts.focus) { const el = groupEls(g)[to]; const h = el && el.querySelector(opts.focus); if (h) h.focus(); }
  }

  // dragging with the mouse / finger: only the handle lifts the row; a 2px pink line shows where it lands
  const line = document.createElement('div');
  line.className = 'w-drop-line';
  line.hidden = true;
  document.body.appendChild(line);
  let drag = null;
  let kb = null;
  function targetOf(e) {
    const others = groupEls(drag.g).filter((x) => x !== drag.el);
    if (!others.length) return { to: 0, others };
    if (!drag.grid) {
      const to = others.filter((o) => { const r = o.getBoundingClientRect(); return r.top + r.height / 2 < e.clientY; }).length;
      return { to, others };
    }
    let best = 0; let bd = Infinity;
    others.forEach((o, i) => { const r = o.getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY); if (d < bd) { bd = d; best = i; } });
    const r = others[best].getBoundingClientRect();
    const before = e.clientX > r.left + r.width / 2; // right to left: the right half comes first
    return { to: best + (before ? 0 : 1), others, near: others[best], before };
  }
  function showLine(t) {
    const { to, others } = t;
    if (!others.length) { line.hidden = true; return; }
    line.hidden = false;
    if (drag.grid) {
      const r = t.near.getBoundingClientRect();
      Object.assign(line.style, { width: '2px', height: `${r.height}px`, top: `${r.top}px`, left: `${(t.before ? r.right + 5 : r.left - 7)}px` });
      return;
    }
    const ref = others[Math.min(to, others.length - 1)].getBoundingClientRect();
    const y = to < others.length ? ref.top - 3 : ref.bottom + 1;
    Object.assign(line.style, { width: `${ref.width}px`, height: '2px', left: `${ref.left}px`, top: `${y}px` });
  }
  document.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('[data-drag]');
    if (!h || e.button !== 0 || kb) return;
    const el = h.closest('[data-sort-group]');
    if (!el) return;
    e.preventDefault();
    const g = el.dataset.sortGroup;
    const from = groupEls(g).indexOf(el);
    drag = { g, el, h, from, to: from, x0: e.clientX, y0: e.clientY, grid: g.startsWith('til'), moved: false, scroller: el.closest('.w-list, .w-tabbed > section') };
    try { h.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) return;
      drag.moved = true;
      drag.el.classList.add('is-lifted');
      document.body.classList.add('is-sorting');
    }
    const sc = drag.scroller;
    if (sc) { const r = sc.getBoundingClientRect(); if (e.clientY < r.top + 40) sc.scrollTop -= 10; else if (e.clientY > r.bottom - 40) sc.scrollTop += 10; }
    drag.el.style.transform = `translate(${drag.grid ? e.clientX - drag.x0 : 0}px, ${e.clientY - drag.y0}px) scale(1.02)`;
    const t = targetOf(e);
    drag.to = t.to;
    showLine(t);
  });
  const endDrag = (cancel) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    line.hidden = true;
    document.body.classList.remove('is-sorting');
    const lifted = d.el.getBoundingClientRect();
    d.el.classList.remove('is-lifted');
    d.el.style.transform = '';
    if (d.moved && !cancel && d.to !== d.from) moveIn(d.g, d.from, d.to, { lifted });
  };
  document.addEventListener('pointerup', () => endDrag(false));
  document.addEventListener('pointercancel', () => endDrag(true));

  // the keyboard: space lifts, the arrows move, space puts it down (Esc puts it back)
  document.addEventListener('keydown', (e) => {
    if (drag && e.key === 'Escape') { endDrag(true); return; }
    const h = e.target.closest && e.target.closest('[data-drag]');
    if (!h) return;
    const el = h.closest('[data-sort-group]');
    if (!el) return;
    const g = el.dataset.sortGroup;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!kb) {
        const from = groupEls(g).indexOf(el);
        kb = { g, el, from, cur: from };
        el.classList.add('is-lifted');
        live.textContent = `הורם – מקום ${from + 1} מתוך ${groupEls(g).length}. חצים להזזה, רווח להנחה, Esc לביטול`;
      } else {
        const k = kb;
        kb = null;
        k.el.classList.remove('is-lifted');
        if (k.cur === k.from) { live.textContent = 'הסדר לא השתנה'; return; }
        drawAll(); // back to the real order, then move it for real
        moveIn(k.g, k.from, k.cur, { focus: '[data-drag]' });
      }
      return;
    }
    if (!kb || kb.el !== el) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      const k = kb;
      kb = null;
      k.el.classList.remove('is-lifted');
      drawAll();
      const back = groupEls(k.g)[k.from];
      if (back) back.querySelector('[data-drag]').focus();
      live.textContent = 'ההזזה בוטלה';
      return;
    }
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowLeft';
    const bwd = e.key === 'ArrowUp' || e.key === 'ArrowRight';
    if (!fwd && !bwd) return;
    e.preventDefault();
    const sibs = groupEls(g);
    const n = kb.cur + (fwd ? 1 : -1);
    if (n < 0 || n >= sibs.length) return;
    const ref = fwd ? sibs[n].nextSibling : sibs[n];
    const r0 = el.getBoundingClientRect();
    sibs[n].parentNode.insertBefore(el, ref);
    const r1 = el.getBoundingClientRect();
    el.animate([{ transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px)` }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
    kb.cur = n;
    h.focus();
    live.textContent = `מקום ${n + 1} מתוך ${sibs.length}`;
  });

  // the ⋯ menu: up · down, and for a lesson / practice "העברה לשלב…"
  const more = document.createElement('div');
  more.className = 'w-more';
  more.setAttribute('role', 'menu');
  more.hidden = true;
  document.body.appendChild(more);
  let moreCtx = null;
  const closeMore = (back) => { more.hidden = true; if (back && moreCtx) moreCtx.btn.focus(); moreCtx = null; };
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-more]');
    if (btn) {
      if (moreCtx && moreCtx.btn === btn) { closeMore(false); return; }
      const el = btn.closest('[data-sort-group]');
      const g = el.dataset.sortGroup;
      const sibs = groupEls(g);
      const i = sibs.indexOf(el);
      let html = `<button type="button" role="menuitem" data-act="up"${i === 0 ? ' disabled' : ''}>הזזה למעלה</button><button type="button" role="menuitem" data-act="down"${i === sibs.length - 1 ? ' disabled' : ''}>הזזה למטה</button>`;
      if (g.startsWith('prt')) {
        const [, k] = g.split(':');
        const stages = stagesOf(picked());
        if (stages.length > 1) html += `<p class="w-more__h">העברה לשלב…</p>${stages.map((st, j) => (j === Number(k) ? '' : `<button type="button" role="menuitem" data-act="to:${j}">שלב ${j + 1}${stName(st) ? ` · ${UI.esc(stName(st))}` : ''}</button>`)).join('')}`;
      }
      more.innerHTML = html;
      more.hidden = false;
      const r = btn.getBoundingClientRect();
      const mw = more.offsetWidth;
      const mh = more.offsetHeight;
      more.style.left = `${Math.max(8, Math.min(r.right - mw, innerWidth - mw - 8))}px`;
      more.style.top = `${r.bottom + 6 + mh > innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6}px`;
      moreCtx = { btn, g, i };
      const first = more.querySelector('button:not([disabled])');
      if (first && e.detail === 0) first.focus();
      return;
    }
    if (!more.hidden && !more.contains(e.target)) closeMore(false);
  });
  more.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !moreCtx) return;
    const { g, i } = moreCtx;
    const viaKeys = e.detail === 0;
    closeMore(false);
    const act = b.dataset.act;
    if (act === 'up' || act === 'down') { moveIn(g, i, i + (act === 'up' ? -1 : 1), viaKeys ? { focus: '[data-more]' } : {}); return; }
    const toK = Number(act.split(':')[1]);
    const [, k, kind] = g.split(':');
    const word = kind === 'lessons' ? 'השיעור' : 'התרגול';
    openStage = toK;
    commitOrder((arr) => opPart(arr, pickedId, Number(k), kind, i, toK, Infinity), `${word} עבר לסוף שלב ${toK + 1}`);
    revealOpen();
    if (viaKeys) { const el = groupEls(`prt:${toK}:${kind}`).pop(); if (el) el.querySelector('[data-more]').focus(); }
  });
  more.addEventListener('keydown', (e) => {
    const all = [...more.querySelectorAll('button:not([disabled])')];
    const at = all.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); all[(at + 1) % all.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); all[(at - 1 + all.length) % all.length].focus(); }
    if (e.key === 'Escape') { e.preventDefault(); closeMore(true); }
  });
  document.addEventListener('scroll', () => { if (!more.hidden) closeMore(false); }, true);

  function drawAll() { drawList(); drawEdit(); drawPreview(); }
  drawAll();
})();
