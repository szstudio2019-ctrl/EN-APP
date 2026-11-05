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
      .filter(([u]) => filter === 'all' || (filter === 'active' && u.active) || (filter === 'inactive' && !u.active) || (filter === 'expiring' && Users.expiring(u)))
      .filter(([u]) => !q || [u.first, u.last, u.user, u.phone, u.email].join(' ').toLowerCase().includes(q));
    empty.hidden = list.length > 0;
    rows.innerHTML = list.map(([u, i]) => {
      const left = Users.daysLeft(u);
      const note = left < 0 ? ' <span class="a-late">(פג)</span>' : left <= 30 ? ` <span class="a-soon">(עוד ${left} ימים)</span>` : '';
      const name = UI.esc(`${u.first} ${u.last}`);
      return `<tr class="${u.active ? '' : 'is-off'}">
        <td><span class="a-user">${badgeOf(u)}${Users.avatar(u, i)}<span>${name}</span></span></td>
        <td dir="ltr" style="text-align:right">${UI.esc(u.user)}</td>
        <td dir="ltr" style="text-align:right">${UI.esc(u.phone) || '–'}</td>
        <td dir="ltr" style="text-align:right">${UI.esc(u.email) || '–'}</td>
        <td>${fmt(u.start)}</td>
        <td>${fmt(u.end)}${note}</td>
        <td>${UI.switchHtml(`act-${i}`, u.active, `${u.first} ${u.last} פעיל`)}</td>
        <td><span style="display:inline-flex;gap:4px">
          <a class="a-icon-btn" href="admin-stats.html?user=${encodeURIComponent(u.id)}" aria-label="נתוני ההתמדה של ${name}" title="נתונים">${UI.ICON.chart}</a>
          <button class="a-icon-btn" type="button" data-edit="${i}" aria-label="עריכת ${name}" title="עריכה">${UI.ICON.edit}</button>
        </span></td>
      </tr>`;
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
  rows.addEventListener('click', (e) => { const b = e.target.closest('[data-edit]'); if (b) open(Number(b.dataset.edit)); });
  $('u-close').addEventListener('click', close);
  $('f-cancel').addEventListener('click', close);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dialog.hidden) close(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (id) => $(id).value.trim();
    const data = { first: v('f-first'), last: v('f-last'), user: v('f-user'), phone: v('f-phone'), email: v('f-email'), start: v('f-start'), end: v('f-end'), active: $('f-active').checked, photo };
    if (editing >= 0) Object.assign(users[editing], data);
    else users.unshift({ id: `${data.user}-${Date.now()}`, ...data });
    Users.save();
    close();
    if (editing < 0) { filter = 'all'; search.value = ''; }
    render();
  });

  render();
})();
