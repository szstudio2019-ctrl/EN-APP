// Admin page (Einat): users with their details, an active toggle, filters with
// counts, search, and a "new user" form. Demo: kept in this browser.
(function () {
  const KEY = 'en-app:users';
  const DAY = 24 * 60 * 60 * 1000;
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const now = Date.now();
  const demo = () => [
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
  let users;
  try { users = JSON.parse(localStorage.getItem(KEY)); } catch (err) { users = null; }
  if (!Array.isArray(users)) users = demo();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(users)); } catch (err) { /* blocked */ } };

  const rows = document.getElementById('admin-rows');
  const empty = document.getElementById('admin-empty');
  const search = document.getElementById('admin-search');
  let filter = 'all';
  const fmt = (d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const daysLeft = (u) => Math.ceil((new Date(u.end) - now) / DAY);
  const expiring = (u) => { const n = daysLeft(u); return n >= 0 && n <= 30; };
  const COLORS = ['#e33563', '#2f7cf2', '#eeb741', '#91b121', '#7d4ae8', '#16a99a'];
  const avatar = (u, i) => (u.photo
    ? `<img class="admin__avatar" src="${u.photo}" alt="">`
    : `<span class="admin__avatar" style="background:${COLORS[i % COLORS.length]}">${(u.first[0] || '') + (u.last[0] || '')}</span>`);

  /* ---------- Each child's data (demo): a year of play, made up from the
     username so it stays the same on every visit ---------- */
  const seeded = (s) => {
    let h = 2166136261;
    for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  };
  const activity = {};
  function activityOf(u) {
    if (activity[u.id]) return activity[u.id];
    const rnd = seeded(u.user || u.id);
    const keen = 0.35 + rnd() * 0.5; // how often this child plays
    const since = Math.max(0, Math.floor((now - new Date(u.start)) / DAY));
    const stopped = u.active ? 0 : 20 + Math.floor(rnd() * 40); // inactive: no play lately
    // days[0] = today, days[1] = yesterday, … : minutes played and coins earned
    const days = Array.from({ length: 365 }, (_, d) => {
      const played = d <= since && d >= stopped && rnd() < keen;
      const min = played ? 5 + Math.round(rnd() * 35) : 0;
      return { min, coins: played ? Math.round(min * (1 + rnd())) : 0 };
    });
    const rr = seeded(`${u.user || u.id}:reviews`);
    days.forEach((d) => { d.rev = d.min && rr() < 0.3 ? 1 : 0; });
    activity[u.id] = days;
    return days;
  }
  const PERIODS = { week: ['שבוע', 7], month: ['חודש', 30], year: ['שנה', 365] };
  const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const MONTHS_HE = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  const openStats = {}; // user id -> the period shown
  const TILE_ICONS = {
    coins: '<img src="assets/coin.webp" alt="">',
    days: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 14.5l2 2 4-4"/></svg>',
    persist: '<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/></svg>',
    streak: '<svg viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.6 2.3 3C11 9 11.5 6 12 3z"/></svg>',
    reviews: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>',
    kids: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.3c3 0 5.5 2.2 5.5 5.7"/></svg>',
    top: '<img src="assets/trophy.svg" alt="">',
  };
  const tile = (kind, label, value, note) => `<div class="admin-stats__tile admin-stats__tile--${kind}"><div class="admin-stats__text"><span>${label}</span><b>${value}</b>${note ? `<small>${note}</small>` : ''}</div><i class="admin-stats__icon" aria-hidden="true">${TILE_ICONS[kind]}</i></div>`;
  const CHART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>';

  // the persistence chart: one bar per day (week, month) or per month (year)
  // opts (all children): kids = the bars count children, not minutes / days
  function chartOf(days, period, opts = {}) {
    let bars;
    if (period === 'year') {
      bars = Array.from({ length: 12 }, (_, k) => {
        const m = new Date(now); m.setDate(1); m.setMonth(m.getMonth() - (11 - k));
        const from = Math.floor((now - m) / DAY);
        const next = new Date(m); next.setMonth(m.getMonth() + 1);
        const to = Math.max(0, Math.ceil((now - next) / DAY));
        const month = days.slice(to, from + 1);
        if (opts.kids) {
          const avg = Math.round((month.reduce((s, d) => s + d.min, 0) / Math.max(1, month.length)) * 10) / 10;
          return { v: avg, label: MONTHS_HE[m.getMonth()], tip: `${avg} ילדים ביום בממוצע` };
        }
        const n = month.filter((d) => d.min).length;
        return { v: n, label: MONTHS_HE[m.getMonth()], tip: `${n} ימי משחק` };
      });
    } else {
      const n = PERIODS[period][1];
      bars = Array.from({ length: n }, (_, k) => {
        const d = n - 1 - k;
        const date = new Date(now - d * DAY);
        const label = period === 'week' ? DAYS_HE[date.getDay()] : (k % 5 === 4 || d === 0 ? String(date.getDate()) : '');
        const tip = opts.kids ? `${days[d].min} ילדים שיחקו` : days[d].min ? `${days[d].min} דקות` : 'לא שיחק';
        return { v: days[d].min, label, tip };
      });
    }
    const W = 1400, H = 220, top = 24, base = H - 30; // wide, so the chart stays low in the panel
    const max = opts.kids ? Math.max(1, opts.kids) : Math.max(...bars.map((b) => b.v), period === 'year' ? 10 : 20);
    const step = W / bars.length;
    const bw = Math.min(56, step * 0.62);
    const unit = opts.kids ? 'ילדים' : period === 'year' ? 'ימים' : 'דקות';
    const grid = [0.5, 1].map((f) => { const y = base - (base - top) * f; return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="admin-chart__grid"/><text x="${W}" y="${y - 6}" class="admin-chart__axis" text-anchor="end">${Math.round(max * f * 10) / 10} ${unit}</text>`; }).join('');
    const marks = bars.map((b, k) => {
      const x = k * step + (step - bw) / 2;
      const h = b.v ? Math.max(4, ((base - top) * b.v) / max) : 3;
      return `<g><title>${b.label || ''} ${b.tip}</title><rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(6, bw / 3).toFixed(1)}" class="${b.v ? 'admin-chart__bar' : 'admin-chart__none'}"/>${b.label ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 8}" class="admin-chart__axis" text-anchor="middle">${b.label}</text>` : ''}</g>`;
    }).join('');
    return `<svg class="admin-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="גרף התמדה – ${PERIODS[period][0]}">${grid}<line x1="0" x2="${W}" y1="${base}" y2="${base}" class="admin-chart__base"/>${marks}</svg>`;
  }

  function statsOf(u, period) {
    const days = activityOf(u);
    const n = PERIODS[period][1];
    const part = days.slice(0, n);
    const played = part.filter((d) => d.min).length;
    const coins = part.reduce((s, d) => s + d.coins, 0);
    const reviews = part.reduce((s, d) => s + d.rev, 0);
    let best = 0, run = 0;
    part.forEach((d) => { run = d.min ? run + 1 : 0; best = Math.max(best, run); });
    const pct = Math.round((played / n) * 100);
    return `
      <div class="admin-stats">
        <div class="admin-stats__head">
          <b class="admin-stats__title">הנתונים של ${u.first}</b>
          <div class="admin-stats__periods" role="tablist" aria-label="תקופה">
            ${Object.entries(PERIODS).map(([k, [name]]) => `<button type="button" role="tab" class="admin__chip${k === period ? ' is-on' : ''}" data-period="${k}" data-id="${u.id}" aria-selected="${k === period}">${name}</button>`).join('')}
          </div>
        </div>
        <div class="admin-stats__tiles">
          ${tile('coins', 'מטבעות שנצברו', coins, 'מטבעות')}
          ${tile('days', 'ימי משחק', played, `מתוך ${n} ימים`)}
          ${tile('persist', 'התמדה', `${pct}%`, 'מהימים בתקופה')}
          ${tile('streak', 'הרצף הארוך', best, 'ימים ברצף')}
          ${tile('reviews', 'חזרות שעשה/תה', reviews, 'חזרות בתקופה')}
        </div>
        <p class="admin-stats__chart-title">גרף התמדה · ${period === 'year' ? 'ימי משחק בכל חודש' : 'דקות משחק בכל יום'}</p>
        ${chartOf(days, period)}
      </div>`;
  }

  /* ---------- "נתוני התמדה": a popup with every child's data, with filters
     (period, and which children) ---------- */
  const sp = document.createElement('div');
  sp.className = 'admin-pop admin-sp';
  sp.setAttribute('role', 'dialog');
  sp.setAttribute('aria-modal', 'true');
  sp.setAttribute('aria-labelledby', 'sp-title');
  sp.hidden = true;
  document.getElementById('admin-pop').after(sp); // inside the stage, like the new-user popup
  let spPeriod = 'week';
  let spWho = 'all';
  const WHO = { all: 'כל הילדים', active: 'פעילים', inactive: 'לא פעילים' };
  function spRender() {
    const n = PERIODS[spPeriod][1];
    const kids = users.map((u, i) => [u, i]).filter(([u]) => spWho === 'all' || (spWho === 'active' ? u.active : !u.active));
    const rowsData = kids.map(([u, i]) => {
      const part = activityOf(u).slice(0, n);
      const played = part.filter((d) => d.min).length;
      return { u, i, played, pct: Math.round((played / n) * 100), coins: part.reduce((s, d) => s + d.coins, 0) };
    }).sort((a, b) => b.pct - a.pct);
    const totalCoins = rowsData.reduce((s, r) => s + r.coins, 0);
    const totalReviews = kids.reduce((s, [u]) => s + activityOf(u).slice(0, n).reduce((t, d) => t + d.rev, 0), 0);
    const avg = rowsData.length ? Math.round(rowsData.reduce((s, r) => s + r.pct, 0) / rowsData.length) : 0;
    const playing = rowsData.filter((r) => r.played).length;
    // how many children played each day (week, month) / the average per day in each month (year)
    const allDays = kids.map(([u]) => activityOf(u));
    const perDay = Array.from({ length: 365 }, (_, d) => ({ min: allDays.filter((a) => a[d].min).length, coins: 0 }));
    const chip = (attr, k, name, on) => `<button type="button" class="admin__chip${on ? ' is-on' : ''}" ${attr}="${k}">${name}</button>`;
    sp.innerHTML = `
      <div class="admin-pop__card admin-sp__card">
        <button class="admin-pop__close" type="button" data-sp-close aria-label="סגירה">✕</button>
        <h2 class="admin-pop__title" id="sp-title">נתוני התמדה</h2>
        <div class="admin-sp__filters">
          <div class="admin-stats__periods" role="tablist" aria-label="תקופה">${Object.entries(PERIODS).map(([k, [name]]) => chip('data-sp-period', k, name, k === spPeriod)).join('')}</div>
          <div class="admin-stats__periods" role="tablist" aria-label="ילדים">${Object.entries(WHO).map(([k, name]) => chip('data-sp-who', k, name, k === spWho)).join('')}</div>
        </div>
        <div class="admin-stats__tiles">
          ${tile('coins', 'מטבעות שנצברו', totalCoins, `כל הילדים · ${PERIODS[spPeriod][0]}`)}
          ${tile('persist', 'התמדה ממוצעת', `${avg}%`, 'מהימים בתקופה')}
          ${tile('kids', 'ילדים ששיחקו', `${playing}`, `מתוך ${rowsData.length}`)}
          ${tile('reviews', 'חזרות', totalReviews, 'כל הילדים')}
          ${podiumOf(rowsData.slice(0, 3))}
        </div>
        <p class="admin-stats__chart-title">${spPeriod === 'year' ? 'כמה ילדים שיחקו · ממוצע ליום בכל חודש' : 'כמה ילדים שיחקו בכל יום'}</p>
        ${chartOf(perDay, spPeriod, { kids: kids.length })}
        <p class="admin-stats__chart-title">התמדה לפי ילד</p>
        <ul class="admin-sp__kids">
          ${rowsData.map((r) => `<li>
            <span class="admin__user">${badgeOf(r.u)}${avatar(r.u, r.i)}<b>${r.u.first} ${r.u.last}</b></span>
            <span class="admin-sp__bar"><i style="width:${r.pct}%"></i></span>
            <b class="admin-sp__pct">${r.pct}%</b>
            <span class="admin-sp__meta">${r.played} ימים · <img src="assets/coin.webp" alt="">${r.coins}</span>
          </li>`).join('') || '<li class="admin-sp__none">אין ילדים בסינון הזה</li>'}
        </ul>
      </div>`;
  }
  // the three most persistent children on a podium: 2nd, 1st, 3rd
  function podiumOf(top) {
    const step = (r, place) => (r ? `<div class="admin-podium__place admin-podium__place--${place}">
        <span class="admin-podium__who">${avatar(r.u, r.i)}<b>${r.u.first}</b><small>${r.pct}%</small></span>
        <span class="admin-podium__step">${place === 1 ? '<img src="assets/trophy.svg" alt="">' : ''}<em>${place}</em></span>
      </div>` : '<div class="admin-podium__place"></div>');
    return `<div class="admin-stats__tile admin-podium" aria-label="המתמידים ביותר"><span class="admin-podium__title">המתמידים ביותר</span><div class="admin-podium__row">${step(top[1], 2)}${step(top[0], 1)}${step(top[2], 3)}</div></div>`;
  }
  const spOpen = () => { spRender(); sp.hidden = false; sp.querySelector('[data-sp-close]').focus(); };
  const spClose = () => { sp.hidden = true; if (location.hash === '#stats') history.replaceState(null, '', location.pathname); };
  sp.addEventListener('click', (e) => {
    if (e.target === sp || e.target.closest('[data-sp-close]')) { spClose(); return; }
    const p = e.target.closest('[data-sp-period]');
    if (p) { spPeriod = p.dataset.spPeriod; spRender(); return; }
    const w = e.target.closest('[data-sp-who]');
    if (w) { spWho = w.dataset.spWho; spRender(); }
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sp.hidden) spClose(); });
  document.getElementById('admin-stats-open').addEventListener('click', spOpen);
  // the menu's "נתוני התמדה" (admin.html#stats) opens it
  const fromHash = () => { if (location.hash === '#stats') spOpen(); };
  window.addEventListener('hashchange', fromHash);
  setTimeout(fromHash, 0);

  /* a badge before the child's picture, from the last 30 days: a trophy for the
     outstanding (played 70%+ of the days), a medal for those who keep trying (40%+) */
  const MEDAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l2 6H9z" fill="#e33563"/><path d="M13 2h4l-2 6h-4z" fill="#2f7cf2"/><circle cx="12" cy="15" r="6.5" fill="#f4b73b" stroke="#d08a00" stroke-width="1.2"/><path d="M12 11.6l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="#fff6d6"/></svg>';
  function badgeOf(u) {
    const part = activityOf(u).slice(0, 30);
    const pct = (part.filter((d) => d.min).length / 30) * 100;
    if (pct >= 70) return '<span class="admin__badge admin__badge--star" title="מצטיין/ת – שיחק/ה ברוב הימים בחודש האחרון"><img src="assets/trophy.svg" alt="מצטיין/ת"></span>';
    if (pct >= 40) return `<span class="admin__badge admin__badge--medal" title="מתמיד/ה – משתדל/ת לשחק באופן קבוע">${MEDAL}<span class="sr-only">מתמיד/ה</span></span>`;
    return '<span class="admin__badge"></span>';
  }

  function render() {
    document.getElementById('n-all').textContent = users.length;
    document.getElementById('n-active').textContent = users.filter((u) => u.active).length;
    document.getElementById('n-inactive').textContent = users.filter((u) => !u.active).length;
    document.getElementById('n-expiring').textContent = users.filter(expiring).length;
    const q = search.value.trim().toLowerCase();
    const list = users
      .map((u, i) => [u, i])
      .filter(([u]) => filter === 'all' || (filter === 'active' && u.active) || (filter === 'inactive' && !u.active) || (filter === 'expiring' && expiring(u)))
      .filter(([u]) => !q || [u.first, u.last, u.user, u.phone, u.email].join(' ').toLowerCase().includes(q));
    empty.hidden = list.length > 0;
    rows.innerHTML = list.map(([u, i]) => {
      const left = daysLeft(u);
      const endNote = left < 0 ? '<small class="is-late">פג</small>' : left <= 30 ? `<small class="is-soon">עוד ${left} ימים</small>` : '';
      return `<tr class="${u.active ? '' : 'is-off'}${openStats[u.id] ? ' is-open' : ''}" data-row="${u.id}">
        <td><span class="admin__user">${badgeOf(u)}${avatar(u, i)}<b>${u.first} ${u.last}</b></span></td>
        <td dir="ltr">${u.user}</td>
        <td dir="ltr">${u.phone || '–'}</td>
        <td dir="ltr">${u.email || '–'}</td>
        <td>${fmt(u.start)}</td>
        <td>${fmt(u.end)} ${endNote}</td>
        <td><button class="admin__stats-btn${openStats[u.id] ? ' is-open' : ''}" type="button" data-stats="${u.id}" aria-expanded="${!!openStats[u.id]}" aria-label="הנתונים של ${u.first} ${u.last}">${CHART}</button></td>
        <td><label class="admin__toggle"><input type="checkbox" data-i="${i}" ${u.active ? 'checked' : ''} aria-label="${u.first} ${u.last} פעיל"><span></span></label></td>
      </tr>${openStats[u.id] ? `<tr class="admin__stats-row"><td colspan="8"><div class="admin-acc" data-acc="${u.id}"><div class="admin-acc__in">${statsOf(u, openStats[u.id])}</div></div></td></tr>` : ''}`;
    }).join('');
  }

  // a tap anywhere on the row (or its data button) opens / closes the child's data
  // under it – not on the active toggle; the period chips switch it
  rows.addEventListener('click', (e) => {
    const row = !e.target.closest('.admin__toggle') && e.target.closest('[data-row]');
    if (row) {
      const id = row.dataset.row;
      // the data slides open / shut (.admin-acc)
      const acc = rows.querySelector(`.admin-acc[data-acc="${id}"]`);
      if (openStats[id]) {
        if (acc) acc.classList.add('is-shut');
        setTimeout(() => { delete openStats[id]; render(); }, acc ? 320 : 0);
      } else {
        openStats[id] = 'week';
        render();
        const opened = rows.querySelector(`.admin-acc[data-acc="${id}"]`);
        if (opened) { opened.classList.add('is-shut'); void opened.offsetWidth; opened.classList.remove('is-shut'); }
      }
      return;
    }
    const chip = e.target.closest('[data-period]');
    if (chip) { openStats[chip.dataset.id] = chip.dataset.period; render(); }
  });
  rows.addEventListener('change', (e) => {
    const box = e.target.closest('[data-i]');
    if (!box) return;
    users[Number(box.dataset.i)].active = box.checked;
    save();
    render();
  });
  document.querySelector('.admin__filters').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    filter = chip.dataset.filter;
    document.querySelectorAll('.admin__chip').forEach((c) => c.classList.toggle('is-on', c === chip));
    render();
  });
  search.addEventListener('input', render);

  /* New user */
  const pop = document.getElementById('admin-pop');
  const form = document.getElementById('admin-form');
  // the photo: shrunk to a 160px square (JPEG) so it stays light in storage
  const photoIn = document.getElementById('u-photo');
  const photoImg = document.getElementById('u-photo-img');
  const photoRemove = document.getElementById('u-photo-remove');
  const photoBtn = document.querySelector('.admin-pop__photo-btn');
  let photo = '';
  const setPhoto = (src) => {
    photo = src;
    photoImg.hidden = !src;
    if (src) photoImg.src = src; else photoImg.removeAttribute('src');
    photoRemove.hidden = !src;
    photoBtn.textContent = src ? 'החלפת תמונה' : 'הוספת תמונה';
  };
  photoIn.addEventListener('change', () => {
    const file = photoIn.files && photoIn.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 160;
      const side = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = S; c.height = S;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
      setPhoto(c.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(url);
    };
    img.src = url;
    photoIn.value = '';
  });
  photoRemove.addEventListener('click', () => setPhoto(''));

  const open = () => {
    form.reset();
    setPhoto('');
    document.getElementById('u-start').value = iso(now);
    document.getElementById('u-end').value = iso(now + 365 * DAY);
    pop.hidden = false;
    document.getElementById('u-first').focus();
  };
  const close = () => { pop.hidden = true; };
  document.getElementById('admin-add').addEventListener('click', open);
  document.getElementById('admin-close').addEventListener('click', close);
  pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) close(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (id) => document.getElementById(id).value.trim();
    users.unshift({
      id: `${v('u-user')}-${Date.now()}`, first: v('u-first'), last: v('u-last'), user: v('u-user'),
      phone: v('u-phone'), email: v('u-email'), start: v('u-start'), end: v('u-end'),
      active: document.getElementById('u-active').checked, photo,
    });
    save();
    close();
    filter = 'all';
    document.querySelectorAll('.admin__chip').forEach((c) => c.classList.toggle('is-on', c.dataset.filter === 'all'));
    search.value = '';
    render();
  });

  render();
})();
