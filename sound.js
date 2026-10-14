// Site sound, shared by every page:
// - soft background game music, played by the browser itself (Web Audio: a
//   gentle music-box arpeggio over a I–vi–IV–V loop, quiet, no audio file);
//   it starts with the learner's first tap or key (browsers block sound before
//   that) and a note button in the header turns it on and off (remembered);
// - a short soft "click" when moving between stages (levels, lessons, steps).
(function () {
  const KEY = 'en-app:music';
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  let ctx = null;
  let master = null;
  let musicGain = null;
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (err) { /* blocked */ }

  function audio() {
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---------- the music ---------- */
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // chords: C, Am, F, G (two bars each); a music-box line over them
  const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const PATTERN = [0, 1, 2, 1, 2, 3, 2, 1]; // up and down the chord, the top an octave up
  const STEP = 0.32; // seconds per eighth note (about 94 bpm)
  let nextTime = 0;
  let step = 0;
  let timer = null;

  function note(freq, time, dur, vol, type) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(musicGain);
    o.start(time);
    o.stop(time + dur + 0.05);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.6) {
      const bar = Math.floor(step / 16) % CHORDS.length;
      const chord = CHORDS[bar];
      const i = PATTERN[step % 8];
      const pitch = i === 3 ? chord[0] + 12 : chord[i];
      note(midi(pitch + 12), nextTime, 0.9, 0.05, 'triangle');      // the music box
      if (step % 8 === 0) note(midi(chord[0] - 12), nextTime, 2.4, 0.06, 'sine'); // a soft bass
      if (step % 16 === 12) note(midi(chord[2] + 24), nextTime, 0.6, 0.025, 'sine'); // a little sparkle
      nextTime += STEP;
      step += 1;
    }
  }
  function startMusic() {
    audio();
    if (timer) return;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 150);
    schedule();
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8); // fade in
  }
  function stopMusic() {
    if (!ctx || !timer) return;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    clearInterval(timer);
    timer = null;
  }

  /* ---------- the stage click ---------- */
  function click() {
    audio();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(980, t + 0.07);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.15);
  }
  // the controls that move between stages
  const STAGE = '.practice__steps button, .practice__arrow, .rp-topic, .rp-sub, .m-pins__arrow, .lesson, .slide-nav__item, .wm-island__btn, .world-map__tab, .lesson__go, .practice__btn';
  document.addEventListener('click', (e) => { if (e.target.closest(STAGE)) click(); }, true);

  /* ---------- the header button ---------- */
  const NOTE_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>';
  const NOTE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/></svg>';
  const home = document.querySelector('.topbar .home-btn');
  let btn = null;
  if (home) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'home-btn music-btn';
    home.before(btn);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      on = !on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (err) { /* blocked */ }
      sync();
      if (on) startMusic(); else stopMusic();
    });
  }
  function sync() {
    if (!btn) return;
    btn.innerHTML = on ? NOTE_ON : NOTE_OFF;
    btn.setAttribute('aria-label', on ? 'כיבוי המוזיקה' : 'הפעלת המוזיקה');
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-off', !on);
  }
  sync();

  // the music starts with the first tap or key (the browser's rule)
  const first = () => {
    window.removeEventListener('pointerdown', first, true);
    window.removeEventListener('keydown', first, true);
    if (on) startMusic(); else audio();
  };
  window.addEventListener('pointerdown', first, true);
  window.addEventListener('keydown', first, true);
  // quiet while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
  });

  window.SiteSound = { click, startMusic, stopMusic };
})();
