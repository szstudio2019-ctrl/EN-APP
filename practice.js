// Practice page ("בואו נתרגל"): six stages (the numbers 1–6 above the cards),
// each with six words (the dashes under the cards). Tapping the word says it
// aloud; "הקלט" records the learner (microphone), "בדיקה" plays it back.
(function () {
  const STAGES = [
    ['bat', 'cat', 'hat', 'mat', 'rat', 'sat'],
    ['map', 'cap', 'tap', 'nap', 'lap', 'gap'],
    ['bag', 'rag', 'tag', 'wag', 'nag', 'flag'],
    ['jam', 'ham', 'ram', 'yam', 'dam', 'clam'],
    ['can', 'fan', 'man', 'pan', 'ran', 'van'],
    ['dad', 'bad', 'mad', 'pad', 'sad', 'glad'],
  ];
  const PER = STAGES[0].length;
  // every word has one place in the whole set: stage * PER + word
  const WORDS = STAGES.flat();
  const KEY = 'en-app:practice-doctor';

  const stepsEl = document.getElementById('practice-steps');
  const dotsEl = document.getElementById('practice-dots');
  const wordEl = document.getElementById('practice-word');
  const recBtn = document.getElementById('practice-rec');
  const playBtn = document.getElementById('practice-play');
  const statusEl = document.getElementById('practice-status');
  const card = document.getElementById('practice-card');

  let index = 0;
  const recordings = {}; // word index -> object URL of the recording
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (err) { done = {}; }
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(`${KEY}:seen`)) || {}; } catch (err) { seen = {}; }
  const saveSeen = () => { try { localStorage.setItem(`${KEY}:seen`, JSON.stringify(seen)); } catch (err) { /* storage blocked */ } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (err) { /* storage blocked */ } };

  stepsEl.innerHTML = STAGES.map((w, i) => `<li><button type="button" data-step="${i}" aria-label="שלב ${i + 1}">${i + 1}</button></li>`).join('');
  dotsEl.innerHTML = STAGES[0].map(() => '<i></i>').join('');

  function show(i, dir) {
    // no wrapping: the first word has no "previous", the last no "next"
    index = Math.max(0, Math.min(WORDS.length - 1, i));
    seen[index] = true;
    saveSeen();
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === WORDS.length - 1;
    wordEl.textContent = WORDS[index];
    const stage = Math.floor(index / PER);
    const inStage = index % PER;
    stepsEl.querySelectorAll('li').forEach((li, k) => {
      li.classList.toggle('is-current', k === stage);
      // a level is done once the learner went through all six of its words
      li.classList.toggle('is-done', STAGES[k].every((w, j) => seen[k * PER + j]));
    });
    [...dotsEl.children].forEach((d, k) => {
      d.classList.toggle('is-on', k === inStage);
      d.classList.toggle('is-done', !!done[stage * PER + k]);
    });
    playBtn.disabled = !recordings[index];
    statusEl.textContent = '';
    if (dir) {
      card.classList.remove('is-in-next', 'is-in-prev');
      void card.offsetWidth;
      card.classList.add(dir > 0 ? 'is-in-next' : 'is-in-prev');
    }
  }

  const nextBtn = document.getElementById('practice-next');
  const prevBtn = document.getElementById('practice-prev');
  nextBtn.addEventListener('click', () => show(index + 1, 1));
  prevBtn.addEventListener('click', () => show(index - 1, -1));
  stepsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const to = Number(b.dataset.step) * PER;
    show(to, to > index ? 1 : -1);
  });

  /* Say the word (the browser's English voice) */
  function say(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.8;
    const voice = speechSynthesis.getVoices().find((v) => /^en(-|_)US/i.test(v.lang));
    if (voice) u.voice = voice;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  wordEl.addEventListener('click', () => {
    say(WORDS[index]);
    wordEl.classList.remove('is-speaking');
    void wordEl.offsetWidth;
    wordEl.classList.add('is-speaking');
  });

  /* Record and play back */
  let recorder = null;
  let chunks = [];
  let stopTimer;
  async function startRec() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      statusEl.textContent = 'הדפדפן הזה לא תומך בהקלטה';
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      statusEl.textContent = 'צריך לאשר גישה למיקרופון כדי להקליט';
      return;
    }
    chunks = [];
    const at = index;
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (recordings[at]) URL.revokeObjectURL(recordings[at]);
      recordings[at] = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      done[at] = Date.now();
      save();
      recBtn.classList.remove('is-recording');
      recBtn.querySelector('.practice__label').textContent = 'הקלט';
      if (at === index) { playBtn.disabled = false; statusEl.textContent = 'מעולה! לחצו על בדיקה כדי לשמוע'; }
      show(index);
      if (at === index) statusEl.textContent = 'מעולה! לחצו על בדיקה כדי לשמוע';
      recorder = null;
    };
    recorder.start();
    recBtn.classList.add('is-recording');
    recBtn.querySelector('.practice__label').textContent = 'עצור';
    statusEl.textContent = 'מקליטים… אמרו את המילה';
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, 5000);
  }
  recBtn.addEventListener('click', () => {
    if (recorder && recorder.state === 'recording') { clearTimeout(stopTimer); recorder.stop(); } else startRec();
  });
  playBtn.addEventListener('click', () => {
    const url = recordings[index];
    if (!url) return;
    new Audio(url).play().catch(() => {});
  });

  show(0);
})();
