// Phone layout, shared by every page (after menu.js and drawer.js).
// The 1920x1080 stage is tiny on a phone, so its header and edge tabs are
// replaced by a real-size top row (menu right, logo centre, the learner left)
// and a blue glass bar at the bottom: islands, trophy, shop and coins. The
// islands, trophy and coins open a sheet that slides up from the bottom.
(function () {
  const mq = window.matchMedia('(max-width: 760px)');
  const ISLANDS = window.ISLANDS || [];
  const $ = (sel) => document.querySelector(sel);
  const text = (sel, fallback) => ($(sel) ? $(sel).textContent.trim() : fallback);

  // The menu leaves the scaled stage so it opens at real size on a phone
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const home = sidebar && sidebar.parentNode;
  // …and so does the welcome popup, which grows to fill the phone's width
  const intro = document.getElementById('intro');
  const introHome = intro && intro.parentNode;
  const sizeIntro = () => {
    if (!intro) return;
    const target = mq.matches ? document.body : introHome;
    if (intro.parentNode !== target) target.appendChild(intro);
    const k = Math.min((window.innerWidth - 24) / 593, (window.innerHeight - 110) / 692);
    intro.style.setProperty('--m-k', mq.matches ? k.toFixed(3) : '1');
  };
  window.addEventListener('resize', sizeIntro);
  const place = () => {
    sizeIntro();
    if (!sidebar) return;
    const target = mq.matches ? document.body : home;
    if (backdrop && backdrop.parentNode !== target) target.appendChild(backdrop);
    if (sidebar.parentNode !== target) target.appendChild(sidebar);
  };

  /* ---------- Top row ---------- */
  const top = document.createElement('header');
  top.className = 'm-top';
  top.innerHTML = `
    <button class="m-top__menu" type="button" aria-label="פתיחת התפריט"><img src="assets/menu.svg" alt=""></button>
    <a class="m-top__logo" href="index.html" aria-label="מדקדקים באנגלית – דף הבית">
      <span class="m-top__tiles" aria-hidden="true"><b class="m-a">a</b><b class="m-b">b</b><b class="m-c">c</b></span>
      <span class="m-top__title">מדקדקים באנגלית</span>
    </a>
    <a class="m-top__user" href="profile.html" aria-label="האזור האישי">
      <img src="${$('.user__photo') ? $('.user__photo').getAttribute('src') : 'assets/avatar.webp'}" alt="">
      <span>${text('.user__name', '')}</span>
    </a>`;
  top.querySelector('.m-top__menu').addEventListener('click', () => {
    const btn = document.getElementById('menu-open');
    if (btn) btn.click();
  });

  /* ---------- Bottom bar ---------- */
  const coins = text('.stat--coins .stat__value', '0');
  const chests = text('.stat--chest .stat__value', '0');
  const bar = document.createElement('nav');
  bar.className = 'm-bar';
  bar.setAttribute('aria-label', 'קיצורי דרך');
  bar.innerHTML = `
    <button class="m-bar__btn" type="button" data-sheet="islands"><img src="assets/island-review.webp" alt=""><span>איים</span></button>
    <button class="m-bar__btn" type="button" data-sheet="trophy"><img src="assets/trophy.svg" alt=""><span>המשפט שלי</span></button>
    <a class="m-bar__btn" href="shop.html"><img src="assets/shop.webp" alt=""><span>חנות</span></a>
    <button class="m-bar__btn m-bar__btn--coin" type="button" data-sheet="coins"><span class="m-bar__stack" aria-hidden="true"><img class="m-bar__chest" src="assets/chest.webp" alt=""><img class="m-bar__coin" src="assets/coin.webp" alt=""></span><span>מה צברתי</span></button>`;

  /* ---------- Bottom sheet ---------- */
  const shade = document.createElement('div');
  shade.className = 'm-shade';
  const sheet = document.createElement('section');
  sheet.className = 'm-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = '<span class="m-sheet__grip" aria-hidden="true"></span><div class="m-sheet__body"></div>';
  const body = sheet.querySelector('.m-sheet__body');
  let openKind = null;

  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const builders = {
    coins: () => `
      <h2 class="m-sheet__title">מה צברתי</h2>
      <div class="m-wallet">
        <div class="m-wallet__item"><img src="assets/coin.webp" alt=""><b>${coins}</b><span>מטבעות</span></div>
        <div class="m-wallet__item"><img src="assets/chest.webp" alt=""><b>${chests}</b><span>תיבות אוצר</span></div>
      </div>
      <a class="btn-pill m-sheet__cta" href="shop.html"><span>לחנות האותיות</span></a>`,
    trophy: () => {
      const sentence = $('.trophy-hint .sentence');
      return `
        <h2 class="m-sheet__title">המשפט המנצח שלי</h2>
        <p class="m-sheet__text">${text('.trophy-hint__text', '')}</p>
        <div class="m-sentence">${sentence ? sentence.outerHTML : ''}</div>
        <a class="btn-pill m-sheet__cta" href="shop.html"><span>לקנות אותיות</span></a>`;
    },
    islands: () => `
      <h2 class="m-sheet__title">כל העולמות</h2>
      <div class="m-islands">${ISLANDS.map((island, i) => {
        if (island.finale) return '';
        const status = island.status || 'locked';
        const range = island.review ? `חזרות ${island.review}` : island.lessons ? `שיעורים ${island.lessons}` : '';
        const badge = status === 'done' ? '<i class="m-isl__badge m-isl__badge--done">✓</i>'
          : status === 'progress' ? `<i class="m-isl__badge m-isl__badge--pct">${island.progress || 0}%</i>`
          : `<i class="m-isl__badge m-isl__badge--lock">${LOCK}</i>`;
        return `<button class="m-isl" type="button" data-i="${i}">
            <span class="m-isl__pic">${island.img ? `<img src="assets/${island.img}.webp" alt="">` : ''}${badge}</span>
            <b>${island.name}</b><span>${range}</span>
          </button>`;
      }).join('')}</div>`,
  };

  function setSheet(kind) {
    openKind = kind;
    if (kind) {
      body.innerHTML = builders[kind]();
      sheet.classList.toggle('m-sheet--full', kind === 'islands');
      sheet.setAttribute('aria-label', body.querySelector('.m-sheet__title').textContent);
    }
    document.body.classList.toggle('m-sheet-open', !!kind);
    bar.querySelectorAll('[data-sheet]').forEach((b) => b.classList.toggle('is-on', b.dataset.sheet === kind));
  }
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sheet]');
    if (btn) setSheet(openKind === btn.dataset.sheet ? null : btn.dataset.sheet);
  });
  shade.addEventListener('click', () => setSheet(null));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openKind) setSheet(null); });
  // an island opens like it does in the islands drawer (drawer.js)
  body.addEventListener('click', (e) => {
    const isl = e.target.closest('.m-isl');
    if (!isl) return;
    setSheet(null);
    const btn = document.querySelectorAll('#drawer-list .drawer__item button')[Number(isl.dataset.i)];
    if (btn) btn.click();
    else {
      const island = ISLANDS[Number(isl.dataset.i)];
      location.href = island.page || `index.html#island-${Number(isl.dataset.i) + 1}`;
    }
  });
  // swipe the sheet down to close it
  let y0 = null;
  sheet.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (y0 !== null && e.changedTouches[0].clientY - y0 > 60 && body.scrollTop <= 0) setSheet(null);
    y0 = null;
  });

  /* ---------- The stage at its biggest ----------
     On a phone the stage fills the whole height above the bottom bar and
     scrolls sideways (instead of shrinking to the window's width). It starts
     at the page's main content: the lesson pins, the front island, or the
     right edge of a white panel (Hebrew reads from the right). */
  const stage = document.getElementById('stage');
  const viewport = document.querySelector('.viewport');
  let firstFit = true;
  const WORLD = window.WORLD;
  const isWorld = !!(WORLD && WORLD.lessons && document.body.classList.contains('world-page')
    && !document.body.classList.contains('practice-page'));

  /* ---------- Island pages: the whole scene + a lessons slider ----------
     The scene (background and the small island) is shown whole across the
     phone's width, under the top row; the lessons, too small there, move to a
     card below it: one big pin at a time with arrows (and swipe). */
  let pinsCard = null;
  if (isWorld) {
    const label = { done: 'הושלם', current: 'השיעור הבא', locked: 'נעול' };
    const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    const LOCKI = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
    const list = WORLD.lessons;
    let at = Math.max(0, list.findIndex((l) => l.status === 'current'));
    pinsCard = document.createElement('section');
    pinsCard.className = 'm-pins';
    pinsCard.setAttribute('aria-label', 'השיעורים באי');
    pinsCard.innerHTML = `
      <h2 class="m-pins__title">${WORLD.title || ''}</h2>
      <p class="m-pins__range">${WORLD.lessonsRange ? `שיעורים ${WORLD.lessonsRange}` : ''}</p>
      <div class="m-pins__row">
        <button class="m-pins__arrow m-pins__arrow--prev" type="button" aria-label="השיעור הקודם">${ARROW}</button>
        <div class="m-pins__stage" aria-live="polite"></div>
        <button class="m-pins__arrow m-pins__arrow--next" type="button" aria-label="השיעור הבא">${ARROW}</button>
      </div>
      <div class="m-pins__dots">${list.map(() => '<i></i>').join('')}</div>`;
    const slot = pinsCard.querySelector('.m-pins__stage');
    const dots = [...pinsCard.querySelectorAll('.m-pins__dots i')];
    const prev = pinsCard.querySelector('.m-pins__arrow--prev');
    const next = pinsCard.querySelector('.m-pins__arrow--next');
    const show = (i, dir) => {
      if (!list.length) {
        // an island whose lessons are not in yet
        slot.innerHTML = '<p class="m-pin__soon">השיעורים של האי הזה יתווספו בקרוב</p>';
        prev.hidden = true;
        next.hidden = true;
        return;
      }
      at = Math.max(0, Math.min(list.length - 1, i));
      const l = list[at];
      const badge = l.status === 'done' ? CHECK : l.status === 'locked' ? LOCKI : '<i></i>';
      const locked = l.status === 'locked';
      slot.innerHTML = `
        <div class="m-pin${dir ? ` m-pin--${dir}` : ''}">
          <a class="lesson lesson--${l.status}" href="${locked ? '#' : l.href}" aria-label="שיעור ${l.n} – ${label[l.status]}"><span class="lesson__n">${l.n}</span><span class="lesson__badge">${badge}</span></a>
          <p class="m-pin__name">שיעור ${l.n} · <span class="m-pin__state m-pin__state--${l.status}">${label[l.status]}</span></p>
          ${locked ? '<span class="m-pin__go is-locked">נעול</span>' : `<a class="btn-pill m-pin__go" href="${l.href}"><span>${l.status === 'done' ? 'לחזור לשיעור' : 'כניסה לשיעור'}</span></a>`}
        </div>`;
      slot.querySelectorAll('[href="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === at));
      prev.disabled = at === 0;
      next.disabled = at === list.length - 1;
    };
    prev.addEventListener('click', () => show(at - 1, 'prev'));
    next.addEventListener('click', () => show(at + 1, 'next'));
    let x0 = null;
    slot.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    slot.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      // RTL: swiping left moves on to the next lesson
      if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
      x0 = null;
    });
    show(at);
    document.body.classList.add('m-world');
  }

  /* ---------- Letter shop: two white tabs (letters / sentences) ---------- */
  const shopLetters = document.querySelector('.shop-panel--letters');
  const shopSentences = document.querySelector('.shop-panel--sentences');
  let shopBox = null;
  if (shopLetters && shopSentences) {
    shopBox = document.createElement('div');
    shopBox.className = 'm-shop';
    shopBox.dataset.tab = 'letters';
    shopBox.innerHTML = `
      <div class="m-shop__tabs" role="tablist">
        <button class="m-shop__tab is-on" type="button" role="tab" aria-selected="true" data-tab="letters">חנות האותיות</button>
        <button class="m-shop__tab" type="button" role="tab" aria-selected="false" data-tab="sentences">אזור המשפטים</button>
      </div>`;
    shopBox.querySelector('.m-shop__tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (!tab) return;
      shopBox.dataset.tab = tab.dataset.tab;
      shopBox.querySelectorAll('.m-shop__tab').forEach((t) => {
        t.classList.toggle('is-on', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
    });
    document.body.classList.add('m-shop-page');
  }
  const shopHome = shopLetters && [shopLetters.parentNode, shopLetters.nextSibling, shopSentences.nextSibling];
  const placeShop = () => {
    if (!shopBox) return;
    if (mq.matches && shopLetters.parentNode !== shopBox) shopBox.append(shopLetters, shopSentences);
    else if (!mq.matches && shopLetters.parentNode === shopBox) {
      shopHome[0].insertBefore(shopLetters, shopHome[1]);
      shopHome[0].insertBefore(shopSentences, shopHome[2]);
    }
  };

  function bigFit() {
    if (!mq.matches || !stage || !viewport) return;
    if (isWorld) {
      // the whole scene across the width: the background reaches 86px above
      // the stage and 1195px below its top
      const s = window.innerWidth / 1920;
      const top = 78 + 86 * s;
      stage.style.transform = `translate(0px, ${top}px) scale(${s})`;
      stage.style.setProperty('--edge-shift', '0px');
      stage.style.setProperty('--edge-shift-y', '0px');
      stage.style.setProperty('--scene-k', '1');
      pinsCard.style.top = `${Math.round(top + 1195 * s - 26)}px`;
      viewport.scrollLeft = 0;
      return;
    }
    const s = (window.innerHeight - bar.offsetHeight + 14) / 1080;
    stage.style.transform = `scale(${s})`;
    stage.style.setProperty('--edge-shift', '0px');
    stage.style.setProperty('--edge-shift-y', '0px');
    stage.style.setProperty('--scene-k', '1.01');
    if (!firstFit) return;
    firstFit = false;
    const max = 1920 * s - window.innerWidth;
    let focus = 960;
    const pins = [...document.querySelectorAll('.lessons .lesson')];
    if (document.getElementById('journey')) focus = 560;
    else if (pins.length) {
      const xs = pins.map((p) => parseFloat(p.style.left)).filter((x) => !Number.isNaN(x));
      if (xs.length) focus = (Math.min(...xs) + Math.max(...xs)) / 2;
    } else if (document.querySelector('.shop-panel')) focus = 1920;
    viewport.scrollLeft = Math.max(0, Math.min(max, focus * s - window.innerWidth / 2));
  }
  window.addEventListener('resize', () => requestAnimationFrame(bigFit));

  document.body.append(top, shade, sheet, bar);
  if (pinsCard) document.body.append(pinsCard);
  if (shopBox) document.body.append(shopBox);
  const sync = () => {
    document.body.classList.toggle('is-mobile', mq.matches);
    if (!mq.matches) {
      setSheet(null);
      firstFit = true;
      window.dispatchEvent(new Event('resize')); // the page's own fit() takes over again
    }
    place();
    placeShop();
    bigFit();
  };
  // pins are placed by world.js once the page has loaded
  window.addEventListener('load', () => { firstFit = true; bigFit(); });
  (mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync));
  sync();
})();
