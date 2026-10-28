// Letters island, the lesson: the ABC song plays, and the two rows of letters
// (capitals above, small letters below) dance with it. Every letter hops
// gently on the beat (a little wave along the row); the letter being sung
// jumps high and lights up in both rows, and the ones already sung keep a
// soft colour. The times are Einat's (A at 0:00 … Z at 0:27).
(function () {
  const video = document.getElementById('abc-video');
  const play = document.getElementById('abc-play');
  const restart = document.getElementById('abc-restart');
  const rows = document.getElementById('abc-rows');
  if (!video || !rows) return;
  const TIMES = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27];
  const tiles = (i) => document.querySelectorAll(`.abc-rows .abc-tile[data-i="${i}"]`);
  let last = -2;
  let raf = 0;

  // the slider (lesson page): the pair being sung slides to the middle and
  // its letter-shop card opens beside it; the ones before and after fade out
  const slider = rows.closest('.abc-slider');
  const slides = [...rows.querySelectorAll('.abc-slide')];
  const CARD = 226 + 28; // the card's width + its gap (see .abc-slide.is-on)
  function centre(i) {
    if (!slider || !slides[i]) return;
    // the sung pair in the middle; the next ones fade off, the ones already sung are very faint
    slides.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.dataset.d = k > i ? String(Math.min(k - i, 3)) : k < i ? 'past' : '0'; });
    const s = slides[i];
    // from the resting sizes (the cards opening and closing are still animating)
    const pair = s.querySelector('.abc-pair').offsetWidth;
    const left = i * (pair + 40); // 40 = the gap between the pairs (.abc-track)
    const w = pair + CARD;
    rows.style.transform = `translateX(${(slider.clientWidth / 2 - (left + w / 2)).toFixed(1)}px)`;
  }

  function sync() {
    const t = video.currentTime;
    let on = -1;
    for (let i = TIMES.length - 1; i >= 0; i -= 1) {
      if (t >= TIMES[i]) { on = i; break; }
    }
    if (video.ended) on = -1;
    if (on !== last) {
      document.querySelectorAll('.abc-rows .abc-tile.is-on').forEach((el) => el.classList.remove('is-on'));
      document.querySelectorAll('.abc-rows .abc-tile').forEach((el) => el.classList.toggle('is-sung', on >= 0 && Number(el.dataset.i) < on));
      if (on >= 0) { tiles(on).forEach((el) => el.classList.add('is-on')); centre(on); }
      last = on;
    }
    if (!video.paused && !video.ended) raf = requestAnimationFrame(sync);
  }
  function state() {
    const playing = !video.paused && !video.ended;
    rows.classList.toggle('is-playing', playing);
    if (play.classList.contains('abc-play-btn')) {
      // the big button: Play ↔ Pause
      play.classList.toggle('is-playing', playing);
      play.querySelector('.abc-play-btn__label').innerHTML = playing ? 'עצירת השיר' : video.currentTime > 0 && !video.ended ? 'המשך השיר' : 'השמעת שיר ה-<span lang="en">ABC</span>';
    } else {
      play.hidden = playing;
      video.controls = playing || video.currentTime > 0;
    }
    cancelAnimationFrame(raf);
    sync();
  }
  // "מההתחלה": the song from A again (it plays on)
  if (restart) {
    restart.addEventListener('click', () => {
      if (window.SiteSound && window.SiteSound.stopMusic) window.SiteSound.stopMusic();
      video.currentTime = 0;
      last = -2;
      video.play().catch(() => {});
    });
  }
  play.addEventListener('click', () => {
    if (play.classList.contains('abc-play-btn') && !video.paused && !video.ended) { video.pause(); return; }
    // the game music steps aside while the song plays
    if (window.SiteSound && window.SiteSound.stopMusic) window.SiteSound.stopMusic();
    if (video.ended) video.currentTime = 0;
    video.play().catch(() => {});
  });
  // a tap on a letter (it says itself, lesson.js) brings its pair and card to the middle
  if (slider) {
    rows.addEventListener('click', (e) => {
      const s = e.target.closest('.abc-slide');
      if (s && video.paused) centre(Number(s.dataset.i));
    });
    window.addEventListener('resize', () => { const on = slides.findIndex((s) => s.classList.contains('is-on')); centre(Math.max(0, on)); });
    centre(0);
  }
  ['play', 'pause', 'ended', 'seeked'].forEach((ev) => video.addEventListener(ev, state));
  // also on the video's own time ticks (when frames are not drawn, e.g. a hidden tab)
  video.addEventListener('timeupdate', sync);
  video.addEventListener('ended', () => {
    document.querySelectorAll('.abc-rows .abc-tile').forEach((el) => el.classList.remove('is-sung', 'is-on'));
    centre(0);
    last = -2;
  });
})();
// Letters practice: the help window (the song and its letters) – a tap on a
// letter says it; drag the window by its top bar; ✕ closes it and a small
// "חלון עזר" tab brings it back. Its place and open/closed state are kept.
(function () {
  const box = document.getElementById('lp-help');
  if (!box) return;
  const head = document.getElementById('lp-help-head');
  const openBtn = document.getElementById('lp-help-open');
  const KEY = 'en-app:letters-help:left'; // a new key: the window moved to the left
  let st = {};
  try { st = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (err) { st = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (err) { /* storage blocked */ } };

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
  box.addEventListener('click', (e) => {
    const t = e.target.closest('[data-say]');
    if (!t) return;
    say(t.dataset.say);
    t.classList.remove('is-tapped');
    void t.offsetWidth;
    t.classList.add('is-tapped');
  });

  // open / close
  const show = (on) => {
    box.hidden = !on;
    openBtn.hidden = on;
    st.closed = !on;
    save();
    if (!on) { const a = document.getElementById('abc-video'); if (a) a.pause(); }
  };
  document.getElementById('lp-help-close').addEventListener('click', () => show(false));
  openBtn.addEventListener('click', () => show(true));
  if (st.closed) show(false);

  // drag: the stage is scaled, so the pointer's moves are divided by its scale
  const stage = document.getElementById('stage');
  const scale = () => (stage ? stage.getBoundingClientRect().width / 1920 : 1) || 1;
  let x = st.x || 0;
  let y = st.y || 0;
  const place = () => { box.style.translate = `${x}px ${y}px`; };
  place();
  let drag = null;
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    drag = { px: e.clientX, py: e.clientY, x, y, k: scale() };
    head.setPointerCapture(e.pointerId);
    box.classList.add('is-dragging');
  });
  head.addEventListener('pointermove', (e) => {
    if (!drag) return;
    x = drag.x + (e.clientX - drag.px) / drag.k;
    y = drag.y + (e.clientY - drag.py) / drag.k;
    // anywhere on the stage – over the cards and the side menu too; only its
    // top bar must stay on screen (the window starts at 130, 452 on the stage)
    y = Math.max(-452, Math.min(1080 - 452 - 60, y));
    x = Math.max(-130 - 250, Math.min(1920 - 130 - 80, x));
    place();
    // kept as it moves, so a refresh finds it where it was left (also when the drag is cut off)
    st.x = Math.round(x);
    st.y = Math.round(y);
    save();
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    box.classList.remove('is-dragging');
    st.x = Math.round(x);
    st.y = Math.round(y);
    save();
  };
  head.addEventListener('pointerup', end);
  head.addEventListener('pointercancel', end);
  head.addEventListener('lostpointercapture', end);
})();

// Letters practice: white arrows beside the column numbers – the previous /
// next column (they press that column's number; the last / first fades)
(function () {
  const steps = document.getElementById('practice-steps');
  const prev = document.getElementById('lp-step-prev');
  const next = document.getElementById('lp-step-next');
  if (!steps || !prev || !next) return;
  const at = () => [...steps.children].findIndex((li) => li.classList.contains('is-current'));
  const go = (d) => {
    const b = steps.children[at() + d] && steps.children[at() + d].querySelector('[data-step]');
    if (b) b.click();
  };
  // only SHOW numbers at a time, in a window that slides along with the column you are on
  const SHOW = 10;
  const view = document.createElement('div');
  view.className = 'lp-steps-view';
  steps.before(view);
  view.append(steps);
  const paint = () => {
    const i = at();
    prev.disabled = i <= 0;
    next.disabled = i < 0 || i >= steps.children.length - 1;
    const n = steps.children.length;
    const a0 = steps.children[0];
    const a1 = steps.children[1];
    if (!a1) return;
    const pitch = Math.abs(a0.offsetLeft - a1.offsetLeft);
    view.style.width = (pitch * Math.min(SHOW, n) - (pitch - a0.offsetWidth)) + 'px';
    const first = Math.max(0, Math.min(n - SHOW, i - Math.floor(SHOW / 2) + 1));
    // right to left: the later numbers are hidden on the left, so the row moves right
    steps.style.transform = `translateX(${first * pitch}px)`;
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  new MutationObserver(paint).observe(steps, { subtree: true, attributes: true, attributeFilter: ['class'] });
  paint();
})();
