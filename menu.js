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

  window.SiteMenu = { isOpen: () => open, sync: () => {}, openReviews: () => {} };
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

  /* Popup with every review island (from the menu's "חזרות" and the map's
     finale). On the map a review moves the map to it; elsewhere it opens the
     map at that island. */
  const pop = document.createElement('div');
  pop.className = 'reviews-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-modal', 'true');
  pop.setAttribute('aria-label', 'כל החזרות');
  let reviewNo = 0;
  const cards = ISLANDS.map((island, i) => {
    if (!island.review) return '';
    reviewNo += 1;
    return `<button class="reviews-pop__row" type="button" data-go="${i}">
        <img class="reviews-pop__img" src="assets/${island.img}.webp" alt="">
        <span class="reviews-pop__no">${reviewNo}</span>
        <span class="reviews-pop__name">חזרה מספר ${reviewNo}</span>
        <span class="reviews-pop__range">שיעורים <bdi>${island.review}</bdi></span>
      </button>`;
  }).join('');
  pop.innerHTML = `
    <div class="reviews-pop__card">
      <button class="reviews-pop__close" type="button" aria-label="סגירה">✕</button>
      <h2 class="reviews-pop__title">כל החזרות</h2>
      <div class="reviews-pop__list">${cards}</div>
    </div>`;
  document.getElementById('stage').appendChild(pop);
  const setPop = (state) => {
    pop.classList.toggle('is-open', state);
    if (state) pop.querySelector('.reviews-pop__close').focus();
  };
  window.SiteMenu.openReviews = () => setPop(true);
  pop.addEventListener('click', (e) => {
    const card = e.target.closest('[data-go]');
    if (card) {
      const i = Number(card.dataset.go);
      setPop(false);
      if (window.journeyGoTo) setTimeout(() => window.journeyGoTo(i), 250);
      else location.href = `index.html#island-${i + 1}`;
      return;
    }
    if (e.target === pop || e.target.closest('.reviews-pop__close')) setPop(false);
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop.classList.contains('is-open')) setPop(false); });

  // Collapsible groups. "חזרות" itself opens the reviews popup; its arrow
  // still opens and closes the list.
  sidebar.querySelectorAll('.sb-link--group').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (btn.nextElementSibling && btn.nextElementSibling.id === 'sb-reviews' && !e.target.closest('.sb-chevron')) {
        setMenu(false);
        setTimeout(() => setPop(true), 300);
        return;
      }
      const group = btn.closest('.sb-group');
      const isOpen = !group.classList.contains('is-open');
      group.classList.toggle('is-open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  // "הגרלת המשפטים": closes the menu and opens the trophy's sentence bubble
  const sentenceLink = document.getElementById('sb-sentence');
  if (sentenceLink) {
    sentenceLink.addEventListener('click', (e) => {
      e.preventDefault();
      setMenu(false);
      const trophy = document.querySelector('.trophy');
      if (trophy) setTimeout(() => { if (trophy.getAttribute('aria-expanded') !== 'true') trophy.click(); }, 350);
    });
  }

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
        : `<span class="sb-sublink__status sb-sublink__status--locked" aria-label="נעול">${LOCK}</span>`;
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
  const isReview = (island) => !!island.review;
  const short = (island) => island.name.replace(/^אי (ה)?/, '');
  fillList('sb-worlds', (island) => !isReview(island) && !island.finale,
    (island) => (island.lessons ? `${short(island)} (שיעור ${island.lessons})` : short(island)));
  fillList('sb-reviews', isReview, (island, n) => `חזרה ${n} (שיעורים ${island.review})`);

  // Highlight the island being viewed (on an island page: that page's island)
  const sync = (current) => links.forEach(([link, i]) => link.classList.toggle('is-current', i === current));
  window.SiteMenu.sync = sync;
  const pageIsland = ISLANDS.findIndex((island) => island.page === here);
  if (pageIsland >= 0) sync(pageIsland);
})();
