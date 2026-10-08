// Island page: fits the 1920x1080 stage, fills in the WORLD settings, plays the
// animated island on the right and opens the trophy sentence bubble.
(function () {
  const W = 1920;
  const H = 1080;
  const WORLD = window.WORLD;
  const stage = document.getElementById('stage');
  const viewport = document.querySelector('.viewport');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canSound = () => !!(navigator.userActivation && navigator.userActivation.hasBeenActive);

  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform = `translate(${(window.innerWidth - W * scale) / 2}px, ${(window.innerHeight - H * scale) / 2}px) scale(${scale})`;
    // the bottom-left controls sit at the window's own left edge, even past the stage
    stage.style.setProperty('--edge-shift', `${(-(window.innerWidth - W * scale) / 2 / scale).toFixed(1)}px`);
    // …and the islands drawer reaches the window's bottom edge
    stage.style.setProperty('--edge-shift-y', `${(-(window.innerHeight - H * scale) / 2 / scale).toFixed(1)}px`);
    // How much bigger the background scene must be drawn, around the stage
    // centre, to fill the whole window: its width is 1920 and it reaches 626px
    // above / 655px below the centre (1281px tall, 86px above the stage).
    const k = Math.max(
      1,
      window.innerWidth / (W * scale),
      (window.innerHeight / 2) / (626 * scale),
    );
    stage.style.setProperty('--scene-k', (k * 1.01).toFixed(4));
  }
  window.addEventListener('resize', fit);
  fit();

  document.body.classList.add('is-loading');

  /* Background scene (hidden, with the clouds behind, if the file is missing) */
  const bg = document.getElementById('world-bg');
  bg.addEventListener('error', () => bg.classList.add('is-missing'));
  bg.src = WORLD.background;

  /* Island name on the clearing */
  const heading = document.getElementById('world-heading');
  if (heading && WORLD.heading) {
    heading.style.left = `${WORLD.heading.x}px`;
    heading.style.top = `${WORLD.heading.y}px`;
    // Game-logo style title built from text (styles in world.css): the first
    // line glossy yellow with a thick navy outline, the second white on a blue
    // pill; `deco` adds that world's ornaments (e.g. 'doctor': pluses and a
    // stethoscope). Any island page gets it by changing the words only.
    const [top, bottom] = WORLD.heading.lines;
    heading.classList.add('game-title');
    heading.setAttribute('aria-label', WORLD.heading.lines.join(' '));
    // both lines follow an upward arc (SVG text on a path)
    heading.innerHTML = `
      <svg class="game-title__svg" viewBox="0 0 760 265" aria-hidden="true">
        <defs>
          <linearGradient id="gt-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fffbd0"/><stop offset=".18" stop-color="#fff04a"/><stop offset=".45" stop-color="#ffd61f"/>
            <stop offset=".75" stop-color="#ffb112"/><stop offset="1" stop-color="#ff8a00"/>
          </linearGradient>
          <linearGradient id="gt-blue" x1="0" y1="103" x2="0" y2="223" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#4a47b8"/><stop offset=".55" stop-color="#2f2c8f"/><stop offset="1" stop-color="#242275"/>
          </linearGradient>
          <!-- inner shadow: a darker band along the bottom of each letter and a
               light band along the top, so the letters look rounded -->
          <filter id="gt-inner-gold" x="-5%" y="-10%" width="110%" height="130%">
            <feOffset in="SourceAlpha" dy="-7" result="up"/>
            <feComposite in="SourceAlpha" in2="up" operator="out" result="bottomBand"/>
            <feGaussianBlur in="bottomBand" stdDeviation="2" result="bottomSoft"/>
            <feFlood flood-color="#d45f00" flood-opacity=".85"/>
            <feComposite in2="bottomSoft" operator="in" result="shade"/>
            <feOffset in="SourceAlpha" dy="5" result="down"/>
            <feComposite in="SourceAlpha" in2="down" operator="out" result="topBand"/>
            <feGaussianBlur in="topBand" stdDeviation="1.5" result="topSoft"/>
            <feFlood flood-color="#fff" flood-opacity=".8"/>
            <feComposite in2="topSoft" operator="in" result="shine"/>
            <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/><feMergeNode in="shine"/></feMerge>
          </filter>
          <filter id="gt-inner-white" x="-5%" y="-10%" width="110%" height="130%">
            <feOffset in="SourceAlpha" dy="-5" result="up"/>
            <feComposite in="SourceAlpha" in2="up" operator="out" result="band"/>
            <feGaussianBlur in="band" stdDeviation="1.5" result="soft"/>
            <feFlood flood-color="#9fb4ff" flood-opacity=".9"/>
            <feComposite in2="soft" operator="in" result="shade"/>
            <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/></feMerge>
          </filter>
          <path id="gt-arc-top" d="M40 205 Q380 40 720 205"/>
          <path id="gt-arc-bottom" d="M190 210 Q380 115 570 210"/>
        </defs>
        ${bottom ? `
        <use href="#gt-arc-bottom" class="game-title__pill-edge"/>
        <use href="#gt-arc-bottom" class="game-title__pill"/>
        <text class="game-title__bottom-text" filter="url(#gt-inner-white)"><textPath href="#gt-arc-bottom" startOffset="50%">${bottom}</textPath></text>` : ''}
        <text class="game-title__top-stroke"><textPath href="#gt-arc-top" startOffset="50%">${top}</textPath></text>
        <text class="game-title__top-text" filter="url(#gt-inner-gold)"><textPath href="#gt-arc-top" startOffset="50%">${top}</textPath></text>
      </svg>`;
    if (WORLD.heading.deco === 'doctor') {
      heading.insertAdjacentHTML('beforeend', `
        <svg class="game-title__plus game-title__plus--a" viewBox="0 0 80 80" aria-hidden="true">
          <defs>
            <linearGradient id="gt-pink-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9cc4"/><stop offset=".5" stop-color="#ff4f93"/><stop offset="1" stop-color="#e33563"/></linearGradient>
            <filter id="gt-plus-a" x="-10%" y="-10%" width="120%" height="130%">
              <feOffset in="SourceAlpha" dy="-6" result="up"/>
              <feComposite in="SourceAlpha" in2="up" operator="out" result="band"/>
              <feGaussianBlur in="band" stdDeviation="1.5" result="soft"/>
              <feFlood flood-color="#a3103f" flood-opacity=".85"/>
              <feComposite in2="soft" operator="in" result="shade"/>
              <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/></feMerge>
            </filter>
          </defs>
          <path d="M30 8h20v22h22v20H50v22H30V50H8V30h22z" fill="none" stroke="#242275" stroke-width="12" stroke-linejoin="round"/>
          <path d="M30 8h20v22h22v20H50v22H30V50H8V30h22z" fill="url(#gt-pink-a)" filter="url(#gt-plus-a)" stroke="#ff4f93" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <svg class="game-title__plus game-title__plus--b" viewBox="0 0 80 80" aria-hidden="true">
          <defs>
            <linearGradient id="gt-pink-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9cc4"/><stop offset=".5" stop-color="#ff4f93"/><stop offset="1" stop-color="#e33563"/></linearGradient>
            <filter id="gt-plus-b" x="-10%" y="-10%" width="120%" height="130%">
              <feOffset in="SourceAlpha" dy="-6" result="up"/>
              <feComposite in="SourceAlpha" in2="up" operator="out" result="band"/>
              <feGaussianBlur in="band" stdDeviation="1.5" result="soft"/>
              <feFlood flood-color="#a3103f" flood-opacity=".85"/>
              <feComposite in2="soft" operator="in" result="shade"/>
              <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/></feMerge>
            </filter>
          </defs>
          <path d="M30 8h20v22h22v20H50v22H30V50H8V30h22z" fill="none" stroke="#242275" stroke-width="12" stroke-linejoin="round"/>
          <path d="M30 8h20v22h22v20H50v22H30V50H8V30h22z" fill="url(#gt-pink-b)" filter="url(#gt-plus-b)" stroke="#ff4f93" stroke-width="2" stroke-linejoin="round"/>
        </svg>`);
    }
  }

  /* Card */
  document.getElementById('world-title').textContent = WORLD.title;
  document.getElementById('world-lessons').textContent = WORLD.lessonsRange;
  document.getElementById('world-coins').textContent = WORLD.coins;

  /* Lesson pins */
  const lessons = document.getElementById('lessons');
  const label = { done: 'הושלם', current: 'השיעור הבא', locked: 'נעול' };
  const PIN_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const PIN_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  for (const l of WORLD.lessons) {
    const a = document.createElement('a');
    a.className = `lesson lesson--${l.status}`;
    a.href = l.href;
    a.style.left = `${l.x}px`;
    a.style.top = `${l.y}px`;
    a.setAttribute('aria-label', `שיעור ${l.n} – ${label[l.status]}`);
    // the number, plus a small status badge: done ✓, next ●, locked 🔒
    const badge = l.status === 'done' ? PIN_CHECK : l.status === 'locked' ? PIN_LOCK : '<i></i>';
    a.innerHTML = `<span class="lesson__n">${l.n}</span><span class="lesson__badge">${badge}</span>`;
    if (l.status === 'locked') {
      a.setAttribute('aria-disabled', 'true');
      a.addEventListener('click', (e) => e.preventDefault());
    }
    lessons.appendChild(a);
  }

  /* Animated island: loops on its own; a click restarts it once with the sound */
  const islandEl = document.getElementById('world-island');
  const still = document.getElementById('world-island-still');
  const art = WORLD.island;
  const box = 'left:11px;top:-5px;width:564px;height:501px';
  still.src = `assets/${art.still}.webp`;
  still.style.cssText = box;
  islandEl.addEventListener('click', (e) => e.preventDefault());

  if (!reducedMotion) {
    const supportsAlphaVideo = !!navigator.userAgentData; // Chromium (Chrome, Edge, Opera)
    if (supportsAlphaVideo) {
      // Two copies take turns so the loop restarts without a seek hitch
      const make = () => {
        const v = document.createElement('video');
        v.className = 'island__video';
        v.src = `assets/${art.video}.webm`;
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        v.style.cssText = box;
        return v;
      };
      let front = make();
      let back = make();
      back.classList.add('is-standby');
      still.after(front, back);
      const swap = () => {
        back.muted = true;
        back.play().catch(() => {});
        back.classList.remove('is-standby');
        front.classList.add('is-standby');
        front.pause();
        front.currentTime = 0;
        [front, back] = [back, front];
      };
      front.addEventListener('ended', swap);
      back.addEventListener('ended', swap);
      const start = () => front.play().then(() => islandEl.classList.add('is-playing')).catch(() => {});
      setTimeout(start, 900);
      // "Ahhh" with sound: on click, and on hover once the visitor has interacted
      // with the page (browsers block sound before that). One pass each time.
      // Same as the home page: the video stays silent, the louder WAV carries the sound
      const sfx = art.sound ? new Audio(`assets/${art.sound}.wav`) : null;
      if (sfx) sfx.preload = 'auto';
      const sayAhh = () => {
        front.currentTime = 0;
        front.play().then(() => islandEl.classList.add('is-playing')).catch(() => {});
        if (sfx) { sfx.currentTime = 0; sfx.play().catch(() => {}); }
      };
      islandEl.addEventListener('click', sayAhh);
      islandEl.addEventListener('mouseenter', () => { if (canSound()) sayAhh(); });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && front.paused) front.play().catch(() => {});
      });
    } else {
      // Safari / iPhone: animated WebP + WAV
      const anim = document.createElement('img');
      anim.className = 'island__video';
      anim.alt = '';
      anim.style.cssText = box;
      still.after(anim);
      const audio = art.sound ? new Audio(`assets/${art.sound}.wav`) : null;
      const restart = () => { anim.src = `assets/${art.video}.webp?${Date.now()}`; islandEl.classList.add('is-playing'); };
      setTimeout(restart, 900);
      const sayAhh = () => {
        restart();
        if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
      };
      islandEl.addEventListener('click', sayAhh);
      islandEl.addEventListener('mouseenter', () => { if (canSound()) sayAhh(); });
    }
  }

  /* Progress bar fills after the entrance */
  const bar = document.getElementById('world-progress');
  bar.style.width = '0%';

  /* Trophy: the hidden sentence (hover on desktop, tap anywhere) */
  const trophy = document.querySelector('.trophy');
  if (trophy) {
    const setTrophy = (open) => trophy.setAttribute('aria-expanded', String(open));
    trophy.addEventListener('click', (e) => {
      e.stopPropagation();
      setTrophy(trophy.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.trophy-hint')) setTrophy(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setTrophy(false); });
  }

  /* Entrance once fonts and the scene are ready (max 3s) */
  const ready = Promise.race([
    Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise((r) => { bg.addEventListener('load', r, { once: true }); bg.addEventListener('error', r, { once: true }); }),
    ]),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  ready.then(() => requestAnimationFrame(() => {
    // Loader flies out (same as the map), then the world plays its entrance
    const loader = document.getElementById('loader');
    if (loader) {
      // the number runs up to 100 with the bar, then the loader leaves
      const pctEl = document.getElementById('loader-pct');
      const barEl = document.getElementById('loader-bar');
      const t0 = performance.now();
      const run = (now) => {
        const p = Math.min(1, (now - t0) / 700);
        const v = Math.round(100 * (1 - Math.pow(1 - p, 3)));
        pctEl.textContent = v;
        barEl.style.width = `${v}%`;
        if (p < 1) requestAnimationFrame(run);
        else setTimeout(() => loader.classList.add('is-done'), 150);
      };
      requestAnimationFrame(run);
      setTimeout(() => loader.remove(), 2200);
    }
    document.body.classList.remove('is-loading');
    setTimeout(() => { bar.style.width = `${WORLD.progress}%`; }, 600);
  }));
})();
