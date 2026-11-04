// Lesson and practice pages: a small round button on the zebra guide (her
// upper left) that freezes her movement and starts it again. The choice is
// remembered for the next pages (per browser). While frozen, a guide video
// that something else tries to start (the explanation's Play) stays still;
// the explanation's sound itself still plays.
(function () {
  const KEY = 'en-app:guide-frozen';
  const read = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const write = (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} };

  const guides = [...document.querySelectorAll('.lesson__guide, .rp-guide')]
    .filter((g) => g.querySelector('video'));
  if (!guides.length) return;

  const css = document.createElement('style');
  css.textContent = `
.guide-freeze { position: absolute; left: 28px; top: 110px; z-index: 5; width: 52px; height: 52px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 3px #a4c62c, 0 6px 14px rgba(80, 110, 10, .2); cursor: pointer; transition: transform .2s ease, background .2s ease; }
.guide-freeze:hover { transform: scale(1.08); background: #f6fbe6; }
.guide-freeze svg { width: 24px; height: 24px; fill: #6f8c12; }
.guide-freeze.is-frozen { background: linear-gradient(180deg, #a4c62c 0%, #86a81a 100%); box-shadow: 0 0 0 3px #fff, 0 6px 14px rgba(80, 110, 10, .3); }
.guide-freeze.is-frozen svg { fill: #fff; }
.is-frozen-guide { animation-play-state: paused !important; }
.is-frozen-guide * { animation-play-state: paused !important; }`;
  document.head.appendChild(css);

  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.5"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.5"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';

  let frozen = read();
  const buttons = [];

  // videos that were playing when she froze start again on unfreezing
  const wasPlaying = new WeakSet();

  function apply() {
    for (const g of guides) {
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
      b.title = frozen ? 'הפעלת התנועה' : 'עצירת התנועה';
    }
  }

  for (const g of guides) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'guide-freeze';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      frozen = !frozen;
      write(frozen);
      apply();
    });
    g.appendChild(b);
    buttons.push(b);
    // while frozen, a play from elsewhere is undone at once
    for (const v of g.querySelectorAll('video')) {
      v.addEventListener('play', () => { if (frozen) { wasPlaying.add(v); v.pause(); } });
    }
  }
  apply();
})();
