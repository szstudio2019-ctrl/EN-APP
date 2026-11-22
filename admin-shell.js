// Admin shell, shared by the four admin pages: the top bar (logo, the four
// pages, "לאתר התלמידים", the manager), the demo data kept in this browser
// (users, worlds, coins) and small builders for the shared components
// (switch, stepper, segmented filter, sticky save bar).
(function () {
  const PAGES = [
    ['home', 'admin-home.html', 'ראשי', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>'],
    ['content', 'admin-content.html', 'עריכת תוכן', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>'],
    ['users', 'admin.html', 'משתמשים', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>'],
    ['stats', 'admin-stats.html', 'התמדה', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'],
    ['coins', 'admin-coins.html', 'מטבעות', '<img src="assets/coin.webp" alt="">'],
  ];
  // what 'עריכת תוכן' opens to (the pages not built yet are marked 'בקרוב')
  const CONTENT_SUB = [
    ['islands', 'admin-content.html', 'עריכת תוכן לאיים'],
    ['about', 'admin-about.html', 'עריכת תוכן לאודות'],
    ['intro', 'admin-intro.html', 'עריכת תוכן להסבר על האתר'],
    ['cards', 'admin-cards.html', 'עריכת תוכן לחנות כרטיסים'],
    ['raffle', 'admin-sentences.html', 'עריכת תוכן למשפטי הגרלה'],
  ];
  const subLink = ([k, href, name], role) => (href
    ? `<a${role} class="a-sub__item" href="${href}"${page === 'content' && k === (document.body.dataset.sub || 'islands') ? ' aria-current="page"' : ''}><span>${name}</span></a>`
    : `<span${role} class="a-sub__item a-sub__item--soon" aria-disabled="true"><span>${name}</span><small>בקרוב</small></span>`);
  const page = document.body.dataset.page;

  /* ---------- the side rail: a narrow menu on the right, one icon per admin page ---------- */
  const sub = document.body.dataset.sub || 'islands';
  const I = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  // [key, href (none = not built yet), name, icon, is this the page]
  const RAIL = [
    ['home', 'admin-home.html', 'ראשי', I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'), page === 'home'],
    '-',
    ['islands', 'admin-content.html', 'עריכת איים', '<svg class="is-fill" viewBox="0 0 64 52" aria-hidden="true"><path d="M33 20c-1-6 2-11 6-14 0 4 3 7 7 8-4 1-9 3-13 6z"/><path d="M27 21c-2-4-1-8 2-10 0 3 2 5 4 6-2 1-4 2-6 4z"/><path d="M4 25c0-3 12-6 28-6s28 3 28 6c0 2-2 3-5 4l-7 9-6 3-4 9-5-8-6-1-5-6-7-3c-6-2-11-3-11-7z"/></svg>', page === 'content' && sub === 'islands'],
    ['about', 'admin-about.html', 'עריכת אודות', I('<path d="M17 4.6A8.6 8.6 0 1 0 19.6 17"/><rect x="9" y="8.2" width="7.4" height="8.8" rx="1.6" transform="rotate(-10 12.7 12.6)" fill="currentColor" stroke="none"/>'), page === 'content' && sub === 'about'],
    ['intro', 'admin-intro.html', 'הסבר על האתר', I('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>'), page === 'content' && sub === 'intro'],
    ['cards', 'admin-cards.html', 'חנות כרטיסים', I('<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>'), page === 'content' && sub === 'cards'],
    ['raffle', 'admin-sentences.html', 'משפטי הגרלה', I('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/>'), page === 'content' && sub === 'raffle'],
    '-',
    ['users', 'admin.html', 'משתמשים', I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>'), page === 'users'],
    ['stats', 'admin-stats.html', 'התמדה', I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'), page === 'stats'],
    ['coins', 'admin-coins.html', 'מטבעות', '<img class="a-rail__img" src="assets/coin.webp" alt="">', page === 'coins'],
    ['settings', '', 'הגדרות (בקרוב)', I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'), false],
    ['site', 'index.html?view=admin', 'לאתר התלמידים', I('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'), false],
  ];
  const railItem = (x) => {
    if (x === '-') return '<li class="a-rail__sep" aria-hidden="true"></li>';
    const [k, href, name, icon, on] = x;
    return `<li>${href
      ? `<a class="a-rail__item" href="${href}" aria-label="${name}"${on ? ' aria-current="page"' : ''} data-rail="${k}">${icon}<span class="a-tip" aria-hidden="true">${name}</span></a>`
      : `<span class="a-rail__item is-soon" role="link" aria-disabled="true" aria-label="${name}">${icon}<span class="a-tip" aria-hidden="true">${name}</span></span>`}</li>`;
  };
  // the manager's own details (name, photo…), kept in this browser; edited on admin-profile.html
  const ME_DEFAULT = { first: 'עינת', last: '', email: '', phone: '', role: 'מנהלת המערכת', photo: '' };
  const Me = {
    load() { try { return { ...ME_DEFAULT, ...(JSON.parse(localStorage.getItem('en-app:admin-me')) || {}) }; } catch (e) { return { ...ME_DEFAULT }; } },
    save(v) { try { localStorage.setItem('en-app:admin-me', JSON.stringify(v)); } catch (e) { /* blocked */ } },
    // the rail shows the saved name and photo
    paint(v) {
      const a = document.querySelector('.a-rail__me');
      if (!a) return;
      a.querySelector('img').src = v.photo || 'assets/team-einat.webp';
      a.querySelector('span').textContent = v.first || 'עינת';
      a.setAttribute('aria-label', `הפרטים שלי – ${v.first || 'עינת'}`);
    },
  };
  const rail = document.createElement('nav');
  rail.className = 'a-rail';
  rail.setAttribute('aria-label', 'מערכת ניהול');
  rail.innerHTML = `
    <a class="a-rail__logo" href="admin-home.html" aria-label="מדקדקים באנגלית – מערכת ניהול, ראשי"><span class="logo__mark" aria-hidden="true"><img class="logo__ring" src="assets/logo-ring.svg" alt=""><span class="logo__tile logo__tile--a">a</span><span class="logo__tile logo__tile--c">c</span><span class="logo__tile logo__tile--b">b</span></span></a>
    <div class="a-find">
      <button class="a-rail__item a-rail__search" type="button" aria-label="חיפוש עמוד" aria-expanded="false" aria-controls="a-find-box">${I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>')}<span class="a-tip" aria-hidden="true">חיפוש עמוד</span></button>
      <div class="a-find__box" id="a-find-box" role="dialog" aria-label="חיפוש עמוד" hidden>
        <input type="search" placeholder="לאיזה עמוד?" aria-label="שם העמוד">
        <ul class="a-find__list">${RAIL.filter((x) => x !== '-' && x[1]).map(([, href, name, icon]) => `<li><a href="${href}">${icon}<span>${name}</span></a></li>`).join('')}</ul>
      </div>
    </div>
    <ul class="a-rail__list">${RAIL.map(railItem).join('')}</ul>
    <div class="a-rail__foot">
      <a class="a-rail__me" href="admin-profile.html" aria-label="הפרטים שלי – עינת"${page === 'me' ? ' aria-current="page"' : ''}><img src="assets/team-einat.webp" alt=""><span>עינת</span><span class="a-tip" aria-hidden="true">הפרטים שלי</span></a>
      <a class="a-rail__item a-rail__out" href="index.html?view=off" aria-label="התנתקות">${I('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>')}<span class="a-tip" aria-hidden="true">התנתקות</span></a>
    </div>`;
  document.body.prepend(rail);
  Me.paint(Me.load());
  document.body.classList.add('has-rail');
  // every page title starts with 'מערכת ניהול –'
  const h1 = document.querySelector('.a-head h1');
  if (h1 && !h1.querySelector('.a-h1-pre')) h1.insertAdjacentHTML('afterbegin', '<span class="a-h1-pre">מערכת ניהול – </span>');
  // the search button: a small box to find an admin page by its name
  const findBtn = rail.querySelector('.a-rail__search');
  const findBox = rail.querySelector('.a-find__box');
  const findIn = findBox.querySelector('input');
  const setFind = (on) => { findBox.hidden = !on; findBtn.setAttribute('aria-expanded', String(on)); if (on) { findIn.value = ''; filterFind(); findIn.focus(); } };
  const filterFind = () => { const q = findIn.value.trim(); findBox.querySelectorAll('li').forEach((li) => { li.hidden = !!q && !li.textContent.includes(q); }); };
  findBtn.addEventListener('click', () => setFind(findBox.hidden));
  findIn.addEventListener('input', filterFind);
  findIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = findBox.querySelector('li:not([hidden]) a'); if (a) a.click(); } });
  document.addEventListener('click', (e) => { if (!findBox.hidden && !e.target.closest('.a-find')) setFind(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !findBox.hidden) { setFind(false); findBtn.focus(); } });

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
        // the button names no picks, only how many were picked
        box.querySelector('.a-multi__text').innerHTML = p.length ? `${box.dataset.name} <b class="a-multi__n">${p.length}</b>` : box.dataset.all;
        btn.setAttribute('aria-label', p.length ? `${box.dataset.name}: ${p.join(', ')}` : box.dataset.all);
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
    // SaveButton: one save button for the whole admin. States (data-status):
    // idle (no changes, disabled) · dirty · saving (spinner, locked, same width) · saved (green "נשמר ✓" for 2s, then idle).
    // A failed save goes back to dirty with a small red note under the button.
    // saveButton(btn, { onSave, label }) → { setDirty, isDirty, run, status, onStatus }
    saveButton(btn, { onSave, validate, label = 'שמירה' } = {}) {
      btn.classList.add('a-savebtn');
      btn.classList.remove('a-btn--primary');
      let wrap = btn.parentElement && btn.parentElement.classList.contains('a-savebtn-wrap') ? btn.parentElement : null;
      if (!wrap) { wrap = document.createElement('span'); wrap.className = 'a-savebtn-wrap'; btn.replaceWith(wrap); wrap.append(btn); }
      let err = wrap.querySelector('.a-savebtn__err');
      if (!err) { err = document.createElement('small'); err.className = 'a-savebtn__err'; err.setAttribute('role', 'alert'); wrap.append(err); }
      let status = 'idle';
      let timer = 0;
      const subs = [];
      const paint = () => {
        btn.dataset.status = status;
        btn.disabled = status !== 'dirty';
        btn.setAttribute('aria-busy', String(status === 'saving'));
        btn.innerHTML = status === 'saving' ? '<span class="a-savebtn__spin" aria-hidden="true"></span>שומר…'
          : status === 'saved' ? 'נשמר ✓' : esc(label);
        // the width stays put while saving and while 'נשמר ✓' shows
        if (status === 'idle' || status === 'dirty') btn.style.width = '';
        subs.forEach((fn) => fn(status));
      };
      const set = (s) => { status = s; paint(); };
      const api = {
        status: () => status,
        isDirty: () => status === 'dirty' || status === 'saving',
        onStatus: (fn) => subs.push(fn),
        setDirty(d) {
          if (status === 'saving') return;
          if (d) { clearTimeout(timer); err.textContent = ''; set('dirty'); } else if (status !== 'saved') set('idle');
        },
        run() {
          if (status !== 'dirty') return;
          if (validate && validate() === false) return;
          err.textContent = '';
          btn.style.width = `${btn.offsetWidth}px`;
          set('saving');
          setTimeout(() => {
            let ok = true;
            try { ok = onSave() !== false; } catch (e) { ok = false; }
            if (!ok) { err.textContent = 'השמירה נכשלה, נסי שוב'; set('dirty'); return; }
            set('saved');
            clearTimeout(timer);
            timer = setTimeout(() => { if (status === 'saved') set('idle'); }, 2000);
          }, 450);
        },
      };
      // a form's submit button: the form checks its fields first, then calls run()
      btn.addEventListener('click', (e) => { if (btn.type === 'submit') return; e.preventDefault(); api.run(); });
      paint();
      return api;
    },
    // ActionBar: the page's sticky bar at the bottom of the content. Start (right): "יש שינויים שלא נשמרו"
    // (only with changes); end (left): "ביטול שינויים" (only with changes) and the SaveButton.
    // saveBar({ onSave, onCancel, validate }) → { el, setDirty, isDirty, save, mount() }
    saveBar({ onSave, onCancel, validate }) {
      const el = document.createElement('div');
      el.className = 'a-save a-actbar';
      el.setAttribute('role', 'region');
      el.setAttribute('aria-label', 'שמירה');
      el.innerHTML = `<div class="a-actbar__start">
          <span class="a-actbar__dirty" hidden><i aria-hidden="true"></i>יש שינויים שלא נשמרו</span>
          <span class="a-save__status" role="status" aria-live="polite">כל השינויים נשמרו</span>
        </div>
        <div class="a-actbar__end">
          <button type="button" class="a-actbar__cancel" data-cancel hidden>ביטול שינויים</button>
          <button type="button" data-save>שמירה</button>
        </div>`;
      const status = el.querySelector('.a-save__status');
      const dirtyNote = el.querySelector('.a-actbar__dirty');
      const cancel = el.querySelector('[data-cancel]');
      const save = UI.saveButton(el.querySelector('[data-save]'), { onSave, validate });
      const show = (d) => { dirtyNote.hidden = !d; cancel.hidden = !d; el.classList.toggle('is-dirty', d); status.textContent = d ? 'יש שינויים שלא נשמרו' : 'כל השינויים נשמרו'; };
      const setDirty = (d) => { save.setDirty(d); show(save.isDirty()); };
      save.onStatus((s) => { if (s === 'saved' || s === 'idle') show(false); });
      cancel.addEventListener('click', () => { onCancel(); setDirty(false); });
      UI.guardLeave(save.isDirty);
      setDirty(false);
      // one bar for the page, at the bottom of the content area
      const mount = () => { const main = document.querySelector('.a-main'); if (main) main.appendChild(el); };
      return { el, setDirty, isDirty: save.isDirty, save, mount };
    },
    // leaving with unsaved changes asks first: "להישאר" / "לצאת בלי לשמור" (closing the tab gets the browser's own question)
    guardLeave(isDirty) {
      UI._dirtyChecks = UI._dirtyChecks || [];
      UI._dirtyChecks.push(isDirty);
      if (UI._guarded) return;
      UI._guarded = true;
      const anyDirty = () => UI._dirtyChecks.some((f) => f());
      let leaving = false;
      window.addEventListener('beforeunload', (e) => { if (!leaving && anyDirty()) { e.preventDefault(); e.returnValue = ''; } });
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a || leaving || !anyDirty() || a.target === '_blank' || a.getAttribute('href').startsWith('#')) return;
        e.preventDefault();
        UI.confirmLeave(() => { leaving = true; location.href = a.href; });
      }, true);
    },
    confirmLeave(onLeave) {
      let dlg = document.getElementById('a-leave');
      if (!dlg) {
        dlg = document.createElement('div');
        dlg.id = 'a-leave';
        dlg.className = 'a-leave';
        dlg.innerHTML = `<div class="a-leave__card" role="alertdialog" aria-modal="true" aria-labelledby="a-leave-t">
            <p class="a-leave__t" id="a-leave-t">יש שינויים שלא נשמרו. לצאת בלי לשמור?</p>
            <div class="a-leave__btns">
              <button type="button" class="a-btn a-btn--ghost" data-leave-go>לצאת בלי לשמור</button>
              <button type="button" class="a-btn a-leave__stay" data-leave-stay>להישאר</button>
            </div>
          </div>`;
        document.body.append(dlg);
      }
      const back = document.activeElement;
      const close = () => { dlg.hidden = true; document.removeEventListener('keydown', onKey, true); if (back && back.focus) back.focus(); };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        if (e.key === 'Tab') { const bs = [...dlg.querySelectorAll('button')]; const i = bs.indexOf(document.activeElement); e.preventDefault(); bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus(); }
      };
      dlg.onclick = (e) => {
        if (e.target.closest('[data-leave-go]')) { close(); onLeave(); return; }
        if (e.target.closest('[data-leave-stay]') || e.target === dlg) close();
      };
      dlg.hidden = false;
      document.addEventListener('keydown', onKey, true);
      dlg.querySelector('[data-leave-stay]').focus();
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

  window.Admin = { Users, Worlds, Coins, UI, Me, iso, DAY, now };
})();
