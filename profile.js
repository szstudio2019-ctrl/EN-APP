// Profile page: edit the learner's details (photo, name, username, phone,
// password) and see the coins, treasure chests and sentences collected.
// Demo: everything is kept in this browser (localStorage); menu.js shows the
// saved name and photo in the header and menu of every page.
(function () {
  const W = 1920;
  const H = 1080;
  const stage = document.getElementById('stage');
  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const x = (window.innerWidth - W * scale) / 2;
    const y = (window.innerHeight - H * scale) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.style.setProperty('--edge-shift', `${(-x / scale).toFixed(1)}px`);
    stage.style.setProperty('--edge-shift-y', `${(-y / scale).toFixed(1)}px`);
  }
  window.addEventListener('resize', fit);
  fit();
  document.body.classList.add('is-loading');

  const KEY = 'en-app:profile';
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (err) { return null; } };
  const profile = Object.assign({
    name: document.querySelector('.user__name')?.textContent.trim() || '',
    user: 'shira.cohen',
    phone: '',
    email: '',
    photo: '',
  }, read(KEY) || {});

  /* ---------- Details form ---------- */
  const $ = (id) => document.getElementById(id);
  const photo = $('profile-photo');
  // the full name is kept as one string; the form splits it into first / last
  const [first, ...rest] = profile.name.split(/\s+/);
  $('p-first').value = profile.first ?? first ?? '';
  $('p-last').value = profile.last ?? rest.join(' ');
  $('p-email').value = profile.email;
  $('p-user').value = profile.user;
  $('p-phone').value = profile.phone;
  if (profile.photo) photo.src = profile.photo;

  // a new photo is shrunk to a small square before it is kept
  $('profile-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const size = 240;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const s = Math.max(size / img.width, size / img.height);
      const w = img.width * s;
      const h = img.height * s;
      c.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      photo.src = c.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });

  const msg = $('profile-msg');
  const say = (text, ok) => { msg.textContent = text; msg.classList.toggle('is-error', !ok); };
  $('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = $('p-pass').value;
    if (pass && pass.length < 6) { say('הסיסמה צריכה להיות לפחות 6 תווים', false); return; }
    if (pass !== $('p-pass2').value) { say('הסיסמאות לא תואמות', false); return; }
    const phone = $('p-phone').value.trim();
    if (phone && !/^[0-9+\-\s]{9,15}$/.test(phone)) { say('מספר הטלפון לא תקין', false); return; }
    const email = $('p-email').value.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say('כתובת האימייל לא תקינה', false); return; }
    profile.first = $('p-first').value.trim();
    profile.last = $('p-last').value.trim();
    profile.name = [profile.first, profile.last].filter(Boolean).join(' ');
    profile.email = email;
    profile.user = $('p-user').value.trim();
    profile.phone = phone;
    profile.photo = photo.src.startsWith('data:') ? photo.src : profile.photo;
    try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (err) { say('לא ניתן לשמור בדפדפן הזה', false); return; }
    $('p-pass').value = '';
    $('p-pass2').value = '';
    // show the new name and photo in the header and menu right away
    document.querySelectorAll('.user__name, .sidebar__name').forEach((el) => { el.textContent = profile.name; });
    if (profile.photo) document.querySelectorAll('.user__photo').forEach((el) => { el.src = profile.photo; });
    say(pass ? 'הפרטים והסיסמה נשמרו' : 'הפרטים נשמרו', true);
    setMode('view');
  });

  /* ---------- View / edit: the details show as text; 'עריכת פרטים' opens the
     fields, 'שמירת השינויים' or 'ביטול' close them. The password only appears
     behind 'שינוי סיסמה'. ---------- */
  const form = $('profile-form');
  const note = $('profile-note');
  const shown = [...form.querySelectorAll('.profile__field input')].filter((i) => i.type !== 'password');
  // a text twin for every field (view mode)
  shown.forEach((input) => {
    const v = document.createElement('span');
    v.className = 'pf-value';
    if (input.dir === 'ltr') v.dir = 'ltr';
    input.after(v);
  });
  const paintValues = () => shown.forEach((input) => {
    const v = input.nextElementSibling;
    v.textContent = input.value.trim() || '—';
    v.classList.toggle('is-empty', !input.value.trim());
  });
  const passFields = [...form.querySelectorAll('.pf-pass')];
  const passOpen = $('pf-pass-open');
  const showPass = (on) => { passFields.forEach((f) => { f.hidden = !on; }); passOpen.hidden = on; if (!on) { $('p-pass').value = ''; $('p-pass2').value = ''; } };
  passOpen.addEventListener('click', () => { showPass(true); $('p-pass').focus(); });
  // what the fields held when editing began (for 'ביטול')
  let before = null;
  function setMode(mode) {
    const view = mode === 'view';
    form.classList.toggle('is-view', view);
    form.classList.toggle('is-edit', !view);
    note.textContent = view ? 'הפרטים שלי' : 'אפשר לערוך את הפרטים ולשמור';
    showPass(false);
    if (view) paintValues();
    else { before = shown.map((i) => i.value); msg.textContent = ''; shown[0].focus(); }
  }
  $('pf-edit').addEventListener('click', () => setMode('edit'));
  $('pf-cancel').addEventListener('click', () => {
    if (before) shown.forEach((i, k) => { i.value = before[k]; });
    photo.src = profile.photo || photo.getAttribute('src');
    msg.textContent = '';
    setMode('view');
  });
  setMode('view');

  /* ---------- What I collected ---------- */
  const shop = read('en-app:shop');
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const sentences = (shop && shop.sentences) || [
    { en: 'Dream big!', he: 'חלום בגדול!', date: now - DAY, found: 'dre' },
    { en: 'Be brave!', he: 'תהיה אמיץ!', date: now - 3 * DAY, found: 'berav' },
    { en: 'Never give up!', he: 'לעולם אל תוותר!', date: now - 9 * DAY, found: 'nevgiu' },
  ];
  $('p-coins').textContent = (shop && shop.coins) ?? (document.querySelector('.stat--coins .stat__value')?.textContent || 350);
  $('p-chests').textContent = document.querySelector('.stat--chest .stat__value')?.textContent || 3;

  const lettersOf = (t) => [...new Set(t.toLowerCase().replace(/[^a-z]/g, ''))];
  const leftIn = (s) => lettersOf(s.en).filter((l) => !s.found.includes(l)).length;
  const fmt = (t) => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
  const tiles = (s) => s.en.split(' ').map((word) => `<span class="s-word">${word.split('').map((ch) => {
    const l = ch.toLowerCase();
    if (!/[a-z]/.test(l)) return `<b class="s-tile s-tile--mark">${ch}</b>`;
    return s.found.includes(l) ? `<b class="s-tile is-found">${ch}</b>` : '<b class="s-tile">?</b>';
  }).join('')}</span>`).join('');
  $('sentences').innerHTML = sentences.map((s, i) => {
    const left = leftIn(s);
    return `<li class="s-item${i === 0 ? ' is-active' : ''}${left === 0 ? ' is-done' : ''}">
        <div class="s-item__top">
          ${i === 0 ? '<span class="s-badge">המשפט הנוכחי</span>' : ''}
          <span class="s-date">${fmt(s.date)}</span>
          ${left === 0 ? '<span class="s-status s-status--done"><i class="s-check">✓</i> הושלם</span>' : `<span class="s-status">נשארו ${left} אותיות</span>`}
        </div>
        <div class="s-tiles" lang="en" dir="ltr">${tiles(s)}</div>
        ${left === 0 ? `<p class="s-he">${s.he}</p>` : ''}
      </li>`;
  }).join('');

  /* ---------- Trophy bubble and loader (same as the other pages) ---------- */
  const trophy = document.querySelector('.trophy');
  if (trophy) {
    const setTrophy = (open) => trophy.setAttribute('aria-expanded', String(open));
    trophy.addEventListener('click', (e) => { e.stopPropagation(); setTrophy(trophy.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.trophy-hint')) setTrophy(false); });
  }
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 3000))])
    .then(() => requestAnimationFrame(() => {
      const loader = document.getElementById('loader');
      if (loader) {
        const pctEl = document.getElementById('loader-pct');
        const barEl = document.getElementById('loader-bar');
        const t0 = performance.now();
        const run = (t) => {
          const p = Math.min(1, (t - t0) / 700);
          const v = Math.round(100 * (1 - Math.pow(1 - p, 3)));
          pctEl.textContent = v;
          barEl.style.width = `${v}%`;
          if (p < 1) requestAnimationFrame(run);
          else setTimeout(() => loader.classList.add('is-done'), 150);
        };
        requestAnimationFrame(run);
        setTimeout(() => loader.remove(), 2200);
      }
      document.body.classList.remove('is-loading');
    }));
})();

// My persistence (the same demo data Einat sees on the admin page): a meter
// for the last 30 days with a trophy / medal, and a tab with the week / month /
// year data – coins, days played, persistence, longest streak, reviews, chart.
(function () {
  const meter = document.getElementById('pf-meter');
  const box = document.getElementById('pf-stats');
  if (!meter || !box || !window.ChildStats) return;
  const { activityOf, statsOf } = window.ChildStats;
  const DAY = 24 * 60 * 60 * 1000;
  // the learner: her row in the admin's list (else the demo's own values)
  let me = null;
  try { me = (JSON.parse(localStorage.getItem('en-app:users')) || []).find((u) => u.user === 'shira.cohen'); } catch (err) { me = null; }
  if (!me) {
    const start = new Date(Date.now() - 120 * DAY).toISOString().slice(0, 10);
    me = { id: 'shira.cohen', user: 'shira.cohen', first: 'שירה', last: 'כהן', start, active: true };
  }
  const part = activityOf(me).slice(0, 30);
  const played = part.filter((d) => d.min).length;
  const pct = Math.round((played / 30) * 100);
  const MEDAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l2 6H9z" fill="#e33563"/><path d="M13 2h4l-2 6h-4z" fill="#2f7cf2"/><circle cx="12" cy="15" r="6.5" fill="#f4b73b" stroke="#d08a00" stroke-width="1.2"/><path d="M12 11.6l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="#fff6d6"/></svg>';
  const badge = pct >= 70 ? { ico: '<img src="assets/trophy.svg" alt="">', name: 'מצטיינת!' }
    : pct >= 40 ? { ico: MEDAL, name: 'מתמידה!' } : { ico: '', name: 'ממשיכים לשחק' };
  meter.innerHTML = `
    <div class="pf-meter__head"><b>מד ההתמדה שלי</b><span>${played} מתוך 30 הימים האחרונים</span></div>
    <div class="pf-meter__row">
      <div class="pf-meter__bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="התמדה"><i style="width:${pct}%"></i><span style="inset-inline-start:40%"></span><span style="inset-inline-start:70%"></span></div>
      <b class="pf-meter__pct">${pct}%</b>
      <span class="pf-meter__badge">${badge.ico}<small>${badge.name}</small></span>
    </div>`;
  let period = 'week';
  const paint = () => { box.innerHTML = statsOf(me, period); };
  box.addEventListener('click', (e) => { const c = e.target.closest('[data-period]'); if (c) { period = c.dataset.period; paint(); } });
  paint();
  // the two views
  const list = document.getElementById('sentences');
  document.querySelector('.pf-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    const stats = b.dataset.view === 'stats';
    document.querySelectorAll('.pf-tabs [data-view]').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', String(x === b)); });
    list.hidden = b.dataset.view !== 'sentences';
    box.hidden = !stats;
    const cards = document.getElementById('pf-cards');
    if (cards) cards.hidden = b.dataset.view !== 'cards';
  });
})();

// My letter cards: the ones bought in the shop and still waiting (with how
// many), and under them the ones already in a sentence (faded, "במשפט")
(function () {
  const box = document.getElementById('pf-cards');
  if (!box) return;
  let shop = null;
  try { shop = JSON.parse(localStorage.getItem('en-app:shop')); } catch (err) { shop = null; }
  // demo, before anything was bought in this browser
  const inv = (shop && shop.inv) || { e: 2, o: 1, t: 1, m: 1, s: 1 };
  const sentences = (shop && shop.sentences) || [{ found: 'dre' }, { found: 'berav' }, { found: 'nevgiu' }];
  const used = {};
  sentences.forEach((s) => [...(s.found || '')].forEach((l) => { used[l] = (used[l] || 0) + 1; }));
  const waiting = Object.keys(inv).sort().map((l) => [l, Math.max(0, (inv[l] || 0) - (used[l] || 0))]).filter(([, n]) => n > 0);
  const inUse = Object.keys(used).sort();
  const card = (l, extra) => `<span class="pf-card${extra.cls || ''}" title="${extra.title}"><img src="assets/cards/card-${l}.webp" alt="האות ${l}" loading="lazy">${extra.badge || ''}</span>`;
  box.innerHTML = `
    <p class="pf-cards__title">מחכות לשימוש <small>${waiting.reduce((n, [, c]) => n + c, 0)} כרטיסיות</small></p>
    ${waiting.length ? `<div class="pf-cards__grid">${waiting.map(([l, n]) => card(l, { title: `האות ${l}`, badge: n > 1 ? `<b class="pf-card__n">×${n}</b>` : '' })).join('')}</div>`
      : '<p class="pf-cards__empty">אין כרטיסיות שמחכות – אפשר לקנות ב<a href="shop.html">חנות האותיות</a></p>'}
    ${inUse.length ? `<p class="pf-cards__title">כבר במשפט <small>${inUse.length} אותיות</small></p>
    <div class="pf-cards__grid">${inUse.map((l) => card(l, { cls: ' is-used', title: `האות ${l} – במשפט`, badge: '<b class="pf-card__tag">במשפט</b>' })).join('')}</div>` : ''}`;
})();
