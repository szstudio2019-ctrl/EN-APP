// Islands drawer, shared by every page: a half-circle arrow tab at the bottom
// centre; hovering or clicking the bottom strip (or the tab) slides up a row of
// every island, in ISLANDS order. Needs islands.js. On the map (script.js) a
// click flies straight to the island; on other pages it opens that island.
(function () {
  const ISLANDS = window.ISLANDS || [];
  const lockSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  window.SiteDrawer = { sync: () => {} };
  if (!document.getElementById('drawer')) return;
  // The island being viewed: on the map script.js keeps it in sync; on an
  // island page it is that page's island
  const here = location.pathname.split('/').pop();
  let current = Math.max(0, ISLANDS.findIndex((island) => island.page && island.page === here));

  const drawer = document.getElementById('drawer');
  const drawerList = document.getElementById('drawer-list');
  const drawerHandle = document.getElementById('drawer-handle');
  const drawerZone = document.getElementById('drawer-zone');
  const drawerLine = drawerList.querySelector('.drawer__line');
  const drawerFill = drawerList.querySelector('.drawer__fill');
  const doneIcon = '<img class="drawer__done" src="assets/icons/done-check.svg" alt="">';
  const smallLock = `<span class="drawer__lock">${lockSvg}</span>`;
  const drawerItems = ISLANDS.map((island, i) => {
    const li = document.createElement('li');
    li.className = 'drawer__item';
    if (island.review) li.classList.add('drawer__item--review');
    if (island.finale) li.classList.add('drawer__item--finale');
    li.style.setProperty('--i', i);
    const status = island.status || 'locked';
    li.dataset.state = status;
    const pic = island.finale ? 'assets/trophy.svg'
        : island.img ? `assets/${island.img}.webp` : '';
    const range = island.review ? `חזרות ${island.review}`
      : island.lessons ? `שיעורים ${island.lessons}` : '';
    const pct = island.progress || 0;
    const ring = status === 'progress'
      ? `<svg class="drawer__ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" pathLength="100"/><circle class="drawer__ring-fill" cx="50" cy="50" r="46" pathLength="100" style="stroke-dasharray:${pct} 100"/></svg><span class="drawer__pct">${pct}%</span>`
      : '';
    const state = status === 'done' ? 'הושלם' : status === 'progress' ? `${pct}%` : status === 'locked' ? 'נעול' : '';
    li.innerHTML = `
      <button class="drawer__btn" type="button" aria-label="${island.name}${range ? `, ${range}` : ''}${state ? `, ${state}` : ''}">
        <span class="drawer__pic">${pic ? `<img src="${pic}" alt="">` : ''}</span>
        ${ring}
        ${status === 'done' ? doneIcon : ''}
        ${status === 'locked' ? smallLock : ''}
        <span class="drawer__tip"><b>${island.name}</b>${range ? `<span>${range}</span>` : ''}</span>
      </button>`;
    li.querySelector('button').addEventListener('click', () => {
      hoverBlocked = true; // stay closed until the mouse leaves the bottom strip
      setDrawer(false);
      // on the map: one flight straight there (locked islands can be looked at);
      // on another page: that island's own page, or the map opened at it
      if (window.journeyGoTo) window.journeyGoTo(i);
      else if (i !== current) {
        // through a link, so the page veil (transition.js) plays
        const link = document.createElement('a');
        link.href = island.page || `index.html#island-${i + 1}`;
        document.body.appendChild(link);
        link.click();
      }
    });
    drawerList.appendChild(li);
    return li;
  });

  // The line joins the centres of the first and last pictures; the pink part
  // runs from the first island to the one in front (right to left: RTL)
  function syncDrawer() {
    drawerItems.forEach((li, i) => {
      li.classList.toggle('is-current', i === current);
      li.querySelector('button').setAttribute('aria-current', i === current ? 'true' : 'false');
    });
    const centre = (li) => li.offsetLeft + li.offsetWidth / 2;
    const first = centre(drawerItems[0]);
    const last = centre(drawerItems[drawerItems.length - 1]);
    const here = centre(drawerItems[current]);
    drawerLine.style.left = `${Math.min(first, last)}px`;
    drawerLine.style.width = `${Math.abs(first - last)}px`;
    drawerFill.style.width = `${Math.abs(first - here)}px`;
  }

  let drawerOpen = false;
  let drawerTimer;
  let hoverBlocked = false;
  function setDrawer(open) {
    clearTimeout(drawerTimer);
    if (open === drawerOpen) return;
    drawerOpen = open;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    drawerHandle.setAttribute('aria-expanded', String(open));
    drawerHandle.classList.toggle('is-open', open);
    if (open) {
      // the half-circle button rides up on top of the drawer
      drawerHandle.style.setProperty('--drawer-h', `${drawer.offsetHeight}px`);
      syncDrawer();
      // bring the island in front into view when the row scrolls (phones)
      const li = drawerItems[current];
      const sc = drawer.querySelector('.drawer__scroll');
      sc.scrollLeft = li.offsetLeft - (sc.clientWidth - li.offsetWidth) / 2;
    }
  }
  const closeSoon = () => { clearTimeout(drawerTimer); drawerTimer = setTimeout(() => setDrawer(false), 300); };
  // Desktop: hover the bottom strip, the icon or the drawer itself
  [drawerZone, drawerHandle, drawer].forEach((el) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !hoverBlocked) { clearTimeout(drawerTimer); setDrawer(true); } });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') closeSoon(); });
  });
  document.addEventListener('pointermove', (e) => {
    if (hoverBlocked && !e.target.closest('#drawer, #drawer-handle, #drawer-zone')) hoverBlocked = false;
  });
  // Touch and keyboard: the icon toggles; a tap outside closes
  drawerHandle.addEventListener('click', () => setDrawer(!drawerOpen));
  // a click or tap anywhere along the bottom strip opens it too
  drawerZone.addEventListener('click', () => setDrawer(true));
  document.addEventListener('pointerdown', (e) => {
    if (drawerOpen && !e.target.closest('#drawer, #drawer-handle, #drawer-zone')) setDrawer(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerOpen) { setDrawer(false); drawerHandle.focus(); }
  });


  window.SiteDrawer.sync = (index) => { current = index; syncDrawer(); };
  syncDrawer();
})();
