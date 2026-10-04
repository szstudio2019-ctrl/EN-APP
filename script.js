// Scale the 1920x1080 stage to fit the window, centered (letterboxed).
(function () {
  const W = 1920;
  const H = 1080;
  const stage = document.getElementById('stage');

  function fit() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const x = (window.innerWidth - W * scale) / 2;
    const y = (window.innerHeight - H * scale) / 2;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  window.addEventListener('resize', fit);
  fit();

  document.querySelectorAll('.island[data-state="locked"]').forEach((el) => {
    el.addEventListener('click', (e) => e.preventDefault());
  });
})();
