// About page: fits the stage, trophy bubble and loader (like the profile page).
(function () {
  const W = 1920;
  const H = 1080;
  const stage = document.getElementById('stage');
  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const x = (window.innerWidth - W * scale) / 2;
    const y = (window.innerHeight - H * scale) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.style.setProperty('--edge-shift', `${(-x / scale).toFixed(1)}px`);
    stage.style.setProperty('--edge-shift-y', `${(-y / scale).toFixed(1)}px`);
  }
  window.addEventListener('resize', fit);
  fit();
  document.body.classList.add('is-loading');

  /* ---------- Trophy bubble and loader (same as the other pages) ---------- */
  const trophy = document.querySelector('.trophy');
  if (trophy) {
    const setTrophy = (open) => trophy.setAttribute('aria-expanded', String(open));
    trophy.addEventListener('click', (e) => { e.stopPropagation(); setTrophy(trophy.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.trophy-hint')) setTrophy(false); });
  }
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 3000))])
    .then(() => requestAnimationFrame(() => {
      const loader = document.getElementById('loader');
      if (loader) {
        const pctEl = document.getElementById('loader-pct');
        const barEl = document.getElementById('loader-bar');
        const t0 = performance.now();
        const run = (t) => {
          const p = Math.min(1, (t - t0) / 700);
          const v = Math.round(100 * (1 - Math.pow(1 - p, 3)));
          pctEl.textContent = v;
          barEl.style.width = `${v}%`;
          if (p < 1) requestAnimationFrame(run);
          else setTimeout(() => loader.classList.add('is-done'), 150);
        };
        requestAnimationFrame(run);
        setTimeout(() => loader.remove(), 2200);
      }
      document.body.classList.remove('is-loading');
    }));
})();
