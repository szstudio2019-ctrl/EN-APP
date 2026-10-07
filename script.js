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
    // the bottom-left controls sit at the window's own left edge, even past the stage
    stage.style.setProperty('--edge-shift', `${(-x / scale).toFixed(1)}px`);
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
  // The island list lives in islands.js (shared with the menu and island pages)
  const ISLANDS = window.ISLANDS;

  // One island is visible at a time. Odd islands (1st, 3rd, …) sit on the
  // right and even ones on the left. On scroll the current island shrinks away
  // and fades while a snake of light slithers across to the other side, and the
  // new island grows in where it lands. Hidden islands wait small and
  // transparent on their own side, at the same height.
  // x is the distance of the island centre from the stage centre, y its centre
  // height on the 1920x1080 stage, s the scale, o the opacity, delay in seconds.
  const SLOTS = {
    passed: { x: 380, y: 560, s: 0.55, o: 0, delay: 0 },
    active: { x: 380, y: 560, s: 1.15, o: 1, delay: 0.15 },
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
  const touchOnly = window.matchMedia('(hover: none)').matches; // phones and tablets

  const els = ISLANDS.map((island, i) => {
    const a = document.createElement('a');
    a.className = 'island';
    a.href = island.page || `#island-${i + 1}`;
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
      : { icon: 'coin.webp', label: 'מטבעות', value: island.coins ?? 350 };
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

    // Animated island: the still shows the clip's first frame. Hovering plays
    // the animation with its sound ("Ahhh", from a separate, louder WAV); on
    // touch screens it plays on its own while in front, silently. Browsers only
    // allow sound once the visitor has clicked or tapped the page, so the very
    // first hover after loading may be silent.
    // Chromium gets the transparent WebM; Safari / iPhone, which can't show
    // transparent WebM, get an animated WebP.
    if (island.video && !reducedMotion) {
      const [vl, vt, vw, vh] = island.videoBox || [l, t, w, h];
      const still = a.querySelector('.island__img');
      const boxCss = `left:${vl}px;top:${vt}px;width:${vw}px;height:${vh}px`;
      const sfx = island.sound ? new Audio(`assets/${island.sound}.wav`) : null;
      if (sfx) sfx.preload = 'auto';
      const playSound = () => { if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); } };
      const stopSound = () => { if (sfx) sfx.pause(); };

      if (supportsAlphaVideo) {
        // Two copies of the clip take turns: while one plays, the other waits
        // decoded on its first frame, so the loop restarts without a seek hitch.
        const makeVideo = () => {
          const v = document.createElement('video');
          v.className = 'island__video';
          v.src = `assets/${island.video}.webm`;
          v.muted = true;
          v.playsInline = true;
          v.preload = 'auto';
          v.style.cssText = boxCss;
          return v;
        };
        let front = makeVideo();
        let back = makeVideo();
        back.classList.add('is-standby');
        still.after(front, back);
        let running = false;
        let soundPass = false; // the current pass was started by a click

        const swap = () => {
          if (!running) return;
          // the sound pass finished after the mouse had already left: rest on the still
          if (soundPass && !touchOnly && !a.classList.contains('is-hot')) { soundPass = false; island.stop(); return; }
          soundPass = false;
          back.play().catch(() => {});
          back.classList.remove('is-standby');
          front.classList.add('is-standby');
          front.pause();
          front.currentTime = 0;
          [front, back] = [back, front];
        };
        front.addEventListener('ended', swap);
        back.addEventListener('ended', swap);

        island.start = (withSound) => {
          if (running) return;
          running = true;
          front.currentTime = 0;
          front.play().then(() => a.classList.add('is-playing')).catch(() => {});
          if (withSound) playSound();
        };
        island.stop = () => {
          running = false;
          soundPass = false;
          a.classList.remove('is-playing');
          for (const v of [front, back]) v.pause();
          // rewind only once the clip has faded out, so it doesn't visibly jump
          clearTimeout(island.rewind);
          island.rewind = setTimeout(() => { if (!running) for (const v of [front, back]) v.currentTime = 0; }, 500);
          stopSound();
        };
        a.addEventListener('island-hot', () => island.start(true));
        // touch screens fire mouseleave after a tap; there the island keeps playing
        a.addEventListener('island-cold', () => { if (!soundPass && !touchOnly) island.stop(); });
        // Browsers pause silent video in a background tab; pick up again on return
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && running && front.paused) front.play().catch(() => {});
        });
        a.addEventListener('click', (e) => {
          if (a.dataset.slot !== 'active') return;
          if (island.page) return; // the island opens its own page
          e.preventDefault(); // the sound belongs to hover only
        });
      } else {
        // Safari / iPhone fallback
        const anim = document.createElement('img');
        anim.className = 'island__video';
        anim.alt = '';
        anim.style.cssText = boxCss;
        still.after(anim);
        const restart = () => { anim.src = `assets/${island.video}.webp?${Date.now()}`; };
        island.start = (withSound) => { restart(); a.classList.add('is-playing'); if (withSound) playSound(); };
        island.stop = () => { a.classList.remove('is-playing'); anim.removeAttribute('src'); stopSound(); };
        a.addEventListener('island-hot', () => island.start(true));
        a.addEventListener('island-cold', () => { if (!touchOnly) island.stop(); });
        a.addEventListener('click', (e) => {
          if (a.dataset.slot !== 'active') return;
          if (island.page) return; // the island opens its own page
          e.preventDefault(); // the sound belongs to hover only
        });
      }
    }
    a.addEventListener('mouseenter', () => { if (a.dataset.slot === 'active') setHot(true); });
    a.addEventListener('mouseleave', () => { if (a.dataset.slot === 'active') cool(); });
    journey.appendChild(a);
    return a;
  });

  // Start at the island named in the link (index.html#island-N), else the first
  let current = (() => {
    const m = /^#island-(\d+)$/.exec(location.hash);
    const n = m ? Number(m[1]) - 1 : 0;
    return n >= 0 && n < ISLANDS.length ? n : 0;
  })();

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

  const SNAKE_MS = 950; // head travels from start to end, then the tail follows
  const SNAKE_LEN = 0.55; // visible body length as a share of the whole route
  let snakeRaf = 0;
  const ease = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)); // ease-out: quick start, slow settle

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

  /* "About this world" bubble beside the island in front, on the side facing
     the centre of the screen. It is shown as soon as the island arrives, and it
     is part of the island's hover area: hovering the island or the bubble
     plays the island's animation and glow. */
  const aboutEl = document.getElementById('island-about');
  let hot = false;
  let coolTimer;

  function setHot(on) {
    clearTimeout(coolTimer);
    if (on === hot) return;
    hot = on;
    const a = els[current];
    a.classList.toggle('is-hot', on);
    a.dispatchEvent(new Event(on ? 'island-hot' : 'island-cold'));
  }
  const cool = () => { clearTimeout(coolTimer); coolTimer = setTimeout(() => setHot(false), 150); };

  // Called whenever the island in front changes
  function showAbout() {
    if (!aboutEl) return;
    clearTimeout(showAbout.swap);
    clearTimeout(showAbout.t);
    clearTimeout(coolTimer);
    hot = false;
    els.forEach((el) => el.classList.remove('is-hot'));
    // 1) the old bubble fades out where it is, still showing its own island
    const wasShown = aboutEl.classList.contains('is-shown');
    aboutEl.classList.remove('is-shown');
    // 2) only once it is invisible does it move to the new island's side and
    //    take the new text; 3) it fades in after the island has arrived
    const index = current;
    showAbout.swap = setTimeout(() => {
      const island = ISLANDS[index];
      const about = island.about;
      if (!about) { aboutEl.innerHTML = ''; return; }
      aboutEl.classList.toggle('is-left', index % 2 === 0); // island on the right → bubble on its left
      aboutEl.innerHTML = `
        <p class="island-about__island">${island.name}</p>
        <h2 class="island-about__title">${about.title}</h2>
        <p class="island-about__text">${about.text}</p>
        ${island.page ? `<a class="btn-pill island-about__go" href="${island.page}"><img src="assets/chevron.svg" alt="" class="btn-pill__chevron"><span>לעולם הזה</span></a>` : ''}`;
      showAbout.t = setTimeout(() => aboutEl.classList.add('is-shown'), 450);
    }, wasShown ? 300 : 0);
  }

  if (aboutEl) {
    aboutEl.addEventListener('mouseenter', () => setHot(true));
    aboutEl.addEventListener('mouseleave', cool);
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
      // Animated islands stop when they leave the front. On touch screens
      // (no hover) the island in front plays on its own instead.
      if (ISLANDS[i].stop) {
        if (offset !== 0) ISLANDS[i].stop();
        else if (touchOnly) setTimeout(() => { if (current === i) ISLANDS[i].start(); }, 900);
      }
      // The bar fills when the island arrives in front
      el.querySelector('.island__progress span').style.width =
        offset === 0 && status === 'progress' ? `${ISLANDS[i].progress || 0}%` : '0%';
    });
    window.SiteMenu.sync(current);
    showAbout();
    count.textContent = `${current + 1} / ${ISLANDS.length}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === ISLANDS.length - 1;
  }

  // One move per gesture: ignore further input until the flight has finished.
  const TRAVEL_MS = 850;
  let busy = false;
  // A move asked for while one is still playing is remembered (one step) and
  // runs as soon as the current one finishes, so quick scrolling isn't lost.
  let queued = null;
  function goTo(target) {
    target = Math.max(0, Math.min(ISLANDS.length - 1, target));
    if (target === current) return;
    if (busy) { queued = target; return; }
    busy = true;
    const from = current;
    const forward = target > from;
    current = target;
    if (!reducedMotion) setBackgroundRate(TRAVEL_SPEED);
    const place = (el, slot) => { el.style.transform = `translate(${slot.x - 278}px, ${slot.y - 248}px) scale(${slot.s})`; };
    const sideOf = (i) => (i % 2 === 0 ? 1 : -1); // right-hand islands are on the right
    const big = (i) => ({ ...SLOTS.leaving, x: W / 2 + sideOf(i) * SLOTS.leaving.x });
    const incoming = els[target];
    if (!forward) {
      // Going back is the mirror of going forward: the island returns from up
      // close (big) instead of growing out of the distance
      incoming.style.transition = 'none';
      place(incoming, big(target));
      incoming.style.opacity = 0;
      incoming.offsetWidth;
      incoming.style.transition = '';
    }
    render();
    const leaving = els[from];
    leaving.style.transitionDelay = '0s';
    // Forward: the island being left grows past the viewer. Back: it shrinks
    // away into the distance (render() already sent it to its small slot).
    if (forward) place(leaving, big(from));
    snake(from, target);
    setTimeout(() => {
      busy = false;
      setBackgroundRate(SPEED);
      // …then quietly returns, invisible, to its resting slot
      const rest = slotFor(from - current, from);
      leaving.style.transition = 'none';
      place(leaving, rest);
      leaving.offsetWidth;
      leaving.style.transition = '';
      if (queued !== null) { const next = queued; queued = null; goTo(next); }
    }, TRAVEL_MS);
  }
  const go = (step) => goTo(current + step);
  window.journeyGoTo = goTo; // used by the side menu

  // Mouse wheel / trackpad: forward (down) = next island, back (up) = previous
  let wheelSum = 0;
  let wheelTimer;
  window.addEventListener('wheel', (e) => {
    if (window.SiteMenu.isOpen()) return; // let the menu scroll
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
    if (!touchStart || window.SiteMenu.isOpen()) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    const d = Math.abs(dy) > Math.abs(dx) ? -dy : dx;
    if (Math.abs(d) > 50) go(d > 0 ? 1 : -1);
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (window.SiteMenu.isOpen()) return;
    if (['ArrowDown', 'PageDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowUp', 'PageUp', 'ArrowRight'].includes(e.key)) { e.preventDefault(); go(-1); }
  });

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  const viewport = document.querySelector('.viewport');

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
  /* ------------------------------------------------------------------ */
  /* Trophy: the hidden sentence                                         */
  /* ------------------------------------------------------------------ */
  const trophy = document.querySelector('.trophy');
  if (trophy) {
    const setTrophy = (open) => trophy.setAttribute('aria-expanded', String(open));
    trophy.addEventListener('click', (e) => {
      e.stopPropagation();
      setTrophy(trophy.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.trophy-hint')) setTrophy(false);
    });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setTrophy(false); });
  }
})();
