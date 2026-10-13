// Review 5 ("כל החזרות"): every topic learned so far, on the practice page's
// card deck. Top row = the topics (icon + name + how many items); under it
// the letters / sounds of the chosen topic with a short explanation; the cards
// hold that sound's words (the dashes and the count show how many there are).
// Tapping the word says it; "הקלט" records the learner, "בדיקה" plays it back.
(function () {
  // the consonant rows of the course's table (Einat's sheet)
  const C = ['b', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'y', 'z'];
  const withC = (end) => C.map((c) => c + end);
  // a word that is written two ways (bai/bay) is said by its second spelling
  const pair = (a, b) => C.map((c) => ({ show: `${c}${a}/${c}${b}`, say: `${c}${b}` }));

  // a playground slide (the emoji 🛝 is missing on Windows)
  const SLIDE = '<svg class="rp-svg" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 29V6M13 29V6M7 11h6M7 17h6M7 23h6" stroke="#3d4bb0" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M13 6c6 0 7 6 10 13 1.5 3.5 3 6 6 6" stroke="#e33563" stroke-width="4" stroke-linecap="round" fill="none"/></svg>';
  const TOPICS = [
    { name: 'זיהוי האותיות', icon: '🔍', subs: [
      { label: 'b–z', icon: '🔤', text: 'מזהים כל אות ואומרים את הצליל שלה', words: C },
    ] },
    { name: 'האות של הרופא/ה', icon: '🩺', subs: [
      { label: 'a', icon: '🩺', text: 'האות a אומרת לאות שלפניה להגיד "אָה" – כמו אצל הרופא/ה', words: withC('a') },
    ] },
    { name: 'האותיות המחייכות', icon: '😊', subs: [
      { label: 'i', icon: '😊', text: 'האות i מחייכת ואומרת "אִי"', words: withC('i') },
      { label: 'ea', icon: '😊', text: 'ea מחייכות יחד ואומרות "אִי"', words: withC('ea') },
      { label: 'ee', icon: '😊', text: 'ee מחייכות יחד ואומרות "אִי"', words: withC('ee') },
    ] },
    { name: 'האותיות הבודדות', icon: '☝️', subs: [
      { label: 'o', icon: '😮', text: 'o – עיגול עם הפה: "אוֹ"', words: withC('o') },
      { label: 'u', icon: SLIDE, text: 'u – צליל קצר: "אַ"', words: withC('u') },
      { label: 'e', icon: '🕹️', text: 'e – אומרת "אֶ"', words: withC('e') },
    ] },
    { name: 'צירופי האותיות', icon: '🔗', subs: [
      { label: 'oo', icon: '🐄', text: 'oo – כמו הפרה: "אוּוּ"', words: withC('oo') },
      { label: 'ai ay', icon: '🎮', text: 'ai / ay – שתי דרכים לכתוב את אותו הצליל', words: pair('ai', 'ay') },
      { label: 'ou ow', icon: '😕', text: 'ou / ow – "אַוּוּ", כמו כשמשהו כואב', words: pair('ou', 'ow') },
    ] },
    { name: 'האותיות השורקות', icon: '🌬️', subs: [
      { label: 'sh', icon: '🤫', text: 'sh – "שששש", כמו כשמבקשים שקט', words: ['ship', 'shop', 'she', 'shell', 'fish', 'wish'] },
      { label: 'ch', icon: '🚂', text: 'ch – "צ\'" כמו רכבת: צ\'ו-צ\'ו', words: ['chip', 'chop', 'chin', 'chat', 'much', 'rich'] },
    ] },
    { name: 'צלילים מיוחדים', icon: '✨', subs: [
      { label: 'th', icon: '👅', text: 'th – הלשון יוצאת קצת בין השיניים', words: ['this', 'that', 'thin', 'them', 'with', 'bath'] },
      { label: 'ph', icon: '📞', text: 'ph – נשמע כמו f', words: ['phone', 'photo', 'graph', 'dolphin', 'elephant', 'phonics'] },
      { label: 'tion', icon: '🎬', text: 'tion – בסוף מילה נשמע "שֶן"', words: ['action', 'nation', 'motion', 'lotion', 'station', 'fiction'] },
      { label: 'igh', icon: '🌙', text: 'igh – נשמע כמו "אַיי", ה-gh שותקות', words: ['high', 'light', 'night', 'might', 'right', 'knight'] },
    ] },
  ];
  // every word as { show, say }
  TOPICS.forEach((t) => t.subs.forEach((s) => {
    s.words = s.words.map((w) => (typeof w === 'string' ? { show: w, say: w } : w));
  }));
  const countOf = (t) => t.subs.reduce((n, s) => n + s.words.length, 0);

  const topicsEl = document.getElementById('rp-topics');
  const subsEl = document.getElementById('rp-subs');
  const explainEl = document.getElementById('rp-explain');
  const countEl = document.getElementById('rp-count');
  const dotsEl = document.getElementById('practice-dots');
  const wordEl = document.getElementById('practice-word');
  const recBtn = document.getElementById('practice-rec');
  const playBtn = document.getElementById('practice-play');
  const statusEl = document.getElementById('practice-status');
  const card = document.getElementById('practice-card');
  const nextBtn = document.getElementById('practice-next');
  const prevBtn = document.getElementById('practice-prev');

  const KEY = 'en-app:practice-review-5';
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (err) { done = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (err) { /* storage blocked */ } };
  const recordings = {};
  let topic = 0;
  let sub = 0;
  let index = 0;
  const words = () => TOPICS[topic].subs[sub].words;
  const keyOf = (i) => `${topic}.${sub}.${i}`;

  topicsEl.innerHTML = TOPICS.map((t, i) => `
    <button class="rp-topic" type="button" role="tab" data-topic="${i}">
      <span class="rp-topic__icon" aria-hidden="true">${t.icon}</span>
      <span class="rp-topic__name">${t.name}</span>
      <span class="rp-topic__count">${countOf(t)} ${i === 0 ? 'אותיות' : 'מילים'}</span>
    </button>`).join('');

  function renderTopic() {
    topicsEl.querySelectorAll('.rp-topic').forEach((b, i) => {
      b.classList.toggle('is-on', i === topic);
      b.setAttribute('aria-selected', String(i === topic));
    });
    const t = TOPICS[topic];
    subsEl.innerHTML = t.subs.map((s, i) => `
      <button class="rp-sub" type="button" data-sub="${i}">
        <span class="rp-sub__icon" aria-hidden="true">${s.icon}</span>
        <b lang="en" dir="ltr">${s.label}</b>
        <span class="rp-sub__n">${s.words.length}</span>
      </button>`).join('');
  }

  function renderSub() {
    subsEl.querySelectorAll('.rp-sub').forEach((b, i) => b.classList.toggle('is-on', i === sub));
    const s = TOPICS[topic].subs[sub];
    explainEl.textContent = s.text;
    dotsEl.innerHTML = s.words.map(() => '<i></i>').join('');
  }

  function show(i, dir) {
    const list = words();
    index = Math.max(0, Math.min(list.length - 1, i));
    // the arrows run on through the topic's stages (i → ea → ee); at the
    // topic's very last word the "next" arrow fades: it opens the "done" popup
    const subs = TOPICS[topic].subs;
    prevBtn.disabled = index === 0 && sub === 0;
    nextBtn.disabled = false;
    nextBtn.classList.toggle('is-end', index === list.length - 1 && sub === subs.length - 1);
    wordEl.textContent = list[index].show;
    wordEl.classList.toggle('is-long', list[index].show.length > 6);
    countEl.textContent = `${index + 1} מתוך ${list.length}`;
    [...dotsEl.children].forEach((d, k) => {
      d.classList.toggle('is-on', k === index);
      d.classList.toggle('is-done', !!done[keyOf(k)]);
    });
    playBtn.disabled = !recordings[keyOf(index)];
    statusEl.textContent = '';
    if (dir) {
      card.classList.remove('is-in-next', 'is-in-prev');
      void card.offsetWidth;
      card.classList.add(dir > 0 ? 'is-in-next' : 'is-in-prev');
    }
  }

  const pickTopic = (i) => { topic = i; sub = 0; renderTopic(); renderSub(); show(0, 1); };
  const pickSub = (i, at = 0, dir = 1) => {
    sub = i;
    renderSub();
    show(at, dir);
    // the new stage's chip pops, so the move is noticed
    const chip = subsEl.querySelector(`[data-sub="${i}"]`);
    chip.classList.remove('is-new');
    void chip.offsetWidth;
    chip.classList.add('is-new');
  };
  topicsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-topic]');
    if (b) pickTopic(Number(b.dataset.topic));
  });
  subsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (b) pickSub(Number(b.dataset.sub));
  });
  nextBtn.addEventListener('click', () => {
    if (index < words().length - 1) show(index + 1, 1);
    else if (sub < TOPICS[topic].subs.length - 1) pickSub(sub + 1);
    else openDone();
  });
  prevBtn.addEventListener('click', () => {
    if (index > 0) show(index - 1, -1);
    else if (sub > 0) pickSub(sub - 1, TOPICS[topic].subs[sub - 1].words.length - 1, -1);
  });

  /* "סיימת את…" popup at the end of a topic: the screen darkens, and the
     button moves on to the next topic's practice */
  const pop = document.createElement('div');
  pop.className = 'rp-done';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-modal', 'true');
  pop.hidden = true;
  document.body.appendChild(pop);
  function closeDone() {
    pop.classList.remove('is-open');
    setTimeout(() => { pop.hidden = true; }, 300);
  }
  // "לתרגל שוב" = round arrows (like the redraw button); "לתרגול הבא" = an arrow
  const AGAIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>';
  const ARROW_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></svg>';
  function openDone() {
    const t = TOPICS[topic];
    const nextT = TOPICS[topic + 1];
    pop.setAttribute('aria-label', `סיימת את ${t.name}`);
    pop.innerHTML = `
      <div class="rp-done__card">
        <span class="rp-done__icon" aria-hidden="true">${t.icon}</span>
        <p class="rp-done__kicker">כל הכבוד!</p>
        <h2 class="rp-done__title">סיימת את ${t.name}</h2>
        <p class="rp-done__text">תרגלת ${countOf(t)} ${topic === 0 ? 'אותיות' : 'מילים'}</p>
        ${nextT ? `<p class="rp-done__next">הבא בתור: <b>${nextT.icon} ${nextT.name}</b></p>` : '<p class="rp-done__next"><b>סיימת את כל החזרות 🏆</b></p>'}
        <div class="rp-done__buttons">
          <button class="rp-done__again" type="button" data-act="again">${AGAIN}<span>לתרגל שוב</span></button>
          ${nextT ? `<button class="btn-pill rp-done__go" type="button" data-act="next"><span>לתרגול הבא</span>${ARROW_NEXT}</button>`
            : `<a class="btn-pill rp-done__go" href="review.html"><span>לאי החזרות</span>${ARROW_NEXT}</a>`}
        </div>
      </div>`;
    pop.hidden = false;
    requestAnimationFrame(() => pop.classList.add('is-open'));
    const go = pop.querySelector('.rp-done__go');
    if (go) go.focus();
  }
  pop.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'next') { closeDone(); pickTopic(topic + 1); }
    else if (act && act.dataset.act === 'again') { closeDone(); pickSub(0); }
    else if (e.target === pop) closeDone();
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) closeDone(); });

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
    say(words()[index].say);
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
    const at = keyOf(index);
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
      show(index);
      if (at === keyOf(index)) statusEl.textContent = 'מעולה! לחצו על בדיקה כדי לשמוע';
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
    const url = recordings[keyOf(index)];
    if (url) new Audio(url).play().catch(() => {});
  });

  renderTopic();
  renderSub();
  show(0);
})();

// "הערה להורים": opens and closes the note under the opening line
(function () {
  const btn = document.getElementById('rp-parents');
  const note = document.getElementById('rp-note');
  if (!btn || !note) return;
  const set = (open) => { note.hidden = !open; btn.setAttribute('aria-expanded', String(open)); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); set(note.hidden); });
  document.addEventListener('click', (e) => { if (!note.hidden && !note.contains(e.target)) set(false); });
})();
