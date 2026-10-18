// Worlds map, shared by every page (replaces the old islands drawer). Needs
// islands.js. The "עולמות" tab on the left edge (under the cart) opens a
// popup map: every world as a floating island along a winding path, in the
// course order. Each island is one fixed block: the picture (with its status
// badge in the top corner) and, under it, a white label pill. Done worlds are
// joined by a solid pink line; the learner's world is bigger, glows and
// carries "אתה כאן" with the avatar; a dashed line runs on from there; locked
// worlds have a dimmed picture and a lock, and only say how to open them.
// Desktop: the path runs across (scrolls sideways); phones: it runs down.
(function () {
  const ISLANDS = window.ISLANDS || [];
  window.SiteDrawer = { sync: () => {} };
  window.SiteMap = { open: () => {} };
  const handle = document.getElementById('drawer-handle');
  if (!ISLANDS.length) return;

  const here = location.pathname.split('/').pop();
  // a review island's page carries its range (review.html?r=1-16): match it exactly, else by the file
  const pageOf = (p) => (p || '').split('?')[0];
  const exact = ISLANDS.findIndex((island) => island.page && island.page === here + location.search);
  let viewing = Math.max(0, exact >= 0 ? exact : ISLANDS.findIndex((island) => island.page && pageOf(island.page) === here));
  // the learner's world: the first one not done yet
  const reached = (() => { const i = ISLANDS.findIndex((island) => island.status !== 'done'); return i < 0 ? ISLANDS.length - 1 : i; })();
  const stateOf = (island, i) => {
    if (i === reached) return 'current';
    if (island.status === 'done') return 'done';
    if (island.status === 'progress') return 'open';
    return 'locked';
  };
  const states = ISLANDS.map(stateOf);
  // each review island's number, from the data (the order of the reviews)
  let reviews = 0;
  const reviewNo = ISLANDS.map((island) => (island.review ? (reviews += 1) : 0));
  // coins in each world (demo): done = all of them, in progress = its share
  const coinsOf = (island) => {
    const total = 500;
    if (island.earned !== undefined) return [island.earned, total];
    if (island.status === 'done') return [total, total];
    return [Math.round(((island.progress || 0) / 100) * total), total];
  };
  // the small map copies of the pictures (WebP at the shown size)
  const picOf = (island) => (island.finale ? 'assets/trophy.svg' : island.img ? `assets/map/${island.img}.webp` : '');

  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const photo = () => { const p = document.querySelector('.user__photo'); return p ? p.getAttribute('src') : 'assets/avatar.webp'; };
  // "שירה את כאן": the learner's first name (from the header)
  const hereText = () => {
    const n = document.querySelector('.user__name');
    const first = n ? n.textContent.trim().split(' ')[0] : '';
    return first ? `${first} את כאן` : 'את כאן';
  };

  /* ---------- The tab: a white card with a pink outline + "עולמות" ---------- */
  if (handle) {
    handle.classList.add('worlds-tab');
    handle.setAttribute('aria-controls', 'world-map');
    handle.setAttribute('aria-label', 'מפת האיים');
    handle.querySelectorAll('.tab-tip, .rp-tab-label, .drawer-handle__arrow').forEach((el) => el.remove());
    if (!handle.querySelector('.worlds-tab__label')) handle.insertAdjacentHTML('beforeend', '<span class="worlds-tab__label">איים של אותיות</span>');
  }
  // the trophy and cart tabs carry their names under the icon too
  [['.trophy', 'המשפט שלי'], ['.cart', 'חנות האותיות']].forEach(([sel, name]) => {
    const tab = document.querySelector(sel);
    if (tab && !tab.querySelector('.tab-label')) tab.insertAdjacentHTML('beforeend', `<span class="tab-label" aria-hidden="true">${name}</span>`);
  });

  /* ---------- The popup ---------- */
  const map = document.createElement('div');
  map.className = 'world-map';
  map.id = 'world-map';
  map.hidden = true;
  map.innerHTML = `
    <section class="world-map__panel" role="dialog" aria-modal="true" aria-labelledby="world-map-title">
      <header class="world-map__head">
        <h2 class="world-map__title" id="world-map-title">מפת האיים</h2>
        <div class="world-map__tabs" role="tablist" aria-label="מה להציג">
          <button class="world-map__tab is-on" type="button" role="tab" aria-selected="true" data-tab="all">כל האיים</button>
          <button class="world-map__tab" type="button" role="tab" aria-selected="false" data-tab="reviews">חזרות</button>
        </div>
      </header>
      <button class="world-map__close" type="button" aria-label="סגירת המפה">${CLOSE}</button>
      <div class="world-map__scroll">
        <div class="world-map__track">
          <svg class="world-map__path" aria-hidden="true"></svg>
          <ol class="world-map__list"></ol>
        </div>
      </div>
      <p class="world-map__toast" role="status" aria-live="polite"></p>
    </section>`;
  document.body.appendChild(map);
  const panel = map.querySelector('.world-map__panel');
  const scroll = map.querySelector('.world-map__scroll');
  const track = map.querySelector('.world-map__track');
  const svg = map.querySelector('.world-map__path');
  const list = map.querySelector('.world-map__list');
  const toast = map.querySelector('.world-map__toast');

  const nodes = ISLANDS.map((island, i) => {
    const state = states[i];
    const li = document.createElement('li');
    li.className = `wm-island wm-island--${state}`;
    if (island.review) li.classList.add('wm-island--review');
    if (island.finale) li.classList.add('wm-island--finale');
    li.style.setProperty('--float-delay', `${-((i * 0.83) % 5).toFixed(2)}s`);
    li.style.setProperty('--float-time', `${4 + (i % 3)}s`);
    const pic = picOf(island);
    const range = island.review ? `חזרות ${island.review}` : island.lessons ? `שיעורים ${island.lessons}` : '';
    const [got, total] = coinsOf(island);
    // every world shows the coins earned in it (a locked one: 0 of 500)
    const open = !island.finale;
    const badge = state === 'done' ? `<span class="wm-badge wm-badge--done">${CHECK}</span>`
      : state === 'locked' ? `<span class="wm-badge wm-badge--lock">${LOCK}</span>` : '';
    const no = reviewNo[i] ? ` <span class="wm-no" aria-label="מספר ${reviewNo[i]}">${reviewNo[i]}</span>` : '';
    li.innerHTML = `
      <button class="wm-island__btn" type="button" aria-label="${island.name}${reviewNo[i] ? ` ${reviewNo[i]}` : ''}${range ? `, ${range}` : ''}${state === 'locked' ? ', נעול' : state === 'done' ? ', הושלם' : ''}">
        <span class="wm-island__pic">
          ${state === 'current' ? `<span class="wm-here"><img src="${photo()}" alt=""><span>${hereText()}</span></span>` : ''}
          ${pic ? `<img class="wm-island__img" src="${pic}" alt="" decoding="async">` : ''}${badge}
        </span>
        <span class="wm-label">
          <span class="wm-label__name">${island.name}${no}</span>
          ${range ? `<span class="wm-label__line">${range}</span>` : ''}
          ${open ? `<span class="wm-coins"><img src="assets/coin.webp" alt="">צברת <b>${got}</b> מטבעות</span>` : ''}
        </span>
      </button>`;
    li.querySelector('button').addEventListener('click', () => go(i));
    list.appendChild(li);
    return li;
  });

  // the main review island: first on the "חזרות" tab only (not a course stop),
  // it opens the review island page with all its pins
  const MAIN = 'main';
  const reviewCoins = ISLANDS.reduce((sum, island) => sum + (island.review ? coinsOf(island)[0] : 0), 0);
  states[MAIN] = 'done';
  const mainLi = document.createElement('li');
  mainLi.className = 'wm-island wm-island--open wm-island--review wm-island--main';
  mainLi.style.setProperty('--float-delay', '-1.4s');
  mainLi.style.setProperty('--float-time', '5s');
  mainLi.innerHTML = `
      <button class="wm-island__btn" type="button" aria-label="אי החזרות הראשי, כל החזרות">
        <span class="wm-island__pic"><img class="wm-island__img" src="assets/map/island-review.webp" alt="" decoding="async"></span>
        <span class="wm-label">
          <span class="wm-label__name">אי החזרות הראשי</span>
          <span class="wm-label__line">כל החזרות</span>
          <span class="wm-coins"><img src="assets/coin.webp" alt="">צברת <b>${reviewCoins}</b> מטבעות</span>
        </span>
      </button>`;
  mainLi.querySelector('button').addEventListener('click', () => {
    setMap(false);
    if (here === 'review.html' && !location.search) return;
    const link = document.createElement('a');
    link.href = 'review.html';
    document.body.appendChild(link);
    setTimeout(() => link.click(), 250);
  });
  list.appendChild(mainLi);

  let toastTimer;
  function say(text) {
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
  }
  function go(i) {
    const island = ISLANDS[i];
    if (states[i] === 'locked') {
      const li = nodes[i];
      li.classList.remove('is-shake');
      void li.offsetWidth;
      li.classList.add('is-shake');
      say(island.finale ? 'סיימו את כל העולמות כדי להגיע לכאן' : 'סיימו את העולם הקודם כדי לפתוח');
      return;
    }
    setMap(false);
    if (window.journeyGoTo && !island.page) { setTimeout(() => window.journeyGoTo(i), 300); return; }
    const target = island.page || `index.html#island-${i + 1}`;
    if (target === here) return;
    // through a link, so the page veil (transition.js) plays
    const link = document.createElement('a');
    link.href = target;
    document.body.appendChild(link);
    setTimeout(() => link.click(), 250);
  }

  /* ---------- Layout: picture centres along a wave, a smooth path through them ----------
     Spacing keeps every block (picture + label) clear of its neighbours. */
  const vertical = () => window.matchMedia('(max-width: 760px)').matches;
  let isOpen = false;
  // the tab: every island, or only the review islands (the old "כל החזרות" popup)
  let tab = 'all';
  const shownList = () => {
    const list = ISLANDS.map((_, i) => i).filter((i) => tab === 'all' || ISLANDS[i].review);
    return tab === 'reviews' ? [MAIN, ...list] : list;
  };
  function layout() {
    const V = vertical();
    const shown = shownList();
    const n = shown.length;
    const W = scroll.clientWidth;
    const H = scroll.clientHeight;
    let pts;
    let tw;
    let th;
    if (V) {
      // a block is about 260px tall (the current one 300): one per 300px
      const gap = 300;
      tw = W;
      th = 150 + (n - 1) * gap + 230;
      const amp = Math.max(0, Math.min(70, W / 2 - 120));
      pts = shown.map((_, k) => [W / 2 + amp * Math.sin(k * 1.25), 150 + k * gap]);
    } else {
      // blocks are 230px wide: 300px apart, and the wave stays inside the height
      // the reviews (six with the main one) squeeze in a little to fit without scrolling
      const gap = tab === 'reviews' ? Math.max(250, Math.min(300, (W - 440) / Math.max(1, n - 1))) : 300;
      th = Math.max(520, H);
      tw = Math.max(W, 220 + (n - 1) * gap + 220);
      const mid = th / 2 - 35; // the label hangs under the picture, so the centre sits a little higher
      const amp = Math.max(0, Math.min(190, (th - 420) / 2));
      // RTL: the first one on the right; a short row (the reviews) sits in the middle
      const start = n * gap < W ? (W + (n - 1) * gap) / 2 : tw - 220;
      pts = shown.map((_, k) => [start - k * gap, mid + amp * Math.sin(k * 1.15)]);
    }
    track.style.width = `${tw}px`;
    track.style.height = `${th}px`;
    svg.setAttribute('width', tw);
    svg.setAttribute('height', th);
    svg.setAttribute('viewBox', `0 0 ${tw} ${th}`);
    // place the shown islands; hide the rest
    const at = {};
    shown.forEach((i, k) => { at[i] = pts[k]; });
    nodes.forEach((li, i) => {
      li.hidden = !at[i];
      if (at[i]) { li.style.left = `${at[i][0]}px`; li.style.top = `${at[i][1]}px`; }
    });
    mainLi.hidden = !at[MAIN];
    if (at[MAIN]) { mainLi.style.left = `${at[MAIN][0]}px`; mainLi.style.top = `${at[MAIN][1]}px`; }
    // Catmull-Rom through the picture centres, one piece per pair
    const seg = (k) => {
      const p0 = pts[Math.max(0, k - 1)];
      const p1 = pts[k];
      const p2 = pts[k + 1];
      const p3 = pts[Math.min(n - 1, k + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      return `M${p1[0].toFixed(1)},${p1[1].toFixed(1)} C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    };
    // from the data: a piece is solid when it joins a done world to a done
    // world or to the learner's world; every other piece is dashed
    let solid = '';
    let dashed = '';
    for (let k = 0; k < n - 1; k += 1) {
      const a = states[shown[k]];
      const b = states[shown[k + 1]];
      const lit = (a === 'done' && (b === 'done' || b === 'current')) || (a === 'current' && b === 'done');
      if (lit) solid += `<path class="wm-line wm-line--done" pathLength="1" d="${seg(k)}"/>`;
      else dashed += `<path class="wm-line wm-line--next" d="${seg(k)}"/>`;
    }
    svg.innerHTML = `<g class="wm-lines-next">${dashed}</g><g class="wm-lines-done">${solid}</g>`;
    return at;
  }
  // bring the viewed island (or the learner's, or the first shown) into the middle
  function focusMap(at) {
    const shown = shownList();
    const pick = [viewing, reached].find((i) => at[i]) ?? shown[0];
    const focus = at[pick];
    if (!focus) return;
    if (vertical()) scroll.scrollTo({ top: focus[1] - scroll.clientHeight / 2, behavior: 'instant' });
    else scroll.scrollTo({ left: focus[0] - scroll.clientWidth / 2, behavior: 'instant' });
  }
  function setTab(next) {
    tab = next === 'reviews' ? 'reviews' : 'all';
    map.querySelectorAll('.world-map__tab').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
    });
    if (!isOpen) return;
    focusMap(layout());
    // redraw the line for the new set
    map.classList.remove('is-drawn');
    void map.offsetWidth;
    map.classList.add('is-drawn');
  }
  map.querySelector('.world-map__tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) setTab(b.dataset.tab);
  });

  /* ---------- Open / close: grows out of the tab ---------- */
  let closeTimer;
  function setMap(open, which) {
    if (open && which) setTab(which);
    if (open === isOpen) return;
    isOpen = open;
    clearTimeout(closeTimer);
    if (handle) handle.setAttribute('aria-expanded', String(open));
    if (open) {
      map.hidden = false;
      document.body.classList.add('world-map-open');
      focusMap(layout());
      map.classList.remove('is-drawn');
      void map.offsetWidth; // start from the small state, then grow
      map.classList.add('is-open');
      // the solid line draws itself in once the popup is up
      setTimeout(() => { if (isOpen) map.classList.add('is-drawn'); }, 250);
      map.querySelector('.world-map__close').focus({ preventScroll: true });
    } else {
      map.classList.remove('is-open', 'is-drawn');
      document.body.classList.remove('world-map-open');
      closeTimer = setTimeout(() => { map.hidden = true; }, 400);
      if (handle) handle.focus({ preventScroll: true });
    }
  }
  if (handle) handle.addEventListener('click', () => setMap(!isOpen, 'all'));
  map.querySelector('.world-map__close').addEventListener('click', () => setMap(false));
  // a click outside the popup closes it
  map.addEventListener('click', (e) => { if (!panel.contains(e.target)) setMap(false); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) setMap(false); });
  window.addEventListener('resize', () => { if (isOpen) layout(); });
  // a mouse wheel scrolls the across-path sideways
  scroll.addEventListener('wheel', (e) => {
    if (vertical() || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    scroll.scrollBy({ left: -e.deltaY, behavior: 'smooth' }); // RTL: down = on along the path (to the left)
  }, { passive: false });

  // load the map pictures ahead, so none arrives in the middle of the opening
  const preload = () => ISLANDS.forEach((island) => { const src = picOf(island); if (src) { const img = new Image(); img.decoding = 'async'; img.src = src; } });
  if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 2500 });
  else setTimeout(preload, 1200);

  // SiteMap.open('reviews') opens it on the reviews tab (the menu's "חזרות", the finale)
  window.SiteMap = { open: (which) => setMap(true, which || 'all'), close: () => setMap(false) };
  window.SiteDrawer.sync = (index) => {
    viewing = index;
    nodes.forEach((li, i) => li.classList.toggle('is-viewing', i === index));
  };
  window.SiteDrawer.sync(viewing);
})();
