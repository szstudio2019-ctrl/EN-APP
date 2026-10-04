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

  // Background video moves only while the user scrolls (wheel / touch swipe).
  // Reduced-motion users keep the still poster.
  const bgVideo = document.querySelector('video.bg');
  const SPEED = 1; // playback rate while scrolling (1 = normal speed)
  const IDLE_MS = 250; // pause this long after the last scroll event
  if (bgVideo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let idleTimer;
    const nudge = () => {
      bgVideo.playbackRate = SPEED;
      if (bgVideo.paused) bgVideo.play().catch(() => {});
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => bgVideo.pause(), IDLE_MS);
    };
    window.addEventListener('wheel', nudge, { passive: true });
    window.addEventListener('touchmove', nudge, { passive: true });
  }

  document.querySelectorAll('.island[data-state="locked"]').forEach((el) => {
    el.addEventListener('click', (e) => e.preventDefault());
  });
})();
