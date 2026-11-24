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
  const subOf = (w) => { if (w.review) return w.kicker || 'אי חזרה'; const st = stagesOf(w); const n = st.reduce((a, x) => a + x.lessons.length + x.practices.length, 0); return `${st.length} שלבים · ${n} פריטים`; };
  const islandOn = (w) => mode === 'edit' && w.id === pickedId && sel.type === 'island';
  const imgSrc = (w, small) => (w.imgData || (w.img ? `assets/${small ? 'map/' : ''}${w.img}.webp` : ''));
  const pic = (w, cls) => (imgSrc(w, true) ? `<img class="${cls}" src="${imgSrc(w, true)}" alt="" onerror="this.onerror=null;this.src='assets/${w.img}.webp'">` : `<span class="${cls} ${cls}--none" aria-hidden="true"></span>`);

  /* ---------- the + menu, beside the save area ---------- */
  const plus = document.createElement('div');
  plus.className = 'w-plus';
  plus.innerHTML = `<button class="w-plus__btn" type="button" id="w-plus" aria-haspopup="menu" aria-expanded="false" aria-controls="w-plus-menu" ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>אי</span></button>
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
  delBtn.addEventListener('click', () => { const w = mode === 'edit' && picked(); if (w) askArchive(w); });
  // the reviews that go over an island's lessons (by their lesson range)
  const rangeOf = (txt) => { const m = String(txt || '').match(/(\d+)\s*-\s*(\d+)/); return m ? [Number(m[1]), Number(m[2])] : null; };
  function reviewsWith(w) {
    if (w.review || !w.planned) return [];
    const a = w.firstLesson || 1;
    const b = a + w.planned - 1;
    return list.filter((r) => { if (!r.review) return false; const rg = rangeOf(r.reviewOf); return rg && rg[0] <= b && a <= rg[1]; }).map((r) => r.name);
  }
  // deleting = to the archive (archived, archivedAt), after a question
  function askArchive(w) {
    const name = w.name || (w.review ? 'החזרה' : 'האי');
    const revs = reviewsWith(w);
    UI.confirm({
      title: `להעביר את ${name} לארכיון?`,
      note: revs.length ? `האי כלול ב${joinHe(revs)}. החזרות יישארו, אבל בלי השיעורים שלו.` : '',
      ok: 'העברה לארכיון',
      cancel: 'ביטול',
    }, () => archiveIsland(w));
  }
  function archiveIsland(w) {
    const at = list.findIndex((x) => x.id === w.id);
    if (at < 0) return;
    const name = w.name || (w.review ? 'החזרה' : 'האי');
    list.splice(at, 1);
    w.archived = true;
    w.archivedAt = new Date().toISOString();
    const entry = { w, at: Date.now() };
    arch.islands.unshift(entry);
    // the one that moved up into its place opens (the one above, if it was the last)
    pickedId = (list[at] || list[at - 1] || {}).id;
    mode = 'edit'; step = 0; viewTab = 'edit';
    drawAll(); changed();
    revealPicked();
    live.textContent = `${name} ${w.review ? 'הועברה' : 'הועבר'} לארכיון`;
    showToast(() => {
      const j = arch.islands.indexOf(entry);
      if (j >= 0) arch.islands.splice(j, 1);
      delete w.archived; delete w.archivedAt;
      list.splice(Math.min(at, list.length), 0, w);
      pickedId = w.id; mode = 'edit'; step = 0; viewTab = 'edit';
      drawAll(); changed(); revealPicked();
      live.textContent = `${name} ${w.review ? 'חזרה' : 'חזר'} למקום ${at + 1}`;
    }, `${name} ${w.review ? 'הועברה' : 'הועבר'} לארכיון`);
  }
  // the list scrolls to the picked island
  function revealPicked() {
    const li = items.querySelector(`.w-item[data-id="${pickedId}"]`);
    if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
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
  items.insertAdjacentHTML('afterend', '<p class="w-legend" aria-hidden="true"><span><i class="w-dot w-dot--pub"></i>פורסם</span><span><i class="w-dot w-dot--written"></i>נכתב</span><span><i class="w-dot w-dot--draft"></i>טיוטה</span></p>');
  const opened = new Set();
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  function drawList() {
    const pub = list.filter((w) => w.published).length;
    syncReviewKickers();
    $('w-count').textContent = `${pub} מתוך ${list.length} מפורסמים`;
    paintArchBtn();
    if (showArch) { items.innerHTML = archList(); return; }
    items.innerHTML = list.map((w, k) => `<li class="w-item" data-id="${w.id}" data-sort-group="isl" aria-current="${islandOn(w)}">
        <button class="w-grip" type="button" data-drag data-grip aria-label="גרירת ${UI.esc(w.name)} – מקום ${k + 1} מתוך ${list.length}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
        <span class="w-n" aria-hidden="true">${k + 1}</span>
        ${pic(w, 'w-pic')}
        <span class="w-body">
          <button class="w-pick" type="button" data-pick aria-current="${islandOn(w)}"><b>${UI.esc(w.name) || 'אי בלי שם'}</b><small>${UI.esc(subOf(w))}</small></button>
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
    const back = (key, what) => `<button class="w-arch__back w-tipped" type="button" data-restore="${key}" aria-label="שחזור ${UI.esc(what)}">${BACK_ICON}<span>שחזור</span><span class="w-tip w-tip--l" aria-hidden="true">${BACK_TIP[key[0]]}</span></button>`;
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
      delete a.w.archived; delete a.w.archivedAt;
      list.push(a.w);
      pickedId = a.w.id; mode = 'edit'; step = 0; viewTab = 'edit';
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
  // a world opens to its tree (a review world: what it goes over)
  const subOpen = new Set();
  const STATUS = { pub: 'פורסם', written: 'נכתב', draft: 'טיוטה' };
  const dot = (st) => `<i class="w-dot w-dot--${st}" role="img" aria-label="${STATUS[st]}" title="${STATUS[st]}"></i>`;
  const stageStatus = (st) => (st.published ? 'pub' : isReady(st) ? 'written' : 'draft');
  const partStatus = (st, p) => (!isWritten(p) ? 'draft' : st.published ? 'pub' : 'written');
  const partWord = (kind) => (kind === 'lessons' ? 'שיעור' : 'תרגול');
  const tagStage = (k) => `<span class="w-tag w-tag--stage">שלב ${k + 1}</span>`;
  const tagPart = (kind, i) => (kind === 'lessons' ? '<span class="w-tag w-tag--lesson">שיעור</span>' : `<span class="w-tag w-tag--practice">תרגול ${i + 1}</span>`);
  const DOTS3 = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  function treeOf(w) {
    const on = (t, k, kind, i) => mode === 'edit' && w.id === pickedId && sel.type === t && sel.k === k && (t !== 'part' || (sel.kind === kind && sel.i === i));
    const rows = stagesOf(w).map((st, k) => {
      const open = subOpen.has(`${w.id}:${k}`);
      const parts = (kind) => st[kind].map((p, i) => `<li class="w-tn" data-sort-group="tpr:${w.id}:${k}:${kind}">
          <div class="w-tn__row w-tn__row--part${on('part', k, kind, i) ? ' is-sel' : ''}">
            <button class="w-handle" type="button" data-drag aria-label="גרירת ${partWord(kind)} ${i + 1}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
            <button class="w-tn__main" type="button" data-sel="part:${k}:${kind}:${i}"${on('part', k, kind, i) ? ' aria-current="true"' : ''}>${tagPart(kind, i)}<span class="w-tn__name">${UI.esc(p.name) || partWord(kind)}</span></button>
            ${dot(partStatus(st, p))}
            <button class="w-morebtn" type="button" data-more aria-label="אפשרויות ל${partWord(kind)} ${i + 1}" aria-haspopup="menu">${DOTS3}</button>
          </div>
        </li>`).join('');
      const choosing = addPartAt === `${w.id}:${k}`;
      const add = choosing
        ? `<span class="w-tn__choose"><button type="button" data-add-part-kind="${k}:lessons">שיעור</button><button type="button" data-add-part-kind="${k}:practices">תרגול</button><button type="button" class="w-tn__x" data-add-part-cancel aria-label="ביטול">✕</button></span>`
        : `<button class="w-tn__add" type="button" data-add-part="${k}">+ שיעור / תרגול</button>`;
      return `<li class="w-tn w-tn--stage" data-sort-group="stg:${w.id}">
          <div class="w-tn__row w-tn__row--stage${on('stage', k) ? ' is-sel' : ''}">
            <button class="w-handle" type="button" data-drag data-grip aria-label="גרירת שלב ${k + 1}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
            <button class="w-tn__main" type="button" data-sel="stage:${k}"${on('stage', k) ? ' aria-current="true"' : ''}>${tagStage(k)}<b class="w-tn__name">${UI.esc(stName(st))}</b></button>
            ${dot(stageStatus(st))}
            <button class="w-morebtn" type="button" data-more aria-label="אפשרויות לשלב ${k + 1}" aria-haspopup="menu">${DOTS3}</button>
            <button class="w-tn__chev" type="button" data-sub-toggle="${k}" aria-expanded="${open}" aria-label="${open ? 'סגירת' : 'פתיחת'} שלב ${k + 1}">${CHEV}</button>
          </div>
          ${open ? `<ul class="w-tn__kids">${parts('lessons')}${parts('practices')}<li class="w-tn__addli">${add}</li></ul>` : ''}
        </li>`;
    }).join('');
    return `<ul class="w-tree">${rows}<li class="w-tn__addli w-tn__addli--stage"><button class="w-addrow" type="button" data-add-lesson><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת שלב</button></li></ul>`;
  }
  function subList(w) {
    if (!w.review) return treeOf(w);
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
      const label = stTitle(st, k);
      const part = (kind, word) => st[kind].map((p, i) => `<li><button class="w-sub2__item" type="button" data-sub-lesson="${k}"><span>${word} ${i + 1}${p.name ? ` · ${UI.esc(p.name)}` : ''}</span><small>${isWritten(p) ? 'נכתב' : 'חסר'}</small></button></li>`).join('');
      return `<li data-sort-group="stg:${w.id}">
          <div class="w-subrow">
            <button class="w-handle" type="button" data-drag data-grip aria-label="גרירת שלב ${k + 1}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
            <button class="w-sub__item${isReady(st) ? '' : ' is-empty'}" type="button" data-sub-lesson="${k}"><span><b>${label}</b><small>${stSub(st, k)}</small>${stageBars(st)}</span></button>
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
    if (e.target.closest('[data-add-lesson]')) { openNewStage(li.dataset.id); return; }
    const sb = e.target.closest('[data-sel]');
    if (sb) {
      const p = sb.dataset.sel.split(':');
      pickedId = li.dataset.id; mode = 'edit'; draft = null; viewTab = 'edit'; newStageFor = null; addPartAt = null;
      sel = p[0] === 'stage' ? { type: 'stage', k: Number(p[1]) } : { type: 'part', k: Number(p[1]), kind: p[2], i: Number(p[3]) };
      opened.add(li.dataset.id);
      subOpen.add(`${li.dataset.id}:${p[1]}`);
      drawAll();
      const back = items.querySelector(`.w-item[data-id="${li.dataset.id}"] [data-sel="${sb.dataset.sel}"]`);
      if (back && e.detail === 0) back.focus();
      return;
    }
    const ap = e.target.closest('[data-add-part]');
    if (ap) { addPartAt = `${li.dataset.id}:${ap.dataset.addPart}`; drawList(); const f = items.querySelector('[data-add-part-kind]'); if (f) f.focus(); return; }
    if (e.target.closest('[data-add-part-cancel]')) { addPartAt = null; drawList(); return; }
    const apk = e.target.closest('[data-add-part-kind]');
    if (apk) {
      const [k, kind] = apk.dataset.addPartKind.split(':');
      const w = list.find((x) => x.id === li.dataset.id);
      const st = editStages(w)[Number(k)];
      st[kind].push(blankPart());
      addPartAt = null;
      pickedId = w.id; mode = 'edit'; draft = null; viewTab = 'edit';
      sel = { type: 'part', k: Number(k), kind, i: st[kind].length - 1 };
      drawAll(); changed();
      const f = edit.querySelector('[data-st-name]'); if (f) f.focus();
      live.textContent = `${partWord(kind)} חדש נוסף לשלב ${Number(k) + 1}`;
      return;
    }
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
    sel = { type: 'island' };
    viewTab = 'edit';
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
    'letters.html': 'assets/world-letters-bg.webp', 'doctor.html': 'assets/doctor-world-bg-hd.webp', 'smiles.html': 'assets/world-smiles-bg.webp',
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
  let newStageFor = null;
  // what the editor shows, chosen in the tree: the island, a stage, a lesson / practice, or a new stage
  let sel = { type: 'island' };
  let addPartAt = null; // "+ שיעור / תרגול" open on this stage ("<island>:<k>")
  let shownStage = -1; // the stage picked in the tiles: its card stays (closed) when its arrow folds it // a new stage is filled in under the tiles (the tiles stay)
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
  const topRow = (w, middle) => `<div class="w-toprow"><div class="w-toprow__name"><b aria-hidden="true">${UI.esc(w.name)}</b></div><div class="w-toprow__mid">${middle}</div><div class="w-toprow__end">${topPub(w)}${sel.type === 'island' ? viewTabs() : ''}</div></div>`;
  // breadcrumbs: each part goes up a level (and picks it in the tree)
  function crumbs(w) {
    if (sel.type === 'island') return '';
    const c = [`<button type="button" data-crumb="island">${UI.esc(w.name)}</button>`];
    const last = (t) => `<span aria-current="page">${t}</span>`;
    if (sel.type === 'newstage') c.push(last('שלב חדש'));
    if (sel.type === 'stage') c.push(last(`שלב ${sel.k + 1}`));
    if (sel.type === 'part') { c.push(`<button type="button" data-crumb="stage">שלב ${sel.k + 1}</button>`); c.push(last(`${partWord(sel.kind)} ${sel.i + 1}`)); }
    return `<nav class="w-crumbs" aria-label="מיקום">${c.join('<span class="w-crumbs__sep" aria-hidden="true">›</span>')}</nav>`;
  }
  // the island's publish switch, beside the steps: "פורסם" / "לא פורסם"
  const topPub = (w) => `<span class="w-toppub">${UI.switchHtml('w-pub-top', w.published, 'פרסום האי')}<span class="w-toppub__t${w.published ? ' is-on' : ''}">${w.published ? 'פורסם' : 'לא פורסם'}</span></span>`;
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
  // a stage's title is its name; its number and screens go in the small line under it
  const stTitle = (st, k) => UI.esc(stName(st)) || `שלב ${k + 1}`;
  const stSub = (st, k) => { const n = st.lessons.length + st.practices.length; return `שלב ${k + 1} · ${n} ${n === 1 ? "מסך" : "מסכים"}`; };
  const stName = (st) => st.name || (st.lessons[0] || {}).name || '';
  // what each existing lesson page holds: the stage's name, the lesson and the practice (from the client's "רק הקלטות" doc)
  const ABC_SAYS = 'כדי להתחיל לקרוא, נצטרך לזהות את אותיות ה-abc.\nבשביל זה נשתמש בסרגל האותיות שלנו.\nאיך משתמשים בסרגל?\nמצאו את האות שאתם צריכים על סרגל האותיות.\nהַפְעִילוּ את שיר ה-abc, הָזִיזוּ את האצבע על סרגל האותיות לפי הקצב עד שתגיעו לאות הרצויה.\nאחר כך לפי שם האות נחשו איזה צליל היא מפיקה.\nתַּרְגְּלוּ עד שאתם מכירים את כל האותיות!';
  const PAGE_CONTENT = {
    'letters-lesson.html': {
      stage: 'סרגל ה-abc',
      lesson: { name: 'זיהוי האותיות', template: 'שיר האותיות', code: 'abc-1-song' },
      practice: { name: 'זיהוי האותיות', template: 'אותיות', code: 'abc-1-practice', desc: 'נתרגל עכשיו זיהוי אותיות.\nזַהו את האותיות שמופיעות על המסך. לגבי כל אות, אמרו את שם האות.\nלפי שם האות, נחשו איזה צליל האות מפיקה.\nאם אינכם זוכרים, הַפְעִילוּ את סרגל האותיות.' },
    },
    'vowels-lesson.html': {
      stage: 'אותיות ניקוד',
      lesson: { name: 'מה זה אותיות ניקוד?', template: 'הסבר בלשוניות', code: 'abc-2-vowels', desc: 'כדי שנוכל להתחיל לקרוא, אנחנו צריכים להבין קודם משהו חשוב לגבי ההבדל בין עברית לבין אנגלית.\nקראו את הצלילים הבאים בעברית:\nאיך ידעתם איך לקרוא כל צליל? נכון! לפי סימן הניקוד מתחת לאות!\nעכשיו בואו נסתכל על האות b באנגלית:\nהאות b נותנת לנו את הצליל בּ בעברית.\nאם נשים קָמָץ מתחת ל-b נקבל בָּ.\nאבל אתם יודעים מה הבעיה?\nשבאנגלית אין לנו את הסימנים האלו!\nבמקום סימן מתחת לאות, באנגלית יש אותיות שמגיעות אחרי האות ואומרות לנו איך לקרוא אותה.\nהאותיות האלו נקראות אותיות ניקוד.\nבמקום שהן יהיו מתחת לאות – הן מגיעות אחריה.' },
      practice: null, // this stage has a lesson only
    },
  };
  // fills what is still empty (never over something written in the admin)
  function fillContent(st) {
    const c = PAGE_CONTENT[(st.lessons[0] || {}).page];
    if (!c) return st;
    if (!st.name) st.name = c.stage;
    const L = st.lessons[0];
    Object.entries(c.lesson).forEach(([f, v]) => { if (!L[f]) L[f] = v; });
    if (c.practice === null) { if (st.practices.length === 1 && !st.practices[0].page && !st.practices[0].name && !st.practices[0].desc) st.practices = []; }
    else if (st.practices[0]) Object.entries(c.practice).forEach(([f, v]) => { if (!st.practices[0][f]) st.practices[0][f] = v; });
    return st;
  }
  function seedStage(w, k) {
    const page = (w.lessonPages || [])[k] || '';
    const s = blankStage((w.lessonNames || [])[k]);
    s.lessons[0].desc = (w.lessonDescs || [])[k] || '';
    if (page) {
      s.published = true; // already open to the students
      s.lessons[0].page = page;
      const p = practiceOf(page);
      if (p) s.practices[0].page = p;
    }
    return fillContent(s);
  }
  function stagesOf(w) {
    (w.stages || []).forEach(fillContent);
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
      title: first ? 'זיהוי האותיות' : '',
      red: first ? 'שיעור: סרגל ה-abc' : '',
      tab: first ? 'סרגל ה-abc' : '',
      button: '', coins: '', empty: false,
      says: first ? ABC_SAYS : '',
      reads: first ? ABC_SAYS : '',
      file: first ? 'assets/abc-song.mp4' : '',
      letters: 'abcdefghijklmnopqrstuvwxyz'.split('').map((l, n) => ({ l, t: ABC_TIMES[n] })),
    };
  }
  const OLD_SONG = { title: 'האי של זיהוי אותיות', red: 'שיעור היכרות עם סרגל האותיות', tab: 'שיר ה-abc · כל האותיות' };
  function songOf(it) {
    if (!it.song) return songDefaults(it);
    if (it.song.title === OLD_SONG.title) { const d = songDefaults(it); ['title', 'red', 'tab', 'says', 'reads'].forEach((f) => { it.song[f] = d[f]; }); }
    return it.song;
  }
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
    return `<section class="w-sg">
          <h5 class="w-sg__h"><span>1</span>מה רואים במסך</h5>
          ${text('title', 'כותרת')}
          <div class="a-grid">${text('red', 'השורה האדומה מתחת לכותרת')}${text('tab', 'השורה השנייה בלשונית')}</div>
          <div class="a-grid">${text('button', 'הכפתור בסוף המסך', 'ריק = הנוסח הרגיל')}${text('coins', 'מטבעות על סיום המסך', 'ריק = לפי הגדרות המטבעות')}</div>
          <label class="w-song__empty"><input type="checkbox" data-sg-empty="${key}"${s.empty ? ' checked' : ''}><span><b>שלב ריק</b> – התלמיד רואה רק את הכותרת והכפתורים, בלי התוכן. מסמנים כשעוד אין תוכן למסך.</span></label>
        </section>
        <section class="w-sg">
          <h5 class="w-sg__h"><span>2</span>הזברה</h5>
          <div class="a-grid w-sg__zebra">
            <label class="a-field"><span>מה כתוב בבועה (מעל השיר)</span><textarea rows="8" data-sg="${key}:says">${UI.esc(s.says)}</textarea></label>
            <label class="a-field"><span>מה הזברה מקריאה (ההקלטה)</span><textarea rows="8" data-sg="${key}:reads">${UI.esc(s.reads)}</textarea></label>
          </div>
        </section>
        <section class="w-sg w-song__box">
          <h5 class="w-sg__h"><span>3</span>השיר והאותיות</h5>
          <div class="w-song__file">
            <label class="w-abc__b" title="העלאת שיר" aria-label="העלאת קובץ שיר"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V6M8 10l4-4 4 4M5 18h14"/></svg><input class="sr-only" type="file" accept="audio/*,video/mp4,video/webm" data-sg-file="${key}"></label>
            <span dir="ltr">${UI.esc(s.fileName || (s.file || '').split('/').pop() || 'אין קובץ')}</span>
            <small class="a-help">שיר חדש: אחרי ההעלאה בודקים את הזמנים של האותיות ושומרים.</small>
          </div>
          ${url ? `<audio class="w-song__player" controls preload="metadata" src="${url}" data-song-audio="${key}"></audio>` : '<p class="a-muted">עוד אין קובץ שיר</p>'}
          <p class="a-help">לכל אות: הרגע בשיר שבו שרים אותה (בשניות). מנגנים את השיר ולוחצים על השעון ליד אות כשהיא נשמעת – והזמן נקבע לבד. ▶ מנגן מהרגע של האות.</p>
          <ol class="w-abcs">${s.letters.map((_, n) => songLetterRow(key, s, n)).join('')}</ol>
          <button class="w-addrow w-addrow--in" type="button" data-sg-add="${key}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת אות</button>
        </section>`;
  }
  /* ---------- the "אותיות" practice template: the screen, the zebra's instruction, and the letters by level ---------- */
  const LETTERS_TEMPLATE = 'אותיות';
  const ABC_COLUMNS = [['b','c','b','f','d'],['f','b','g','g','f'],['k','b','d','g','f'],['l','k','g','c','d'],['m','b','l','k','g'],['n','k','m','g','d'],['p','g','k','l','n'],['m','n','b','d','f'],['g','r','m','p','r'],['t','r','m','p','l'],['s','z','x','r','t'],['c','z','t','t','v'],['c','d','f','h','h'],['j','k','l','n','p'],['q','r','s','v','w'],['w','y','z','z','y']];
  function pracDefaults(it) {
    const first = it.page === 'letters-practice.html';
    return {
      title: first ? 'זיהוי האותיות' : '',
      red: first ? 'תרגול: זיהוי אותיות' : '',
      tab: first ? 'זיהוי אותיות' : '',
      button: first ? 'לשלב הבא: אותיות הניקוד' : '',
      coins: '', empty: false,
      levelWord: first ? 'טור' : 'רמה', levelsTitle: first ? 'טורים' : '', levelsVisible: first ? 10 : '',
      says: it.desc || '',
      levels: first ? ABC_COLUMNS.map((c) => c.slice()) : [],
    };
  }
  const asLevel = (l) => (Array.isArray(l) ? { name: '', note: '', items: l } : l);
  function pracOf(it) {
    const p = it.prac || pracDefaults(it);
    p.levels = (p.levels || []).map(asLevel);
    return p;
  }
  function editPrac(key) {
    const [k, kind, i] = key.split(':');
    const part = editStages(picked())[Number(k)][kind][Number(i)];
    part.prac = pracOf(part);
    return part.prac;
  }
  // the practice's content only, in the same look as the song: the screen's texts, what the zebra says, and the letters by level
  function pracFields(key, it) {
    const p = pracOf(it);
    const text = (f, label, help) => `<label class="a-field"><span>${label}</span><input data-pr="${key}:${f}" value="${UI.esc(String(p[f] ?? ''))}">${help ? `<small class="a-help">${help}</small>` : ''}</label>`;
    const lv = p.levelWord || 'רמה';
    return `<section class="w-sg">
          <h5 class="w-sg__h"><span>1</span>מה רואים במסך</h5>
          ${text('title', 'כותרת')}
          <div class="a-grid">${text('red', 'השורה האדומה מתחת לכותרת')}${text('tab', 'השורה השנייה בלשונית')}</div>
          <div class="a-grid">${text('button', 'הכפתור בסוף המסך', 'ריק = הנוסח הרגיל')}${text('coins', 'מטבעות על סיום המסך', 'ריק = לפי הגדרות המטבעות')}</div>
          <label class="w-song__empty"><input type="checkbox" data-pr-check="${key}:empty"${p.empty ? ' checked' : ''}><span><b>שלב ריק</b> – התלמיד רואה רק את הכותרת והכפתורים, בלי התוכן. מסמנים כשעוד אין תוכן למסך.</span></label>
        </section>
        <section class="w-sg">
          <h5 class="w-sg__h"><span>2</span>הזברה</h5>
          <label class="a-field"><span>מה הזברה אומרת בתרגול</span><textarea rows="5" data-pr="${key}:says">${UI.esc(p.says)}</textarea></label>
        </section>
        <section class="w-sg w-song__box">
          <h5 class="w-sg__h"><span>3</span>התוכן של המסך · אותיות</h5>
          <p class="a-help">כל ${UI.esc(lv)} הוא שורה של אותיות, מופרדות ברווח, לפי הסדר שבו הילד קורא אותן. התמונה של כל כרטיס נבחרת לפי האות.</p>
          <ol class="w-levels">${p.levels.map((L, n) => `<li class="w-level"><b>${UI.esc(lv)} ${n + 1}</b><input dir="ltr" lang="en" data-pr-level="${key}:${n}" value="${UI.esc(L.items.join(' '))}" aria-label="האותיות של ${UI.esc(lv)} ${n + 1}"><span class="w-level__n">${L.items.length} אותיות</span><button class="w-abc__b w-abc__b--del" type="button" data-pr-level-del="${key}:${n}" aria-label="מחיקת ${UI.esc(lv)} ${n + 1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg></button></li>`).join('')}</ol>
          <button class="w-addrow w-addrow--in" type="button" data-pr-level-add="${key}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת ${UI.esc(lv)}</button>
        </section>`;
  }
  function wirePrac() {
    edit.addEventListener('input', (e) => {
      if (mode !== 'edit') return;
      const t = e.target;
      if (t.dataset.pr) {
        const q = t.dataset.pr.split(':');
        editPrac(q.slice(0, 3).join(':'))[q[3]] = t.value;
        changed();
      } else if (t.dataset.prLevel) {
        const q = t.dataset.prLevel.split(':');
        const row = t.value.trim().split(/[\s,]+/).filter(Boolean);
        editPrac(q.slice(0, 3).join(':')).levels[Number(q[3])].items = row;
        const n = t.parentElement.querySelector('.w-level__n'); if (n) n.textContent = `${row.length} אותיות`;
        changed();
      }
    });
    edit.addEventListener('change', (e) => {
      if (mode !== 'edit') return;
      const t = e.target;
      if (t.dataset.prCheck) { const q = t.dataset.prCheck.split(':'); editPrac(q.slice(0, 3).join(':'))[q[3]] = t.checked; changed(); }
    });
    edit.addEventListener('click', (e) => {
      if (mode !== 'edit') return;
      const add = e.target.closest('[data-pr-level-add]');
      if (add) { const key = add.dataset.prLevelAdd; const p = editPrac(key); p.levels.push({ name: '', note: '', items: [] }); drawEdit(); changed(); const f = edit.querySelector(`[data-pr-level="${key}:${p.levels.length - 1}"]`); if (f) f.focus(); return; }
      const del = e.target.closest('[data-pr-level-del]');
      if (del) { const q = del.dataset.prLevelDel.split(':'); editPrac(q.slice(0, 3).join(':')).levels.splice(Number(q[3]), 1); drawEdit(); changed(); }
    });
  }
  /* ---------- the "הסבר בלשוניות" template: the screen, the zebra, and the three tabs' content ---------- */
  const TABS_TEMPLATE = 'הסבר בלשוניות';
  function tabsDefaults(it) {
    const v = it.page === 'vowels-lesson.html';
    return {
      title: v ? 'זיהוי האותיות' : '', red: v ? 'שיעור – מה זה אותיות ניקוד?' : '', tab: v ? 'מה זה אותיות ניקוד?' : '',
      button: v ? 'לאותיות של הרופאה' : '', coins: '', empty: false,
      says: '', reads: it.desc || '',
      tabs: v ? [
        { name: 'מגלים', title: 'קראו את הצלילים הבאים בעברית:', sounds: [['בְּ', 'buh'], ['בָּ', 'bah'], ['בִּ', 'bee']], text: '💭 **איך ידעתם איך לקרוא כל צליל?**\nנכון! לפי {pink:סימן הניקוד} מתחת לאות!' },
        { name: 'מרכיבים', title: 'עכשיו בואו נסתכל על האות b באנגלית:', sounds: [['בָּ', 'bah']], text: 'האות b = כמו **ב** בעברית\nעם שווא – הצליל **בְּ**\nעם קמץ מתחת = **בָּ**' },
        { name: 'קוראים', title: '', sounds: [['בָּ', 'bah']], text: '**באנגלית אין לנו את הסימנים האלו!**\n**במקום זה אנחנו משתמשים באותיות!**\nהאותיות האלו נקראות {pink:אותיות ניקוד}\nבמקום שהן יהיו **מתחת** לאות – הן מגיעות {green:אחריה}' },
      ] : [{ name: '', title: '', sounds: [], text: '' }],
    };
  }
  const tabsOf = (it) => it.tabsc || tabsDefaults(it);
  function editTabs(key) {
    const [k, kind, i] = key.split(':');
    const part = editStages(picked())[Number(k)][kind][Number(i)];
    part.tabsc = tabsOf(part);
    return part.tabsc;
  }
  function tabsFields(key, it) {
    const t = tabsOf(it);
    const text = (f, label, help) => `<label class="a-field"><span>${label}</span><input data-tb="${key}:${f}" value="${UI.esc(String(t[f] ?? ''))}">${help ? `<small class="a-help">${help}</small>` : ''}</label>`;
    const tab = (T, n) => `<fieldset class="w-tabc">
        <legend>לשונית ${n + 1}</legend>
        <div class="a-grid"><label class="a-field"><span>שם הלשונית</span><input data-tbt="${key}:${n}:name" value="${UI.esc(T.name)}"></label><label class="a-field"><span>הכותרת</span><input data-tbt="${key}:${n}:title" value="${UI.esc(T.title)}"></label></div>
        <div class="a-field"><span>הצלילים (בעברית, ומה הדפדפן משמיע)</span>
          <ol class="w-tabc__sounds">${T.sounds.map(([he, say], j) => `<li><input lang="he" data-tbs="${key}:${n}:${j}:0" value="${UI.esc(he)}" aria-label="הצליל בעברית"><input dir="ltr" lang="en" data-tbs="${key}:${n}:${j}:1" value="${UI.esc(say)}" aria-label="מה נשמע"><button class="w-abc__b w-abc__b--del" type="button" data-tbs-del="${key}:${n}:${j}" aria-label="מחיקת הצליל"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/></svg></button></li>`).join('')}</ol>
          <button class="w-addrow w-addrow--in" type="button" data-tbs-add="${key}:${n}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת צליל</button>
        </div>
        <label class="a-field"><span>הטקסט (כל שורה – פסקה)</span><textarea rows="4" data-tbt="${key}:${n}:text">${UI.esc(T.text)}</textarea><small class="a-help">**מודגש** · {pink:ורוד} · {green:ירוק}</small></label>
      </fieldset>`;
    return `<section class="w-sg">
          <h5 class="w-sg__h"><span>1</span>מה רואים במסך</h5>
          ${text('title', 'כותרת')}
          <div class="a-grid">${text('red', 'השורה האדומה מתחת לכותרת')}${text('tab', 'השורה השנייה בלשונית')}</div>
          <div class="a-grid">${text('button', 'הכפתור בסוף המסך', 'ריק = הנוסח הרגיל')}${text('coins', 'מטבעות על סיום המסך', 'ריק = לפי הגדרות המטבעות')}</div>
          <label class="w-song__empty"><input type="checkbox" data-tb-check="${key}:empty"${t.empty ? ' checked' : ''}><span><b>שלב ריק</b> – התלמיד רואה רק את הכותרת והכפתורים, בלי התוכן. מסמנים כשעוד אין תוכן למסך.</span></label>
        </section>
        <section class="w-sg">
          <h5 class="w-sg__h"><span>2</span>הזברה</h5>
          <div class="a-grid w-sg__zebra">
            <label class="a-field"><span>מה כתוב בבועה</span><textarea rows="8" data-tb="${key}:says">${UI.esc(t.says)}</textarea><small class="a-help">ריק = לא מוצגת בועה</small></label>
            <label class="a-field"><span>מה הזברה מקריאה (ההקלטה)</span><textarea rows="8" data-tb="${key}:reads">${UI.esc(t.reads)}</textarea></label>
          </div>
        </section>
        <section class="w-sg w-song__box">
          <h5 class="w-sg__h"><span>3</span>התוכן של המסך · הלשוניות</h5>
          ${t.tabs.map(tab).join('')}
          <button class="w-addrow w-addrow--in" type="button" data-tbt-add="${key}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת לשונית</button>
        </section>`;
  }
  function wireTabs() {
    const kk = (v) => { const q = v.split(':'); return [q.slice(0, 3).join(':'), ...q.slice(3)]; };
    edit.addEventListener('input', (e) => {
      if (mode !== 'edit') return;
      const t = e.target;
      let v;
      if ((v = t.dataset.tb)) { const [key, f] = kk(v); editTabs(key)[f] = t.value; changed(); }
      else if ((v = t.dataset.tbt)) { const [key, n, f] = kk(v); editTabs(key).tabs[Number(n)][f] = t.value; changed(); }
      else if ((v = t.dataset.tbs)) { const [key, n, j, c] = kk(v); editTabs(key).tabs[Number(n)].sounds[Number(j)][Number(c)] = t.value; changed(); }
    });
    edit.addEventListener('change', (e) => {
      if (mode !== 'edit' || !e.target.dataset.tbCheck) return;
      const [key, f] = kk(e.target.dataset.tbCheck);
      editTabs(key)[f] = e.target.checked; changed();
    });
    edit.addEventListener('click', (e) => {
      if (mode !== 'edit') return;
      const q = (name) => { const b = e.target.closest(`[data-${name}]`); return b ? b.getAttribute(`data-${name}`) : null; };
      let v;
      if ((v = q('tbs-add'))) { const [key, n] = kk(v); const T = editTabs(key).tabs[Number(n)]; T.sounds.push(['', '']); drawEdit(); changed(); const f = edit.querySelector(`[data-tbs="${key}:${n}:${T.sounds.length - 1}:0"]`); if (f) f.focus(); }
      else if ((v = q('tbs-del'))) { const [key, n, j] = kk(v); editTabs(key).tabs[Number(n)].sounds.splice(Number(j), 1); drawEdit(); changed(); }
      else if ((v = q('tbt-add'))) { const t = editTabs(v); t.tabs.push({ name: '', title: '', sounds: [], text: '' }); drawEdit(); changed(); }
    });
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
          ${it.template === SONG_TEMPLATE ? songFields(key, it) : kind === 'practices' && it.template === LETTERS_TEMPLATE ? pracFields(key, it) : kind === 'lessons' && it.template === TABS_TEMPLATE ? tabsFields(key, it) : `<label class="a-field"><span>תיאור ה${word}</span><textarea data-st-desc="${key}" placeholder="מה לומדים כאן">${UI.esc(it.desc)}</textarea></label>`}
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
          <b>${stTitle(s, k)}<small>${stSub(s, k)}</small></b>
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
      shownStage = openStage;
      stageMsg.clear();
    }
    // a tile for every stage (edit · duplicate · delete); the stage being edited opens under the tiles
    const EDIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
    const tile = (st, k) => `<li class="w-tile${k === openStage ? ' is-open' : ''}" data-tile="${k}" data-sort-group="til:${w.id}">
        <button class="w-handle w-tile__grip" type="button" data-drag aria-label="גרירת שלב ${k + 1}. רווח להרמה, חצים להזזה, רווח להנחה">${UI.ICON.grip}</button>
        <button class="w-tile__main" type="button" data-st-edit="${k}" aria-label="עריכת שלב ${k + 1}">
          <span class="w-tile__top"><b>${stTitle(st, k)}</b></span>
          <small>${stSub(st, k)}</small>
          ${stageBars(st)}
        </button>
        <span class="w-tile__pub" title="${st.published ? 'פורסם – התלמידים רואים אותו' : 'טיוטה – מוסתר מהתלמידים'}">${UI.switchHtml(`tl-pub-${k}`, st.published, `פרסום שלב ${k + 1}`)}</span>
        <span class="w-tile__acts">
          <button class="w-morebtn" type="button" data-more aria-label="אפשרויות לשלב ${k + 1}" aria-haspopup="menu"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
          <button class="w-lrow__del w-tipped" type="button" data-st-edit="${k}" aria-label="עריכת שלב ${k + 1}">${EDIT_ICON}<span class="w-tip w-tip--l" aria-hidden="true">עריכה</span></button>
          <button class="w-lrow__del w-st__dup w-tipped" type="button" data-st-dup="${k}" aria-label="שכפול שלב ${k + 1}">${COPY_ICON}<span class="w-tip w-tip--l" aria-hidden="true">שכפול השלב</span></button>
          <button class="w-lrow__del w-tipped" type="button" data-st-del="${k}" aria-label="מחיקת שלב ${k + 1} – עובר לארכיון">${TRASH_ICON}<span class="w-tip w-tip--l" aria-hidden="true">מחיקה – השלב עובר לארכיון</span></button>
        </span>
      </li>`;
    if (newStageFor && newStageFor !== w.id) newStageFor = null;
    const adding = newStageFor === w.id;
    const newTile = adding ? `<li class="w-tile w-tile--new is-open"><span class="w-tile__main"><span class="w-tile__top"><b>שלב חדש</b><span class="a-tag a-tag--draft">חדש</span></span><small>שלב ${stages.length + 1} · ממלאים את הפרטים למטה</small></span></li>` : '';
    const form = adding ? `<form class="w-newstage w-newstage--inline" id="w-newstage-inline" novalidate aria-labelledby="w-ns-title">
          <h3 class="w-ns__title" id="w-ns-title">שלב חדש – שלב ${stages.length + 1}</h3>
          <label class="a-field"><span>שם השלב</span><input id="n-name" placeholder="למשל: האות של הרופאה" required></label>
          <fieldset class="a-field w-tplset"><legend>מסך השיעור – לפי איזו תבנית?</legend>${radios('n-ltpl', LESSON_TPL, 'הסבר')}</fieldset>
          <fieldset class="a-field w-tplset"><legend>התרגול – לפי איזו תבנית?</legend>${radios('n-ptpl', PRACTICE_TPL, 'אותיות')}</fieldset>
          <p class="a-help w-newstage__note">השלב נוצר כטיוטה, עם המסכים שבחרת. אחר כך ממלאים את התוכן ומפרסמים. אפשר להוסיף מסכים גם אחר כך (+ מסך).</p>
          <div class="w-new__foot"><button class="a-btn a-btn--primary" type="submit">יצירת השלב</button><button class="a-btn a-btn--ghost" type="button" data-newstage-cancel>ביטול</button></div>
        </form>` : '';
    return `<ul class="w-tiles">${stages.map(tile).join('')}${newTile}<li class="w-tile w-tile--add"><button class="w-addrow" type="button" data-wtab-add><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת שלב</button></li></ul>
        ${form}<ol class="w-stages w-stages--tiles"${adding ? ' hidden' : ''}>${stages.map((s, k) => stageCard(s, k, k === stages.length - 1)).join('')}</ol>
        <button class="w-ladd w-addrow" type="button" data-wtab-add hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>הוספת שלב</button>`;
  }
  // one open at each level; only classes change, so the height animates
  function applyOpen() {
    if (openStage >= 0) shownStage = openStage;
    edit.querySelectorAll('[data-st]').forEach((el) => el.classList.toggle('is-shown', Number(el.dataset.st) === shownStage));
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
    dupBtn.style.display = delBtn.style.display = w ? '' : 'none';
    if (!w) {
      setH1('');
      edit.innerHTML = `<div class="a-card w-empty"><h2>אין כרגע איים. רוצה להוסיף?</h2>
          <div class="w-empty__opts">
            <button type="button" class="w-empty__opt" data-empty-new="world"><span class="w-plus__ic" aria-hidden="true">${menu.querySelector('[data-new="world"] .w-plus__ic').innerHTML}</span><b>הוספת אי</b><small>אי חדש עם שלבים, שיעורים ותרגולים</small></button>
            <button type="button" class="w-empty__opt" data-empty-new="review"><span class="w-plus__ic" aria-hidden="true">${menu.querySelector('[data-new="review"] .w-plus__ic').innerHTML}</span><b>הוספת חזרה</b><small>אי חזרה על השיעורים שלפניו</small></button>
          </div></div>`;
      return;
    }
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
    const stages = stagesOf(w);
    if (sel.type === 'stage' && !stages[sel.k]) sel = { type: 'island' };
    if (sel.type === 'part' && !(stages[sel.k] && stages[sel.k][sel.kind] && stages[sel.k][sel.kind][sel.i])) sel = { type: 'island' };
    if (sel.type === 'newstage' && newStageFor !== w.id) sel = { type: 'island' };
    if (w.review && sel.type !== 'island') sel = { type: 'island' };
    dupBtn.style.display = delBtn.style.display = sel.type === 'island' ? '' : 'none';
    let body;
    if (sel.type === 'island') {
      body = `<h3 class="w-ed__sec">פרטי האי</h3>
          <div class="a-grid w-namepos">
            <label class="a-field"><span>השם (במפה ובתפריט)</span><input id="f-name" value="${UI.esc(w.name)}"></label>
            ${posField(w)}
          </div>
          <div class="a-grid w-heads">
            <label class="a-field"><span>הכותרת בדף האי – שורה 1</span><input id="f-head1" value="${UI.esc(w.head1 || '')}"></label>
            <label class="a-field"><span>שורה 2</span><input id="f-head2" value="${UI.esc(w.head2 || '')}"></label>
          </div>
          <div class="w-pubin" id="w-pubin"></div>
          ${w.review ? `<label class="a-field"><span>על אילו שיעורים החזרה</span><input id="f-reviewof" dir="ltr" value="${UI.esc(w.reviewOf || '')}" placeholder="1-10"></label>` : ''}
          <h3 class="w-ed__sec">טקסטים</h3>
          <label class="a-field"><span>כותרת ה"אודות" במפה</span><input id="f-title" value="${UI.esc(w.title)}"></label>
          <label class="a-field"><span>טקסט ה"אודות" במפה</span><textarea id="f-text">${UI.esc(w.text)}</textarea><small class="a-help">משפט או שניים: מה לומדים באי הזה</small></label>
          <div class="w-pubbox" id="w-warnbox"></div>
          <h3 class="w-ed__sec">מדיה</h3>
          <div class="w-media-grid">${mediaField(w)}${bgField(w)}</div>`;
    } else if (sel.type === 'stage') {
      const st = stages[sel.k];
      const k = sel.k;
      const msg = stageMsg.has(k) ? missingText(st) : '';
      const item = (kind, i) => { const p = st[kind][i]; return `<li><button class="w-ed__item" type="button" data-pick-part="${k}:${kind}:${i}">${tagPart(kind, i)}<span>${UI.esc(p.name) || partWord(kind)}</span>${dot(partStatus(st, p))}</button></li>`; };
      body = `<div class="w-ed__top">
            <h2 class="w-ed__h" id="w-title">${tagStage(k)}<span>${UI.esc(stName(st)) || `שלב ${k + 1}`}</span>${dot(stageStatus(st))}</h2>
            <span class="w-ed__acts">
              <span class="w-toppub">${UI.switchHtml(`st-pub-${k}`, st.published, `פרסום שלב ${k + 1}`)}<span class="w-toppub__t${st.published ? ' is-on' : ''}">${st.published ? 'פורסם' : 'לא פורסם'}</span></span>
              <button class="w-lrow__del w-st__dup w-tipped" type="button" data-st-dup="${k}" aria-label="שכפול שלב ${k + 1}">${COPY_ICON}<span class="w-tip w-tip--l" aria-hidden="true">שכפול השלב</span></button>
              <button class="w-lrow__del w-tipped" type="button" data-st-del="${k}" aria-label="מחיקת שלב ${k + 1} – עובר לארכיון">${TRASH_ICON}<span class="w-tip w-tip--l" aria-hidden="true">מחיקה – השלב עובר לארכיון</span></button>
            </span>
          </div>
          ${msg ? `<p class="w-st__msg" role="status">${msg}</p>` : ''}
          <label class="a-field"><span>שם השלב</span><input data-stage-name="${k}" value="${UI.esc(stName(st))}" placeholder="למשל: סרגל ה-abc"></label>
          <div class="a-field"><span>מה יש בשלב</span>
            <ul class="w-ed__items">${st.lessons.map((_, i) => item('lessons', i)).join('')}${st.practices.map((_, i) => item('practices', i)).join('')}</ul>
            <small class="a-help">כדי לערוך שיעור או תרגול – בוחרים אותו כאן או בעץ מימין. מוסיפים ב"+ שיעור / תרגול" בעץ.</small>
          </div>`;
    } else if (sel.type === 'part') {
      body = partEditor(stages[sel.k], sel.k, sel.kind, sel.i);
    } else {
      body = `<div class="w-ed__top"><h2 class="w-ed__h" id="w-title">${tagStage(stages.length)}<span>שלב חדש</span></h2></div>
          <form class="w-newstage w-newstage--inline" id="w-newstage-inline" novalidate aria-labelledby="w-title">
            <label class="a-field"><span>שם השלב</span><input id="n-name" placeholder="למשל: האות של הרופאה" required></label>
            <fieldset class="a-field w-tplset"><legend>מסך השיעור – לפי איזו תבנית?</legend>${radios('n-ltpl', LESSON_TPL, 'הסבר')}</fieldset>
            <fieldset class="a-field w-tplset"><legend>התרגול – לפי איזו תבנית?</legend>${radios('n-ptpl', PRACTICE_TPL, 'אותיות')}</fieldset>
            <p class="a-help w-newstage__note">השלב נוצר כטיוטה, עם המסכים שבחרת. אחר כך ממלאים את התוכן ומפרסמים. אפשר להוסיף מסכים גם אחר כך (+ שיעור / תרגול בעץ).</p>
            <div class="w-new__foot"><button class="a-btn a-btn--primary" type="submit">יצירת השלב</button><button class="a-btn a-btn--ghost" type="button" data-newstage-cancel>ביטול</button></div>
          </form>`;
    }
    edit.innerHTML = `<div class="a-card w-sections w-tabbed w-one" role="tabpanel">${topRow(w, crumbs(w))}${sel.type === 'island' ? `<h2 class="sr-only" id="w-title">עריכת ${UI.esc(w.name)}</h2>` : ''}<section>${body}</section></div>`;
    placeActions();
    syncSaveNow();
    drawPreview();
  }

  // a lesson / practice in the editor: its title, name, template and its content
  function partEditor(s, k, kind, i) {
    const it = s[kind][i];
    const word = partWord(kind);
    const key = `${k}:${kind}:${i}`;
    const id = `${k}-${kind}-${i}`;
    const canDelete = !it.page;
    const content = it.template === SONG_TEMPLATE ? songFields(key, it)
      : kind === 'practices' && it.template === LETTERS_TEMPLATE ? pracFields(key, it)
        : kind === 'lessons' && it.template === TABS_TEMPLATE ? tabsFields(key, it)
          : `<label class="a-field"><span>תיאור ה${word}</span><textarea data-st-desc="${key}" placeholder="מה לומדים כאן">${UI.esc(it.desc)}</textarea></label>`;
    return `<div class="w-ed" data-row="${key}">
        <div class="w-ed__top">
          <h2 class="w-ed__h" id="w-title">${tagPart(kind, i)}<span>${UI.esc(it.name) || word}</span>${dot(partStatus(s, it))}<span class="a-tag ${isWritten(it) ? 'a-tag--live' : 'a-tag--draft'} sr-only">${isWritten(it) ? 'נכתב' : 'חסר'}</span></h2>
          <span class="w-ed__acts">
            ${it.page ? `<a class="w-lrow__open w-tipped" href="${it.page}?view=admin" target="_blank" rel="noopener" aria-label="צפייה ב${word} (בלשונית חדשה)">${EYE_ICON}<span class="w-tip w-tip--l" aria-hidden="true">צפייה כמו תלמיד</span></a>` : ''}
            ${canDelete ? `<button class="w-lrow__del w-tipped" type="button" data-row-del="${key}" aria-label="מחיקת ה${word} – עובר לארכיון">${TRASH_ICON}<span class="w-tip w-tip--l" aria-hidden="true">מחיקה – עובר לארכיון</span></button>` : ''}
          </span>
        </div>
        <div class="a-grid">
          <label class="a-field"><span>שם ה${word}</span><input data-st-name="${key}" value="${UI.esc(it.name)}" placeholder="שם ה${word} (לא חובה)"></label>
          <label class="a-field"><span>תבנית</span><select id="tp-${id}" data-st-field="${key}:template"><option value="">לא נבחרה</option>${TEMPLATE_NAMES.map((t) => `<option value="${t}"${it.template === t ? ' selected' : ''}>תבנית ${t}</option>`).join('')}</select></label>
        </div>
        ${it.code || it.page ? `<p class="w-ed__code">קוד המסך: <span dir="ltr">${UI.esc(it.code || it.page.replace('.html', ''))}</span></p>` : ''}
        ${content}
      </div>`;
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
    const cr = e.target.closest('[data-crumb]');
    if (cr) { sel = cr.dataset.crumb === 'stage' && sel.k != null ? { type: 'stage', k: sel.k } : { type: 'island' }; newStageFor = null; drawAll(); return; }
    const pp = e.target.closest('[data-pick-part]');
    if (pp) { const [k, kind, i] = pp.dataset.pickPart.split(':'); sel = { type: 'part', k: Number(k), kind, i: Number(i) }; subOpen.add(`${pickedId}:${k}`); drawAll(); return; }
    const en = e.target.closest('[data-empty-new]');
    if (en) { addNow(en.dataset.emptyNew); return; }
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
    if (e.target.closest('[data-wtab-add]')) { if (newStageFor === w.id) { const f = $('n-name'); if (f) f.focus(); return; } openNewStage(w.id); return; }
    if (e.target.closest('[data-newstage-cancel]')) { newStageFor = null; drawEdit(); const b = edit.querySelector('[data-wtab-add]'); if (b) b.focus(); return; }
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
    if (stEdit && newStageFor) { newStageFor = null; openStage = Number(stEdit.dataset.stEdit); drawEdit(); revealOpen(); return; }
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
    if (t.id === 'w-pub-top') { w.published = t.checked; drawList(); drawEdit(); drawPreview(); changed(); const b = $('w-pub-top'); if (b) b.focus(); live.textContent = w.published ? 'האי פורסם' : 'האי לא מפורסם'; return; }
    if (t.id && (t.id.startsWith('st-pub-') || t.id.startsWith('tl-pub-'))) {
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
    if (e.target.dataset.stageName != null && mode === 'edit') {
      const w = picked();
      const k = Number(e.target.dataset.stageName);
      const st = editStages(w)[k];
      st.name = e.target.value;
      w.lessonNames = pad(w.lessonNames || [], editStages(w).length);
      w.lessonNames[k] = e.target.value;
      drawList(); changed();
      const h = edit.querySelector('.w-ed__h > span:not(.w-tag)'); if (h) h.textContent = e.target.value || `שלב ${k + 1}`;
      return;
    }
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
      }
      if (isName) { drawList(); const h = edit.querySelector('.w-ed__h > span:not(.w-tag):not(.a-tag)'); if (h) h.textContent = e.target.value || partWord(kind); }
      if (!isName) {
        const st = stagesOf(w)[Number(k)];
        const part = st[kind][Number(i)];
        const tag = edit.querySelector(`[data-row="${k}:${kind}:${i}"] .a-tag`) || document.createElement('span');
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
  function openNewStage(id) {
    pickedId = id; mode = 'edit'; draft = null; step = 3; viewTab = 'edit';
    stagesFor = id; openStage = -1; stageMsg.clear(); newStageFor = id;
    sel = { type: 'newstage' }; opened.add(id);
    drawAll();
    const f = $('n-name');
    if (f) { f.focus(); f.closest('form').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  edit.addEventListener('submit', (e) => {
    if (e.target.id !== 'w-newstage-inline') return;
    e.preventDefault();
    const w = picked();
    const name = ($('n-name').value || '').trim();
    if (!w) return;
    if (!name) { $('n-name').focus(); return; }
    const pickV = (n) => (edit.querySelector(`input[name="${n}"]:checked`) || {}).value || 'none';
    const lt = pickV('n-ltpl');
    const pt = pickV('n-ptpl');
    const stages = editStages(w);
    stages.push({ published: false, name, lessons: lt === 'none' ? [] : [{ ...blankPart(name), template: lt }], practices: pt === 'none' ? [] : [{ ...blankPart(), template: pt }] });
    w.lessonNames = pad(w.lessonNames || [], stages.length - 1);
    w.lessonNames.push(name);
    w.planned = stages.length;
    newStageFor = null;
    openStage = stages.length - 1;
    sel = { type: 'stage', k: stages.length - 1 };
    subOpen.add(`${w.id}:${stages.length - 1}`);
    drawAll(); changed();
    revealOpen();
    live.textContent = `השלב "${name}" נוצר כטיוטה`;
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
  wirePrac();
  wireTabs();
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
      if (a === pickedId && (sel.type === 'stage' || sel.type === 'part')) sel.k = remap(sel.k);
      if (shownStage >= 0) shownStage = remap(shownStage);
      stageMsg.clear();
      [...subOpen].forEach((key) => { const [id, k] = key.split(':'); if (id === a) { subOpen.delete(key); subOpen.add(`${id}:${remap(Number(k))}`); } });
      commitOrder((arr) => opStage(arr, a, from, to), `שלב ${from + 1} עבר למקום ${to + 1} מתוך ${n}`);
    } else if (kind === 'tpr') {
      const [, wid, kk, knd] = g.split(':');
      const re = (i) => (i === from ? to : from < i && i <= to ? i - 1 : to <= i && i < from ? i + 1 : i);
      if (sel.type === 'part' && wid === pickedId && sel.k === Number(kk) && sel.kind === knd) sel.i = re(sel.i);
      commitOrder((arr) => opPart(arr, wid, Number(kk), knd, from, Number(kk), to), `${partWord(knd)} ${from + 1} עבר למקום ${to + 1} מתוך ${n}`);
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
      if (g === 'isl') html += '<p class="w-more__h"></p><button type="button" role="menuitem" data-act="archive" class="w-more__danger">מחיקה – העברה לארכיון</button>';
      if (g.startsWith('prt') || g.startsWith('tpr')) {
        const gp = g.split(':');
        const k = g.startsWith('tpr') ? gp[2] : gp[1];
        const stages = stagesOf(list.find((x) => x.id === (g.startsWith('tpr') ? gp[1] : pickedId)));
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
    if (act === 'archive') { const w = list[i]; if (w) askArchive(w); return; }
    if (act === 'up' || act === 'down') { moveIn(g, i, i + (act === 'up' ? -1 : 1), viaKeys ? { focus: '[data-more]' } : {}); return; }
    const toK = Number(act.split(':')[1]);
    const gp = g.split(':');
    const isT = gp[0] === 'tpr';
    const wid = isT ? gp[1] : pickedId;
    const k = isT ? gp[2] : gp[1];
    const kind = isT ? gp[3] : gp[2];
    const word = kind === 'lessons' ? 'השיעור' : 'התרגול';
    openStage = toK;
    if (wid === pickedId && sel.type === 'part' && sel.k === Number(k) && sel.kind === kind && sel.i === i) { const moved = stagesOf(picked())[toK][kind].length; sel = { type: 'part', k: toK, kind, i: moved }; subOpen.add(`${wid}:${toK}`); }
    commitOrder((arr) => opPart(arr, wid, Number(k), kind, i, toK, Infinity), `${word} עבר לסוף שלב ${toK + 1}`);
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
