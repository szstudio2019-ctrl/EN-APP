// Recording – a demo for now (no microphone): "הקלט" marks the card as
// recorded at once, as a real recording would (the practice's own code runs on
// as usual: the dash turns green, the levels and popups follow). Then "הקלט"
// becomes "השמעה" (it says the word) and "בדיקה" opens (it plays "the child's
// recording" – the word in a higher voice). Load before practice.js /
// sentences.js / review-practice.js.
(function () {
  // a stand-in microphone and recorder: the recording ends as soon as it starts
  const track = { stop() {} };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  if (!navigator.mediaDevices) navigator.mediaDevices = {};
  navigator.mediaDevices.getUserMedia = () => Promise.resolve(stream);
  window.MediaRecorder = class {
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; this.ondataavailable = null; this.onstop = null; }
    start() {
      this.state = 'recording';
      setTimeout(() => this.stop(), 350);
    }
    stop() {
      if (this.state !== 'recording') return;
      this.state = 'inactive';
      if (this.ondataavailable) this.ondataavailable({ data: new Blob(['demo'], { type: this.mimeType }) });
      if (this.onstop) this.onstop();
    }
  };

  const say = (text, pitch) => {
    if (!('speechSynthesis' in window) || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.85;
    u.pitch = pitch || 1;
    const v = speechSynthesis.getVoices().find((x) => /^en(-|_)US/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  };
  // the word (or sentence) on the card
  const current = () => {
    const el = document.getElementById('practice-word') || document.getElementById('sn-sentence') || document.querySelector('.practice__card');
    if (!el) return '';
    const img = el.querySelector('img[alt]');
    return img ? img.alt : el.innerText.replace(/\s+/g, ' ').trim();
  };

  const start = () => {
    const rec = document.getElementById('practice-rec');
    const play = document.getElementById('practice-play');
    if (!rec || !play) return;
    const label = rec.querySelector('.practice__label');
    const icon = rec.querySelector('.practice__icon');
    const MIC = icon ? icon.innerHTML : '';
    const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>'; // a Play triangle
    // a recorded card: "הקלט" turns into "השמעה"
    const paint = () => {
      const recorded = !play.disabled;
      if (rec.classList.contains('is-recording')) return;
      rec.classList.toggle('is-listen', recorded);
      if (label) label.textContent = recorded ? 'השמעה' : 'הקלט';
      if (icon) icon.innerHTML = recorded ? SPEAKER : MIC;
    };
    new MutationObserver(paint).observe(play, { attributes: true, attributeFilter: ['disabled'] });
    new MutationObserver(paint).observe(rec, { attributes: true, attributeFilter: ['class'] });
    paint();
    // "השמעה": the word itself; "בדיקה": "the recording"
    rec.addEventListener('click', (e) => {
      if (!rec.classList.contains('is-listen')) return;
      e.stopImmediatePropagation();
      say(current(), 1);
    }, true);
    play.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      say(current(), 1.35);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
