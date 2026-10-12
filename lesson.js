// Lesson page: the zebra-doctor guide. Play reads the lesson story aloud
// (the browser's Hebrew voice) and turns into Stop while it speaks.
(function () {
  const btn = document.getElementById('guide-play');
  const story = document.querySelector('.lesson__story');
  if (!btn || !story) return;
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  const STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>';
  const canSpeak = 'speechSynthesis' in window;
  let speaking = false;

  function set(on) {
    speaking = on;
    btn.innerHTML = on ? STOP : PLAY;
    btn.classList.toggle('is-stop', on);
    btn.setAttribute('aria-label', on ? 'עצירת ההסבר' : 'השמעת ההסבר');
    document.querySelector('.lesson__guide').classList.toggle('is-speaking', on);
  }
  set(false);

  btn.addEventListener('click', () => {
    if (!canSpeak) return;
    if (speaking) { speechSynthesis.cancel(); set(false); return; }
    const u = new SpeechSynthesisUtterance(story.innerText.replace(/\s+/g, ' '));
    u.lang = 'he-IL';
    u.rate = 0.95;
    const voice = speechSynthesis.getVoices().find((v) => /^he/i.test(v.lang));
    if (voice) u.voice = voice;
    u.onend = () => set(false);
    u.onerror = () => set(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    set(true);
  });
  window.addEventListener('pagehide', () => { if (canSpeak) speechSynthesis.cancel(); });
})();
