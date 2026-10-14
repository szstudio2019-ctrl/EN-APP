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

  // each level: a circle (✓ when done, its number when open) and its number under it
  stepsEl.innerHTML = STAGES.map((w, i) => `<li><button type="button" data-step="${i}" aria-label="רמה ${i + 1}"><span class="step__in"></span></button><span class="step__no" aria-hidden="true">${i + 1}</span></li>`).join('');
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  dotsEl.innerHTML = STAGES[0].map(() => '<i></i>').join('');

  function show(i, dir) {
    // no wrapping: the first word has no "previous", the last no "next"
    index = Math.max(0, Math.min(WORDS.length - 1, i));
    seen[index] = true;
    saveSeen();
    prevBtn.disabled = index === 0;
    // the very last word: "next" fades and opens the end-of-practice popup
    nextBtn.disabled = false;
    nextBtn.classList.toggle('is-end', index === WORDS.length - 1);
    wordEl.textContent = WORDS[index];
    const stage = Math.floor(index / PER);
    const inStage = index % PER;
    stepsEl.querySelectorAll('li').forEach((li, k) => {
      li.classList.toggle('is-current', k === stage);
      // a level turns green once the learner has moved on to a later level
      const reached = Math.max(-1, ...Object.keys(seen).map(Number));
      li.classList.toggle('is-done', reached >= (k + 1) * PER);
      // a done (green) level can always be opened again
      const b = li.querySelector('button');
      b.title = li.classList.contains('is-done') && k !== stage ? `לחזור לרמה ${k + 1}` : `רמה ${k + 1}`;
      // in the circle: the number on the level you are on, ✓ on a done one
      b.querySelector('.step__in').innerHTML = k === stage ? String(k + 1) : li.classList.contains('is-done') ? CHECK : '';
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
  nextBtn.addEventListener('click', () => {
    if (index === WORDS.length - 1) { openFinish(); return; }
    const level = Math.floor(index / PER);
    const endOfLevel = index % PER === PER - 1;
    show(index + 1, 1);
    if (endOfLevel) cheer(level + 1);
  });
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


  /* Popups (as on the review page): a short "כל הכבוד" at the end of levels
     1–5 that goes by itself; at the end of level 6 a trophy with confetti,
     the coins earned and a way back to the island. The page's own details come
     from the practice section: data-island-name, data-island-page, data-lesson. */
  const page = document.querySelector('.practice');
  const islandName = (page && page.dataset.islandName) || 'האי';
  const islandPage = (page && page.dataset.islandPage) || 'index.html';
  const lessonNo = (page && page.dataset.lesson) || '1';
  const COINS_PER_LEVEL = 10;
  const firstName = (() => { const n = document.querySelector('.user__name'); return n ? n.textContent.trim().split(' ')[0] : ''; })();
  const COIN = '<img src="assets/coin.webp" alt="">';

  const toast = document.createElement('div');
  toast.className = 'pd-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer;
  function cheer(level) {
    toast.innerHTML = `<span class="pd-toast__star" aria-hidden="true">⭐</span>
      <span class="pd-toast__text"><b>כל הכבוד!</b> סיימת את רמה ${level}</span>
      <span class="pd-toast__coins">+${COINS_PER_LEVEL} ${COIN}</span>`;
    toast.classList.remove('is-on');
    void toast.offsetWidth;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2600);
  }

  const finish = document.createElement('div');
  finish.className = 'pd-finish';
  finish.setAttribute('role', 'dialog');
  finish.setAttribute('aria-modal', 'true');
  finish.hidden = true;
  document.body.appendChild(finish);
  const COLORS = ['#e33563', '#eeb741', '#91b121', '#2f7cf2', '#7d4ae8', '#ffd45c'];
  function openFinish() {
    const coins = STAGES.length * COINS_PER_LEVEL;
    const confetti = Array.from({ length: 46 }, (_, i) => {
      const left = Math.round(Math.random() * 100);
      const delay = (Math.random() * 0.9).toFixed(2);
      const dur = (2.4 + Math.random() * 1.6).toFixed(2);
      const rot = Math.round(Math.random() * 360);
      return `<i style="left:${left}%;background:${COLORS[i % COLORS.length]};animation-delay:${delay}s;animation-duration:${dur}s;rotate:${rot}deg"></i>`;
    }).join('');
    finish.setAttribute('aria-label', 'סיימת את השיעור והתרגול');
    finish.innerHTML = `
      <div class="pd-finish__confetti" aria-hidden="true">${confetti}</div>
      <div class="pd-finish__card">
        <img class="pd-finish__trophy" src="assets/trophy.svg" alt="">
        <p class="pd-finish__kicker">כל הכבוד!</p>
        <h2 class="pd-finish__title">${firstName ? firstName + ', ' : ''}סיימת את שיעור ותרגול ${lessonNo}</h2>
        <p class="pd-finish__coins">${COIN}צברת <b>${coins}</b> מטבעות</p>
        <a class="btn-pill pd-finish__go" href="${islandPage}"><span>חזרה ל${islandName}</span><img src="assets/chevron.svg" alt="" class="btn-pill__chevron"></a>
      </div>`;
    finish.hidden = false;
    void finish.offsetWidth;
    finish.classList.add('is-open');
    finish.querySelector('.pd-finish__go').focus({ preventScroll: true });
  }
  finish.addEventListener('click', (e) => {
    if (e.target === finish) { finish.classList.remove('is-open'); setTimeout(() => { finish.hidden = true; }, 300); }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !finish.hidden) { finish.classList.remove('is-open'); setTimeout(() => { finish.hidden = true; }, 300); }
  });
  // "סיימתי את התרגול" opens the same popup
  const doneLink = document.getElementById('practice-done');
  if (doneLink) doneLink.addEventListener('click', (e) => { e.preventDefault(); openFinish(); });

  show(0);
})();
