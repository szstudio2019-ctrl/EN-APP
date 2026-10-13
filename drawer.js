// Worlds map, shared by every page (replaces the old islands drawer). Needs
// islands.js. The "עולמות" tab on the left edge (under the cart) opens a
// full-screen map: every world as a floating island along a winding path, in
// the course order. Done worlds are joined by a glowing line; the learner's
// world is bigger, glows and carries "אתה כאן" with the avatar; the next ones
// wait along a dashed line; locked ones are faded with a lock and only say
// how to open them. Desktop: the path runs across (scrolls sideways);
// phones: it runs down (scrolls down).
(function () {
  const ISLANDS = window.ISLANDS || [];
  window.SiteDrawer = { sync: () => {} };
  window.SiteMap = { open: () => {} };
  const handle = document.getElementById('drawer-handle');
  if (!ISLANDS.length) return;

  const here = location.pathname.split('/').pop();
  // the island being viewed (the map page keeps it in sync)
  let viewing = Math.max(0, ISLANDS.findIndex((island) => island.page && island.page === here));
  // the learner's world: the first one not done yet
  const reached = (() => { const i = ISLANDS.findIndex((island) => island.status !== 'done'); return i < 0 ? ISLANDS.length - 1 : i; })();
  const stateOf = (island, i) => {
    if (island.finale) return reached >= ISLANDS.length - 1 ? 'current' : 'locked';
    if (i === reached) return 'current';
    if (island.status === 'done') return 'done';
    if (island.status === 'progress') return 'open';
    return 'locked';
  };
  // coins in each world (demo): done = all of them, in progress = its share
  const coinsOf = (island) => {
    const total = 500;
    if (island.status === 'done') return [island.earned && island.earned < total ? island.earned : total, total];
    return [Math.round(((island.progress || 0) / 100) * total), total];
  };

  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const photo = () => { const p = document.querySelector('.user__photo'); return p ? p.getAttribute('src') : 'assets/avatar.webp'; };

  /* ---------- The tab: a white card with a pink outline + "עולמות" ---------- */
  if (handle) {
    handle.classList.add('worlds-tab');
    handle.setAttribute('aria-controls', 'world-map');
    handle.setAttribute('aria-label', 'מפת העולמות');
    handle.querySelectorAll('.tab-tip, .rp-tab-label, .drawer-handle__arrow').forEach((el) => el.remove());
    if (!handle.querySelector('.worlds-tab__label')) handle.insertAdjacentHTML('beforeend', '<span class="worlds-tab__label">עולמות</span>');
  }

  /* ---------- The map ---------- */
  const map = document.createElement('div');
  map.className = 'world-map';
  map.id = 'world-map';
  map.setAttribute('role', 'dialog');
  map.setAttribute('aria-modal', 'true');
  map.setAttribute('aria-label', 'מפת העולמות');
  map.hidden = true;
  map.innerHTML = `
    <div class="world-map__sky" aria-hidden="true"></div>
    <header class="world-map__head">
      <h2 class="world-map__title">מפת העולמות</h2>
      <p class="world-map__sub">כל העולמות לפי סדר הלמידה</p>
    </header>
    <button class="world-map__close" type="button" aria-label="סגירת המפה">${CLOSE}</button>
    <div class="world-map__scroll">
      <div class="world-map__track">
        <svg class="world-map__path" aria-hidden="true"></svg>
        <ol class="world-map__list"></ol>
      </div>
    </div>
    <p class="world-map__toast" role="status" aria-live="polite"></p>`;
  document.body.appendChild(map);
  const scroll = map.querySelector('.world-map__scroll');
  const track = map.querySelector('.world-map__track');
  const svg = map.querySelector('.world-map__path');
  const list = map.querySelector('.world-map__list');
  const toast = map.querySelector('.world-map__toast');

  const nodes = ISLANDS.map((island, i) => {
    const state = stateOf(island, i);
    const li = document.createElement('li');
    li.className = `wm-island wm-island--${state}`;
    if (island.review) li.classList.add('wm-island--review');
    if (island.finale) li.classList.add('wm-island--finale');
    const pic = island.finale ? 'assets/trophy.svg' : island.img ? `assets/${island.img}.webp` : '';
    const range = island.review ? `חזרות ${island.review}` : island.lessons ? `שיעורים ${island.lessons}` : '';
    const [got, total] = coinsOf(island);
    const open = state !== 'locked' && !island.finale;
    const badge = state === 'done' ? `<span class="wm-badge wm-badge--done">${CHECK}</span>`
      : state === 'locked' ? `<span class="wm-badge wm-badge--lock">${LOCK}</span>` : '';
    li.innerHTML = `
      <button class="wm-island__btn" type="button" aria-label="${island.name}${range ? `, ${range}` : ''}${state === 'locked' ? ', נעול' : state === 'done' ? ', הושלם' : ''}">
        ${state === 'current' ? `<span class="wm-here"><img src="${photo()}" alt="">אתה כאן</span>` : ''}
        <span class="wm-island__pic">${pic ? `<img src="${pic}" alt="">` : ''}${badge}</span>
        <span class="wm-island__name">${island.name}</span>
        ${range ? `<span class="wm-island__range">${range}</span>` : ''}
        ${open ? `<span class="wm-island__coins"><b>${got}</b> מתוך ${total} מטבעות</span>
          <span class="wm-island__bar"><i style="width:${Math.round((got / total) * 100)}%"></i></span>` : ''}
      </button>`;
    li.querySelector('button').addEventListener('click', () => go(i, state));
    list.appendChild(li);
    return li;
  });

  let toastTimer;
  function say(text) {
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
  }
  function go(i, state) {
    const island = ISLANDS[i];
    if (state === 'locked') {
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

  /* ---------- Layout: points along a wave, then a smooth path through them ---------- */
  const vertical = () => window.matchMedia('(max-width: 760px)').matches;
  function layout() {
    const V = vertical();
    const n = ISLANDS.length;
    const W = scroll.clientWidth;
    const H = scroll.clientHeight;
    let pts;
    let tw;
    let th;
    if (V) {
      const gap = 250;
      tw = W;
      th = 140 + (n - 1) * gap + 200;
      const amp = Math.min(90, W / 2 - 100);
      pts = ISLANDS.map((_, i) => [W / 2 + amp * Math.sin(i * 1.25), 150 + i * gap]);
    } else {
      const gap = 290;
      th = Math.max(460, H);
      tw = Math.max(W, 200 + (n - 1) * gap + 200);
      const mid = th / 2 - 10;
      const amp = Math.min(200, th / 2 - 220);
      // RTL: the first world on the right
      pts = ISLANDS.map((_, i) => [tw - 200 - i * gap, mid + amp * Math.sin(i * 1.15)]);
    }
    track.style.width = `${tw}px`;
    track.style.height = `${th}px`;
    svg.setAttribute('width', tw);
    svg.setAttribute('height', th);
    svg.setAttribute('viewBox', `0 0 ${tw} ${th}`);
    nodes.forEach((li, i) => { li.style.left = `${pts[i][0]}px`; li.style.top = `${pts[i][1]}px`; });
    // Catmull-Rom through the island centres, one piece per pair
    const seg = (i) => {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(n - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      return `M${p1[0]},${p1[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    };
    let html = '';
    for (let i = 0; i < n - 1; i += 1) {
      const lit = i + 1 <= reached; // both ends already reached
      html += `<path class="wm-line ${lit ? 'wm-line--done' : 'wm-line--next'}" d="${seg(i)}"/>`;
    }
    svg.innerHTML = `<defs><linearGradient id="wm-glow" x1="0" x2="1"><stop offset="0" stop-color="#ffd45c"/><stop offset="1" stop-color="#e33563"/></linearGradient></defs>${html}`;
    return pts;
  }

  /* ---------- Open / close: grows out of the tab ---------- */
  let isOpen = false;
  function setMap(open) {
    if (open === isOpen) return;
    isOpen = open;
    if (handle) {
      handle.setAttribute('aria-expanded', String(open));
      const r = handle.getBoundingClientRect();
      map.style.setProperty('--from-x', `${r.left + r.width / 2}px`);
      map.style.setProperty('--from-y', `${r.top + r.height / 2}px`);
    }
    if (open) {
      map.hidden = false;
      document.body.classList.add('world-map-open');
      const pts = layout();
      // bring the learner's (or the viewed) world into the middle
      const at = pts[Math.max(viewing, 0)] || pts[reached];
      const focus = viewing > 0 ? at : pts[reached];
      if (vertical()) scroll.scrollTop = focus[1] - scroll.clientHeight / 2;
      else scroll.scrollLeft = focus[0] - scroll.clientWidth / 2;
      void map.offsetWidth; // start from the small state, then grow
      map.classList.add('is-open');
      map.querySelector('.world-map__close').focus({ preventScroll: true });
    } else {
      map.classList.remove('is-open');
      document.body.classList.remove('world-map-open');
      setTimeout(() => { if (!isOpen) map.hidden = true; }, 400);
      if (handle) handle.focus({ preventScroll: true });
    }
  }
  if (handle) handle.addEventListener('click', () => setMap(!isOpen));
  map.querySelector('.world-map__close').addEventListener('click', () => setMap(false));
  // a click on the sky (not on an island) closes it
  map.addEventListener('click', (e) => { if (!e.target.closest('.wm-island__btn, .world-map__close, .world-map__head')) setMap(false); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) setMap(false); });
  window.addEventListener('resize', () => { if (isOpen) layout(); });
  // a mouse wheel scrolls the across-path sideways
  scroll.addEventListener('wheel', (e) => {
    if (vertical() || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    scroll.scrollLeft -= e.deltaY; // RTL: down = on along the path (to the left)
  }, { passive: false });

  window.SiteMap = { open: () => setMap(true), close: () => setMap(false) };
  window.SiteDrawer.sync = (index) => {
    viewing = index;
    nodes.forEach((li, i) => li.classList.toggle('is-viewing', i === index));
  };
  window.SiteDrawer.sync(viewing);
})();
