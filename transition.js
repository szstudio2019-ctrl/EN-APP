// Page transition between the map and the worlds, shared by every page.
// A click on a link to another page of the site closes a dark veil with the
// abc tiles, then navigates; the next page opens with its loader flying out.
(function () {
  const tiles = `
    <div class="loader__tiles" aria-hidden="true">
      <span class="loader__tile loader__tile--a">a</span>
      <span class="loader__tile loader__tile--b">b</span>
      <span class="loader__tile loader__tile--c">c</span>
    </div>`;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isOtherPage = (a) => a
    && a.href
    && a.origin === location.origin
    && !a.target
    && !a.hasAttribute('download')
    && /(\.html|\/)$/.test(a.pathname)
    && a.pathname !== location.pathname;

  document.addEventListener('click', (e) => {
    if (reducedMotion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!isOtherPage(a)) return;
    e.preventDefault();
    const cover = document.createElement('div');
    cover.className = 'page-cover';
    cover.innerHTML = tiles;
    document.body.appendChild(cover);
    requestAnimationFrame(() => requestAnimationFrame(() => cover.classList.add('is-on')));
    setTimeout(() => { location.href = a.href; }, 520);
  });

  // Coming back with the browser's Back button can restore the page as it
  // was left; drop the veil then
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) document.querySelectorAll('.page-cover').forEach((c) => c.remove());
  });
})();
