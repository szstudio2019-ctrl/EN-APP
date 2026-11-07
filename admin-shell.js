// Admin shell, shared by the four admin pages: the top bar (logo, the four
// pages, "לאתר התלמידים", the manager), the demo data kept in this browser
// (users, worlds, coins) and small builders for the shared components
// (switch, stepper, segmented filter, sticky save bar).
(function () {
  const PAGES = [
    ['content', 'admin-content.html', 'עריכת תוכן', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>'],
    ['users', 'admin.html', 'משתמשים', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>'],
    ['stats', 'admin-stats.html', 'התמדה', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'],
    ['coins', 'admin-coins.html', 'מטבעות', '<img src="assets/coin.webp" alt="">'],
  ];
  // what 'עריכת תוכן' opens to (the pages not built yet are marked 'בקרוב')
  const CONTENT_SUB = [
    ['islands', 'admin-content.html', 'עריכת תוכן לאיים'],
    ['about', '', 'עריכת תוכן לאודות'],
    ['intro', '', 'עריכת תוכן להסבר על האתר'],
    ['cards', '', 'עריכת תוכן לחנות כרטיסים'],
    ['raffle', '', 'עריכת תוכן למשפטי הגרלה'],
  ];
  const subLink = ([k, href, name], role) => (href
    ? `<a${role} class="a-sub__item" href="${href}"${page === 'content' && k === 'islands' ? ' aria-current="page"' : ''}><span>${name}</span></a>`
    : `<span${role} class="a-sub__item a-sub__item--soon" aria-disabled="true"><span>${name}</span><small>בקרוב</small></span>`);
  const page = document.body.dataset.page;

  /* ---------- top bar ---------- */
  const top = document.createElement('header');
  top.className = 'a-top';
  // as the student site's top bar: menu, home and the greeting on the right, the
  // logo in the middle, the four admin pages on the left (no coins, chests or music)
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'בוקר טוב,' : hour < 17 ? 'צהריים טובים,' : 'ערב טוב,';
  top.innerHTML = `
    <div class="a-top__in">
      <div class="a-top__start">
        <div class="a-menu">
          <button class="a-menu__btn" type="button" id="a-menu-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="a-menu" aria-label="תפריט"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M8 12h12M4 17h16"/></svg></button>
          <div class="a-menu__list" id="a-menu" role="menu" hidden>
            ${PAGES.map(([k, href, name, icon]) => `<a role="menuitem" href="${href}"${k === page ? ' aria-current="page"' : ''}>${icon}<span>${name}</span></a>${k === 'content' ? `<div class="a-menu__sub">${CONTENT_SUB.map((x) => subLink(x, ' role="menuitem"')).join('')}</div>` : ''}`).join('')}
            <hr class="a-menu__line">
            <a role="menuitem" href="index.html?view=admin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg><span>לאתר התלמידים</span></a>
          </div>
        </div>
        <div class="a-me-wrap">
          <button class="a-me" type="button" id="a-me-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="a-me-menu"><img src="assets/team-einat.webp" alt=""><span class="a-me__text"><span class="a-me__hello">${hello}</span><b class="a-me__name">עינת</b></span><svg class="a-me__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="a-me__menu" id="a-me-menu" role="menu" hidden>
            <a role="menuitem" class="a-me__item a-me__item--main" href="index.html?view=admin"><span>לאתר התלמידים</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></a>
            <a role="menuitem" class="a-me__item" href="profile.html?view=admin"><span>הפרופיל שלי</span></a>
            <a role="menuitem" class="a-me__item" href="index.html?intro&amp;view=admin"><span>הסבר על האתר</span></a>
            <a role="menuitem" class="a-me__item a-me__item--out" href="index.html?view=off"><span>התנתקות</span></a>
          </div>
        </div>
      </div>
      <a class="a-logo" href="admin-content.html" aria-label="מדקדקים באנגלית – קורס דיגיטלי באנגלית · ניהול">
        <span class="logo">
          <span class="logo__text"><span class="logo__title">מדקדקים באנגלית</span><span class="logo__subtitle">קורס דיגיטלי באנגלית</span></span>
          <span class="logo__mark"><img class="logo__ring" src="assets/logo-ring.svg" alt=""><span class="logo__tile logo__tile--a">a</span><span class="logo__tile logo__tile--c">c</span><span class="logo__tile logo__tile--b">b</span></span>
        </span>
      </a>
      <nav class="a-nav" aria-label="ניהול">
        ${PAGES.map(([k, href, name, icon]) => (k === 'content'
          ? `<div class="a-sub"><button class="a-sub__btn" type="button" aria-expanded="false" aria-haspopup="true"${k === page ? ' aria-current="page"' : ''}>${icon}<span>${name}</span><svg class="a-sub__chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="a-sub__list" hidden>${CONTENT_SUB.map((x) => subLink(x, '')).join('')}</div></div>`
          : `<a href="${href}"${k === page ? ' aria-current="page"' : ''}>${icon}<span>${name}</span></a>`)).join('')}
      </nav>
    </div>`;
  document.body.prepend(top);
  // the menu button opens the pages (handy on a phone, where the nav is hidden)
  const menuBtn = top.querySelector('#a-menu-btn');
  const menuList = top.querySelector('#a-menu');
  const setMenu = (on) => { menuList.hidden = !on; menuBtn.setAttribute('aria-expanded', String(on)); };
  menuBtn.addEventListener('click', () => setMenu(menuList.hidden));
  document.addEventListener('click', (e) => { if (!menuList.hidden && !e.target.closest('.a-menu')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuList.hidden) { setMenu(false); menuBtn.focus(); } });
  // the greeting opens Einat's menu
  const meBtn = top.querySelector('#a-me-btn');
  const meList = top.querySelector('#a-me-menu');
  const setMe = (on) => { meList.hidden = !on; meBtn.setAttribute('aria-expanded', String(on)); };
  meBtn.addEventListener('click', () => setMe(meList.hidden));
  document.addEventListener('click', (e) => { if (!meList.hidden && !e.target.closest('.a-me-wrap')) setMe(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !meList.hidden) { setMe(false); meBtn.focus(); } });
  // 'עריכת תוכן' in the bar opens to its four parts
  const sub = top.querySelector('.a-sub');
  const subBtn = sub.querySelector('.a-sub__btn');
  const subList = sub.querySelector('.a-sub__list');
  const setSub = (on) => { subList.hidden = !on; subBtn.setAttribute('aria-expanded', String(on)); };
  subBtn.addEventListener('click', () => setSub(subList.hidden));
  document.addEventListener('click', (e) => { if (!subList.hidden && !sub.contains(e.target)) setSub(false); });
  sub.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !subList.hidden) { setSub(false); subBtn.focus(); } });

  /* ---------- storage (per browser, demo) ---------- */
  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* blocked */ } };

  /* users: the same list and key the old admin page used */
  const DAY = 24 * 60 * 60 * 1000;
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const now = Date.now();
  const MORE_DEMO = [
    ['ליה', 'שמעוני', 'lia.s', '054-1112233', 'lia@example.com', 200, 160, true],
    ['רועי', 'גולן', 'roy.g', '052-2223344', 'roy@example.com', 90, 270, true],
    ['נגה', 'אלון', 'noga.a', '050-3334455', 'noga@example.com', 250, 110, true],
    ['עידו', 'כץ', 'ido.k', '053-4445566', 'ido@example.com', 330, 25, true],
    ['הדר', 'ברק', 'hadar.b', '058-5556677', 'hadar@example.com', 420, -60, false],
    ['אלה', 'רוזן', 'ella.r', '054-6667788', 'ella@example.com', 45, 320, true],
    ['דניאל', 'סויסה', 'daniel.s', '052-7778899', 'daniel@example.com', 150, 215, true],
    ['יעל', 'חדד', 'yael.h', '050-8889900', 'yael@example.com', 280, 85, true],
  ];
  const demoUsers = () => [
    ['שירה', 'כהן', 'shira.cohen', '050-1234567', 'shira@example.com', 120, 245, true, 'assets/avatar.webp'],
    ['נועם', 'לוי', 'noam.levi', '052-2345678', 'noam@example.com', 300, 65, true],
    ['מאיה', 'פרץ', 'maya.p', '054-3456789', 'maya@example.com', 30, 335, true],
    ['איתי', 'מזרחי', 'itay.m', '053-4567890', 'itay@example.com', 400, -35, false],
    ['תמר', 'אברהם', 'tamar.a', '058-5678901', 'tamar@example.com', 350, 12, true],
    ['יונתן', 'ביטון', 'yoni.b', '050-6789012', 'yoni@example.com', 500, -135, false],
    ['אורי', 'דהן', 'uri.d', '052-7890123', 'uri@example.com', 60, 300, true],
    ...MORE_DEMO,
  ].map(([first, last, user, phone, email, ago, left, active, photo]) => ({
    id: user, first, last, user, phone, email, active, photo: photo || '',
    start: iso(now - ago * DAY), end: iso(now + left * DAY),
  }));
  let users = read('en-app:users', null);
  if (!Array.isArray(users)) users = demoUsers();
  // more demo children (added once to a list saved before they existed)
  if (!read('en-app:users-more', false)) {
    const have = new Set(users.map((u) => u.id));
    demoUsers().forEach((u) => { if (!have.has(u.id) && MORE_DEMO.some((m) => m[2] === u.id)) users.push(u); });
    write('en-app:users', users);
    write('en-app:users-more', true);
  }
  const Users = {
    all: () => users,
    save: () => write('en-app:users', users),
    daysLeft: (u) => Math.ceil((new Date(u.end) - now) / DAY),
  };
  // the child's grade (כיתה); demo children get a steady one until it is set
  Users.GRADES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'];
  Users.gradeOf = (u) => u.grade || Users.GRADES[Math.max(0, users.indexOf(u)) % Users.GRADES.length];
  Users.expiring = (u) => { const n = Users.daysLeft(u); return n >= 0 && n <= 30; };
  const COLORS = ['#B0234F', '#1F5FBF', '#8A5A00', '#4C6A0B', '#5B34B8', '#0E7468'];
  Users.avatar = (u, i) => (u.photo
    ? `<img class="a-avatar" src="${u.photo}" alt="">`
    : `<span class="a-avatar" style="background:${COLORS[i % COLORS.length]}" aria-hidden="true">${(u.first[0] || '') + (u.last[0] || '')}</span>`);

  /* worlds: built from the islands list (islands.js); the admin's edits are kept apart */
  // the lessons already written in each world: their pages, in order
  const LESSON_PAGES = {
    'letters.html': ['letters-lesson.html', 'vowels-lesson.html'],
    'doctor.html': ['lesson.html', 'sentences-lesson.html', 'doctor3-lesson.html'],
    'smiles.html': ['smiles1-lesson.html', 'smiles2-lesson.html', 'smiles3-lesson.html'],
    'single.html': ['single-lesson.html', 'single2-lesson.html', 'single3-lesson.html'],
    'blending.html': ['blending1-lesson.html', 'blending2-lesson.html', 'blending3-lesson.html'],
    'whistling.html': ['whistling1-lesson.html', 'whistling2-lesson.html', 'whistling3-lesson.html'],
    'magic.html': ['magic1-lesson.html', 'magic2-lesson.html', 'magic3-lesson.html'],
    'sounds.html': ['sounds1-lesson.html', 'sounds2-lesson.html', 'sounds3-lesson.html'],
  };
  // the big two-line title on each world's page
  const HEADINGS = {
    'letters.html': ['אי זיהוי', 'האותיות'], 'doctor.html': ['אי האותיות', 'של הרופא/ה'], 'smiles.html': ['אי האותיות', 'המחייכות'],
    'single.html': ['אי האותיות', 'הבודדות'], 'blending.html': ['אי צירוף', 'האותיות'], 'whistling.html': ['אי האותיות', 'השורקות'],
    'magic.html': ['אי הקסמים', ''], 'sounds.html': ['אי הצלילים', 'המיוחדים'],
  };
  const span = (r) => { const m = String(r || '').match(/^(\d+)(?:-(\d+))?$/); return m ? (m[2] ? +m[2] - +m[1] + 1 : 1) : 0; };
  function baseWorlds() {
    let review = 0;
    return (window.ISLANDS || []).filter((i) => !i.finale).map((i, n) => {
      const isReview = !!i.review;
      if (isReview) review += 1;
      return {
        id: `w${n}`,
        name: isReview ? `חזרה ${review}` : i.name,
        kicker: isReview ? `חזרה על שיעורים ${i.review}` : (i.lessons ? `שיעורים ${i.lessons}` : ''),
        title: (i.about && i.about.title) || '',
        text: (i.about && i.about.text) || '',
        img: i.img || '',
        page: i.page || '',
        review: isReview,
        head1: (HEADINGS[i.page] || [isReview ? 'אי החזרות' : i.name, ''])[0],
        head2: (HEADINGS[i.page] || ['', ''])[1],
        lessonPages: isReview ? [] : (LESSON_PAGES[i.page] || []),
        lessonNames: [],
        firstLesson: parseInt(String(i.lessons || '1'), 10) || 1,
        reviewOf: i.review || '',
        planned: isReview ? 0 : Math.max(span(i.lessons), (LESSON_PAGES[i.page] || []).length),
        written: isReview ? 0 : (LESSON_PAGES[i.page] || []).length,
        published: i.status === 'done' || i.status === 'progress',
      };
    });
  }
  const Worlds = {
    load() {
      const base = baseWorlds();
      const saved = read('en-app:admin-worlds', null);
      if (!saved || !Array.isArray(saved.list)) return base;
      const byId = Object.fromEntries(base.map((w) => [w.id, w]));
      const list = saved.list.map((w) => ({ ...(byId[w.id] || {}), ...w }));
      // islands added to the site later, not in the saved order yet
      base.forEach((w) => { if (!list.some((x) => x.id === w.id)) list.push(w); });
      return list;
    },
    save: (list) => write('en-app:admin-worlds', { list }),
    isDemo: (w) => /טקסט דמו/.test(`${w.title} ${w.text}`),
  };

  /* coins */
  const COIN = '<img src="assets/coin.webp" alt="">';
  const COINS = {
    // [key, title, description, default, icon, unit]
    earn: [
      ['lesson', 'סיום מסך לימוד', 'מסך הסבר בשיעור (פעם אחת לכל מסך)', 10, COIN],
      ['practice', 'סיום מסך תרגול', 'מסך תרגול בשיעור (פעם אחת לכל מסך)', 20, COIN],
      ['review', 'סיום שלב בחזרה', 'כל שלב באיי החזרות (פעם אחת לכל שלב)', 20, COIN],
      ['chest', 'תיבת אוצר', 'על סיום אי חזרות שלם (פעם אחת לכל אי)', 100, '<img src="assets/chest.webp" alt="">'],
      ['streak', 'התמדה', 'יום שבו התלמיד תרגל או למד (פעם אחת ביום)', 5, '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.6 2.3 3C11 9 11.5 6 12 3z" fill="#F2672E"/><path d="M12 12.5c.6 1.6 2 2.3 2 4a2 2 0 0 1-4 0c0-.9.4-1.6 1-2.1.2.6.6 1 1 1.1-.3-1.2-.3-2.1 0-3z" fill="#FFC24A"/></svg>'],
    ],
    shop: [
      ['letter', 'מחיר כרטיסיית אות', 'כמה מטבעות עולה אות בחנות', 10, '<img src="assets/shop.webp" alt="">', 'מטבעות לאות'],
    ],
  };
  const Coins = {
    defs: COINS,
    load: () => {
      const saved = read('en-app:admin-coins', {});
      const v = {};
      [...COINS.earn, ...COINS.shop].forEach(([k, , , d]) => { v[k] = Number.isFinite(saved[k]) ? saved[k] : d; });
      return v;
    },
    save: (v) => write('en-app:admin-coins', v),
  };

  /* ---------- component builders ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UI = {
    esc,
    switchHtml: (id, on, label) => `<label class="a-switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} aria-label="${esc(label)}"><span class="a-switch__track" aria-hidden="true"></span></label>`,
    stepperHtml: (id, value, label, min = 0, max = 999) => `<span class="a-stepper" data-stepper="${id}">
        <button type="button" data-step="-1" aria-label="הפחתה – ${esc(label)}">−</button>
        <input type="number" id="${id}" value="${value}" min="${min}" max="${max}" inputmode="numeric" aria-label="${esc(label)}">
        <button type="button" data-step="1" aria-label="הוספה – ${esc(label)}">+</button>
      </span>`,
    // + and − on every stepper inside root; onChange(id, value)
    wireSteppers(root, onChange) {
      const clamp = (inp, v) => Math.max(+inp.min, Math.min(+inp.max, Number.isFinite(v) ? Math.round(v) : +inp.min));
      const sync = (box) => {
        const inp = box.querySelector('input');
        box.querySelector('[data-step="-1"]').disabled = +inp.value <= +inp.min;
        box.querySelector('[data-step="1"]').disabled = +inp.value >= +inp.max;
      };
      root.querySelectorAll('[data-stepper]').forEach(sync);
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]');
        if (!b) return;
        const box = b.closest('[data-stepper]');
        const inp = box.querySelector('input');
        inp.value = clamp(inp, +inp.value + Number(b.dataset.step));
        sync(box);
        onChange(inp.id, +inp.value);
      });
      root.addEventListener('change', (e) => {
        const inp = e.target.closest('[data-stepper] input');
        if (!inp) return;
        inp.value = clamp(inp, parseFloat(inp.value));
        sync(inp.closest('[data-stepper]'));
        onChange(inp.id, +inp.value);
      });
      // after redrawing the steppers: their − / + enabled again to match
      return () => root.querySelectorAll('[data-stepper]').forEach(sync);
    },
    // a segmented filter: items [[key, label, count?]], onPick(key)
    segHtml: (name, items, on) => `<div class="a-seg" role="group" aria-label="${esc(name)}">${items.map(([k, label, n]) => `<button type="button" data-seg="${k}" aria-pressed="${k === on}">${esc(label)}${n != null ? `<b>${n}</b>` : ''}</button>`).join('')}</div>`,
    wireSeg(root, onPick) {
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-seg]');
        if (!b) return;
        b.parentElement.querySelectorAll('[data-seg]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        onPick(b.dataset.seg, b);
      });
    },
    // a drop-down with check boxes (several may be picked; none = all):
    // multiHtml(name, allLabel, items [[key, label]], picked []) · wireMulti(root, onChange(picked[]))
    multiHtml: (name, allLabel, items, picked = []) => `<div class="a-multi" data-all="${esc(allLabel)}" data-name="${esc(name)}">
        <button class="a-multi__btn" type="button" aria-haspopup="true" aria-expanded="false"><span class="a-multi__text"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
        <div class="a-multi__list" role="group" aria-label="${esc(name)}" hidden>
          ${items.map(([k, label]) => `<label class="a-multi__opt"><input type="checkbox" value="${esc(k)}"${picked.includes(k) ? ' checked' : ''}><span class="a-multi__box" aria-hidden="true"></span><span>${esc(label)}</span></label>`).join('')}
          <button class="a-multi__clear" type="button">${esc(allLabel)}</button>
        </div>
      </div>`,
    wireMulti(root, onChange) {
      const box = root.querySelector('.a-multi');
      const btn = box.querySelector('.a-multi__btn');
      const list = box.querySelector('.a-multi__list');
      const boxes = () => [...list.querySelectorAll('input')];
      const picked = () => boxes().filter((b) => b.checked).map((b) => b.value);
      const label = () => {
        const p = boxes().filter((b) => b.checked).map((b) => b.value);
        box.querySelector('.a-multi__text').textContent = p.length ? `${box.dataset.name}: ${p.join(', ')}` : box.dataset.all;
        btn.classList.toggle('is-on', p.length > 0);
      };
      const setOpen = (on) => { list.hidden = !on; btn.setAttribute('aria-expanded', String(on)); };
      btn.addEventListener('click', () => setOpen(list.hidden));
      list.addEventListener('change', () => { label(); onChange(picked()); });
      list.querySelector('.a-multi__clear').addEventListener('click', () => { boxes().forEach((b) => { b.checked = false; }); label(); onChange([]); setOpen(false); btn.focus(); });
      document.addEventListener('click', (e) => { if (!list.hidden && !box.contains(e.target)) setOpen(false); });
      box.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !list.hidden) { e.stopPropagation(); setOpen(false); btn.focus(); } });
      label();
    },
    // the sticky save bar: { el, setDirty(bool) }; buttons only while there are changes;
    // leaving the page with unsaved changes asks first
    saveBar({ onSave, onCancel }) {
      const el = document.createElement('div');
      el.className = 'a-save';
      el.innerHTML = `<div class="a-save__in">
          <span class="a-save__status" role="status" aria-live="polite">כל השינויים נשמרו</span>
          <div class="a-save__actions">
            <button type="button" class="a-btn a-btn--ghost" data-cancel>ביטול השינויים</button>
            <button type="button" class="a-btn a-btn--primary" data-save>שמירה</button>
          </div>
        </div>`;
      let dirty = false;
      const status = el.querySelector('.a-save__status');
      const saveBtn = el.querySelector('[data-save]');
      const setDirty = (d) => {
        dirty = d;
        el.classList.toggle('is-dirty', d);
        saveBtn.disabled = !d;
        status.textContent = d ? 'יש שינויים שלא נשמרו' : 'כל השינויים נשמרו';
      };
      el.querySelector('[data-save]').addEventListener('click', () => { onSave(); setDirty(false); });
      el.querySelector('[data-cancel]').addEventListener('click', () => { onCancel(); setDirty(false); });
      window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
      // links inside the admin (the top bar) ask too, in Hebrew
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a || !dirty || a.target === '_blank') return;
        if (!confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?')) e.preventDefault();
        else dirty = false;
      }, true);
      setDirty(false);
      return { el, setDirty, isDirty: () => dirty };
    },
    ICON: {
      chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
      edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
      plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
      info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
      warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17v.5"/></svg>',
      grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
      close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    },
  };

  window.Admin = { Users, Worlds, Coins, UI, iso, DAY, now };
})();
