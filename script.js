// Scale the 1920x1080 stage to fit the window, centered (letterboxed).
(function () {
  const W = 1920;
  const H = 1080;
  const stage = document.getElementById('stage');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const x = (window.innerWidth - W * scale) / 2;
    const y = (window.innerHeight - H * scale) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  window.addEventListener('resize', fit);
  fit();

  /* ------------------------------------------------------------------ */
  /* Background video                                                    */
  /* ------------------------------------------------------------------ */
  // Plays continuously in slow motion. To hide the jump at the loop point, a
  // second copy starts from the beginning and cross-fades in over the last FADE
  // seconds, then the two swap roles. Reduced-motion users keep the still image.
  const SPEED = 0.5; // resting playback rate (1 = normal speed)
  const TRAVEL_SPEED = 1.6; // briefly faster while flying between islands
  const FADE = 1; // seconds of video time spent cross-fading at the loop point
  let rate = SPEED;
  const bgVideos = [];
  // Opacity drives the loop cross-fade; transform follows the mouse (see CSS)
  const bgTransition = () => `opacity ${FADE / SPEED}s linear, transform .8s cubic-bezier(.22, 1, .36, 1)`;
  const bgA = document.querySelector('video.bg');
  if (bgA && !reducedMotion) {
    const bgB = bgA.cloneNode();
    bgA.after(bgB);
    bgVideos.push(bgA, bgB);
    for (const v of bgVideos) {
      v.loop = false;
      v.playbackRate = SPEED;
      v.style.transition = bgTransition();
    }
    bgB.style.opacity = '0';

    let front = bgA;
    let back = bgB;
    let fading = false;

    // WebM files recorded in the browser may not report their length up front;
    // seeking far past the end makes the browser work it out.
    const knownDuration = (v) => new Promise((resolve) => {
      if (Number.isFinite(v.duration)) return resolve(v.duration);
      v.addEventListener('durationchange', function onChange() {
        if (!Number.isFinite(v.duration)) return;
        v.removeEventListener('durationchange', onChange);
        v.currentTime = 0;
        resolve(v.duration);
      });
      v.currentTime = 1e101;
    });

    const tick = (duration) => {
      if (!fading && front.currentTime >= duration - FADE) {
        fading = true;
        // The incoming copy fades in on top; the outgoing one stays fully
        // opaque underneath so the clouds image never shows through mid-fade.
        back.currentTime = 0;
        back.playbackRate = rate;
        back.style.zIndex = '1';
        front.style.zIndex = '0';
        back.play().catch(() => {});
        back.style.opacity = '1';
        setTimeout(() => {
          front.pause();
          front.style.transition = 'transform .8s cubic-bezier(.22, 1, .36, 1)';
          front.style.opacity = '0';
          front.offsetWidth; // apply the instant hide before restoring the transition
          front.style.transition = bgTransition();
          [front, back] = [back, front];
          fading = false;
        }, (FADE / SPEED) * 1000);
      }
      requestAnimationFrame(() => tick(duration));
    };

    const start = () => knownDuration(bgA).then((duration) => {
      bgA.playbackRate = SPEED;
      bgA.play().catch(() => {});
      tick(duration);
    });
    if (bgA.readyState >= 1) start();
    else bgA.addEventListener('loadedmetadata', start, { once: true });
  }

  function setBackgroundRate(r) {
    rate = r;
    for (const v of bgVideos) v.playbackRate = r;
  }

  /* ------------------------------------------------------------------ */
  /* Island journey                                                      */
  /* ------------------------------------------------------------------ */
  // Course order from Figma ("Group 1261154890"). `box` is where the artwork sits
  // inside the 556x497 island frame (left, top, width, height), as in the design.
  // Islands without artwork (img: null) get a simple placeholder island.
  // `status` is the learner's progress (demo values): 'done', 'progress' (with
  // `progress` %), or locked when omitted. Locked islands stay locked even while
  // the learner scrolls past them to look.
  const ISLANDS = [
    { name: 'אי זיהוי אותיות', lessons: '1', img: 'island-abc', box: [0, 0, 568, 476.6], status: 'done' },
    { name: 'אי האותיות של רופא/ה', lessons: '2-4', img: 'island-doctor', box: [0, 0, 564, 478], video: 'island-doctor', status: 'progress', progress: 50 },
    { name: 'אי האותיות המחייכות', img: 'island-smiles', box: [21, 27, 529, 423] },
    { name: 'אי החזרות', img: 'island-review', box: [32, -14, 504, 504] },
    { name: 'אי האותיות הבודדות', img: 'island-single', box: [49, 0, 493, 493] },
    { name: 'אי החזרות', img: 'island-review', box: [32, -14, 504, 504] },
    { name: 'אי צירוף האותיות', img: 'island-blending', box: [0, 48, 557, 371] },
    { name: 'אי האותיות השורקות', img: 'island-whistling', box: [7, 17, 528, 434], flip: true },
    { name: 'אי הקסמים', img: 'island-magic', box: [43, 22, 526, 433] },
    { name: 'אי הצלילים המתקדמים', img: 'island-review', box: [32, -14, 504, 504] },
    { name: 'אי החזרות', img: 'island-review', box: [32, -14, 504, 504] },
  ];

  // Three islands are visible: the active one, the next one, and the one after
  // it, small near the horizon. Odd islands (1st, 3rd, …) sit on the right and
  // even ones on the left. They arrive one after another: the active island
  // first, the next one `delay` seconds later, then the one on the horizon.
  // x is the distance of the island centre from the stage centre, y its centre
  // height on the 1920x1080 stage, s the scale, o the opacity.
  const SLOTS = {
    passed: { x: 380, y: 560, s: 1.5, o: 0, delay: 0 },
    active: { x: 380, y: 560, s: 1.15, o: 1, delay: 0 },
    next: { x: 380, y: 560, s: 0.45, o: 1, delay: 1 },
    horizon: { x: 110, y: 255, s: 0.2, o: 0.9, delay: 2 },
    later: { x: 60, y: 230, s: 0.06, o: 0, delay: 0 },
  };
  const slotFor = (offset, index) => {
    const slot = offset < 0 ? SLOTS.passed
      : offset === 0 ? SLOTS.active
      : offset === 1 ? SLOTS.next
      : offset === 2 ? SLOTS.horizon
      : SLOTS.later;
    const side = index % 2 === 0 ? 1 : -1; // index 0 = island 1 (odd) → right
    return { ...slot, x: W / 2 + side * slot.x };
  };
  // Where the light line touches an island: a little above the card
  const anchor = (slot) => ({ x: slot.x, y: slot.y + 40 * slot.s });

  const journey = document.getElementById('journey');
  const count = document.getElementById('journey-count');
  const prevBtn = document.getElementById('journey-prev');
  const nextBtn = document.getElementById('journey-next');
  const lockSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  const supportsAlphaVideo = !!navigator.userAgentData; // Chromium (Chrome, Edge, Opera)

  const els = ISLANDS.map((island, i) => {
    const a = document.createElement('a');
    a.className = 'island';
    a.href = `#island-${i + 1}`;
    const [l, t, w, h] = island.box || [0, 0, 564, 478];
    const art = island.img
      ? `<img class="island__img${island.flip ? ' island__img--flip' : ''}" src="assets/${island.img}.webp" alt="" style="left:${l}px;top:${t}px;width:${w}px;height:${h}px">`
      : `<div class="island__placeholder">${island.name}</div>`;
    const lessons = island.lessons
      ? `<p class="island__stat"><span>שיעורים</span><b>${island.lessons}</b></p>`
      : '<span></span>';
    a.innerHTML = `
      <div class="island__float">
        ${art}
        <span class="island__lock" aria-label="נעול">${lockSvg}</span>
        <div class="island__card">
          <p class="island__title">${island.name}</p>
          <div class="island__stats">
            ${lessons}
            <div class="island__coins">
              <img src="assets/coin.webp" alt="">
              <p class="island__stat"><span>מטבעות</span><b>350</b></p>
            </div>
          </div>
          <div class="island__progress"><span></span></div>
          <div class="island__done">
            <span class="island__done-label">הושלם</span>
            <img class="island__done-icon" src="assets/icons/done-check.svg" alt="">
          </div>
        </div>
      </div>`;
    a.addEventListener('click', (e) => {
      if (a.dataset.state === 'locked') e.preventDefault();
    });
    // Stagger the hover-float so the islands don't bob in sync
    a.querySelector('.island__float').style.animationDelay = `${-i * 1.3}s`;

    // Island video on mouse-over. Transparent WebM only plays correctly in
    // Chromium browsers; elsewhere the still image stays.
    if (island.video && supportsAlphaVideo && !reducedMotion) {
      const video = document.createElement('video');
      video.className = 'island__video';
      video.src = `assets/${island.video}.webm`;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      a.querySelector('.island__img').after(video);
      a.addEventListener('mouseenter', () => {
        if (a.dataset.state === 'locked') return;
        video.play().then(() => a.classList.add('is-playing')).catch(() => {});
      });
      a.addEventListener('mouseleave', () => {
        a.classList.remove('is-playing');
        video.pause();
      });
    }
    journey.appendChild(a);
    return a;
  });

  let current = 0;

  /* Glowing line of light that links the visible islands. Two segments
     (active → next → horizon), each a soft wide glow, a bright core and a
     travelling sparkle; they draw themselves once the islands have arrived. */
  const NS = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(NS, 'svg');
  path.setAttribute('class', 'journey__path');
  path.setAttribute('viewBox', `0 0 ${W} ${H}`);
  path.innerHTML = `
    <defs>
      <linearGradient id="light" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff6c8"/>
        <stop offset=".5" stop-color="#ffd45c"/>
        <stop offset="1" stop-color="#fff6c8"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>`;
  const segments = [0, 1].map(() => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'journey__seg');
    g.innerHTML = `
      <path class="journey__glow" filter="url(#glow)"/>
      <path class="journey__core"/>
      <path class="journey__spark"/>`;
    path.appendChild(g);
    return g;
  });
  journey.prepend(path);

  function drawLine() {
    const pts = [0, 1, 2]
      .map((o) => current + o)
      .filter((i) => i < ISLANDS.length)
      .map((i) => anchor(slotFor(i - current, i)));
    segments.forEach((g, k) => {
      const a = pts[k];
      const b = pts[k + 1];
      if (!a || !b) { g.classList.remove('is-drawn'); g.style.opacity = '0'; return; }
      // Curve that sags a little below the straight line, like a hanging rope of light
      const cx = (a.x + b.x) / 2;
      const cy = Math.max(a.y, b.y) + 70 - k * 40;
      const d = `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`;
      g.querySelectorAll('path').forEach((p) => p.setAttribute('d', d));
      const len = Math.ceil(g.querySelector('.journey__core').getTotalLength());
      g.style.setProperty('--len', len);
      // Restart the draw-in: hide instantly, then draw after the islands land
      g.classList.remove('is-drawn');
      g.style.opacity = '';
      g.querySelectorAll('path').forEach((p) => { p.style.transition = 'none'; });
      g.getBoundingClientRect();
      g.querySelectorAll('path').forEach((p) => { p.style.transition = ''; });
      g.style.setProperty('--draw-delay', `${(k === 0 ? SLOTS.next.delay : SLOTS.horizon.delay) + 0.6}s`);
      g.classList.add('is-drawn');
    });
  }

  function render() {
    els.forEach((el, i) => {
      const offset = i - current;
      const slot = slotFor(offset, i);
      el.style.transform = `translate(${slot.x - 278}px, ${slot.y - 248}px) scale(${slot.s})`;
      el.style.opacity = slot.o;
      // Arrive one after another; leaving and hiding happen at once
      el.style.transitionDelay = reducedMotion ? '0s' : `${slot.delay}s`;
      el.style.zIndex = offset === 0 ? 100 : offset === 1 ? 60 : 50;
      el.dataset.slot = offset === 0 ? 'active' : offset === 1 ? 'next' : offset === 2 ? 'horizon' : 'hidden';
      const status = ISLANDS[i].status || 'locked';
      el.dataset.state = status;
      el.setAttribute('aria-disabled', status === 'locked' ? 'true' : 'false');
      el.tabIndex = offset === 0 ? 0 : -1;
      // The bar fills when the island arrives in front
      el.querySelector('.island__progress span').style.width =
        offset === 0 && status === 'progress' ? `${ISLANDS[i].progress || 0}%` : '0%';
    });
    syncMenu();
    drawLine();
    count.textContent = `${current + 1} / ${ISLANDS.length}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === ISLANDS.length - 1;
  }

  // One move per gesture: ignore further input until the flight has finished.
  const TRAVEL_MS = 1100;
  let busy = false;
  function goTo(target) {
    target = Math.max(0, Math.min(ISLANDS.length - 1, target));
    if (busy || target === current) return;
    busy = true;
    current = target;
    if (!reducedMotion) setBackgroundRate(TRAVEL_SPEED);
    render();
    setTimeout(() => {
      busy = false;
      setBackgroundRate(SPEED);
    }, TRAVEL_MS);
  }
  const go = (step) => goTo(current + step);

  // Mouse wheel / trackpad: forward (down) = next island, back (up) = previous
  let wheelSum = 0;
  let wheelTimer;
  window.addEventListener('wheel', (e) => {
    if (menuOpen) return; // let the menu scroll
    e.preventDefault();
    wheelSum += e.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelSum = 0; }, 200);
    if (Math.abs(wheelSum) > 40) {
      go(wheelSum > 0 ? 1 : -1);
      wheelSum = 0;
    }
  }, { passive: false });

  // Touch: swipe up/left = next, down/right = previous (RTL reading direction)
  let touchStart = null;
  window.addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!touchStart || menuOpen) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    const d = Math.abs(dy) > Math.abs(dx) ? -dy : dx;
    if (Math.abs(d) > 50) go(d > 0 ? 1 : -1);
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) { setMenu(false); return; }
    if (menuOpen) return;
    if (['ArrowDown', 'PageDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowUp', 'PageUp', 'ArrowRight'].includes(e.key)) { e.preventDefault(); go(-1); }
  });

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  /* ------------------------------------------------------------------ */
  /* Side menu                                                           */
  /* ------------------------------------------------------------------ */
  const viewport = document.querySelector('.viewport');
  const sidebar = document.getElementById('sidebar');
  const menuOpenBtn = document.getElementById('menu-open');
  let menuOpen = false;

  function setMenu(open) {
    menuOpen = open;
    viewport.classList.toggle('menu-open', open);
    sidebar.setAttribute('aria-hidden', String(!open));
    menuOpenBtn.setAttribute('aria-expanded', String(open));
    if (open) sidebar.querySelector('.sidebar__close').focus();
    else menuOpenBtn.focus();
  }
  menuOpenBtn.addEventListener('click', () => setMenu(true));
  document.getElementById('menu-close').addEventListener('click', () => setMenu(false));
  document.getElementById('sidebar-backdrop').addEventListener('click', () => setMenu(false));

  // Stagger the cascade-in of the menu rows
  sidebar.querySelectorAll('.sb-item').forEach((el, i) => el.style.setProperty('--i', i));

  // Collapsible groups
  sidebar.querySelectorAll('.sb-link--group').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.sb-group');
      const open = !group.classList.contains('is-open');
      group.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  // Island lists: game worlds and review islands, each jumping to its island
  const menuLinks = [];
  const fillList = (containerId, filter, label) => {
    const inner = document.createElement('div');
    inner.className = 'sb-sub__inner';
    let n = 0;
    ISLANDS.forEach((island, i) => {
      if (!filter(island)) return;
      n += 1;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sb-sublink';
      const status = island.status === 'done' ? '<span class="sb-sublink__status sb-sublink__status--done">✓ הושלם</span>'
        : island.status === 'progress' ? `<span class="sb-sublink__status">${island.progress || 0}%</span>`
        : '<span class="sb-sublink__status" aria-label="נעול">🔒</span>';
      b.innerHTML = `<span>${label(island, n)}</span>${status}`;
      b.addEventListener('click', () => {
        setMenu(false);
        setTimeout(() => goTo(i), 400);
      });
      inner.appendChild(b);
      menuLinks.push([b, i]);
    });
    document.getElementById(containerId).appendChild(inner);
  };
  const isReview = (island) => island.name === 'אי החזרות';
  const short = (island) => island.name.replace(/^אי (ה)?/, '');
  fillList('sb-worlds', (island) => !isReview(island),
    (island) => (island.lessons ? `${short(island)} (שיעור ${island.lessons})` : short(island)));
  fillList('sb-reviews', isReview, (island, n) => `חזרה ${n}`);

  function syncMenu() {
    menuLinks.forEach(([b, i]) => b.classList.toggle('is-current', i === current));
  }

  /* ------------------------------------------------------------------ */
  /* Mouse depth                                                         */
  /* ------------------------------------------------------------------ */
  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    let raf = 0;
    window.addEventListener('mousemove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        viewport.style.setProperty('--mx', ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        viewport.style.setProperty('--my', ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Loader and entrance                                                 */
  /* ------------------------------------------------------------------ */
  // First paint: every island waits invisible and tiny at the horizon, so that
  // when the loader lifts they arrive in turn (see `arrive` below)
  render();
  els.forEach((el, i) => {
    const far = slotFor(3, i);
    el.style.transition = 'none';
    el.style.transform = `translate(${far.x - 278}px, ${far.y - 248}px) scale(${far.s})`;
    el.style.opacity = 0;
  });
  journey.offsetWidth;
  els.forEach((el) => { el.style.transition = ''; });
  path.style.visibility = 'hidden'; // no light line until the islands arrive
  const arrive = () => { path.style.visibility = ''; render(); };

  const loader = document.getElementById('loader');
  const bar = document.getElementById('loader-bar');
  const pct = document.getElementById('loader-pct');
  document.body.classList.add('is-loading');

  // Count what the first view needs: the visible images, the background video
  // and the fonts. Anything slow is given up on after MAX_WAIT.
  const MIN_SHOW = 1200;
  const MAX_WAIT = 8000;
  const started = performance.now();
  const tasks = [
    ...[...document.images].map((img) => (img.complete ? Promise.resolve()
      : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }))),
    document.fonts ? document.fonts.ready : Promise.resolve(),
  ];
  if (bgA) {
    tasks.push(bgA.readyState >= 3 ? Promise.resolve()
      : new Promise((r) => { bgA.addEventListener('canplay', r, { once: true }); bgA.addEventListener('error', r, { once: true }); }));
  }
  let done = 0;
  let shown = 0;
  tasks.forEach((t) => t.then(() => { done += 1; }));
  // Ease the number toward the real progress so it counts up smoothly
  const counter = () => {
    const target = (done / tasks.length) * 100;
    shown += (target - shown) * 0.12;
    if (target - shown < 0.5) shown = target;
    bar.style.width = `${shown}%`;
    pct.textContent = Math.round(shown);
    if (!finished) requestAnimationFrame(counter);
  };
  let finished = false;
  requestAnimationFrame(counter);

  const allLoaded = Promise.all(tasks);
  const timeout = new Promise((r) => setTimeout(r, MAX_WAIT));
  Promise.race([allLoaded, timeout]).then(() => {
    const wait = Math.max(0, MIN_SHOW - (performance.now() - started));
    setTimeout(() => {
      finished = true;
      bar.style.width = '100%';
      pct.textContent = '100';
      setTimeout(() => {
        loader.classList.add('is-done');
        document.body.classList.remove('is-loading');
        setTimeout(arrive, 500);
        setTimeout(() => {
          document.body.classList.add('is-ready');
          loader.remove();
        }, 1800);
      }, 250);
    }, wait);
  });
})();
