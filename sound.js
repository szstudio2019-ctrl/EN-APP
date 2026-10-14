// Site sound, shared by every page:
// - soft background game music, played by the browser itself (Web Audio:
//   a 16-bar tune with a soft piano melody, a warm pad, a plucked bass and a
//   light hi-hat; no audio file). It starts with the learner's first tap or key
//   (browsers block sound before that) and a note button in the header turns it
//   on and off (remembered);
// - a short soft wooden "tick" when moving between stages (levels, lessons, steps).
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

  /* ---------- the music ----------
     A little tune in C major, 16 bars (then it starts again), about 104 bpm:
     a soft piano melody that changes from bar to bar, a warm pad on the
     chords, a plucked bass and a light hi-hat. No sliding "bubble" notes. */
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const C = [48, 52, 55], G = [43, 47, 50], Am = [45, 48, 52], F = [41, 45, 48];
  const BARS = [C, G, Am, F, C, G, F, G, Am, F, C, G, F, G, C, C];
  const _ = null;
  // the melody, 8 eighths a bar (MIDI notes; _ = rest)
  const MELODY = [
    [76, _, 79, _, 76, 74, 72, _], [74, _, 67, _, 71, _, 74, _],
    [72, _, 76, _, 81, 79, 76, _], [77, _, 76, 74, 72, _, 69, _],
    [67, 72, 76, 79, _, 76, _, 72], [71, _, 74, _, 79, _, 77, 76],
    [77, _, 81, _, 79, 77, 76, 74], [74, _, _, _, 67, _, _, _],
    [69, _, 72, 76, _, 74, 72, _], [72, _, 69, _, 65, _, 69, 72],
    [76, _, 79, _, 84, _, 79, _], [74, _, 71, _, 67, _, 71, 74],
    [81, _, 79, 77, _, 76, 74, _], [74, _, 76, 77, 79, _, 71, _],
    [72, _, 76, _, 79, _, 76, _], [72, _, _, _, _, _, _, _],
  ];
  const EIGHTH = 60 / 104 / 2;
  let nextTime = 0;
  let step = 0;
  let timer = null;
  let noise = null;

  function env(g, t, vol, attack, decay) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  // a soft piano-like note: a triangle and a quieter octave, through a gentle filter
  function piano(n, t, vol) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    const g = ctx.createGain();
    env(g, t, vol, 0.008, 1.1);
    [[1, 'triangle', 1], [2, 'sine', 0.25]].forEach(([mult, type, v]) => {
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = type;
      o.frequency.value = midi(n) * mult;
      og.gain.value = v;
      o.connect(og);
      og.connect(f);
      o.start(t);
      o.stop(t + 1.2);
    });
    f.connect(g);
    g.connect(musicGain);
  }
  // a warm pad on the chord, for the whole bar
  function pad(chord, t, dur) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.5);
    g.gain.setValueAtTime(0.035, t + dur - 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    chord.forEach((n) => {
      [-6, 6].forEach((cents) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = midi(n + 12);
        o.detune.value = cents;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.05);
      });
    });
    f.connect(g);
    g.connect(musicGain);
  }
  // a plucked bass
  function bass(n, t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = midi(n);
    env(g, t, 0.16, 0.01, 0.45);
    o.connect(g);
    g.connect(musicGain);
    o.start(t);
    o.stop(t + 0.5);
  }
  // a light hi-hat (a short burst of filtered noise)
  function hat(t, vol) {
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    env(g, t, vol, 0.002, 0.05);
    src.connect(f);
    f.connect(g);
    g.connect(musicGain);
    src.start(t);
    src.stop(t + 0.08);
  }
  function schedule() {
    while (nextTime < ctx.currentTime + 0.6) {
      const bar = Math.floor(step / 8) % BARS.length;
      const beat = step % 8;
      const chord = BARS[bar];
      if (beat === 0) pad(chord, nextTime, EIGHTH * 8);
      if (beat === 0) bass(chord[0], nextTime);
      if (beat === 4) bass(chord[2] - 12, nextTime);
      if (beat % 2 === 1) hat(nextTime, 0.025);
      const n = MELODY[bar][beat];
      if (n) piano(n, nextTime, 0.07);
      nextTime += EIGHTH;
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
    musicGain.gain.setTargetAtTime(0.6, ctx.currentTime, 0.8); // fade in
  }
  function stopMusic() {
    if (!ctx || !timer) return;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    clearInterval(timer);
    timer = null;
  }

  /* ---------- the button sound: a soft round "pop", like a marimba bubble ----------
     A warm sine that drops a little in pitch (the "pop"), an octave above it
     that fades fast (the wood), and a soft echo a fifth higher – no hard click. */
  function tone(type, f0, f1, t, vol, attack, decay) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + 0.07);
    env(g, t, vol, attack, decay);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + attack + decay + 0.02);
  }
  function click() {
    audio();
    const t = ctx.currentTime;
    tone('sine', 740, 587, t, 0.16, 0.004, 0.24);           // the pop (F#5 → D5)
    tone('sine', 1174, 1174, t, 0.05, 0.002, 0.07);         // the wooden ring
    tone('triangle', 880, 880, t + 0.06, 0.035, 0.006, 0.18); // a soft echo (A5)
  }
  // what makes the sound: every button, link, tab and pin – and the word on the card
  const STAGE = 'button, a[href], [role="tab"], .lesson, .practice__word, .rp-topic, .rp-sub';
  document.addEventListener('click', (e) => {
    const el = e.target.closest(STAGE);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.closest('.music-btn')) return; // the music button has its own feel
    click();
  }, true);

  /* ---------- hover: a tiny cute "bloop" when the mouse reaches a button ----------
     A soft sine that slides up a little (a note from a happy pentatonic scale,
     so nearby buttons sound like a little tune), with a quiet sparkle on top.
     Mouse only, and only once the browser has allowed sound (after the first tap). */
  const HOVER = 'button, .btn-pill, a.lesson, .rp-topic, .rp-sub, .back-home, .home-btn, .stat, .cart, .trophy, .help-btn, .menu-btn, .sb-link, .sb-sublink, .drawer-handle';
  const NOTES = [72, 74, 76, 79, 81, 84]; // C D E G A C
  let lastHover = 0;
  let lastEl = null;
  function hover() {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const f = midi(NOTES[Math.floor(Math.random() * NOTES.length)]);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.84, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    env(g, t, 0.07, 0.008, 0.16);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.2);
    const s = ctx.createOscillator();
    const sg = ctx.createGain();
    s.type = 'triangle';
    s.frequency.value = f * 2;
    env(sg, t + 0.03, 0.022, 0.004, 0.1);
    s.connect(sg);
    sg.connect(master);
    s.start(t + 0.03);
    s.stop(t + 0.16);
  }
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest && e.target.closest(HOVER);
      if (!el) { lastEl = null; return; }
      if (el === lastEl || el.disabled) return;
      lastEl = el;
      const now = performance.now();
      if (now - lastHover < 90) return;
      lastHover = now;
      hover();
    }, true);
  }

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
