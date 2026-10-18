// Letters island, the lesson: the ABC song plays, and the two rows of letters
// (capitals above, small letters below) dance with it. Every letter hops
// gently on the beat (a little wave along the row); the letter being sung
// jumps high and lights up in both rows, and the ones already sung keep a
// soft colour. The times are Einat's (A at 0:00 … Z at 0:27).
(function () {
  const video = document.getElementById('abc-video');
  const play = document.getElementById('abc-play');
  const rows = document.getElementById('abc-rows');
  if (!video || !rows) return;
  const TIMES = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27];
  const tiles = (i) => rows.querySelectorAll(`.abc-tile[data-i="${i}"]`);
  let last = -2;
  let raf = 0;

  function sync() {
    const t = video.currentTime;
    let on = -1;
    for (let i = TIMES.length - 1; i >= 0; i -= 1) {
      if (t >= TIMES[i]) { on = i; break; }
    }
    if (video.ended) on = -1;
    if (on !== last) {
      rows.querySelectorAll('.abc-tile.is-on').forEach((el) => el.classList.remove('is-on'));
      rows.querySelectorAll('.abc-tile').forEach((el) => el.classList.toggle('is-sung', on >= 0 && Number(el.dataset.i) < on));
      if (on >= 0) tiles(on).forEach((el) => el.classList.add('is-on'));
      last = on;
    }
    if (!video.paused && !video.ended) raf = requestAnimationFrame(sync);
  }
  function state() {
    const playing = !video.paused && !video.ended;
    rows.classList.toggle('is-playing', playing);
    play.hidden = playing;
    video.controls = playing || video.currentTime > 0;
    cancelAnimationFrame(raf);
    sync();
  }
  play.addEventListener('click', () => {
    // the game music steps aside while the song plays
    if (window.SiteSound && window.SiteSound.stopMusic) window.SiteSound.stopMusic();
    if (video.ended) video.currentTime = 0;
    video.play().catch(() => {});
  });
  ['play', 'pause', 'ended', 'seeked'].forEach((ev) => video.addEventListener(ev, state));
  // also on the video's own time ticks (when frames are not drawn, e.g. a hidden tab)
  video.addEventListener('timeupdate', sync);
  video.addEventListener('ended', () => {
    rows.querySelectorAll('.abc-tile').forEach((el) => el.classList.remove('is-sung', 'is-on'));
    last = -2;
  });
})();

// Letters practice: the table's letters (and the song's letters on a page
// without lesson.js) say themselves on a tap
(function () {
  if (!document.querySelector('.letters-practice')) return;
  const say = (t) => {
    if (!('speechSynthesis' in window) || !t) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'en-US';
    u.rate = 0.8;
    const v = speechSynthesis.getVoices().find((x) => /^en(-|_)US/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  document.querySelectorAll('.letters-practice [data-say]').forEach((el) => {
    el.addEventListener('click', () => {
      say(el.dataset.say);
      el.classList.remove('is-tapped');
      void el.offsetWidth;
      el.classList.add('is-tapped');
    });
  });
  const done = document.getElementById('practice-done');
  if (done) done.setAttribute('href', 'letters.html');

  /* "סיימתי את התרגול" opens the finish popup: the trophy and the coins
     earned (as on the other practice pages) */
  const COINS = 10;
  const COIN = '<img src="assets/coin.webp" alt="">';
  const COLORS = ['#e33563', '#eeb741', '#91b121', '#2f7cf2', '#7d4ae8', '#ffd45c'];
  const page = document.querySelector('.practice');
  const islandName = page.dataset.islandName || 'האי';
  const islandPage = page.dataset.islandPage || 'letters.html';
  const firstName = (() => { const n = document.querySelector('.user__name'); return n ? n.textContent.trim().split(' ')[0] : ''; })();
  const finish = document.createElement('div');
  finish.className = 'pd-finish';
  finish.setAttribute('role', 'dialog');
  finish.setAttribute('aria-modal', 'true');
  finish.setAttribute('aria-label', 'סיימת את תרגול האותיות');
  finish.hidden = true;
  document.body.appendChild(finish);
  function openFinish() {
    const confetti = Array.from({ length: 46 }, (_, i) => {
      const left = Math.round(Math.random() * 100);
      const delay = (Math.random() * 0.9).toFixed(2);
      const dur = (2.4 + Math.random() * 1.6).toFixed(2);
      const rot = Math.round(Math.random() * 360);
      return `<i style="left:${left}%;background:${COLORS[i % COLORS.length]};animation-delay:${delay}s;animation-duration:${dur}s;rotate:${rot}deg"></i>`;
    }).join('');
    finish.innerHTML = `
      <div class="pd-finish__confetti" aria-hidden="true">${confetti}</div>
      <div class="pd-finish__card">
        <button class="pd-finish__close" type="button" data-close aria-label="סגירה"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
        <img class="pd-finish__trophy" src="assets/trophy.svg" alt="">
        <p class="pd-finish__kicker">כל הכבוד!</p>
        <h2 class="pd-finish__title">${firstName ? firstName + ', ' : ''}סיימת את תרגול האותיות</h2>
        <p class="pd-finish__coins">${COIN}צברת <b>${COINS}</b> מטבעות</p>
        <a class="btn-pill pd-finish__go" href="${islandPage}"><span>חזרה ל${islandName}</span><img src="assets/chevron.svg" alt="" class="btn-pill__chevron"></a>
      </div>`;
    finish.hidden = false;
    void finish.offsetWidth;
    finish.classList.add('is-open');
    finish.querySelector('.pd-finish__go').focus({ preventScroll: true });
  }
  const closeFinish = () => { finish.classList.remove('is-open'); setTimeout(() => { finish.hidden = true; }, 300); };
  finish.addEventListener('click', (e) => { if (e.target === finish || e.target.closest('[data-close]')) closeFinish(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !finish.hidden) closeFinish(); });
  if (done) done.addEventListener('click', (e) => { e.preventDefault(); openFinish(); });
})();
