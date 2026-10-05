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
    { name: 'אי האותיות של רופא/ה', lessons: '2-4', img: 'island-doctor', box: [0, 0, 564, 478], video: 'island-doctor-ahh', status: 'progress', progress: 50 },
    { name: 'אי האותיות המחייכות', lessons: '5-11', img: 'island-smiles', box: [21, 27, 529, 423] },
    { name: 'אי החזרות', review: '1-11', img: 'island-review', box: [32, -14, 504, 504] },
    { name: 'אי האותיות הבודדות', lessons: '13-19', img: 'island-single', box: [49, 0, 493, 493] },
    { name: 'אי החזרות', review: '1-19', img: 'island-review', box: [32, -14, 504, 504] },
    { name: 'אי צירוף האותיות', lessons: '20-27', img: 'island-blending', box: [0, 48, 557, 371] },
    { name: 'אי האותיות השורקות', lessons: '28-31', img: 'island-whistling', box: [7, 17, 528, 434], flip: true },
    { name: 'אי הקסמים', lessons: '32-39', img: 'island-magic', box: [43, 22, 526, 433] },
    { name: 'אי הצלילים המתקדמים', lessons: '42-45', img: 'island-review', box: [32, -14, 504, 504] },
    { name: 'אי החזרות', review: '1-45', img: 'island-review', box: [32, -14, 504, 504] },
  ];

  // One island is visible at a time. Odd islands (1st, 3rd, …) sit on the
  // right and even ones on the left. On scroll the current island shrinks away
  // and fades while a snake of light slithers across to the other side, and the
  // new island grows in where it lands. Hidden islands wait small and
  // transparent on their own side, at the same height.
  // x is the distance of the island centre from the stage centre, y its centre
  // height on the 1920x1080 stage, s the scale, o the opacity, delay in seconds.
  const SLOTS = {
    passed: { x: 380, y: 560, s: 0.55, o: 0, delay: 0 },
    active: { x: 380, y: 560, s: 1.15, o: 1, delay: 0.45 },
    waiting: { x: 380, y: 560, s: 0.55, o: 0, delay: 0 },
    // the island being left grows and drifts out past its own side as it fades
    leaving: { x: 640, y: 560, s: 1.7, o: 0, delay: 0 },
  };
  const slotFor = (offset, index) => {
    const slot = offset < 0 ? SLOTS.passed : offset === 0 ? SLOTS.active : SLOTS.waiting;
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
    // Review islands (Figma): "חזרות" range and "תרגולים 800" with a treasure chest;
    // lesson islands: "שיעורים" range and "מטבעות 350" with a coin
    const range = island.review
      ? `<p class="island__stat"><span>חזרות</span><b>${island.review}</b></p>`
      : island.lessons
        ? `<p class="island__stat"><span>שיעורים</span><b>${island.lessons}</b></p>`
        : '<span></span>';
    const reward = island.review
      ? { icon: 'chest.webp', label: 'תרגולים', value: 800 }
      : { icon: 'coin.webp', label: 'מטבעות', value: 350 };
    a.innerHTML = `
      <div class="island__float">
        ${art}
        <span class="island__lock" aria-label="נעול">${lockSvg}</span>
        <div class="island__card">
          <p class="island__title">${island.name}</p>
          <div class="island__stats">
            ${range}
            <div class="island__coins">
              <img src="assets/${reward.icon}" alt="">
              <p class="island__stat"><span>${reward.label}</span><b>${reward.value}</b></p>
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
      // Two copies of the clip take turns: while one plays, the other waits
      // decoded on its first frame, so the loop restarts without a seek hitch.
      const makeVideo = () => {
        const v = document.createElement('video');
        v.className = 'island__video';
        v.src = `assets/${island.video}.webm`;
        v.playsInline = true;
        v.preload = 'auto';
        // The video covers exactly the same box as the still image
        v.style.cssText = `left:${l}px;top:${t}px;width:${w}px;height:${h}px`;
        return v;
      };
      let front = makeVideo();
      let back = makeVideo();
      back.classList.add('is-standby');
      a.querySelector('.island__img').after(front, back);
      let hovering = false;

      // With sound when the browser allows it (after the visitor has clicked or
      // pressed a key on the page); otherwise silently
      const playWithSound = (v) => {
        v.muted = false;
        return v.play().catch(() => { v.muted = true; return v.play(); });
      };
      const swap = () => {
        if (!hovering) return;
        playWithSound(back).catch(() => {});
        back.classList.remove('is-standby');
        front.classList.add('is-standby');
        front.pause();
        front.currentTime = 0;
        [front, back] = [back, front];
      };
      front.addEventListener('ended', swap);
      back.addEventListener('ended', swap);

      a.addEventListener('mouseenter', () => {
        if (a.dataset.state === 'locked') return;
        hovering = true;
        playWithSound(front).then(() => a.classList.add('is-playing')).catch(() => {});
      });
      a.addEventListener('mouseleave', () => {
        hovering = false;
        a.classList.remove('is-playing');
        for (const v of [front, back]) { v.pause(); v.currentTime = 0; }
      });
    }
    journey.appendChild(a);
    return a;
  });

  let current = 0;

  /* Trail of light: while moving between islands, a glowing half arc
     slithers from the island being left to the one arriving, then slides into
     it and disappears. White core, pink-purple glow, drawn every frame. */
  const NS = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(NS, 'svg');
  path.setAttribute('class', 'journey__path');
  path.setAttribute('viewBox', `0 0 ${W} ${H}`);
  path.innerHTML = `
    <defs>
      <linearGradient id="glow-color" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ff5fa8"/>
        <stop offset=".5" stop-color="#b45cff"/>
        <stop offset="1" stop-color="#ff5fa8"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <g class="journey__seg">
      <path class="journey__glow" filter="url(#glow)"/>
      <path class="journey__core"/>
    </g>`;
  const snakeParts = path.querySelectorAll('.journey__seg path');
  journey.prepend(path);

  const SNAKE_MS = 1500; // head travels from start to end, then the tail follows
  const SNAKE_LEN = 0.55; // visible body length as a share of the whole route
  let snakeRaf = 0;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function snake(fromIndex, toIndex) {
    cancelAnimationFrame(snakeRaf);
    if (reducedMotion) return;
    const A = anchor(slotFor(0, fromIndex));
    const B = anchor(slotFor(0, toIndex));
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const dist = Math.hypot(dx, dy);
    // A half arc that rises out of the island being left and comes in to the
    // new island from its side (level, heading outward), not from above.
    const sideIn = toIndex % 2 === 0 ? 1 : -1; // +1: new island is on the right
    const end = { x: B.x - sideIn * 250, y: B.y - 30 }; // its inner flank
    const lift = Math.max(260, dist * 0.45);
    const p1 = { x: A.x, y: A.y - lift }; // leave going straight up
    const p2 = { x: end.x - sideIn * dist * 0.35, y: end.y }; // arrive level
    const point = (u) => {
      const v = 1 - u;
      const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
      return [a * A.x + b * p1.x + c * p2.x + d * end.x, a * A.y + b * p1.y + c * p2.y + d * end.y];
    };
    const start = performance.now();
    path.classList.add('is-travelling');
    const frame = (now) => {
      const t = Math.min(1, (now - start) / SNAKE_MS);
      const head = ease(Math.min(1, t * 1.25)); // head arrives a little before the end
      const tail = Math.max(0, head - SNAKE_LEN) + (t > 0.8 ? (t - 0.8) / 0.2 * (1 - Math.max(0, head - SNAKE_LEN)) : 0);
      let d = '';
      const steps = 60;
      for (let k = 0; k <= steps; k++) {
        const u = tail + (head - tail) * (k / steps);
        const [x, y] = point(u);
        d += `${k ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      }
      snakeParts.forEach((p) => p.setAttribute('d', head - tail > 0.002 ? d : ''));
      if (t < 1) snakeRaf = requestAnimationFrame(frame);
      else path.classList.remove('is-travelling');
    };
    snakeRaf = requestAnimationFrame(frame);
  }

  function render() {
    els.forEach((el, i) => {
      const offset = i - current;
      const slot = slotFor(offset, i);
      el.style.transform = `translate(${slot.x - 278}px, ${slot.y - 248}px) scale(${slot.s})`;
      el.style.opacity = slot.o;
      // Arrive one after another; leaving and hiding happen at once
      el.style.transitionDelay = reducedMotion ? '0s' : `${slot.delay}s`;
      el.style.zIndex = offset === 0 ? 100 : 50;
      el.dataset.slot = offset === 0 ? 'active' : 'hidden';
      const status = ISLANDS[i].status || 'locked';
      el.dataset.state = status;
      el.setAttribute('aria-disabled', status === 'locked' ? 'true' : 'false');
      el.tabIndex = offset === 0 ? 0 : -1;
      // The bar fills when the island arrives in front
      el.querySelector('.island__progress span').style.width =
        offset === 0 && status === 'progress' ? `${ISLANDS[i].progress || 0}%` : '0%';
    });
    syncMenu();
    count.textContent = `${current + 1} / ${ISLANDS.length}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === ISLANDS.length - 1;
  }

  // One move per gesture: ignore further input until the flight has finished.
  const TRAVEL_MS = 1600;
  let busy = false;
  function goTo(target) {
    target = Math.max(0, Math.min(ISLANDS.length - 1, target));
    if (busy || target === current) return;
    busy = true;
    const from = current;
    current = target;
    if (!reducedMotion) setBackgroundRate(TRAVEL_SPEED);
    render();
    // The island being left grows and fades out (in either direction)…
    const leaving = els[from];
    const side = from % 2 === 0 ? 1 : -1; // right-hand islands leave to the right
    const big = { ...SLOTS.leaving, x: W / 2 + side * SLOTS.leaving.x };
    leaving.style.transitionDelay = '0s';
    leaving.style.transform = `translate(${big.x - 278}px, ${big.y - 248}px) scale(${big.s})`;
    snake(from, target);
    setTimeout(() => {
      busy = false;
      setBackgroundRate(SPEED);
      // …then quietly returns, invisible, to its resting slot
      const rest = slotFor(from - current, from);
      leaving.style.transition = 'none';
      leaving.style.transform = `translate(${rest.x - 278}px, ${rest.y - 248}px) scale(${rest.s})`;
      leaving.offsetWidth;
      leaving.style.transition = '';
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
  const arrive = () => render();

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
