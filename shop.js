// Letter shop page: fits the 1920x1080 stage, sells the letters a–z for coins
// and keeps the list of sentences drawn so far (newest first; the newest is the
// one the letters fill in). Demo state lives in this browser (localStorage).
(function () {
  const W = 1920;
  const H = 1080;
  const stage = document.getElementById('stage');

  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const x = (window.innerWidth - W * scale) / 2;
    const y = (window.innerHeight - H * scale) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    // the side tabs, the panels and the islands drawer reach the window edges
    stage.style.setProperty('--edge-shift', `${(-x / scale).toFixed(1)}px`);
    stage.style.setProperty('--edge-shift-y', `${(-y / scale).toFixed(1)}px`);
  }
  window.addEventListener('resize', fit);
  fit();
  document.body.classList.add('is-loading');

  /* ---------- Sentences that can be drawn ---------- */
  const POOL = [
    { en: 'You can do it!', he: 'אתה יכול לעשות את זה!' },
    { en: 'Believe in yourself!', he: 'תאמין בעצמך!' },
    { en: 'You are amazing!', he: 'אתה מדהים!' },
    { en: 'Your best is enough.', he: 'הכי טוב שלך זה מספיק.' },
    { en: 'Mistakes help you grow.', he: 'טעויות עוזרות לך לצמוח.' },
    { en: 'Never give up!', he: 'לעולם אל תוותר!' },
    { en: 'Every day is a fresh start.', he: 'כל יום הוא התחלה חדשה.' },
    { en: 'Practice makes progress.', he: 'תרגול מביא התקדמות.' },
    { en: 'Dream big!', he: 'חלום בגדול!' },
    { en: 'Keep shining!', he: 'תמשיך להאיר!' },
    { en: 'Be brave!', he: 'תהיה אמיץ!' },
    { en: 'Choose to be kind.', he: 'בחר להיות נחמד.' },
  ];
  const PRICE = 10;
  const DAY = 24 * 60 * 60 * 1000;
  const KEY = 'en-app:shop';

  /* ---------- State (demo) ---------- */
  const lettersOf = (text) => [...new Set(text.toLowerCase().replace(/[^a-z]/g, ''))];
  const coinsInHeader = () => Number(document.querySelector('.stat--coins .stat__value')?.textContent) || 350;
  function demoState() {
    const now = Date.now();
    return {
      coins: coinsInHeader(),
      inv: {},
      sentences: [
        { en: 'Dream big!', he: 'חלום בגדול!', date: now - 1 * DAY, found: 'dre' },
        { en: 'Be brave!', he: 'תהיה אמיץ!', date: now - 3 * DAY, found: 'berav' },
        { en: 'Never give up!', he: 'לעולם אל תוותר!', date: now - 9 * DAY, found: 'nevgiu' },
        { en: 'Keep shining!', he: 'תמשיך להאיר!', date: now - 12 * DAY, found: 'kes' },
      ],
    };
  }
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)); } catch (err) { state = null; }
  if (!state || !Array.isArray(state.sentences)) state = demoState();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { /* storage blocked */ } };

  const leftIn = (s) => lettersOf(s.en).filter((l) => !s.found.includes(l));
  const isDone = (s) => leftIn(s).length === 0;

  /* ---------- Header coins ---------- */
  const coinEls = document.querySelectorAll('.stat--coins .stat__value');
  const showCoins = () => coinEls.forEach((el) => { el.textContent = state.coins; });

  /* ---------- Letters for sale ---------- */
  const lettersEl = document.getElementById('letters');
  document.getElementById('letter-price').textContent = PRICE;
  const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
  // Each letter is an illustrated card (assets/cards/card-<letter>.webp);
  // under it: the + button and how many of that letter you have
  lettersEl.innerHTML = ALPHABET.map((l) => `
    <div class="letter-card" data-letter="${l}">
      <span class="letter-card__art"><img class="letter-card__img" src="assets/cards/card-${l}.webp" alt="האות ${l}" loading="lazy"></span>
      <div class="letter-card__bar">
        <button class="letter-card__buy" type="button" aria-label="קנייה של האות ${l} ב-${PRICE} מטבעות">+</button>
        <span class="letter-card__count" aria-label="יש לך"><span>×</span><b>0</b></span>
      </div>
    </div>`).join('');
  const showLetters = () => {
    lettersEl.querySelectorAll('.letter-card').forEach((card) => {
      const l = card.dataset.letter;
      card.querySelector('.letter-card__count b').textContent = state.inv[l] || 0;
    });
  };

  lettersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.letter-card__buy');
    if (!btn) return;
    const card = btn.closest('.letter-card');
    const l = card.dataset.letter;
    if (state.coins < PRICE) {
      toast('אין מספיק מטבעות – אספו עוד בשיעורים ובחזרות');
      card.classList.remove('is-denied');
      void card.offsetWidth;
      card.classList.add('is-denied');
      return;
    }
    state.coins -= PRICE;
    state.inv[l] = (state.inv[l] || 0) + 1;
    // the letter goes straight into the current sentence when it needs it
    const active = state.sentences[0];
    if (active && leftIn(active).includes(l)) {
      active.found += l;
      toast(isDone(active) ? 'כל הכבוד! השלמתם את המשפט 🎉' : `האות ${l} נכנסה למשפט`);
    } else {
      toast(`קניתם את האות ${l}`);
    }
    card.classList.remove('is-bought');
    void card.offsetWidth;
    card.classList.add('is-bought');
    save();
    render();
  });

  /* ---------- Sentences ---------- */
  const listEl = document.getElementById('sentences');
  const fmtDate = (t) => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
  const tilesFor = (s) => s.en.split(' ').map((word) => `<span class="s-word">${
    word.split('').map((ch) => {
      const l = ch.toLowerCase();
      if (!/[a-z]/.test(l)) return `<b class="s-tile s-tile--mark">${ch}</b>`;
      return s.found.includes(l) ? `<b class="s-tile is-found">${ch}</b>` : '<b class="s-tile">?</b>';
    }).join('')
  }</span>`).join('');

  function showSentences() {
    if (!state.sentences.length) {
      listEl.innerHTML = '<li class="sentences__empty">אין עדיין משפטים – הגרילו משפט חדש</li>';
      return;
    }
    listEl.innerHTML = state.sentences.map((s, i) => {
      const left = leftIn(s).length;
      const status = left === 0
        ? '<span class="s-status s-status--done"><i class="s-check">✓</i> הושלם</span>'
        : `<span class="s-status">נשארו ${left} אותיות</span>`;
      return `
        <li class="s-item${i === 0 ? ' is-active' : ''}${left === 0 ? ' is-done' : ''}">
          <div class="s-item__top">
            ${i === 0 ? '<span class="s-badge">המשפט הנוכחי</span>' : ''}
            <span class="s-date">${fmtDate(s.date)}</span>
            ${status}
            <button class="s-delete" type="button" data-index="${i}" aria-label="מחיקת המשפט">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></svg>
            </button>
          </div>
          <div class="s-tiles" lang="en" dir="ltr">${tilesFor(s)}</div>
          ${left === 0 ? `<p class="s-he">${s.he}</p>` : ''}
        </li>`;
    }).join('');
  }

  listEl.addEventListener('click', (e) => {
    const del = e.target.closest('.s-delete');
    if (!del) return;
    state.sentences.splice(Number(del.dataset.index), 1);
    save();
    render();
  });
  document.getElementById('clear-done')?.addEventListener('click', () => {
    const before = state.sentences.length;
    state.sentences = state.sentences.filter((s) => !isDone(s));
    toast(before === state.sentences.length ? 'אין משפטים שהושלמו' : `נמחקו ${before - state.sentences.length} משפטים שהושלמו`);
    save();
    render();
  });
  document.getElementById('clear-old')?.addEventListener('click', () => {
    const before = state.sentences.length;
    const weekAgo = Date.now() - 7 * DAY;
    state.sentences = state.sentences.filter((s, i) => i === 0 || s.date >= weekAgo); // keep the current one
    toast(before === state.sentences.length ? 'אין משפטים ישנים מלפני שבוע' : `נמחקו ${before - state.sentences.length} משפטים ישנים`);
    save();
    render();
  });
  document.getElementById('new-sentence').addEventListener('click', (e) => {
    const used = new Set(state.sentences.map((s) => s.en));
    const fresh = POOL.filter((p) => !used.has(p.en));
    const pick = (fresh.length ? fresh : POOL)[Math.floor(Math.random() * (fresh.length || POOL.length))];
    state.sentences.unshift({ en: pick.en, he: pick.he, date: Date.now(), found: '' });
    e.currentTarget.classList.remove('is-spinning');
    void e.currentTarget.offsetWidth;
    e.currentTarget.classList.add('is-spinning');
    save();
    render();
    listEl.scrollTop = 0;
    toast('הוגרל משפט חדש!');
  });

  /* ---------- Small message ---------- */
  const toastEl = document.createElement('p');
  toastEl.className = 'shop-toast';
  toastEl.setAttribute('role', 'status');
  stage.appendChild(toastEl);
  let toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }

  function render() {
    showCoins();
    showLetters();
    showSentences();
  }
  render();

  /* ---------- Trophy bubble (same as the other pages) ---------- */
  const trophy = document.querySelector('.trophy');
  if (trophy) {
    const setTrophy = (open) => trophy.setAttribute('aria-expanded', String(open));
    trophy.addEventListener('click', (e) => {
      e.stopPropagation();
      setTrophy(trophy.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.trophy-hint')) setTrophy(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setTrophy(false); });
  }

  /* ---------- Loader out once fonts are ready (max 3s) ---------- */
  Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 3000)),
  ]).then(() => requestAnimationFrame(() => {
    const loader = document.getElementById('loader');
    if (loader) {
      document.getElementById('loader-bar').style.width = '100%';
      document.getElementById('loader-pct').textContent = '100';
      loader.classList.add('is-done');
      setTimeout(() => loader.remove(), 1400);
    }
    document.body.classList.remove('is-loading');
  }));
})();
