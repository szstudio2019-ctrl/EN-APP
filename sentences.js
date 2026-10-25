// Stage 2 of the doctor island: reading sentences (Figma 337:6861, the
// sentences of Einat's lesson 4). Two levels, easy and challenging. Each
// sentence has "הקלט" (record the learner) and "בדיקה" (play it back); the
// pink words are ones the learner can't read yet: tapping one says it aloud.
(function () {
  const LEVELS = [
    ['The cat has a bag.', 'The cat has an apple.', 'The bat has a hat.', 'The rat sat on the mat.', 'Sam sat and had a nap.'],
    ['A fat man sat at a vast map.', 'A black cat ran fast and past a shack.', 'The man had a plan and a bag.', 'A bad rat had a trap by a track.',
      'The man ran back and sat at last.', 'His sad dad had a nap at a camp.', "The man's grand cap was back on a rack."],
  ];
  // the words to hear (in red in Einat's file)
  const HELP = new Set(['the', 'an', 'on', 'shack', 'by', 'his']);
  const KEY = 'en-app:sentences-doctor';
  const COINS_PER_LEVEL = 10;
  const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';
  const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/></svg>';
  const COIN = '<img src="assets/coin.webp" alt="">';

  const tabs = [...document.querySelectorAll('.sentences__tab')];
  const statusEl = document.getElementById('practice-status');
  const textEl = document.getElementById('sn-sentence');
  const card = document.getElementById('practice-card');
  const recBtn = document.getElementById('practice-rec');
  const playBtn = document.getElementById('practice-play');
  const prevBtn = document.getElementById('practice-prev');
  const nextBtn = document.getElementById('practice-next');
  const dotsEl = document.getElementById('practice-dots');
  const lastNo = document.getElementById('sn-last');
  let level = 0;
  let index = 0;
  const recordings = {}; // "level.i" -> object URL
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (err) { done = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (err) { /* storage blocked */ } };

  // a sentence as words: the help words pink buttons, the rest plain text
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function sentenceHTML(t) {
    return t.split(' ').map((w) => {
      const bare = w.toLowerCase().replace(/[^a-z']/g, '');
      return HELP.has(bare) ? `<button class="sentences__help" type="button" data-say="${bare}" aria-label="השמעת המילה ${bare}">${esc(w)}<svg class="sentences__help-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg></button>` : esc(w);
    }).join(' ');
  }

  // the level's tabs, its dashes and the far number
  function render() {
    tabs.forEach((t, i) => { t.classList.toggle('is-on', i === level); t.setAttribute('aria-selected', String(i === level)); });
    card.dataset.level = String(level); // the challenging level's card is light yellow
    dotsEl.innerHTML = LEVELS[level].map(() => '<i></i>').join('');
    lastNo.textContent = LEVELS[level].length;
    show(Math.min(index, LEVELS[level].length - 1));
  }
  // one sentence on the card
  function show(i, dir) {
    const list = LEVELS[level];
    index = Math.max(0, Math.min(list.length - 1, i));
    const k = `${level}.${index}`;
    textEl.innerHTML = sentenceHTML(list[index]);
    textEl.classList.toggle('is-long', list[index].length > 34);
    playBtn.disabled = !recordings[k];
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === list.length - 1;
    [...dotsEl.children].forEach((d, j) => {
      d.classList.toggle('is-on', j === index);
      d.classList.toggle('is-done', !!done[`${level}.${j}`]);
    });
    card.classList.toggle('is-done', !!done[k]);
    statusEl.textContent = '';
    if (dir) {
      card.classList.remove('is-in-next', 'is-in-prev');
      void card.offsetWidth;
      card.classList.add(dir > 0 ? 'is-in-next' : 'is-in-prev');
    }
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => { if (i !== level) { level = i; index = 0; render(); } }));
  nextBtn.addEventListener('click', () => show(index + 1, 1));
  prevBtn.addEventListener('click', () => show(index - 1, -1));

  /* Say a word (the browser's English voice) */
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
  textEl.addEventListener('click', (e) => {
    const help = e.target.closest('[data-say]');
    if (help) say(help.dataset.say);
  });

  /* Record and play back, one sentence at a time */
  let recorder = null;
  let chunks = [];
  let stopTimer;
  async function startRec() {
    if (!navigator.mediaDevices || !window.MediaRecorder) { statusEl.textContent = 'הדפדפן הזה לא תומך בהקלטה'; return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (err) {
      statusEl.textContent = 'צריך לאשר גישה למיקרופון כדי להקליט';
      return;
    }
    const at = level;
    const i = index;
    const k = `${at}.${i}`;
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (recordings[k]) URL.revokeObjectURL(recordings[k]);
      recordings[k] = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      const wasDone = LEVELS[at].every((_, j) => done[`${at}.${j}`]);
      done[k] = Date.now();
      save();
      recorder = null;
      recBtn.classList.remove('is-recording');
      recBtn.querySelector('.practice__label').textContent = 'הקלט';
      if (at === level) {
        show(index);
        if (i === index) statusEl.textContent = 'מעולה! לחצו על בדיקה כדי לשמוע';
      }
      if (!wasDone && LEVELS[at].every((_, j) => done[`${at}.${j}`])) setTimeout(() => openLevel(at), 400);
    };
    recorder.start();
    recBtn.classList.add('is-recording');
    recBtn.querySelector('.practice__label').textContent = 'עצור';
    statusEl.textContent = 'מקליטים… קראו את המשפט';
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, 10000);
  }
  recBtn.addEventListener('click', () => {
    if (recorder && recorder.state === 'recording') { clearTimeout(stopTimer); recorder.stop(); } else startRec();
  });
  playBtn.addEventListener('click', () => {
    const url = recordings[`${level}.${index}`];
    if (url) new Audio(url).play().catch(() => {});
  });

  /* Popups, as on the practice page: a short "כל הכבוד" when a level is all
     recorded; "סיימתי את השיעור" opens the finish with the coins earned */
  const page = document.querySelector('.practice');
  const islandName = page.dataset.islandName || 'האי';
  const islandPage = page.dataset.islandPage || 'index.html';
  const firstName = (() => { const n = document.querySelector('.user__name'); return n ? n.textContent.trim().split(' ')[0] : ''; })();

  const toast = document.createElement('div');
  toast.className = 'pd-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer;
  function cheer(lv) {
    toast.innerHTML = `<span class="pd-toast__star" aria-hidden="true">${COIN}</span>
      <span class="pd-toast__text"><b>כל הכבוד!</b> קראת את כל המשפטים ה${lv === 0 ? 'קלים' : 'מאתגרים'}</span>
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
    const coins = LEVELS.length * COINS_PER_LEVEL;
    const confetti = Array.from({ length: 46 }, (_, i) => {
      const left = Math.round(Math.random() * 100);
      const delay = (Math.random() * 0.9).toFixed(2);
      const dur = (2.4 + Math.random() * 1.6).toFixed(2);
      const rot = Math.round(Math.random() * 360);
      return `<i style="left:${left}%;background:${COLORS[i % COLORS.length]};animation-delay:${delay}s;animation-duration:${dur}s;rotate:${rot}deg"></i>`;
    }).join('');
    finish.setAttribute('aria-label', 'סיימת את קריאת המשפטים');
    finish.innerHTML = `
      <div class="pd-finish__confetti" aria-hidden="true">${confetti}</div>
      <div class="pd-finish__card">
        <button class="pd-finish__close" type="button" data-close aria-label="סגירה"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
        <img class="pd-finish__trophy" src="assets/trophy.svg" alt="">
        <p class="pd-finish__kicker">כל הכבוד!</p>
        <h2 class="pd-finish__title">${firstName ? firstName + ', ' : ''}סיימת את קריאת המשפטים</h2>
        <p class="pd-finish__coins">${COIN}צברת <b>${coins}</b> מטבעות</p>
        <a class="btn-pill pd-finish__go" href="${islandPage}"><span>חזרה ל${islandName}</span><img src="assets/chevron.svg" alt="" class="btn-pill__chevron"></a>
      </div>`;
    finish.hidden = false;
    void finish.offsetWidth;
    finish.classList.add('is-open');
    finish.querySelector('.pd-finish__go').focus({ preventScroll: true });
  }
  // a level all recorded: the big popup – trophy, confetti, coins; "לתרגל שוב"
  // (that level again) or on to the next level
  const AGAIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>';
  function openLevel(lv) {
    const confetti = Array.from({ length: 46 }, (_, i) => `<i style="left:${Math.round(Math.random() * 100)}%;background:${COLORS[i % COLORS.length]};animation-delay:${(Math.random() * 0.9).toFixed(2)}s;animation-duration:${(2.4 + Math.random() * 1.6).toFixed(2)}s;rotate:${Math.round(Math.random() * 360)}deg"></i>`).join('');
    const next = LEVELS[lv + 1] ? lv + 1 : -1;
    finish.setAttribute('aria-label', `קראת את כל המשפטים ה${lv === 0 ? 'קלים' : 'מאתגרים'}`);
    finish.innerHTML = `
      <div class="pd-finish__confetti" aria-hidden="true">${confetti}</div>
      <div class="pd-finish__card">
        <button class="pd-finish__close" type="button" data-close aria-label="סגירה"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
        <img class="pd-finish__trophy" src="assets/trophy.svg" alt="">
        <p class="pd-finish__kicker">כל הכבוד!</p>
        <h2 class="pd-finish__title">${firstName ? firstName + ', ' : ''}קראת את כל המשפטים ה${lv === 0 ? 'קלים' : 'מאתגרים'}</h2>
        <p class="pd-finish__coins">${COIN}צברת <b>+${COINS_PER_LEVEL}</b> מטבעות</p>
        <div class="pd-finish__buttons">
          <button class="pd-finish__again" type="button" data-level="${lv}"><span>לתרגל שוב</span>${AGAIN}</button>
          ${next >= 0 ? `<button class="btn-pill pd-finish__go" type="button" data-level="${next}"><span>לרמה המאתגרת</span><img src="assets/chevron.svg" alt="" class="btn-pill__chevron"></button>`
            : `<a class="btn-pill pd-finish__go" href="${islandPage}"><span>חזרה ל${islandName}</span><img src="assets/chevron.svg" alt="" class="btn-pill__chevron"></a>`}
        </div>
      </div>`;
    finish.hidden = false;
    void finish.offsetWidth;
    finish.classList.add('is-open');
    finish.querySelector('.pd-finish__go').focus({ preventScroll: true });
  }
  const closeFinish = () => { finish.classList.remove('is-open'); setTimeout(() => { finish.hidden = true; }, 300); };
  finish.addEventListener('click', (e) => {
    const to = e.target.closest('[data-level]');
    if (to) { level = Number(to.dataset.level); index = 0; render(); closeFinish(); return; }
    if (e.target === finish || e.target.closest('[data-close]')) closeFinish();
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !finish.hidden) closeFinish(); });
  const doneLink = document.getElementById('practice-done');
  if (doneLink) doneLink.addEventListener('click', (e) => { e.preventDefault(); openFinish(); });

  render();
})();
