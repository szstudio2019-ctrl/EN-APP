// Side menu, shared by every page (map and island pages). Needs islands.js.
// - "ראשי" and the logo go to the home page (plain links in the markup)
// - Game worlds / reviews lists: an island with its own page opens that page;
//   any other island moves the map to it (or opens the map at it from
//   another page, via index.html#island-N)
(function () {
  const ISLANDS = window.ISLANDS || [];
  const viewport = document.querySelector('.viewport');
  const sidebar = document.getElementById('sidebar');
  const openBtn = document.getElementById('menu-open');
  let open = false;

  window.SiteMenu = { isOpen: () => open, sync: () => {} };
  if (!sidebar || !openBtn) return;

  function setMenu(state) {
    open = state;
    viewport.classList.toggle('menu-open', state);
    sidebar.setAttribute('aria-hidden', String(!state));
    openBtn.setAttribute('aria-expanded', String(state));
    if (state) sidebar.querySelector('.sidebar__close').focus();
    else openBtn.focus();
  }
  openBtn.addEventListener('click', () => setMenu(true));
  document.getElementById('menu-close').addEventListener('click', () => setMenu(false));
  document.getElementById('sidebar-backdrop').addEventListener('click', () => setMenu(false));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setMenu(false); });

  // Stagger the cascade-in of the menu rows
  sidebar.querySelectorAll('.sb-item').forEach((el, i) => el.style.setProperty('--i', i));

  // Collapsible groups
  sidebar.querySelectorAll('.sb-link--group').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.sb-group');
      const isOpen = !group.classList.contains('is-open');
      group.classList.toggle('is-open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // Island lists
  const onMap = typeof window.journeyGoTo === 'function' || !!document.getElementById('journey');
  const here = location.pathname.split('/').pop();
  const links = [];
  const fillList = (containerId, filter, label) => {
    const box = document.getElementById(containerId);
    if (!box) return;
    const inner = document.createElement('div');
    inner.className = 'sb-sub__inner';
    let n = 0;
    ISLANDS.forEach((island, i) => {
      if (!filter(island)) return;
      n += 1;
      const link = document.createElement('a');
      link.className = 'sb-sublink';
      link.href = island.page || `index.html#island-${i + 1}`;
      const status = island.status === 'done' ? '<span class="sb-sublink__status sb-sublink__status--done">✓ הושלם</span>'
        : island.status === 'progress' ? `<span class="sb-sublink__status">${island.progress || 0}%</span>`
        : '<span class="sb-sublink__status" aria-label="נעול">🔒</span>';
      link.innerHTML = `<span>${label(island, n)}</span>${status}`;
      if (!island.page && onMap) {
        // on the map: fly to the island instead of reloading the page
        link.addEventListener('click', (e) => {
          e.preventDefault();
          setMenu(false);
          setTimeout(() => window.journeyGoTo && window.journeyGoTo(i), 400);
        });
      }
      inner.appendChild(link);
      links.push([link, i]);
    });
    box.appendChild(inner);
  };
  const isReview = (island) => island.name === 'אי החזרות';
  const short = (island) => island.name.replace(/^אי (ה)?/, '');
  fillList('sb-worlds', (island) => !isReview(island),
    (island) => (island.lessons ? `${short(island)} (שיעור ${island.lessons})` : short(island)));
  fillList('sb-reviews', isReview, (island, n) => `חזרה ${n}`);

  // Highlight the island being viewed (on an island page: that page's island)
  const sync = (current) => links.forEach(([link, i]) => link.classList.toggle('is-current', i === current));
  window.SiteMenu.sync = sync;
  const pageIsland = ISLANDS.findIndex((island) => island.page === here);
  if (pageIsland >= 0) sync(pageIsland);
})();
