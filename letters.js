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
