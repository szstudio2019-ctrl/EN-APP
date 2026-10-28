// Lesson page: the zebra-doctor guide and one big Play over the short
// explanation (it reads the full explanation aloud in the browser's Hebrew
// voice and turns into Stop while it speaks). The b + a = ba tiles each say
// their sound, and the two letters slide together into ba on entering the
// page and on a tap of "=" or "ba". The two method cards say "ba" too.
(function () {
  const btn = document.getElementById('guide-play');
  const story = document.querySelector('.lesson__story');
  const guide = document.querySelector('.lesson__guide');
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="play-tri" d="M8 5.5v13l10.5-6.5z"/></svg><span>האזינו להסבר</span>';
  const STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="play-tri" x="6" y="6" width="12" height="12" rx="3"/></svg><span>עצירה</span>';
  const canSpeak = 'speechSynthesis' in window;
  let speaking = false;
  const idle = guide && guide.querySelector('.lesson__guide-idle');
  // the idle loop's soft pom-pom sound: browsers start it muted, so it is let in, very quietly,
  // on the child's first touch of the page
  if (idle) {
    const unmute = () => { idle.muted = false; idle.volume = 0.12; };
    ['pointerdown', 'keydown'].forEach((t) => document.addEventListener(t, unmute, { once: true, capture: true }));
  }

  function voiceFor(lang) {
    return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
  }
  function set(on) {
    speaking = on;
    btn.innerHTML = on ? STOP : PLAY;
    btn.classList.toggle('is-stop', on);
    btn.setAttribute('aria-label', on ? 'עצירת ההסבר' : 'השמעת ההסבר המלא');
    if (guide) guide.classList.toggle('is-speaking', on);
    // a video guide moves and talks only while the explanation plays
    const film = guide && guide.querySelector('video:not(.lesson__guide-idle, .lesson__guide-loop)');
    if (film) { if (on) film.play().catch(() => {}); else film.pause(); }
    // an idle loop (the smiles i lesson) waits in her place while she is quiet; a plain loop
    // (the zebra doctor) just keeps moving
    // (for now she keeps her idle loop while she speaks too, until her talking videos are made)
    if (idle) idle.play().catch(() => {});
  }
  if (btn && story) {
    set(false);
    // a recorded explanation (data-audio): played as is
    const rec = story.dataset.audio ? new Audio(story.dataset.audio) : null;
    if (rec) {
      rec.preload = 'auto';
      rec.addEventListener('ended', () => set(false));
    }
    btn.addEventListener('click', () => {
      if (rec) {
        if (speaking) { rec.pause(); rec.currentTime = 0; set(false); return; }
        if (canSpeak) speechSynthesis.cancel();
        rec.currentTime = 0;
        rec.play().then(() => set(true)).catch(() => set(false));
        return;
      }
      if (!canSpeak) return;
      if (speaking) { speechSynthesis.cancel(); set(false); return; }
      const u = new SpeechSynthesisUtterance(story.dataset.full || story.innerText);
      u.lang = 'he-IL';
      u.rate = 0.95;
      const v = voiceFor('he');
      if (v) u.voice = v;
      u.onend = () => set(false);
      u.onerror = () => set(false);
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      set(true);
    });
  }

  /* say an English sound */
  function say(text) {
    if (!canSpeak || !text) return;
    if (speaking) set(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.8;
    const v = voiceFor('en-us') || voiceFor('en');
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  const pop = (el) => { el.classList.remove('is-tapped'); void el.offsetWidth; el.classList.add('is-tapped'); };
  // a recorded line (the rules' speakers): one plays at a time, a second tap stops it
  let clip = null, clipBtn = null;
  const stopClip = () => { if (clip) { clip.pause(); clip = null; } if (clipBtn) clipBtn.classList.remove('is-playing'); clipBtn = null; };
  document.querySelectorAll('[data-say-audio]').forEach((el) => {
    el.addEventListener('click', () => {
      const again = clipBtn === el;
      stopClip();
      if (again) return;
      if (speaking) btn.click();
      if (canSpeak) speechSynthesis.cancel();
      clip = new Audio(el.dataset.sayAudio);
      clipBtn = el;
      el.classList.add('is-playing');
      clip.addEventListener('ended', stopClip);
      clip.play().catch(stopClip);
      pop(el);
    });
  });
  if (btn) btn.addEventListener('click', stopClip, true);
  // a Hebrew line read aloud (the rules' speakers)
  document.querySelectorAll('[data-say-he]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!canSpeak) return;
      if (speaking) btn.click();
      const u = new SpeechSynthesisUtterance(el.dataset.sayHe);
      u.lang = 'he-IL';
      u.rate = 0.95;
      const v = voiceFor('he');
      if (v) u.voice = v;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      pop(el);
    });
  });
  document.querySelectorAll('[data-say]').forEach((el) => {
    el.addEventListener('click', () => { say(el.dataset.say); pop(el); });
  });

  /* b and a slide together and merge into ba */
  const sum = document.querySelector('.lesson__sum');
  const tb = sum && sum.querySelector('.lesson__tile--b');
  const ta = sum && sum.querySelector('.lesson__tile--a');
  const tr = sum && sum.querySelector('.lesson__tile--result');
  function merge() {
    if (!sum) return;
    // how far each letter travels to the middle of "ba" (stage units)
    const k = sum.getBoundingClientRect().width / sum.offsetWidth || 1;
    const centre = (el) => { const r = el.getBoundingClientRect(); return (r.left + r.width / 2) / k; };
    const to = centre(tr);
    sum.style.setProperty('--to-b', `${to - centre(tb)}px`);
    sum.style.setProperty('--to-a', `${to - centre(ta)}px`);
    sum.classList.remove('is-merging');
    void sum.offsetWidth;
    sum.classList.add('is-merging');
  }
  if (sum) {
    sum.querySelector('.lesson__op--eq').addEventListener('click', merge);
    tr.addEventListener('click', merge);
    // on entering the page, once the loader is gone
    setTimeout(merge, 1400);
  }
  window.addEventListener('pagehide', () => { if (canSpeak) speechSynthesis.cancel(); });
})();
