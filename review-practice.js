// Review 5 ("כל החזרות"): every topic learned so far, on the practice page's
// card deck. Top row = the topics (icon + name + how many items); under it
// the letters / sounds of the chosen topic with a short explanation; the cards
// hold that sound's words (the dashes and the count show how many there are).
// Tapping the word says it; "הקלט" records the learner, "בדיקה" plays it back.
(function () {
  // icons for a done stage: a check, and round arrows (practise again)
  const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const AGAIN_ICON = '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/></svg>';
  // the consonant rows of the course's table (Einat's sheet)
  const C = ['b', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'y', 'z'];
  const withC = (end) => C.map((c) => c + end);
  // a word that is written two ways (bai/bay) is said by its second spelling
  const pair = (a, b) => C.map((c) => ({ show: `${c}${a}/${c}${b}`, say: `${c}${b}` }));

  // Version 2: the right side is the reviews themselves (חזרה 1–5), each one
  // the islands learned since the last review. A review's stages (the chips
  // on top) are the rows of the course's table: one consonant with its
  // vowels, read left to right (b → ba → bi → bea → bee). Review 1 holds the
  // rows of the whole table (b … z). Each card shows, beside it, the icon of
  // the island its sound comes from (the letter alone: the magnifier).
  const ROWS = C;
  // a stage per row: the letter, then the letter with each sound
  // sound = { v: 'a' | ['ai', 'ay'], ico: an icon in assets/icons, tag: its name }
  const rowsOf = (sounds, text) => ROWS.map((c) => ({
    label: c,
    text: text(c),
    words: sounds.map(({ v, ico, tag }) => (Array.isArray(v)
      ? { show: `${c}${v[0]}/${c}${v[1]}`, say: `${c}${v[1]}`, ico, tag, c }
      : { show: c + v, say: c + v, ico, tag, c })),
  }));
  const S = (v, ico, tag) => ({ v, ico, tag });
  // review 1's sounds: the letter alone, a, i, ea, ee
  const REVIEW2 = [S('o', 'review-abc', 'o'), S('u', 'sound-slide', 'u'), S('e', 'review-abc', 'e')];
  const REVIEW1 = [S('', 'review-find', 'זיהוי'), S('a', 'review-doctor', 'a'), S('i', 'review-smiles', 'i'), S('ea', 'review-smiles', 'ea'), S('ee', 'review-smiles', 'ee')];
  const TOPICS = [
    { name: 'חזרה 1', islands: 'זיהוי · הרופא/ה · המחייכות', pic: 'review-infinity',
      subs: rowsOf(REVIEW1, () => '') },
    // review 2 (Einat's table): the rows b … m only – each the letter, review 1's sounds
    // (a, i, ea, ee), then its own (o, u, e)
    { name: 'חזרה 2', islands: 'האותיות הבודדות', pic: 'review-infinity',
      subs: rowsOf([...REVIEW1, ...REVIEW2], () => '').slice(0, C.indexOf('m') + 1) },
    { name: 'חזרה 3', islands: 'צירופי האותיות', pic: 'review-infinity',
      // review 3 (Einat's table): the rows n … z – each the whole row: the letter, a, i, ea, ee,
      // o, u, e, then oo, ai/ay, ou/ow
      subs: rowsOf([...REVIEW1, ...REVIEW2, S('oo', 'sound-cow', 'oo'), S(['ai', 'ay'], 'sound-gamepad', 'ai/ay'), S(['ou', 'ow'], 'sound-smiley-sad-bandage', 'ou/ow')],
        () => '').slice(C.indexOf('n')) },
    { name: 'חזרה 4', islands: 'האותיות השורקות', pic: 'review-infinity', ico: 'review-whistling', subs: [
      { label: 'sh', text: 'sh – "שששש", כמו כשמבקשים שקט', words: ['sha', 'she', 'shi', 'sho', 'shu', 'shea', 'shee', 'shay', 'shou', 'show'] },
      { label: 'ch', text: 'ch – "צ\'" כמו רכבת: צ\'ו-צ\'ו', words: ['cha', 'che', 'chi', 'cho', 'chu', 'chea', 'chee', 'chay', 'chou', 'chow'] },
    ] },
    { name: 'חזרה 5', islands: 'צלילים מיוחדים', pic: 'review-infinity', ico: 'review-sounds', subs: [
      { label: 'th', text: 'th – הלשון יוצאת קצת בין השיניים', words: ['this', 'that', 'thin', 'them', 'with', 'bath'] },
      { label: 'ph', text: 'ph – נשמע כמו f', words: ['phone', 'photo', 'graph', 'dolphin', 'elephant', 'phonics'] },
      { label: 'tion', text: 'tion – בסוף מילה נשמע "שֶן"', words: ['action', 'nation', 'motion', 'lotion', 'station', 'fiction'] },
      { label: 'igh', text: 'igh – נשמע כמו "אַיי", ה-gh שותקות', words: ['high', 'light', 'night', 'might', 'right', 'knight'] },
    ] },
  ];
  // every word as { show, say }
  TOPICS.forEach((t) => t.subs.forEach((s) => {
    s.words = s.words.map((w) => (typeof w === 'string' ? { show: w, say: w, ico: t.ico, tag: s.label, c: t.name === 'חזרה 4' ? s.label : '' } : w));
  }));
  const countOf = (t) => t.subs.reduce((n, s) => n + s.words.length, 0);

  // which review this is: each review island passes its range (?r=1-16). A topic
  // is open once its first lesson is inside the range; later topics stay on the
  // list, faded with a lock (they open in a later review)
  const RANGES = ['1-10', '1-16', '1-21', '1-34', '1-38'];
  let RANGE = new URLSearchParams(location.search).get('r');
  try { RANGE = RANGE || sessionStorage.getItem('en-app:review-range'); } catch (err) { /* blocked */ }
  RANGE = (RANGE || '1-38').replace(/[^0-9-]/g, '') || '1-38';
  const LAST = Number(RANGE.split('-').pop()) || 38;
  // the pin on the island (1-5) this review was opened from; it is the number on the page
  const PIN = Math.min(5, Math.max(1, Number(new URLSearchParams(location.search).get('p')) || 5));
  const REVIEW_NO = PIN;
  // the learner's first name (from the header), for "כל הכבוד שירה"
  const firstName = (() => { const n = document.querySelector('.user__name'); return n ? n.textContent.trim().split(' ')[0] : ''; })();
  // each pin is its own review with its own range: pin 1 = 1-10, 2 = 1-16,
  // 3 = 1-21, 4 = 1-34, 5 = everything. A page opened without a pin (old links)
  // keeps the island's range
  const PIN_LAST = new URLSearchParams(location.search).get('p')
    ? Number(RANGES[PIN - 1].split('-').pop()) : LAST;
  const isOpen = (ti) => ti < PIN;
  const LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  // the page shows this review's number and range, and its back link returns to it
  const noEl = document.querySelector('.rp-no');
  if (noEl) { noEl.textContent = REVIEW_NO; noEl.setAttribute('aria-label', 'מספר ' + REVIEW_NO); }
  const rangeEl = document.querySelector('.rp-isl-card__range b');
  if (rangeEl) rangeEl.textContent = RANGE;
  const islCard = document.querySelector('.rp-isl-card');
  if (islCard) islCard.setAttribute('aria-label', islCard.getAttribute('aria-label').replace(/1-38/, RANGE));
  document.querySelectorAll('a[href="review.html"]').forEach((a) => { a.href = 'review.html?r=' + RANGE; });

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

  // progress is kept per island range and pin
  const KEY = RANGE === '1-38' && PIN === 5 ? 'en-app:practice-review-5' : `en-app:practice-review:${RANGE}:${PIN}`;
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (err) { done = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (err) { /* storage blocked */ } };
  const recordings = {};
  let topic = Math.min(PIN, 5) - 1;
  let sub = 0;
  let index = 0;
  const words = () => TOPICS[topic].subs[sub].words;
  const keyOf = (i) => `${topic}.${sub}.${i}`;

  topicsEl.innerHTML = TOPICS.map((t, i) => `
    <button class="rp-topic${isOpen(i) ? '' : ' is-locked'}" type="button" role="tab" data-topic="${i}"${isOpen(i) ? '' : ' disabled aria-disabled="true" title="ייפתח בחזרה הבאה"'}>
      <span class="rp-topic__icon" aria-hidden="true">${t.pic ? `<img src="assets/icons/${t.pic}.webp" alt="">` : t.icon}</span>
      <span class="rp-topic__name">${t.name}</span>
      <span class="rp-topic__count">${t.islands} · ${countOf(t)} כרטיסיות</span>
      <span class="rp-check" aria-hidden="true">${CHECK}</span>
      <span class="rp-again" aria-hidden="true">${AGAIN_ICON}</span>
      ${isOpen(i) ? '' : `<span class="rp-lock" aria-hidden="true">${LOCK}</span>`}
    </button>`).join('');

  // a stage (or a whole topic) whose words are all recorded is done: a green
  // outline and a green ✓, and a repeat icon inside to practise it again
  const subDone = (ti, si) => TOPICS[ti].subs[si].words.every((_, wi) => done[`${ti}.${si}.${wi}`]);
  const topicDone = (ti) => TOPICS[ti].subs.every((_, si) => subDone(ti, si));
  function syncStates() {
    // a review before this one (it was finished to get here) shows as done – green
    topicsEl.querySelectorAll('.rp-topic').forEach((b, ti) => b.classList.toggle('is-done', ti < PIN - 1 || topicDone(ti)));
    subsEl.querySelectorAll('.rp-sub').forEach((b, si) => b.classList.toggle('is-done', subDone(topic, si)));
  }

  function renderTopic() {
    topicsEl.querySelectorAll('.rp-topic').forEach((b, i) => {
      b.classList.toggle('is-on', i === topic);
      b.setAttribute('aria-selected', String(i === topic));
    });
    const t = TOPICS[topic];
    subsEl.innerHTML = t.subs.map((s, i) => `
      <button class="rp-sub" type="button" data-sub="${i}"${s.label.length > 2 ? ' data-long' : ''}>
        ${s.pic || s.icon ? `<span class="rp-sub__icon" aria-hidden="true">${s.pic ? `<img src="assets/icons/${s.pic}.webp" alt="">` : s.icon}</span>` : ''}
        <b lang="en" dir="ltr">${s.label}</b>
        <span class="rp-sub__n">${s.words.length}</span>
        <span class="rp-check" aria-hidden="true">${CHECK}</span>
        <span class="rp-again" aria-hidden="true">${AGAIN_ICON}</span>
      </button>`).join('');
  }

  // the stages in a slider: arrows on both sides when they don't all fit
  const subsWrap = document.createElement('div');
  subsWrap.className = 'rp-subs-wrap';
  subsEl.before(subsWrap);
  const subPrev = document.createElement('button');
  subPrev.type = 'button';
  subPrev.className = 'rp-subs-arrow rp-subs-arrow--prev';
  subPrev.setAttribute('aria-label', 'השלבים הקודמים');
  subPrev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  const subNext = subPrev.cloneNode(true);
  subNext.className = 'rp-subs-arrow rp-subs-arrow--next';
  subNext.setAttribute('aria-label', 'השלבים הבאים');
  subsWrap.append(subPrev, subsEl, subNext);
  const page = () => subsEl.clientWidth * 0.7;
  // the stages run left to right (b first, on the left): back = to the left, on = to the right
  subPrev.addEventListener('click', () => subsEl.scrollBy({ left: -page(), behavior: 'smooth' }));
  subNext.addEventListener('click', () => subsEl.scrollBy({ left: page(), behavior: 'smooth' }));
  function syncSubArrows() {
    const fits = subsEl.scrollWidth <= subsEl.clientWidth + 2;
    subsWrap.classList.toggle('is-fit', fits);
    const x = Math.abs(subsEl.scrollLeft);
    subPrev.disabled = x < 2;
    subNext.disabled = x + subsEl.clientWidth >= subsEl.scrollWidth - 2;
  }
  subsEl.addEventListener('scroll', syncSubArrows, { passive: true });
  window.addEventListener('resize', syncSubArrows);
  // the cue beside the card: which island this card's sound comes from
  const cueEl = document.createElement('div');
  cueEl.className = 'rp-cue';
  cueEl.setAttribute('aria-hidden', 'true');
  document.querySelector('.practice__deck').appendChild(cueEl);

  function renderSub() {
    // the card's colour tells the stages apart: 1st light blue, 2nd light yellow, 3rd light pink
    card.dataset.stage = String(sub % 3);
    subsEl.querySelectorAll('.rp-sub').forEach((b, i) => b.classList.toggle('is-on', i === sub));
    const s = TOPICS[topic].subs[sub];
    explainEl.textContent = s.text;
    dotsEl.innerHTML = s.words.map(() => '<i></i>').join('');
    lastNo.textContent = s.words.length; // the bar's far end: how many items (from the data)
    const on = subsEl.querySelector('.rp-sub.is-on');
    if (on) {
      const a = on.getBoundingClientRect();
      const b = subsEl.getBoundingClientRect();
      subsEl.scrollBy({ left: (a.left + a.width / 2) - (b.left + b.width / 2), behavior: 'smooth' });
    }
    syncSubArrows();
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
    // the letter navy, the letters joined to it pink (b + ee, sh + a, b + ai/ay)
    const cur = list[index];
    // the card's colour by the kind of sound: the letter alone light blue, the doctor's a pink, the smiles yellow
    card.dataset.kind = { 'review-find': 'find', 'review-doctor': 'doctor', 'review-smiles': 'smiles' }[cur.ico] || '';
    if (cur.c && cur.show !== cur.c) {
      const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      wordEl.innerHTML = cur.show.split('/').map((part) => (part.startsWith(cur.c) ? `${esc(cur.c)}<span class="rp-join">${esc(part.slice(cur.c.length))}</span>` : esc(part))).join('/');
    } else wordEl.textContent = cur.show;
    if (cueEl) {
      const w = list[index];
      cueEl.hidden = !w.ico;
      if (w.ico) cueEl.innerHTML = `<img src="assets/icons/${w.ico}.webp" alt=""><b lang="en" dir="ltr">${w.tag || ''}</b>`;
      cueEl.classList.remove('is-new');
      void cueEl.offsetWidth;
      cueEl.classList.add('is-new');
    }
    wordEl.classList.toggle('is-long', list[index].show.length > 6);
    countEl.textContent = `${index + 1} מתוך ${list.length}`;
    [...dotsEl.children].forEach((d, k) => {
      d.classList.toggle('is-on', k === index);
      d.classList.toggle('is-done', !!done[keyOf(k)]);
    });
    playBtn.disabled = !recordings[keyOf(index)];
    syncDoneBtn();
    syncStates();
    statusEl.textContent = '';
    if (dir) {
      card.classList.remove('is-in-next', 'is-in-prev');
      void card.offsetWidth;
      card.classList.add(dir > 0 ? 'is-in-next' : 'is-in-prev');
    }
  }

  // "סיימתי את החזרה": a quiet outline until every item of the topic is
  // recorded (from the saved progress), then filled pink with a soft pulse
  const doneBtn = document.getElementById('practice-done');
  function syncDoneBtn() {
    if (!doneBtn) return;
    const all = TOPICS[topic].subs.every((s, si) => s.words.every((_, wi) => done[`${topic}.${si}.${wi}`]));
    doneBtn.classList.toggle('is-complete', all);
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
    if (b && isOpen(Number(b.dataset.topic))) pickTopic(Number(b.dataset.topic));
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
  pop.className = 'pd-finish rp-done-pop';
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
    const nextT = TOPICS[topic + 1] && isOpen(topic + 1) ? TOPICS[topic + 1] : null;
    pop.setAttribute('aria-label', `סיימת את ${t.name}`);
    pop.innerHTML = `
      <div class="pd-finish__confetti" aria-hidden="true">${confettiHTML()}</div>
      <div class="pd-finish__card">
        <button class="pd-finish__close rp-done__close" type="button" data-close aria-label="סגירה"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
        <img class="pd-finish__trophy" src="assets/trophy.svg" alt="">
        <p class="pd-finish__kicker">כל הכבוד!</p>
        <h2 class="pd-finish__title">${firstName ? firstName + ', ' : ''}סיימת את ${t.name}</h2>
        <p class="pd-finish__coins">${COIN}צברת <b>${t.subs.length * COINS_PER_STAGE}</b> מטבעות</p>
        <p class="rp-done__text">תרגלת ${countOf(t)} כרטיסיות</p>
        ${nextT ? `<p class="rp-done__next">הבא בתור: <b>${nextT.pic ? `<img class="rp-done__next-pic" src="assets/icons/${nextT.pic}.webp" alt="">` : nextT.icon} ${nextT.name}</b></p>` : `<p class="rp-done__next"><b>${TOPICS[topic + 1] ? `סיימת את חזרה ${REVIEW_NO} 🏆` : 'סיימת את כל החזרות 🏆'}</b></p>`}
        <div class="rp-done__buttons">
          <button class="rp-done__again" type="button" data-act="again"><span>לתרגל שוב</span>${AGAIN}</button>
          ${nextT ? `<button class="btn-pill rp-done__go" type="button" data-act="next"><span>לתרגול הבא</span>${ARROW_NEXT}</button>`
            : `<a class="btn-pill rp-done__go" href="review.html?r=${RANGE}"><span>לאי החזרות</span>${ARROW_NEXT}</a>`}
        </div>
      </div>`;
    pop.hidden = false;
    void pop.offsetWidth;
    pop.classList.add('is-open');
    const go = pop.querySelector('.rp-done__go');
    if (go) go.focus();
  }
  pop.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'next') { closeDone(); pickTopic(topic + 1); }
    else if (act && act.dataset.act === 'again') { closeDone(); pickSub(0); }
    else if (e.target === pop || e.target.closest('[data-close]')) closeDone();
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) closeDone(); });

  /* "כל הכבוד שירה!" when a stage is done (a short toast), and "סיימתי את
     החזרה" opens the finish popup with the trophy and the coins (as on the
     lesson practice pages) */
  const COIN = '<img src="assets/coin.webp" alt="">';
  const COINS_PER_STAGE = 10;
  const toast = document.createElement('div');
  toast.className = 'pd-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer;
  function cheer(label) {
    toast.innerHTML = `<span class="pd-toast__star" aria-hidden="true">${COIN}</span>
      <span class="pd-toast__text"><b>כל הכבוד${firstName ? ' ' + firstName : ''}!</b> סיימת את שלב <span lang="en" dir="ltr">${label}</span></span>
      <span class="pd-toast__coins">+${COINS_PER_STAGE} ${COIN}</span>`;
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
  finish.setAttribute('aria-label', `סיימת את חזרה ${REVIEW_NO}`);
  finish.hidden = true;
  document.body.appendChild(finish);
  function confettiHTML() {
    const COLORS = ['#e33563', '#eeb741', '#91b121', '#2f7cf2', '#7d4ae8', '#ffd45c'];
    return Array.from({ length: 46 }, (_, i) => {
      const left = Math.round(Math.random() * 100);
      const delay = (Math.random() * 0.9).toFixed(2);
      const dur = (2.4 + Math.random() * 1.6).toFixed(2);
      const rot = Math.round(Math.random() * 360);
      return `<i style="left:${left}%;background:${COLORS[i % COLORS.length]};animation-delay:${delay}s;animation-duration:${dur}s;rotate:${rot}deg"></i>`;
    }).join('');
  }
  function openFinish() {
    let stages = 0;
    TOPICS.forEach((t, ti) => t.subs.forEach((_, si) => { if (subDone(ti, si)) stages += 1; }));
    // demo: before any stage is recorded, the review's open stages
    const open = TOPICS.reduce((n, t, ti) => n + (isOpen(ti) ? t.subs.length : 0), 0);
    const coins = (stages || open) * COINS_PER_STAGE;
    finish.innerHTML = `
      <div class="pd-finish__confetti" aria-hidden="true">${confettiHTML()}</div>
      <div class="pd-finish__card">
        <button class="pd-finish__close" type="button" data-close aria-label="סגירה"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
        <img class="pd-finish__trophy" src="assets/trophy.svg" alt="">
        <p class="pd-finish__kicker">כל הכבוד!</p>
        <h2 class="pd-finish__title">${firstName ? firstName + ', ' : ''}סיימת את חזרה ${REVIEW_NO}</h2>
        <p class="pd-finish__coins">${COIN}צברת <b>${coins}</b> מטבעות</p>
        <a class="btn-pill pd-finish__go" href="review.html?r=${RANGE}"><span>חזרה לאי החזרות</span><img src="assets/chevron.svg" alt="" class="btn-pill__chevron"></a>
      </div>`;
    finish.hidden = false;
    void finish.offsetWidth;
    finish.classList.add('is-open');
    finish.querySelector('.pd-finish__go').focus({ preventScroll: true });
  }
  const closeFinish = () => { finish.classList.remove('is-open'); setTimeout(() => { finish.hidden = true; }, 300); };
  finish.addEventListener('click', (e) => { if (e.target === finish || e.target.closest('[data-close]')) closeFinish(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !finish.hidden) closeFinish(); });
  if (doneBtn) doneBtn.addEventListener('click', (e) => { e.preventDefault(); openFinish(); });

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
      const [ti, si] = at.split('.').map(Number);
      const wasSub = subDone(ti, si);
      const wasTopic = topicDone(ti);
      done[at] = Date.now();
      save();
      // a stage just finished: "כל הכבוד"; the whole topic: the "סיימת את…" popup
      if (!wasTopic && topicDone(ti) && ti === topic) setTimeout(openDone, 600);
      else if (!wasSub && subDone(ti, si)) cheer(TOPICS[ti].subs[si].label);
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

  // the dashes get a number at each end: 1 on the right, the count on the left
  const bar = document.createElement('div');
  bar.className = 'rp-progress';
  dotsEl.before(bar);
  const firstNo = document.createElement('span');
  firstNo.className = 'rp-progress__n';
  firstNo.textContent = '1';
  const lastNo = document.createElement('span');
  lastNo.className = 'rp-progress__n';
  bar.append(firstNo, dotsEl, lastNo);

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

// The zebra's green Play reads the explanation aloud (the browser's Hebrew
// voice) and turns into Stop while it speaks
(function () {
  const btn = document.getElementById('rp-guide-play');
  const intro = document.querySelector('.rp-bubble__text'); // only what the zebra says, not the parents' note
  if (!btn || !intro) return;
  const guide = document.querySelector('.rp-guide');
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="rp-play-tri" d="M9 6.5v11l9-5.5z"/></svg>';
  const STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2.5"/></svg>';
  const canSpeak = 'speechSynthesis' in window;
  let speaking = false;
  const set = (on) => {
    speaking = on;
    btn.innerHTML = on ? STOP : PLAY;
    btn.classList.toggle('is-stop', on);
    btn.setAttribute('aria-label', on ? 'עצירת ההסבר' : 'השמעת ההסבר');
    guide.classList.toggle('is-speaking', on);
  };
  set(false);
  btn.addEventListener('click', () => {
    if (!canSpeak) return;
    if (speaking) { speechSynthesis.cancel(); set(false); return; }
    const u = new SpeechSynthesisUtterance(intro.innerText.replace(/\s+/g, ' '));
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
