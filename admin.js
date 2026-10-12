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
      return `<tr class="${u.active ? '' : 'is-off'}">
        <td><span class="admin__user">${avatar(u, i)}<b>${u.first} ${u.last}</b></span></td>
        <td dir="ltr">${u.user}</td>
        <td dir="ltr">${u.phone || '–'}</td>
        <td dir="ltr">${u.email || '–'}</td>
        <td>${fmt(u.start)}</td>
        <td>${fmt(u.end)} ${endNote}</td>
        <td><label class="admin__toggle"><input type="checkbox" data-i="${i}" ${u.active ? 'checked' : ''} aria-label="${u.first} ${u.last} פעיל"><span></span></label></td>
      </tr>`;
    }).join('');
  }

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
  const open = () => {
    form.reset();
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
      active: document.getElementById('u-active').checked, photo: '',
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
