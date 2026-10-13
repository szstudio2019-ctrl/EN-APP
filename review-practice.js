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
      { label: 'o', icon: '⭕', text: 'o – עיגול עם הפה: "אוֹ"', words: withC('o') },
      { label: 'u', icon: '🅰️', text: 'u – כמו a, רק יותר קצר: "אַ"', words: withC('u') },
      { label: 'e', icon: '🐑', text: 'e – כמו הכבשה: "מֶה"', words: withC('e') },
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
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === list.length - 1;
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
  const pickSub = (i) => { sub = i; renderSub(); show(0, 1); };
  topicsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-topic]');
    if (b) pickTopic(Number(b.dataset.topic));
  });
  subsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (b) pickSub(Number(b.dataset.sub));
  });
  nextBtn.addEventListener('click', () => show(index + 1, 1));
  prevBtn.addEventListener('click', () => show(index - 1, -1));

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
