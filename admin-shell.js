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
  const page = document.body.dataset.page;

  /* ---------- top bar ---------- */
  const top = document.createElement('header');
  top.className = 'a-top';
  top.innerHTML = `
    <div class="a-top__in">
      <a class="a-logo" href="admin-content.html" aria-label="מדקדקים באנגלית – קורס דיגיטלי באנגלית · ניהול">
        <span class="logo">
          <span class="logo__text"><span class="logo__title">מדקדקים באנגלית</span><span class="logo__subtitle">קורס דיגיטלי באנגלית</span></span>
          <span class="logo__mark"><img class="logo__ring" src="assets/logo-ring.svg" alt=""><span class="logo__tile logo__tile--a">a</span><span class="logo__tile logo__tile--c">c</span><span class="logo__tile logo__tile--b">b</span></span>
        </span>
      </a>
      <nav class="a-nav" aria-label="ניהול">
        ${PAGES.map(([k, href, name, icon]) => `<a href="${href}"${k === page ? ' aria-current="page"' : ''}>${icon}<span>${name}</span></a>`).join('')}
      </nav>
      <div class="a-top__end">
        <a class="a-top__site" href="index.html">לאתר התלמידים<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></a>
        <span class="a-me"><img src="assets/team-einat.webp" alt=""><span>ד"ר עינת ודעי רונן</span></span>
      </div>
    </div>`;
  document.body.prepend(top);

  /* ---------- storage (per browser, demo) ---------- */
  const read = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* blocked */ } };

  /* users: the same list and key the old admin page used */
  const DAY = 24 * 60 * 60 * 1000;
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const now = Date.now();
  const demoUsers = () => [
    ['שירה', 'כהן', 'shira.cohen', '050-1234567', 'shira@example.com', 120, 245, true, 'assets/avatar.webp'],
    ['נועם', 'לוי', 'noam.levi', '052-2345678', 'noam@example.com', 300, 65, true],
    ['מאיה', 'פרץ', 'maya.p', '054-3456789', 'maya@example.com', 30, 335, true],
    ['איתי', 'מזרחי', 'itay.m', '053-4567890', 'itay@example.com', 400, -35, false],
    ['תמר', 'אברהם', 'tamar.a', '058-5678901', 'tamar@example.com', 350, 12, true],
    ['יונתן', 'ביטון', 'yoni.b', '050-6789012', 'yoni@example.com', 500, -135, false],
    ['אורי', 'דהן', 'uri.d', '052-7890123', 'uri@example.com', 60, 300, true],
  ].map(([first, last, user, phone, email, ago, left, active, photo]) => ({
    id: user, first, last, user, phone, email, active, photo: photo || '',
    start: iso(now - ago * DAY), end: iso(now + left * DAY),
  }));
  let users = read('en-app:users', null);
  if (!Array.isArray(users)) users = demoUsers();
  const Users = {
    all: () => users,
    save: () => write('en-app:users', users),
    daysLeft: (u) => Math.ceil((new Date(u.end) - now) / DAY),
  };
  Users.expiring = (u) => { const n = Users.daysLeft(u); return n >= 0 && n <= 30; };
  const COLORS = ['#B0234F', '#1F5FBF', '#8A5A00', '#4C6A0B', '#5B34B8', '#0E7468'];
  Users.avatar = (u, i) => (u.photo
    ? `<img class="a-avatar" src="${u.photo}" alt="">`
    : `<span class="a-avatar" style="background:${COLORS[i % COLORS.length]}" aria-hidden="true">${(u.first[0] || '') + (u.last[0] || '')}</span>`);

  /* worlds: built from the islands list (islands.js); the admin's edits are kept apart */
  const WRITTEN = { 'letters.html': 1, 'doctor.html': 3, 'smiles.html': 4, 'single.html': 3, 'blending.html': 3, 'whistling.html': 3, 'magic.html': 3, 'sounds.html': 3 };
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
        planned: isReview ? 0 : span(i.lessons),
        written: isReview ? 0 : (WRITTEN[i.page] || 0),
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
