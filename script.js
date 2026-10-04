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

  // Background video plays continuously in slow motion. To hide the jump at the
  // loop point, a second copy starts from the beginning and cross-fades in over
  // the last FADE seconds, then the two swap roles.
  // Reduced-motion users keep the still clouds image.
  const SPEED = 0.5; // playback rate (1 = normal speed)
  const FADE = 1; // seconds of video time spent cross-fading at the loop point
  const bgA = document.querySelector('video.bg');
  if (bgA && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const bgB = bgA.cloneNode();
    bgA.after(bgB);
    for (const v of [bgA, bgB]) {
      v.loop = false;
      v.playbackRate = SPEED;
      v.defaultPlaybackRate = SPEED;
      v.style.transition = `opacity ${FADE / SPEED}s linear`;
    }
    bgB.style.opacity = '0';

    let front = bgA;
    let back = bgB;
    let fading = false;

    // WebM files recorded in the browser may not report their length up front;
    // seeking far past the end makes the browser work it out.
    const knownDuration = (v) => new Promise((resolve) => {
      if (Number.isFinite(v.duration)) return resolve(v.duration);
      v.addEventListener('durationchange', function onChange() {
        if (!Number.isFinite(v.duration)) return;
        v.removeEventListener('durationchange', onChange);
        v.currentTime = 0;
        resolve(v.duration);
      });
      v.currentTime = 1e101;
    });

    const tick = (duration) => {
      if (!fading && front.currentTime >= duration - FADE) {
        fading = true;
        // The incoming copy fades in on top; the outgoing one stays fully
        // opaque underneath so the clouds image never shows through mid-fade.
        back.currentTime = 0;
        back.playbackRate = SPEED;
        back.style.zIndex = '1';
        front.style.zIndex = '0';
        back.play().catch(() => {});
        back.style.opacity = '1';
        setTimeout(() => {
          front.pause();
          front.style.transition = 'none';
          front.style.opacity = '0';
          front.offsetWidth; // apply the instant hide before restoring the transition
          front.style.transition = `opacity ${FADE / SPEED}s linear`;
          [front, back] = [back, front];
          fading = false;
        }, (FADE / SPEED) * 1000);
      }
      requestAnimationFrame(() => tick(duration));
    };

    const start = () => knownDuration(bgA).then((duration) => {
      bgA.playbackRate = SPEED;
      bgA.play().catch(() => {});
      tick(duration);
    });
    if (bgA.readyState >= 1) start();
    else bgA.addEventListener('loadedmetadata', start, { once: true });
  }

  document.querySelectorAll('.island[data-state="locked"]').forEach((el) => {
    el.addEventListener('click', (e) => e.preventDefault());
  });
})();
