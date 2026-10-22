// Welcome popup before the map: four slides on a white card over the cloud
// video, then a last step around the trophy (the sentence draw). "הבא" and
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
  const slides = [...intro.querySelectorAll('.intro__slide')];
  const dots = intro.querySelector('.intro__dots');
  const next = intro.querySelector('.intro__next');
  const nextLabel = next.querySelector('span');
  // the card's slides, then one more step: the screen darkens around the
  // trophy and its sentence draw (index = slides.length)
  const SPOT = slides.length;
  const back = intro.querySelector('.intro__back');
  const spot = intro.querySelector('.intro__spot');
  const trophy = document.querySelector('.trophy');
  // the dashes are buttons: a tap goes to that step (back too)
  dots.innerHTML = [...slides, spot].map((_, k) => `<button type="button" role="tab" aria-label="שקופית ${k + 1}"><i></i></button>`).join('');
  let index = 0;

  function show(i) {
    index = i;
    const spotOn = i === SPOT;
    slides.forEach((s, k) => {
      s.classList.toggle('is-current', k === i);
      s.setAttribute('aria-hidden', String(k !== i));
    });
    [...dots.children].forEach((d, k) => { d.classList.toggle('is-on', k === i); d.setAttribute('aria-selected', String(k === i)); });
    nextLabel.textContent = 'הבא';
    back.hidden = i === 0;
    intro.classList.toggle('is-spot', spotOn);
    document.body.classList.toggle('intro-spot', spotOn);
    if (spot) spot.setAttribute('aria-hidden', String(!spotOn));
    if (trophy && !spotOn) trophy.setAttribute('aria-expanded', 'false');
    if (spotOn) placeSpot();
  }
  // the words sit right under the trophy's sentence (in stage pixels)
  function placeSpot() {
    const hint = document.querySelector('.trophy-hint');
    const stage = document.getElementById('stage');
    if (!spot || !hint || !stage) return;
    const st = stage.getBoundingClientRect();
    const k = st.width / 1920 || 1;
    const h = hint.getBoundingClientRect();
    spot.style.left = ((h.left - st.left) / k).toFixed(0) + 'px';
    spot.style.top = ((h.bottom - st.top) / k + 22).toFixed(0) + 'px';
  }

  function close() {
    try { localStorage.setItem(KEY, '1'); } catch (err) { /* storage blocked */ }
    if (!isOpen) return;
    isOpen = false;
    intro.classList.remove('is-open', 'is-spot');
    document.body.classList.remove('intro-open', 'intro-spot');
    if (trophy) trophy.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!isOpen) intro.hidden = true; }, 450);
  }

  next.addEventListener('click', () => show(Math.min(SPOT, index + 1)));
  back.addEventListener('click', () => show(Math.max(0, index - 1)));
  dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show([...dots.children].indexOf(b)); });
  if (spot) {
    spot.querySelector('.intro__spot-back').addEventListener('click', () => show(SPOT - 1));
    spot.querySelector('.intro__spot-go').addEventListener('click', close);
  }
  intro.querySelector('.intro__skip').addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });

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
  if (!auto) return;
  if (!document.body.classList.contains('is-loading')) open();
  else {
    const watch = new MutationObserver(() => {
      if (!document.body.classList.contains('is-loading')) { watch.disconnect(); setTimeout(open, 500); }
    });
    watch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
})();
