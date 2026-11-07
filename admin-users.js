// Admin – users: filter (all / active / inactive / expiring soon, with counts),
// search, the table, the active switch, and add / edit in a dialog.
(function () {
  const { Users, UI, iso, DAY, now } = window.Admin;
  const { activityOf } = window.ChildStats;
  const users = Users.all();
  const rows = document.getElementById('u-rows');
  const empty = document.getElementById('u-empty');
  const search = document.getElementById('u-search');
  const filterBox = document.getElementById('u-filter');
  let filter = 'all';
  let grades = [];
  const inGrade = (u) => !grades.length || grades.includes(Users.gradeOf(u));
  const gradeBox = document.getElementById('u-grade');
  gradeBox.innerHTML = UI.multiHtml('כיתות', 'כל הכיתות', Users.GRADES.map((g) => [g, `כיתה ${g}`]));
  UI.wireMulti(gradeBox, (p) => { grades = p; render(); });
  const gradeOptions = (on) => Users.GRADES.map((g) => `<option value="${g}"${g === on ? ' selected' : ''}>כיתה ${g}</option>`).join('');
  const fmt = (d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });

  // the trophy: played on most days of the last 30; the medal: keeps trying
  const MEDAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h4l2 6H9z" fill="#e33563"/><path d="M13 2h4l-2 6h-4z" fill="#2f7cf2"/><circle cx="12" cy="15" r="6.5" fill="#f4b73b" stroke="#d08a00" stroke-width="1.2"/><path d="M12 11.6l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="#fff6d6"/></svg>';
  function badgeOf(u) {
    const pct = (activityOf(u).slice(0, 30).filter((d) => d.min).length / 30) * 100;
    if (pct >= 70) return '<span class="a-badge" title="מצטיין/ת"><img src="assets/trophy.svg" alt="מצטיין/ת"></span>';
    if (pct >= 40) return `<span class="a-badge" title="מתמיד/ה">${MEDAL}<span class="sr-only">מתמיד/ה</span></span>`;
    return '<span class="a-badge" aria-hidden="true"></span>';
  }

  function drawFilter() {
    const users = Users.all().filter(inGrade);
    filterBox.innerHTML = UI.segHtml('סינון משתמשים', [
      ['all', 'הכל', users.length],
      ['active', 'פעילים', users.filter((u) => u.active).length],
      ['inactive', 'לא פעילים', users.filter((u) => !u.active).length],
      ['expiring', 'המנוי פג בקרוב', users.filter(Users.expiring).length],
    ], filter);
  }
  UI.wireSeg(filterBox, (k) => { filter = k; render(); });

  function render() {
    drawFilter();
    const q = search.value.trim().toLowerCase();
    const list = users.map((u, i) => [u, i])
      .filter(([u]) => inGrade(u))
      .filter(([u]) => filter === 'all' || (filter === 'active' && u.active) || (filter === 'inactive' && !u.active) || (filter === 'expiring' && Users.expiring(u)))
      .filter(([u]) => !q || [u.first, u.last, u.user, u.phone, u.email].join(' ').toLowerCase().includes(q));
    empty.hidden = list.length > 0;
    rows.innerHTML = list.map(([u, i]) => {
      const left = Users.daysLeft(u);
      const note = left < 0 ? ' <span class="a-late">(פג)</span>' : left <= 30 ? ` <span class="a-soon">(עוד ${left} ימים)</span>` : '';
      const name = UI.esc(`${u.first} ${u.last}`);
      return `<tr class="${u.active ? '' : 'is-off'}${i === inline || i === dataOpen ? ' is-open' : ''}">
        <td><span class="a-user">${badgeOf(u)}${Users.avatar(u, i)}<span>${name}</span></span></td>
        <td>${Users.gradeOf(u)}</td>
        <td dir="ltr" style="text-align:right">${UI.esc(u.user)}</td>
        <td dir="ltr" style="text-align:right">${UI.esc(u.phone) || '–'}</td>
        <td dir="ltr" style="text-align:right">${UI.esc(u.email) || '–'}</td>
        <td>${fmt(u.start)}</td>
        <td>${fmt(u.end)}${note}</td>
        <td><button class="u-round" type="button" data-data="${i}" aria-expanded="${i === dataOpen}" aria-label="הנתונים של ${name}" title="נתונים">${UI.ICON.chart}</button></td>
        <td>${UI.switchHtml(`act-${i}`, u.active, `${u.first} ${u.last} פעיל`)}</td>
        <td><button class="u-round" type="button" data-edit="${i}" aria-expanded="${i === inline}" aria-label="עריכת ${name}" title="עריכה">${UI.ICON.edit}</button></td>
      </tr>${i === inline ? editorRow(u, i) : i === dataOpen ? dataPanel(u) : ''}`;
    }).join('');
  }

  rows.addEventListener('change', (e) => {
    const box = e.target.closest('input[id^="act-"]');
    if (!box) return;
    users[Number(box.id.slice(4))].active = box.checked;
    Users.save();
    render();
  });
  search.addEventListener('input', render);

  /* the child's data, opened under the row */
  let dataOpen = -1;
  let dataPeriod = 'week';
  const { PERIODS } = window.ChildStats;
  const D_ICON = {
    coins: '<img src="assets/coin.webp" alt="">',
    days: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 14.5l2 2 4-4"/></svg>',
    persist: '<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/></svg>',
    streak: '<svg viewBox="0 0 24 24"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.6 2.3 3C11 9 11.5 6 12 3z"/></svg>',
    reviews: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>',
  };
  const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const MONTHS_HE = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  const niceMax = (v) => { const m = Math.max(10, v); const p = 10 ** Math.floor(Math.log10(m)); const f = m / p; return (f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  function dataPanel(u) {
    const n = PERIODS[dataPeriod][1];
    const act = activityOf(u);
    const part = act.slice(0, n);
    const played = part.filter((d) => d.min).length;
    let best = 0, run = 0;
    part.slice().reverse().forEach((d) => { run = d.min ? run + 1 : 0; best = Math.max(best, run); });
    const tile = (k, label, value, sub) => `<div class="u-data__tile"><span class="st-tile__icon u-data__icon--${k}" aria-hidden="true">${D_ICON[k]}</span><div><p class="st-tile__label">${label}</p><p class="st-tile__value">${value}</p><p class="st-tile__sub">${sub}</p></div></div>`;
    // minutes per day (week, month) or per month (year), oldest first
    const today = new Date();
    const bars = dataPeriod === 'year'
      ? Array.from({ length: 12 }, (_, k) => { const m = 11 - k; return [MONTHS_HE[(today.getMonth() - m + 12) % 12], act.slice(m * 30, m * 30 + 30).reduce((s, d) => s + d.min, 0)]; })
      : Array.from({ length: n }, (_, k) => { const d = n - 1 - k; const date = new Date(today.getTime() - d * 86400000); return [dataPeriod === 'week' ? DAYS_HE[date.getDay()] : String(date.getDate()), act[d].min]; });
    const max = niceMax(Math.max(0, ...bars.map((b) => b[1])));
    const W = 1000, H = 200, top = 12, bottom = 28, axis = 70, plotW = W - axis, step = plotW / bars.length, bw = Math.min(52, step * 0.56);
    const y = (v) => H - bottom - (v / max) * (H - top - bottom);
    const grid = [0, max / 2, max].map((t) => `<line x1="0" x2="${plotW}" y1="${y(t)}" y2="${y(t)}" stroke="#E6E4F2" ${t ? 'stroke-dasharray="4 4"' : ''}/>${t ? `<text x="${W - 4}" y="${y(t) + 4}" text-anchor="start" font-size="13" font-weight="600" fill="#5B5780">${t} דק׳</text>` : ''}`).join('');
    const cols = bars.map(([label, v], k) => { const x = plotW - step * (k + 0.5); return `${v ? `<rect x="${x - bw / 2}" y="${y(v)}" width="${bw}" height="${H - bottom - y(v)}" rx="4" fill="#E33563"><title>${label}: ${v} דק׳</title></rect>` : `<rect x="${x - bw / 2}" y="${H - bottom - 3}" width="${bw}" height="3" rx="1.5" fill="#E6E4F2"/>`}<text x="${x}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#5B5780">${label}</text>`; }).join('');
    return `<tr class="u-panel-row"><td colspan="10"><div class="u-data">
        <div class="u-data__head"><h3>הנתונים של ${UI.esc(u.first)}</h3>${UI.segHtml('תקופה', Object.entries(PERIODS).map(([k, [nm]]) => [k, nm]), dataPeriod)}</div>
        <div class="u-data__tiles">
          ${tile('coins', 'מטבעות שנצברו', part.reduce((s, d) => s + d.coins, 0), 'מטבעות')}
          ${tile('days', 'ימי משחק', played, `מתוך ${n} ימים`)}
          ${tile('persist', 'התמדה', `${Math.round((played / n) * 100)}%`, 'מהימים בתקופה')}
          ${tile('streak', 'הרצף הארוך', best, 'ימים ברצף')}
          ${tile('reviews', 'חזרות שעשה/תה', part.reduce((s, d) => s + d.rev, 0), 'חזרות בתקופה')}
        </div>
        <p class="u-data__chart-title">גרף התמדה · דקות משחק ${dataPeriod === 'year' ? 'בכל חודש' : 'בכל יום'}</p>
        <div class="u-data__chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="דקות משחק: ${bars.map(([l, v]) => `${l} ${v}`).join(', ')}">${grid}${cols}</svg></div>
      </div></td></tr>`;
  }
  rows.addEventListener('click', (e) => {
    const d = e.target.closest('[data-data]');
    if (d) {
      const i = Number(d.dataset.data);
      dataOpen = dataOpen === i ? -1 : i;
      inline = -1;
      dataPeriod = 'week';
      render();
      return;
    }
    const p = e.target.closest('.u-data [data-seg]');
    if (p) { dataPeriod = p.dataset.seg; render(); }
  });

  /* edit in place: the row opens a form right under it */
  let inline = -1; // the user being edited in the table
  let inlinePhoto = '';
  const editorRow = (u, i) => `<tr class="u-editor-row"><td colspan="10">
      <form class="u-editor" id="e-form" novalidate>
        <div class="u-editor__photo">
          <label class="u-editor__pic" for="e-photo" aria-label="בחירת תמונה">${inlinePhoto ? `<img src="${inlinePhoto}" alt="">` : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'}</label>
          <div>
            <label class="u-editor__link" for="e-photo">${inlinePhoto ? 'החלפת תמונה' : 'הוספת תמונה'}</label>
            ${inlinePhoto ? '<button type="button" class="u-editor__link u-editor__link--muted" data-e-remove>הסרה</button>' : ''}
            <small class="a-help" style="display:block">לא חובה · JPG או PNG</small>
          </div>
          <input id="e-photo" type="file" accept="image/*" class="sr-only">
        </div>
        <div class="u-editor__grid">
          <label class="a-field"><span>שם פרטי</span><input id="e-first" value="${UI.esc(u.first)}" required></label>
          <label class="a-field"><span>שם משפחה</span><input id="e-last" value="${UI.esc(u.last)}"></label>
          <label class="a-field"><span>שם משתמש</span><input id="e-user" dir="ltr" value="${UI.esc(u.user)}" required></label>
          <label class="a-field"><span>כיתה</span><select id="e-grade">${gradeOptions(Users.gradeOf(u))}</select></label>
          <label class="a-field"><span>סיסמה חדשה</span><input id="e-pass" type="password" autocomplete="new-password" placeholder="ריק = בלי שינוי"></label>
          <label class="a-field"><span>אימייל</span><input id="e-email" type="email" dir="ltr" value="${UI.esc(u.email)}"></label>
          <label class="a-field"><span>טלפון</span><input id="e-phone" type="tel" dir="ltr" value="${UI.esc(u.phone)}"></label>
          <label class="a-field"><span>המנוי פג בתאריך</span><input id="e-end" type="date" value="${UI.esc(u.end)}" required></label>
        </div>
        <div class="u-editor__foot">
          <button class="a-btn a-btn--primary" type="submit">שמירה</button>
          <button class="u-editor__link u-editor__link--muted" type="button" data-e-cancel>ביטול</button>
        </div>
      </form>
    </td></tr>`;
  function openInline(i) {
    inline = inline === i ? -1 : i;
    dataOpen = -1;
    inlinePhoto = inline >= 0 ? users[inline].photo || '' : '';
    render();
    if (inline >= 0) { const f = document.getElementById('e-first'); if (f) f.focus(); }
  }
  rows.addEventListener('click', (e) => {
    const b = e.target.closest('[data-edit]');
    if (b) { openInline(Number(b.dataset.edit)); return; }
    if (e.target.closest('[data-e-cancel]')) { const i = inline; inline = -1; render(); const back = rows.querySelector(`[data-edit="${i}"]`); if (back) back.focus(); return; }
    if (e.target.closest('[data-e-remove]')) { inlinePhoto = ''; keepFields(() => render()); }
  });
  // redraw without losing what was typed (after a photo change)
  function keepFields(fn) {
    const ids = ['e-first', 'e-last', 'e-user', 'e-grade', 'e-email', 'e-phone', 'e-end'];
    const vals = Object.fromEntries(ids.map((id) => [id, (document.getElementById(id) || {}).value]));
    fn();
    ids.forEach((id) => { const el = document.getElementById(id); if (el && vals[id] != null) el.value = vals[id]; });
  }
  rows.addEventListener('change', (e) => {
    if (e.target.id !== 'e-photo') return;
    const file = e.target.files && e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 160, side = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = S; c.height = S;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
      inlinePhoto = c.toDataURL('image/jpeg', 0.85);
      URL.revokeObjectURL(url);
      keepFields(() => render());
    };
    img.src = url;
  });
  rows.addEventListener('submit', (e) => {
    if (e.target.id !== 'e-form') return;
    e.preventDefault();
    const v = (id) => document.getElementById(id).value.trim();
    if (!v('e-first') || !v('e-user') || !v('e-end')) { (['e-first', 'e-user', 'e-end'].map((id) => document.getElementById(id)).find((el) => !el.value.trim()) || {}).focus?.(); return; }
    Object.assign(users[inline], { first: v('e-first'), last: v('e-last'), user: v('e-user'), grade: v('e-grade'), email: v('e-email'), phone: v('e-phone'), end: v('e-end'), photo: inlinePhoto });
    // the new password is not kept in this demo (no passwords in the browser's storage)
    Users.save();
    const i = inline;
    inline = -1;
    render();
    const back = rows.querySelector(`[data-edit="${i}"]`);
    if (back) back.focus();
  });


  /* add / edit */
  const dialog = document.getElementById('u-dialog');
  const form = document.getElementById('u-form');
  const $ = (id) => document.getElementById(id);
  let editing = -1;
  let opener = null;

  // the photo: shrunk to a 160px square (JPEG) so it stays light in storage
  let photo = '';
  const setPhoto = (src) => {
    photo = src || '';
    $('f-photo-img').hidden = !photo;
    if (photo) $('f-photo-img').src = photo; else $('f-photo-img').removeAttribute('src');
    $('f-photo-remove').hidden = !photo;
    $('f-photo-pick').textContent = photo ? 'החלפת תמונה' : 'הוספת תמונה';
  };
  $('f-photo').addEventListener('change', () => {
    const file = $('f-photo').files && $('f-photo').files[0];
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
    $('f-photo').value = '';
  });
  $('f-photo-remove').addEventListener('click', () => setPhoto(''));

  function open(i) {
    editing = i;
    opener = document.activeElement;
    form.reset();
    const u = users[i];
    $('u-dialog-title').textContent = u ? 'עריכת משתמש' : 'משתמש חדש';
    $('f-submit').textContent = u ? 'שמירה' : 'הוספה';
    $('f-first').value = u ? u.first : '';
    $('f-last').value = u ? u.last : '';
    $('f-user').value = u ? u.user : '';
    $('f-grade').innerHTML = gradeOptions(u ? Users.gradeOf(u) : Users.GRADES[0]);
    $('f-phone').value = u ? u.phone : '';
    $('f-email').value = u ? u.email : '';
    $('f-start').value = u ? u.start : iso(now);
    $('f-end').value = u ? u.end : iso(now + 365 * DAY);
    $('f-active').checked = u ? u.active : true;
    setPhoto(u ? u.photo : '');
    dialog.classList.remove('is-closing');
    dialog.hidden = false;
    $('f-first').focus();
  }
  // a gentle close: fade out, then hide
  let closing = null;
  function close() {
    if (dialog.hidden || closing) return;
    dialog.classList.add('is-closing');
    const done = () => { clearTimeout(closing); closing = null; dialog.hidden = true; dialog.classList.remove('is-closing'); if (opener) opener.focus(); };
    closing = setTimeout(done, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200);
  }
  $('u-add').addEventListener('click', () => open(-1));
  $('u-close').addEventListener('click', close);
  $('f-cancel').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dialog.hidden) close(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (id) => $(id).value.trim();
    const data = { first: v('f-first'), last: v('f-last'), user: v('f-user'), grade: v('f-grade'), phone: v('f-phone'), email: v('f-email'), start: v('f-start'), end: v('f-end'), active: $('f-active').checked, photo };
    if (editing >= 0) Object.assign(users[editing], data);
    else users.unshift({ id: `${data.user}-${Date.now()}`, ...data });
    Users.save();
    close();
    if (editing < 0) { filter = 'all'; search.value = ''; }
    render();
  });

  render();
})();
