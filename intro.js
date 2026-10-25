// Welcome popup before the map: four slides on a white card over the cloud
// video, then the sentence game's card. "הבא" and
// "חזרה" (and the dashes) move between them; "דלגו" / "בואו נתחיל" close it.
// Shown by itself once per browser after the loader (?intro in the address
// forces it); the menu's "הסבר על האתר" opens it again (SiteIntro.open).
// Needs islands.js.
(function () {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const KEY = 'en-app:intro-done';
  const force = new URLSearchParams(location.search).has('intro');
  let done = false;
  try { done = localStorage.getItem(KEY) === '1'; } catch (err) { /* storage blocked */ }
  const auto = !done || force;
  let isOpen = false;

  const ISLANDS = window.ISLANDS || [];
  const firstName = (document.querySelector('.user__name')?.textContent || '').trim().split(/\s+/)[0];
  intro.querySelectorAll('[data-first-name]').forEach((el) => { el.textContent = firstName ? `${firstName} !` : '!'; });
  const lessonIslands = ISLANDS.filter((island) => !island.review && !island.finale);
  intro.querySelectorAll('[data-island-count]').forEach((el) => { el.textContent = lessonIslands.length; });

  const card = intro.querySelector('.intro__card');
  card.tabIndex = -1;
  const slides = [...intro.querySelectorAll('.intro__slide:not(.intro__slide--sentence)')];
  const dots = intro.querySelector('.intro__dots');
  const next = intro.querySelector('.intro__next');
  const nextLabel = next.querySelector('span');
  const back = intro.querySelector('.intro__btns .intro__back');
  // the dashes are buttons: a tap goes to that step (back too)
  dots.innerHTML = slides.map((_, k) => `<button type="button" role="tab" aria-label="שקופית ${k + 1}"><i></i></button>`).join('');
  let index = 0;

  function show(i) {
    index = i;
    slides.forEach((s, k) => {
      s.classList.toggle('is-current', k === i);
      s.setAttribute('aria-hidden', String(k !== i));
    });
    [...dots.children].forEach((d, k) => { d.classList.toggle('is-on', k === i); d.setAttribute('aria-selected', String(k === i)); });
    nextLabel.textContent = 'הבא';
    back.hidden = i === 0;
  }

  function close() {
    try { localStorage.setItem(KEY, '1'); } catch (err) { /* storage blocked */ }
    if (!isOpen) return;
    isOpen = false;
    intro.classList.remove('is-open', 'is-short');
    document.body.classList.remove('intro-open');
    setTimeout(() => { if (!isOpen) intro.hidden = true; }, 450);
  }

  // after the last slide: the sentence game's card
  next.addEventListener('click', () => { if (index < slides.length - 1) show(index + 1); else toShort(); });
  back.addEventListener('click', () => show(Math.max(0, index - 1)));
  dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show([...dots.children].indexOf(b)); });
  // "דלגו", ✕ or Esc in the full intro still show the sentence game's card –
  // the child can't go on to the game without it; on that card they close
  const leave = () => { if (intro.classList.contains('is-short')) close(); else toShort(); };
  intro.querySelector('.intro__skip').addEventListener('click', leave);
  intro.querySelector('.intro__close').addEventListener('click', leave);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) leave(); });

  /* Slide 2: every island in a small slider (RTL: the left arrow goes on) */
  const pics = intro.querySelector('.intro__islands');
  if (pics) {
    const list = ISLANDS.filter((island) => !island.finale && island.img);
    let at = 0;
    const img = pics.querySelector('img');
    const name = pics.querySelector('.intro__island-name');
    const paint = () => {
      const island = list[at];
      img.src = `assets/${island.img}.webp`;
      name.textContent = island.name;
      pics.classList.remove('is-swapping');
      void pics.offsetWidth;
      pics.classList.add('is-swapping');
    };
    pics.querySelector('.intro__arrow--next').addEventListener('click', () => { at = (at + 1) % list.length; paint(); });
    pics.querySelector('.intro__arrow--prev').addEventListener('click', () => { at = (at - 1 + list.length) % list.length; paint(); });
    paint();
  }

  // Open once the loader has gone
  const open = () => {
    if (isOpen) return;
    isOpen = true;
    // behind the popup the map moves to the first island, so closing it
    // (skip or start) lands at the beginning of the journey
    if (window.journeyGoTo) window.journeyGoTo(0, { quiet: true });
    show(0);
    document.body.classList.add('intro-open');
    intro.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => intro.classList.add('is-open')));
    // focus the dialog itself (no ring on the button)
    card.focus({ preventScroll: true });
  };
  window.SiteIntro = { open };

  /* From the second visit on (the child already knows the site): only one card –
     the sentence game. A sentence in progress shows as it is, with no way to
     draw another (the game goes on with the same sentence until it is found);
     with none, a button draws one. Once per visit (browser session). */
  const VISITS = 'en-app:visits';
  let visits = 0;
  try {
    visits = Number(localStorage.getItem(VISITS)) || 0;
    if (!sessionStorage.getItem('en-app:visit')) {
      visits += 1;
      localStorage.setItem(VISITS, String(visits));
      sessionStorage.setItem('en-app:visit', '1');
    }
  } catch (err) { /* storage blocked */ }
  const SHOP = 'en-app:shop';
  const POOL = [
    { en: 'You can do it!', he: 'אתה יכול לעשות את זה!' }, { en: 'Believe in yourself!', he: 'תאמין בעצמך!' },
    { en: 'You are amazing!', he: 'אתה מדהים!' }, { en: 'Never give up!', he: 'לעולם אל תוותר!' },
    { en: 'Dream big!', he: 'חלום בגדול!' }, { en: 'Keep shining!', he: 'תמשיך להאיר!' },
    { en: 'Be brave!', he: 'תהיה אמיץ!' }, { en: 'Choose to be kind.', he: 'בחר להיות נחמד.' },
  ];
  const lettersOf = (t) => [...new Set(t.toLowerCase().replace(/[^a-z]/g, ''))];
  const isDone = (st) => lettersOf(st.en).every((l) => (st.found || '').includes(l));
  const readShop = () => { try { return JSON.parse(localStorage.getItem(SHOP)); } catch (err) { return null; } };
  const sBox = document.getElementById('intro-sentence');
  const sText = document.getElementById('intro-sentence-text');
  const drawBtn = document.getElementById('intro-draw');
  const shopLink = document.getElementById('intro-shop');
  const goBtn = document.getElementById('intro-go');
  // "אפשרות 1": no letter found yet – a different sentence can still be drawn;
  // "אפשרות 2": some letters found – the game goes on, to the shop. Without a
  // choice the card follows the child's own sentence.
  let option = null;
  const drawLabel = drawBtn.querySelector('span');
  function paintSentence() {
    const shop = readShop();
    // the shop's demo when nothing was bought yet: a sentence already in progress
    const active = shop ? shop.sentences && shop.sentences[0] : { en: 'Dream big!', he: 'חלום בגדול!', found: 'dre' };
    const playing = !!active && !isDone(active);
    if (playing) {
      let found = active.found || '';
      if (option === '1') found = '';
      if (option === '2' && !found) found = lettersOf(active.en).slice(0, 4).join('');
      sBox.innerHTML = active.en.split(' ').map((w) => `<span class="sentence__word">${w.split('').map((ch) => {
        const l = ch.toLowerCase();
        if (!/[a-z]/.test(l)) return `<b class="tile tile--mark">${ch}</b>`;
        return found.includes(l) ? `<b class="tile is-found">${ch}</b>` : '<b class="tile">?</b>';
      }).join('')}</span>`).join('');
      const left = lettersOf(active.en).filter((l) => !found.includes(l)).length;
      sText.textContent = `זה המשפט שלך – נשארו ${left} אותיות לגלות. ממשיכים עם אותו משפט עד שמגלים את כולו.\nקני אותיות בחנות האותיות!`;
    } else if (active) {
      // the last sentence was found: it shows whole, and a new one can be drawn
      sBox.innerHTML = active.en.split(' ').map((w) => `<span class="sentence__word">${w.split('').map((ch) => (/[a-z]/i.test(ch) ? `<b class="tile is-found">${ch}</b>` : `<b class="tile tile--mark">${ch}</b>`)).join('')}</span>`).join('');
      sText.textContent = 'סיימת את המשפט הקודם! הגרילי משפט חדש';
    } else {
      sBox.innerHTML = '';
      sText.textContent = 'אין לך משפט פעיל כרגע – הגרילי משפט חדש ותתחילי לגלות אותו!';
    }
    // a sentence not started yet (no letter found) can be swapped for another
    const fresh = playing && !(option === '2' || (option !== '1' && active.found));
    sBox.hidden = !active;
    drawBtn.hidden = playing && !fresh;
    drawLabel.textContent = fresh ? 'הגרלת משפט אחר' : 'הגרלת משפט';
    drawBtn.classList.toggle('is-other', fresh);
    shopLink.hidden = !playing || fresh;
    intro.querySelectorAll('.intro__options button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.option === option)));
  }
  intro.querySelectorAll('.intro__options button').forEach((b) => b.addEventListener('click', () => { option = b.dataset.option; paintSentence(); }));
  drawBtn.addEventListener('click', () => {
    const shop = readShop() || { coins: Number(document.querySelector('.stat--coins .stat__value')?.textContent) || 350, inv: {}, sentences: [] };
    const used = new Set((shop.sentences || []).map((x) => x.en));
    const fresh = POOL.filter((p) => !used.has(p.en));
    const list = fresh.length ? fresh : POOL;
    const pick = list[Math.floor(Math.random() * list.length)];
    shop.sentences = [{ en: pick.en, he: pick.he, date: Date.now(), found: '' }, ...(shop.sentences || []).filter((x) => isDone(x))];
    try { localStorage.setItem(SHOP, JSON.stringify(shop)); } catch (err) { /* storage blocked */ }
    paintSentence();
    sBox.classList.remove('is-drawing');
    void sBox.offsetWidth;
    sBox.classList.add('is-drawing');
    sText.textContent = 'הוגרל לך משפט חדש!\nקני אותיות בחנות האותיות כדי לגלות אותו';
  });
  goBtn.addEventListener('click', close);
  // from the full intro straight to the sentence card
  function toShort() {
    paintSentence();
    intro.classList.add('is-short');
    slides.forEach((sl) => { sl.classList.remove('is-current'); sl.setAttribute('aria-hidden', 'true'); });
    const only = intro.querySelector('.intro__slide--sentence');
    only.classList.add('is-current');
    only.setAttribute('aria-hidden', 'false');
    card.focus({ preventScroll: true });
  }
  const openShort = () => {
    if (isOpen) return;
    isOpen = true;
    paintSentence();
    intro.classList.add('is-short');
    const only = intro.querySelector('.intro__slide--sentence');
    only.classList.add('is-current');
    only.setAttribute('aria-hidden', 'false');
    document.body.classList.add('intro-open');
    intro.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => intro.classList.add('is-open')));
    card.focus({ preventScroll: true });
  };
  window.SiteIntro.openSentence = openShort;
  const whenLoaded = (fn) => {
    if (!document.body.classList.contains('is-loading')) { fn(); return; }
    const w = new MutationObserver(() => {
      if (!document.body.classList.contains('is-loading')) { w.disconnect(); setTimeout(fn, 500); }
    });
    w.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  };
  if (!auto && visits >= 2) {
    let shown = false;
    try { shown = sessionStorage.getItem('en-app:sentence-pop') === '1'; sessionStorage.setItem('en-app:sentence-pop', '1'); } catch (err) { /* blocked */ }
    if (!shown) whenLoaded(openShort);
  }
  if (!auto) return;
  if (!document.body.classList.contains('is-loading')) open();
  else {
    const watch = new MutationObserver(() => {
      if (!document.body.classList.contains('is-loading')) { watch.disconnect(); setTimeout(open, 500); }
    });
    watch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
})();
