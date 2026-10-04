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
  const bgA = document.querySelector('video.bg');
  if (bgA && !reducedMotion) {
    const bgB = bgA.cloneNode();
    bgA.after(bgB);
    bgVideos.push(bgA, bgB);
    for (const v of bgVideos) {
      v.loop = false;
      v.playbackRate = SPEED;
      v.style.transition = `opacity ${FADE / SPEED}s linear`;
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
          front.style.transition = 'none';
          front.style.opacity = '0';
          front.offsetWidth; // apply the instant hide before restoring the transition
          front.style.transition = `opacity ${FADE / SPEED}s linear`;
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
  const ISLANDS = [
    { name: 'אי זיהוי אותיות', lessons: '1', img: 'island-abc', box: [0, 0, 568, 476.6] },
    { name: 'אי האותיות של רופא/ה', lessons: '2-4', img: 'island-doctor', box: [0, 0, 564, 478] },
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

  // Where an island sits relative to the active one (offset = index - current).
  // x/y are the island centre on the 1920x1080 stage; s is its scale; o opacity.
  const SLOTS = {
    passed: { x: 420, y: 1250, s: 2.1, o: 0 }, // flies past the viewer and out
    0: { x: 960, y: 560, s: 1.2, o: 1 }, // active: front and centre
    1: { x: 1420, y: 340, s: 0.44, o: 1 },
    2: { x: 560, y: 280, s: 0.3, o: 1 },
    3: { x: 1200, y: 232, s: 0.21, o: 0.95 },
    4: { x: 800, y: 205, s: 0.15, o: 0.8 },
    far: { x: 1000, y: 190, s: 0.06, o: 0 }, // beyond the horizon
  };
  const slotFor = (offset) => (offset < 0 ? SLOTS.passed : offset > 4 ? SLOTS.far : SLOTS[offset]);

  const journey = document.getElementById('journey');
  const count = document.getElementById('journey-count');
  const prevBtn = document.getElementById('journey-prev');
  const nextBtn = document.getElementById('journey-next');
  const lockSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

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
        </div>
      </div>`;
    a.addEventListener('click', (e) => {
      if (a.dataset.state === 'locked') e.preventDefault();
    });
    journey.appendChild(a);
    return a;
  });

  let current = 0;

  function render() {
    els.forEach((el, i) => {
      const offset = i - current;
      const slot = slotFor(offset);
      el.style.transform = `translate(${slot.x - 278}px, ${slot.y - 248}px) scale(${slot.s})`;
      el.style.opacity = slot.o;
      el.style.zIndex = offset < 0 ? 200 : 100 - offset;
      // Distant islands get a touch of haze
      el.style.filter = offset > 1 ? `blur(${Math.min(offset - 1, 3) * 0.6}px)` : 'none';
      el.dataset.slot = offset < -1 || offset > 4 ? 'hidden' : String(offset);
      el.dataset.state = offset < 0 ? 'done' : offset === 0 ? 'current' : 'locked';
      el.setAttribute('aria-disabled', offset > 0 ? 'true' : 'false');
      el.tabIndex = offset === 0 ? 0 : -1;
      el.querySelector('.island__progress span').style.width = offset < 0 ? '100%' : '0%';
    });
    count.textContent = `${current + 1} / ${ISLANDS.length}`;
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === ISLANDS.length - 1;
  }

  // One step per gesture: ignore further input until the flight has finished.
  const TRAVEL_MS = 1100;
  let busy = false;
  function go(step) {
    const target = Math.max(0, Math.min(ISLANDS.length - 1, current + step));
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

  // Mouse wheel / trackpad: forward (down) = next island, back (up) = previous
  let wheelSum = 0;
  let wheelTimer;
  window.addEventListener('wheel', (e) => {
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
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    const d = Math.abs(dy) > Math.abs(dx) ? -dy : dx;
    if (Math.abs(d) > 50) go(d > 0 ? 1 : -1);
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); go(1); }
    if (['ArrowUp', 'PageUp', 'ArrowRight'].includes(e.key)) { e.preventDefault(); go(-1); }
  });

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  // First paint without animation, then enable transitions
  els.forEach((el) => { el.style.transition = 'none'; });
  render();
  journey.offsetWidth;
  els.forEach((el) => { el.style.transition = ''; });
})();
