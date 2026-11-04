// Lesson and practice pages: a round button in the row under the zebra guide
// (to the right of "from the start") that freezes her movement and starts it
// again. The choice is remembered for the next pages (per browser). While
// frozen, a guide video that something else tries to start (the
// explanation's Play) stays still; the explanation's sound still plays.
// Every button in that row gets a tooltip on hover with what it does.
(function () {
  const KEY = 'en-app:guide-frozen';
  const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const write = (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} };

  const css = document.createElement('style');
  css.textContent = `
.guide-freeze { flex: none; width: 58px; height: 58px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 3px #a4c62c, 0 8px 18px rgba(80, 110, 10, .16); cursor: pointer; transition: transform .2s ease, background .2s ease; }
.guide-freeze:hover { transform: scale(1.06); background: #f6fbe6; }
.guide-freeze svg { width: 24px; height: 24px; fill: #6f8c12; }
.guide-freeze.is-frozen { background: linear-gradient(180deg, #a4c62c 0%, #86a81a 100%); box-shadow: 0 0 0 3px #fff, 0 8px 18px rgba(80, 110, 10, .3); }
.guide-freeze.is-frozen svg { fill: #fff; }
.guide-ctl--solo { gap: 0; }
.is-frozen-guide, .is-frozen-guide * { animation-play-state: paused !important; }
.guide-tip { position: fixed; z-index: 9999; max-width: 260px; padding: 8px 14px; border-radius: 12px; background: #242275; color: #fff; font: 600 15px/1.35 'Rubik', sans-serif; direction: rtl; text-align: center; white-space: normal; pointer-events: none; box-shadow: 0 8px 20px rgba(36, 34, 117, .25); opacity: 0; translate: -50% -100%; transition: opacity .15s ease; }
.guide-tip.is-on { opacity: 1; }
.guide-tip::after { content: ''; position: absolute; left: 50%; top: 100%; translate: -50% 0; border: 7px solid transparent; border-top-color: #242275; }`;
  document.head.appendChild(css);

  /* ---- tooltips ---- */
  const tip = document.createElement('div');
  tip.className = 'guide-tip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let tipFor = null;
  const TIPS = {
    restart: 'השמעת ההסבר של הזברה מההתחלה',
    playOn: 'האזינו להסבר של הזברה',
    playOff: 'עצירת ההסבר',
  };
  const tipText = (b) => {
    if (b.classList.contains('guide-freeze')) return b.classList.contains('is-frozen') ? 'הזברה עצורה – לחצו כדי שתזוז שוב' : 'עצירת התנועה של הזברה';
    if (b.classList.contains('guide-ctl__restart')) return TIPS.restart;
    if (b.classList.contains('lesson__listen') || b.classList.contains('rp-guide__play')) return b.classList.contains('is-stop') ? TIPS.playOff : TIPS.playOn;
    return b.dataset.tip || b.getAttribute('aria-label') || '';
  };
  const showTip = (b) => {
    const t = tipText(b);
    if (!t) return;
    tipFor = b;
    tip.textContent = t;
    const r = b.getBoundingClientRect();
    tip.style.left = `${r.left + r.width / 2}px`;
    tip.style.top = `${r.top - 12}px`;
    tip.classList.add('is-on');
  };
  const hideTip = () => { tipFor = null; tip.classList.remove('is-on'); };
  const addTip = (b) => {
    if (b.dataset.tipReady) return;
    b.dataset.tipReady = '1';
    b.addEventListener('mouseenter', () => showTip(b));
    b.addEventListener('mouseleave', hideTip);
    b.addEventListener('focus', () => showTip(b));
    b.addEventListener('blur', hideTip);
    // the text changes on click (Play ↔ Stop, frozen ↔ moving)
    b.addEventListener('click', () => setTimeout(() => { if (tipFor === b) showTip(b); }, 30));
  };
  window.addEventListener('scroll', hideTip, true);

  /* ---- the freeze button ---- */
  const guides = [...document.querySelectorAll('.lesson__guide, .rp-guide')];
  const moving = guides.filter((g) => g.querySelector('video'));

  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.5"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.5"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  let frozen = read();
  const buttons = [];
  const wasPlaying = new WeakSet();

  function apply() {
    for (const g of moving) {
      g.classList.toggle('is-frozen-guide', frozen);
      for (const v of g.querySelectorAll('video')) {
        if (frozen) {
          if (!v.paused) wasPlaying.add(v);
          v.pause();
        } else {
          const loop = v.loop || v.hasAttribute('autoplay') || v.matches('.lesson__guide-loop, .lesson__guide-idle');
          if (wasPlaying.has(v) || loop) v.play().catch(() => {});
          wasPlaying.delete(v);
        }
      }
    }
    for (const b of buttons) {
      b.innerHTML = frozen ? PLAY : PAUSE;
      b.classList.toggle('is-frozen', frozen);
      b.setAttribute('aria-pressed', String(frozen));
      b.setAttribute('aria-label', frozen ? 'הפעלת התנועה של הזברה' : 'עצירת התנועה של הזברה');
    }
  }

  // the row under this zebra: beside her (lessons) or inside her (the review coach)
  function rowFor(g) {
    const inside = g.querySelector('.guide-ctl');
    if (inside) return inside;
    let s = g.nextElementSibling;
    while (s && !s.classList.contains('guide-ctl') && !s.matches('.lesson__guide, .rp-guide')) s = s.nextElementSibling;
    if (s && s.classList.contains('guide-ctl')) return s;
    // practices have no row yet: one of its own, in the same place under her feet
    const row = document.createElement('div');
    row.className = 'guide-ctl guide-ctl--solo';
    g.after(row);
    return row;
  }

  for (const g of moving) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'guide-freeze';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      frozen = !frozen;
      write(frozen);
      apply();
    });
    // the row is right-to-left: first in it = rightmost, beside "from the start"
    rowFor(g).prepend(b);
    buttons.push(b);
    for (const v of g.querySelectorAll('video')) {
      v.addEventListener('play', () => { if (frozen) { wasPlaying.add(v); v.pause(); } });
    }
  }
  apply();

  document.querySelectorAll('.guide-ctl button, .rp-guide__play').forEach(addTip);
})();
